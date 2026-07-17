import "@tanstack/react-start/server-only";

import { randomUUID } from "node:crypto";
import process from "node:process";

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
  webhookPath: string | null;
  status: string;
  isActive: boolean;
  configSuffix: string;
  missingConfigKeys: string[];
};

export type WhatsAppConnectionHealth = {
  checkedAt: string;
  connection: ReviewConnectionSummary;
  configComplete: boolean;
  missingConfigKeys: string[];
  meta: {
    ok: boolean;
    status: number | null;
    identityMatches: boolean;
    displayNumberPresent: boolean;
    verifiedName: string | null;
    qualityRating: string | null;
    codeVerificationStatus: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  };
  subscription: {
    ok: boolean;
    expectedCallbackUrl: string;
    appId: string | null;
    appName: string | null;
    appStatus: number | null;
    wabaStatus: number | null;
    wabaSubscribed: boolean;
    callbackConfigured: boolean;
    callbackMatches: boolean;
    messagesSubscribed: boolean;
    active: boolean;
    callbackUrl: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  };
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
  webhook_path: string | null;
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

type MetaPhoneNumberResponse = {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
  error?: {
    code?: string | number;
    message?: string;
  };
};

type MetaAppResponse = {
  id?: string;
  name?: string;
  error?: MetaApiError;
};

type MetaSubscribedAppsResponse = {
  data?: unknown[];
  error?: MetaApiError;
};

type MetaAppSubscription = {
  object?: string;
  callback_url?: string;
  active?: boolean;
  fields?: Array<string | { name?: string }>;
};

type MetaAppSubscriptionsResponse = {
  data?: MetaAppSubscription[];
  error?: MetaApiError;
};

type MetaApiError = {
  code?: string | number;
  message?: string;
};

const META_HEALTH_TIMEOUT_MS = 8_000;

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

export async function checkWhatsAppConnectionHealth(
  connectionId: string,
): Promise<WhatsAppConnectionHealth> {
  const connection = await getReviewConnection(connectionId);
  const config = getWhatsAppServerConfig(connection.configSuffix);
  const missingConfigKeys = getMissingWhatsAppConfigKeys(config);
  const checkedAt = new Date().toISOString();
  const expectedCallbackUrl = getExpectedWebhookUrl(connection);

  if (missingConfigKeys.length) {
    return {
      checkedAt,
      connection,
      configComplete: false,
      missingConfigKeys,
      meta: emptyMetaHealth("WhatsApp runtime configuration is incomplete."),
      subscription: emptySubscriptionHealth(
        expectedCallbackUrl,
        "WhatsApp runtime configuration is incomplete.",
      ),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), META_HEALTH_TIMEOUT_MS);
  try {
    const phoneUrl = new URL(
      `${config.graphApiVersion}/${encodeURIComponent(connection.phoneNumberId)}`,
      "https://graph.facebook.com",
    );
    phoneUrl.searchParams.set(
      "fields",
      "id,display_phone_number,verified_name,quality_rating,code_verification_status",
    );
    const appUrl = new URL(`${config.graphApiVersion}/app`, "https://graph.facebook.com");
    appUrl.searchParams.set("fields", "id,name");
    const wabaId = connection.businessAccountId || config.businessAccountId;
    const wabaUrl = new URL(
      `${config.graphApiVersion}/${encodeURIComponent(wabaId)}/subscribed_apps`,
      "https://graph.facebook.com",
    );
    const accessHeaders = { Authorization: `Bearer ${config.accessToken}` };
    const [phoneResponse, appResponse, wabaResponse] = await Promise.all([
      fetch(phoneUrl, { headers: accessHeaders, signal: controller.signal }),
      fetch(appUrl, { headers: accessHeaders, signal: controller.signal }),
      fetch(wabaUrl, { headers: accessHeaders, signal: controller.signal }),
    ]);
    const [phoneData, appData, wabaData] = await Promise.all([
      phoneResponse.json().catch(() => ({})) as Promise<MetaPhoneNumberResponse>,
      appResponse.json().catch(() => ({})) as Promise<MetaAppResponse>,
      wabaResponse.json().catch(() => ({})) as Promise<MetaSubscribedAppsResponse>,
    ]);
    const identityMatches = phoneData.id === connection.phoneNumberId;

    let appSubscriptionResponse: Response | null = null;
    let appSubscriptions: MetaAppSubscriptionsResponse = {};
    if (appResponse.ok && appData.id) {
      const appSubscriptionsUrl = new URL(
        `${config.graphApiVersion}/${encodeURIComponent(appData.id)}/subscriptions`,
        "https://graph.facebook.com",
      );
      appSubscriptionResponse = await fetch(appSubscriptionsUrl, {
        headers: { Authorization: `Bearer ${appData.id}|${config.appSecret}` },
        signal: controller.signal,
      });
      appSubscriptions = (await appSubscriptionResponse
        .json()
        .catch(() => ({}))) as MetaAppSubscriptionsResponse;
    }

    const whatsappSubscription = appSubscriptions.data?.find(
      (subscription) => subscription.object === "whatsapp_business_account",
    );
    const subscribedFields = (whatsappSubscription?.fields ?? []).map((field) =>
      typeof field === "string" ? field : field.name || "",
    );
    const callbackUrl = whatsappSubscription?.callback_url?.trim() || null;
    const subscriptionError =
      appData.error || wabaData.error || appSubscriptions.error || undefined;
    const wabaSubscribed = wabaResponse.ok && Boolean(wabaData.data?.length);
    const callbackConfigured = Boolean(callbackUrl);
    const callbackMatches = callbackUrl
      ? normalizeUrl(callbackUrl) === normalizeUrl(expectedCallbackUrl)
      : false;
    const messagesSubscribed = subscribedFields.includes("messages");
    const active = whatsappSubscription?.active !== false && Boolean(whatsappSubscription);

    return {
      checkedAt,
      connection,
      configComplete: true,
      missingConfigKeys: [],
      meta: {
        ok: phoneResponse.ok && identityMatches,
        status: phoneResponse.status,
        identityMatches,
        displayNumberPresent: Boolean(phoneData.display_phone_number),
        verifiedName: phoneData.verified_name?.trim() || null,
        qualityRating: phoneData.quality_rating?.trim() || null,
        codeVerificationStatus: phoneData.code_verification_status?.trim() || null,
        errorCode: phoneData.error?.code == null ? null : String(phoneData.error.code),
        errorMessage: phoneResponse.ok
          ? null
          : sanitizeExternalErrorMessage(phoneData.error?.message, "Meta connection check failed"),
      },
      subscription: {
        ok:
          appResponse.ok &&
          wabaResponse.ok &&
          Boolean(appSubscriptionResponse?.ok) &&
          wabaSubscribed &&
          callbackMatches &&
          messagesSubscribed &&
          active,
        expectedCallbackUrl,
        appId: appData.id?.trim() || null,
        appName: appData.name?.trim() || null,
        appStatus: appSubscriptionResponse?.status ?? appResponse.status,
        wabaStatus: wabaResponse.status,
        wabaSubscribed,
        callbackConfigured,
        callbackMatches,
        messagesSubscribed,
        active,
        callbackUrl,
        errorCode: subscriptionError?.code == null ? null : String(subscriptionError.code),
        errorMessage: subscriptionError
          ? sanitizeExternalErrorMessage(
              subscriptionError.message,
              "Meta webhook subscription check failed",
            )
          : null,
      },
    };
  } catch (error) {
    return {
      checkedAt,
      connection,
      configComplete: true,
      missingConfigKeys: [],
      meta: emptyMetaHealth(
        sanitizeExternalErrorMessage(
          error instanceof Error ? error.message : undefined,
          "Meta connection check failed",
        ),
      ),
      subscription: emptySubscriptionHealth(
        expectedCallbackUrl,
        sanitizeExternalErrorMessage(
          error instanceof Error ? error.message : undefined,
          "Meta webhook subscription check failed",
        ),
      ),
    };
  } finally {
    clearTimeout(timeout);
  }
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
    webhookPath: connection.webhook_path,
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

function emptyMetaHealth(errorMessage: string): WhatsAppConnectionHealth["meta"] {
  return {
    ok: false,
    status: null,
    identityMatches: false,
    displayNumberPresent: false,
    verifiedName: null,
    qualityRating: null,
    codeVerificationStatus: null,
    errorCode: null,
    errorMessage,
  };
}

function emptySubscriptionHealth(
  expectedCallbackUrl: string,
  errorMessage: string,
): WhatsAppConnectionHealth["subscription"] {
  return {
    ok: false,
    expectedCallbackUrl,
    appId: null,
    appName: null,
    appStatus: null,
    wabaStatus: null,
    wabaSubscribed: false,
    callbackConfigured: false,
    callbackMatches: false,
    messagesSubscribed: false,
    active: false,
    callbackUrl: null,
    errorCode: null,
    errorMessage,
  };
}

function getExpectedWebhookUrl(connection: ReviewConnectionSummary) {
  const siteUrl = process.env.PUBLIC_SITE_URL || "https://www.doubleacode.com";
  const webhookPath =
    connection.webhookPath ||
    (connection.configSuffix === "2" ? "/api/connect/whatsapp/webhook" : "/api/whatsapp/webhook");
  return new URL(webhookPath, siteUrl).toString();
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/$/, "").toLowerCase();
}
