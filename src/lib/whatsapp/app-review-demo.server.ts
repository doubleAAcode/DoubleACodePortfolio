import "@tanstack/react-start/server-only";

import { randomUUID } from "node:crypto";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import {
  getMissingWhatsAppConfigKeys,
  getWhatsAppServerConfig,
  type WhatsAppServerConfig,
} from "./config.server";
import { sanitizeExternalErrorMessage } from "./reliability";

export type ReviewConnectionSummary = {
  connectionId: string;
  businessId: string;
  businessName: string;
  connectionName: string;
  phoneNumberId: string;
  businessAccountId: string | null;
  displayPhoneNumber: string | null;
  status: string;
  isActive: boolean;
  configSuffix: string;
  missingConfigKeys: string[];
};

export type MetaTemplateRow = {
  id: string;
  business_id: string | null;
  connection_id: string | null;
  waba_id: string | null;
  name: string;
  language: string;
  category: string;
  body: string;
  meta_template_id: string | null;
  status: string | null;
  response_json: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  created_by_admin: string | null;
  created_at: string;
  updated_at: string;
};

type ConnectionRow = {
  id: string;
  business_id: string;
  display_name: string | null;
  phone_number_id: string;
  business_account_id: string | null;
  display_phone_number: string | null;
  status: string | null;
  is_active: boolean;
  config_suffix: string | null;
};

type BusinessRow = {
  id: string;
  name: string;
};

type MetaTemplateResponse = {
  id?: string;
  status?: string;
  category?: string;
  error?: {
    code?: string | number;
    message?: string;
    type?: string;
  };
};

export async function listReviewConnections(): Promise<ReviewConnectionSummary[]> {
  if (!isServerSupabaseConfigured()) return [];

  const [connections, businesses] = await Promise.all([
    supabaseServerRest<ConnectionRow[]>(
      "/wa_whatsapp_connections?select=*&order=updated_at.desc&limit=100",
    ),
    supabaseServerRest<BusinessRow[]>("/wa_businesses?select=id,name&limit=500"),
  ]);
  const businessesById = new Map(businesses.map((business) => [business.id, business]));

  return connections.map((connection) => toConnectionSummary(connection, businessesById));
}

export async function getReviewConnection(connectionId: string) {
  if (!connectionId.trim()) throw new Error("Connection ID is required.");
  if (!isServerSupabaseConfigured()) throw new Error("Supabase is not configured.");

  const rows = await supabaseServerRest<ConnectionRow[]>(
    `/wa_whatsapp_connections?select=*&id=eq.${encodeURIComponent(connectionId)}&limit=1`,
  );
  const connection = rows[0];
  if (!connection) throw new Error("WhatsApp connection was not found.");

  const businesses = await supabaseServerRest<BusinessRow[]>(
    `/wa_businesses?select=id,name&id=eq.${encodeURIComponent(connection.business_id)}&limit=1`,
  );
  return toConnectionSummary(
    connection,
    new Map(businesses.map((business) => [business.id, business])),
  );
}

export async function createWhatsAppMessageTemplate({
  connectionId,
  name,
  language,
  category,
  body,
  adminUser,
}: {
  connectionId: string;
  name: string;
  language: string;
  category: string;
  body: string;
  adminUser?: string;
}) {
  const connection = await getReviewConnection(connectionId);
  const config = getWhatsAppServerConfig(connection.configSuffix);
  const cleanName = normalizeTemplateName(name);
  const cleanLanguage = language.trim() || "en_US";
  const cleanCategory = (category.trim() || "UTILITY").toUpperCase();
  const cleanBody = body.trim();

  if (!cleanBody) throw new Error("Template body is required.");
  if (!config.accessToken) throw new Error("WhatsApp access token is not configured.");
  if (!connection.businessAccountId && !config.businessAccountId) {
    throw new Error("WhatsApp Business Account ID is not configured.");
  }

  const wabaId = connection.businessAccountId || config.businessAccountId;
  const url = `https://graph.facebook.com/${config.graphApiVersion}/${wabaId}/message_templates`;
  const payload = {
    name: cleanName,
    language: cleanLanguage,
    category: cleanCategory,
    components: [{ type: "BODY", text: cleanBody }],
  };
  const response = await fetchMeta(url, config, payload);
  const stored = await storeTemplateSubmission({
    connection,
    wabaId,
    name: cleanName,
    language: cleanLanguage,
    category: cleanCategory,
    body: cleanBody,
    response,
    adminUser,
  });

  return { connection, template: stored, metaResponse: response };
}

export async function listLocalMetaTemplates({
  connectionId,
  limit = 50,
}: {
  connectionId?: string;
  limit?: number;
}) {
  if (!isServerSupabaseConfigured()) return [] as MetaTemplateRow[];
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const filter = connectionId ? `&connection_id=eq.${encodeURIComponent(connectionId)}` : "";
  return supabaseServerRest<MetaTemplateRow[]>(
    `/wa_meta_templates?select=id,business_id,connection_id,waba_id,name,language,category,body,meta_template_id,status,error_code,error_message,created_by_admin,created_at,updated_at&order=created_at.desc&limit=${safeLimit}${filter}`,
  );
}

export async function listWhatsAppMessageTemplates({ connectionId }: { connectionId: string }) {
  const connection = await getReviewConnection(connectionId);
  const config = getWhatsAppServerConfig(connection.configSuffix);
  if (!config.accessToken) throw new Error("WhatsApp access token is not configured.");
  const wabaId = connection.businessAccountId || config.businessAccountId;
  if (!wabaId) throw new Error("WhatsApp Business Account ID is not configured.");

  const url = `https://graph.facebook.com/${config.graphApiVersion}/${wabaId}/message_templates?fields=id,name,language,category,status&limit=25`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(sanitizeMetaError(data));
  }
  return { connection, data };
}

function toConnectionSummary(
  connection: ConnectionRow,
  businessesById: Map<string, BusinessRow>,
): ReviewConnectionSummary {
  const config = getWhatsAppServerConfig(connection.config_suffix ?? "");
  return {
    connectionId: connection.id,
    businessId: connection.business_id,
    businessName: businessesById.get(connection.business_id)?.name ?? connection.business_id,
    connectionName: connection.display_name || "WhatsApp connection",
    phoneNumberId: connection.phone_number_id,
    businessAccountId: connection.business_account_id,
    displayPhoneNumber: connection.display_phone_number,
    status: connection.status || "DRAFT",
    isActive: connection.is_active,
    configSuffix: connection.config_suffix ?? "",
    missingConfigKeys: getMissingWhatsAppConfigKeys(config),
  };
}

async function fetchMeta(
  url: string,
  config: WhatsAppServerConfig,
  payload: Record<string, unknown>,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as MetaTemplateResponse;
  return {
    ok: response.ok,
    status: response.status,
    data,
    errorCode: data.error?.code == null ? undefined : String(data.error.code),
    errorMessage: response.ok ? undefined : sanitizeMetaError(data),
  };
}

async function storeTemplateSubmission({
  connection,
  wabaId,
  name,
  language,
  category,
  body,
  response,
  adminUser,
}: {
  connection: ReviewConnectionSummary;
  wabaId: string;
  name: string;
  language: string;
  category: string;
  body: string;
  response: Awaited<ReturnType<typeof fetchMeta>>;
  adminUser?: string;
}) {
  const now = new Date().toISOString();
  const row = {
    id: randomUUID(),
    business_id: connection.businessId,
    connection_id: connection.connectionId,
    waba_id: wabaId,
    name,
    language,
    category,
    body,
    meta_template_id: response.data.id ?? null,
    status: response.ok ? response.data.status || "SUBMITTED" : "FAILED",
    response_json: sanitizeResponse(response.data),
    error_code: response.errorCode ?? null,
    error_message: response.errorMessage ?? null,
    created_by_admin: adminUser ?? null,
    created_at: now,
    updated_at: now,
  };

  if (!isServerSupabaseConfigured()) return row as MetaTemplateRow;
  const rows = await supabaseServerRest<MetaTemplateRow[]>("/wa_meta_templates", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify(row),
  });
  return rows[0] ?? (row as MetaTemplateRow);
}

function normalizeTemplateName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!normalized) throw new Error("Template name is required.");
  return normalized.slice(0, 512);
}

function sanitizeMetaError(data: Record<string, unknown>) {
  const error = data.error as { message?: string } | undefined;
  return sanitizeExternalErrorMessage(error?.message, "Meta template request failed");
}

function sanitizeResponse(data: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = /token|secret|authorization/i.test(key) ? "[redacted]" : value;
  }
  return sanitized;
}
