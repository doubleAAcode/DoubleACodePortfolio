import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import { DOUBLE_A_TEST_BUSINESS_ID } from "./catalog-repository.server";
import { getWhatsAppServerConfig, type WhatsAppServerConfig } from "./config.server";
import {
  canBusinessProcessMessages,
  selectWhatsAppConnectionForPhoneNumber,
  type WhatsAppConnectionCandidate,
} from "./reliability";

const PARTNER_TEST_BUSINESS_ID = "double-a-partner-test-business";

export type WhatsAppConnection = WhatsAppConnectionCandidate & {
  source: "database" | "legacy_env";
  config: WhatsAppServerConfig;
};

type WhatsAppConnectionRow = {
  id: string;
  business_id: string;
  phone_number_id: string;
  config_suffix: string | null;
  is_active: boolean;
  status?: string | null;
};

type BusinessStatusRow = {
  id: string;
  is_active: boolean;
  status?: string | null;
};

export async function resolveWhatsAppConnectionByPhoneNumber(phoneNumberId: string) {
  const databaseConnection = await findDatabaseConnection(phoneNumberId);
  if (databaseConnection) return databaseConnection;

  return findLegacyEnvConnection(phoneNumberId);
}

async function findDatabaseConnection(
  phoneNumberId: string,
): Promise<WhatsAppConnection | undefined> {
  if (!isServerSupabaseConfigured()) return undefined;

  try {
    const rows = await supabaseServerRest<WhatsAppConnectionRow[]>(
      `/wa_whatsapp_connections?select=*&phone_number_id=eq.${encodeURIComponent(
        phoneNumberId,
      )}&is_active=eq.true&limit=1`,
    );
    const row = rows[0];
    if (!row) return undefined;
    if (row.status && row.status !== "ACTIVE") return undefined;
    if (!(await isBusinessActiveForMessaging(row.business_id))) return undefined;

    const configSuffix = row.config_suffix ?? "";
    return {
      connectionId: row.id,
      businessId: row.business_id,
      phoneNumberId: row.phone_number_id,
      configSuffix,
      isActive: row.is_active,
      source: "database",
      config: getWhatsAppServerConfig(configSuffix),
    };
  } catch (error) {
    if (isMissingConnectionsTableError(error)) return undefined;
    throw error;
  }
}

async function findLegacyEnvConnection(
  phoneNumberId: string,
): Promise<WhatsAppConnection | undefined> {
  const suffixes = getLegacyConnectionSuffixes();
  const candidates = suffixes
    .map((configSuffix): WhatsAppConnection | undefined => {
      const config = getWhatsAppServerConfig(configSuffix);
      if (!config.phoneNumberId) return undefined;

      return {
        connectionId: configSuffix ? `legacy-env-${configSuffix}` : "legacy-env-default",
        businessId: getLegacyBusinessId(configSuffix),
        phoneNumberId: config.phoneNumberId,
        configSuffix,
        isActive: true,
        source: "legacy_env",
        config,
      };
    })
    .filter((connection): connection is WhatsAppConnection => Boolean(connection));

  const selected = selectWhatsAppConnectionForPhoneNumber({ phoneNumberId, candidates });
  const connection = selected
    ? candidates.find((candidate) => candidate.connectionId === selected.connectionId)
    : undefined;
  if (!connection) return undefined;
  return (await isBusinessActiveForMessaging(connection.businessId)) ? connection : undefined;
}

async function isBusinessActiveForMessaging(businessId: string) {
  if (!isServerSupabaseConfigured()) return true;
  try {
    const rows = await supabaseServerRest<BusinessStatusRow[]>(
      `/wa_businesses?select=id,is_active,status&id=eq.${encodeURIComponent(businessId)}&limit=1`,
    );
    const business = rows[0];
    return business
      ? canBusinessProcessMessages({ isActive: business.is_active, status: business.status })
      : false;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("status")) {
      const rows = await supabaseServerRest<BusinessStatusRow[]>(
        `/wa_businesses?select=id,is_active&id=eq.${encodeURIComponent(businessId)}&limit=1`,
      );
      return rows[0]?.is_active ?? true;
    }
    throw error;
  }
}

function getLegacyConnectionSuffixes() {
  const configured = process.env.WHATSAPP_CONNECTION_SUFFIXES?.split(",")
    .map((suffix) => suffix.trim())
    .filter(Boolean);

  return ["", ...(configured?.length ? configured : ["2"])];
}

function getLegacyBusinessId(configSuffix: string) {
  if (!configSuffix) return process.env.WHATSAPP_BUSINESS_ID || DOUBLE_A_TEST_BUSINESS_ID;
  return process.env[`WHATSAPP_BUSINESS_ID_${configSuffix}`] || getFallbackBusinessId(configSuffix);
}

function getFallbackBusinessId(configSuffix: string) {
  return configSuffix === "2" ? PARTNER_TEST_BUSINESS_ID : DOUBLE_A_TEST_BUSINESS_ID;
}

function isMissingConnectionsTableError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("wa_whatsapp_connections") || message.includes("relation");
}
