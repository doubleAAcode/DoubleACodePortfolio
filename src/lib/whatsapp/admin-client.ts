import type { MetaTemplateRow, ReviewConnectionSummary } from "./app-review-demo.server";
import type { WaMessageEventRow } from "./message-events.server";
import type { SendResult } from "./sender.server";
import type {
  AdminBusinessDetails,
  AdminBusinessStatus,
  AdminBusinessSummary,
  AdminBusinessTemplate,
  AdminCheckoutSettingsInput,
  CreateAdminBusinessInput,
} from "./admin-store.server";
import type {
  BusinessFlowDetails,
  FlowTemplateDetails,
  FlowTemplateRow,
} from "./flow-template-store.server";
import type { FlowCategory, FlowDefinition } from "./flow-template-types";

export type InternalAdminSessionResult = {
  ok: boolean;
  configured: boolean;
  authenticated: boolean;
  session: { username: string } | null;
};

export type AdminOverview = {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  connectedWhatsAppNumbers: number;
  ordersToday: number;
  failedNotifications: number;
  unknownPhoneEvents: number;
  businessesWithConfigurationIssues: number;
  recentAudit: Array<{
    id: string;
    admin_user_id: string;
    business_id: string | null;
    action: string;
    target_type: string;
    target_id: string | null;
    created_at: string;
  }>;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getInternalAdminSession() {
  return apiFetch<InternalAdminSessionResult>("/api/wa-admin/session");
}

export async function loginInternalAdmin(username: string, password: string) {
  return apiFetch<{ ok: true }>("/api/wa-admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logoutInternalAdmin() {
  return apiFetch<{ ok: true }>("/api/wa-admin/logout", { method: "POST" });
}

export async function getAdminOverview() {
  const result = await apiFetch<ApiResult<AdminOverview>>("/api/wa-admin/overview");
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getAdminBusinesses() {
  const result = await apiFetch<ApiResult<AdminBusinessSummary[]>>("/api/wa-admin/businesses");
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function createAdminBusiness(input: CreateAdminBusinessInput) {
  const result = await apiFetch<ApiResult<AdminBusinessDetails>>("/api/wa-admin/businesses", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getAdminBusinessDetails(businessId: string) {
  const result = await apiFetch<ApiResult<AdminBusinessDetails>>(
    `/api/wa-admin/businesses/${encodeURIComponent(businessId)}`,
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function applyAdminBusinessAction(
  businessId: string,
  action:
    | { action: "set_status"; status: AdminBusinessStatus }
    | { action: "seed_defaults"; templateType: AdminBusinessTemplate }
    | { action: "assign_user"; email: string; role: "OWNER" | "MANAGER" | "STAFF" }
    | { action: "save_connection"; connection: CreateAdminBusinessInput["connection"] }
    | { action: "save_checkout_settings"; settings: AdminCheckoutSettingsInput }
    | { action: "clone_flow_template"; templateId: string }
    | { action: "save_business_flow_draft"; flowJson: FlowDefinition }
    | { action: "publish_business_flow"; versionId: string },
) {
  const result = await apiFetch<ApiResult<AdminBusinessDetails>>(
    `/api/wa-admin/businesses/${encodeURIComponent(businessId)}`,
    {
      method: "POST",
      body: JSON.stringify(action),
    },
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getFlowTemplates() {
  const result = await apiFetch<ApiResult<FlowTemplateRow[]>>("/api/wa-admin/flow-templates");
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function createFlowTemplate(input: {
  id?: string;
  name: string;
  description?: string;
  category: FlowCategory;
  flowJson?: FlowDefinition;
  publish?: boolean;
}) {
  const result = await apiFetch<ApiResult<FlowTemplateDetails>>("/api/wa-admin/flow-templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getFlowTemplateDetails(templateId: string) {
  const result = await apiFetch<ApiResult<FlowTemplateDetails>>(
    `/api/wa-admin/flow-templates/${encodeURIComponent(templateId)}`,
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function applyFlowTemplateAction(
  templateId: string,
  action:
    | { action: "save_draft"; flowJson: FlowDefinition }
    | { action: "publish_version"; versionId: string },
) {
  const result = await apiFetch<ApiResult<FlowTemplateDetails>>(
    `/api/wa-admin/flow-templates/${encodeURIComponent(templateId)}`,
    {
      method: "POST",
      body: JSON.stringify(action),
    },
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getBusinessFlowDetails(businessId: string) {
  const result = await apiFetch<ApiResult<BusinessFlowDetails>>(
    `/api/wa-admin/businesses/${encodeURIComponent(businessId)}/flow`,
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getAdminLogs(businessId?: string) {
  const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : "";
  const result = await apiFetch<ApiResult<{ webhooks: unknown[]; audit: unknown[] }>>(
    `/api/wa-admin/logs${query}`,
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getReviewConnections() {
  const result = await apiFetch<ApiResult<ReviewConnectionSummary[]>>(
    "/api/wa-admin/review-connections",
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getWaMessageEvents(input: { connectionId?: string; businessId?: string }) {
  const params = new URLSearchParams();
  if (input.connectionId) params.set("connectionId", input.connectionId);
  if (input.businessId) params.set("businessId", input.businessId);
  const query = params.toString() ? `?${params.toString()}` : "";
  const result = await apiFetch<ApiResult<WaMessageEventRow[]>>(
    `/api/wa-admin/message-events${query}`,
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function sendReviewWhatsAppMessage(input: {
  connectionId: string;
  recipientPhone: string;
  body: string;
}) {
  const result = await apiFetch<
    ApiResult<{
      connection: ReviewConnectionSummary;
      result: SendResult;
      sentAt: string;
    }>
  >("/api/wa-admin/send-review-message", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getWhatsAppTemplateSubmissions(input: {
  connectionId?: string;
  includeMeta?: boolean;
}) {
  const params = new URLSearchParams();
  if (input.connectionId) params.set("connectionId", input.connectionId);
  if (input.includeMeta) params.set("includeMeta", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const result = await apiFetch<
    ApiResult<{
      local: MetaTemplateRow[];
      meta: unknown;
    }>
  >(`/api/wa-admin/whatsapp-templates${query}`);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function createWhatsAppTemplateSubmission(input: {
  connectionId: string;
  name: string;
  language: string;
  category: string;
  body: string;
}) {
  const result = await apiFetch<
    ApiResult<{
      connection: ReviewConnectionSummary;
      template: MetaTemplateRow;
      metaResponse: unknown;
    }>
  >("/api/wa-admin/whatsapp-templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.error || data?.message || response.statusText);
  return data as T;
}
