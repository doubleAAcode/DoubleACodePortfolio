import type {
  MetaTemplateRow,
  ReviewConnectionSummary,
  WhatsAppConnectionHealth,
} from "./app-review-demo.server";
import type { WaMessageEventRow } from "./message-events.server";
import type { SendResult } from "./sender.server";
import type {
  AdminBusinessDetails,
  AdminBusinessStatus,
  AdminBusinessSummary,
  AdminBusinessTemplate,
  AdminCatalogValueProductsInput,
  AdminCatalogGroupInput,
  AdminCatalogGroupValueInput,
  AdminCategoryInput,
  AdminCheckoutSettingsInput,
  AdminProductCustomFieldInput,
  AdminProductInput,
  AdminProductOptionInput,
  AdminProductOptionValueInput,
  AdminProductVariantInput,
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

export type AdminConversationDiagnostics = {
  customerPhoneMasked: string;
  session: {
    currentStep: string;
    language?: "en" | "ar";
    businessFlowId?: string;
    flowVersionId?: string;
    currentNodeId?: string;
    context: Record<string, unknown>;
    flowVariables: Record<string, unknown>;
    lastCustomerMessageAt: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  events: WaMessageEventRow[];
  resetAt?: string;
};

export async function getInternalAdminSession() {
  return apiFetch<InternalAdminSessionResult>("/api/connect/admin/session");
}

export async function getAdminWhatsAppHealth(connectionId: string) {
  const result = await apiFetch<ApiResult<WhatsAppConnectionHealth>>(
    `/api/connect/admin/whatsapp-health?connectionId=${encodeURIComponent(connectionId)}`,
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function ensureAdminWhatsAppSubscription(connectionId: string) {
  const result = await apiFetch<ApiResult<WhatsAppConnectionHealth>>(
    "/api/connect/admin/whatsapp-health",
    {
      method: "POST",
      body: JSON.stringify({ connectionId }),
    },
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function loginInternalAdmin(username: string, password: string) {
  return apiFetch<{ ok: true }>("/api/connect/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logoutInternalAdmin() {
  return apiFetch<{ ok: true }>("/api/connect/admin/logout", { method: "POST" });
}

export async function getAdminOverview() {
  const result = await apiFetch<ApiResult<AdminOverview>>("/api/connect/admin/overview");
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getAdminBusinesses() {
  const result = await apiFetch<ApiResult<AdminBusinessSummary[]>>("/api/connect/admin/businesses");
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function createAdminBusiness(input: CreateAdminBusinessInput) {
  const result = await apiFetch<ApiResult<AdminBusinessDetails>>("/api/connect/admin/businesses", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getAdminBusinessDetails(businessId: string) {
  const result = await apiFetch<ApiResult<AdminBusinessDetails>>(
    `/api/connect/admin/businesses/${encodeURIComponent(businessId)}`,
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export type AdminBusinessSummaryResult = Awaited<ReturnType<typeof getAdminBusinesses>>[number];
export type AdminBusinessDetailsResult = Awaited<ReturnType<typeof getAdminBusinessDetails>>;

export async function applyAdminBusinessAction(
  businessId: string,
  action:
    | { action: "set_status"; status: AdminBusinessStatus }
    | { action: "seed_defaults"; templateType: AdminBusinessTemplate }
    | { action: "assign_user"; email: string; role: "OWNER" | "MANAGER" | "STAFF" }
    | { action: "save_connection"; connection: CreateAdminBusinessInput["connection"] }
    | { action: "save_checkout_settings"; settings: AdminCheckoutSettingsInput }
    | { action: "save_catalog_group"; group: AdminCatalogGroupInput }
    | { action: "delete_catalog_group"; groupId: string }
    | { action: "save_catalog_group_value"; value: AdminCatalogGroupValueInput }
    | { action: "delete_catalog_group_value"; valueId: string }
    | { action: "save_catalog_value_products"; assignment: AdminCatalogValueProductsInput }
    | { action: "save_admin_category"; category: AdminCategoryInput }
    | { action: "delete_admin_category"; categoryId: string }
    | { action: "save_admin_product"; product: AdminProductInput }
    | { action: "delete_admin_product"; productId: string }
    | { action: "save_admin_product_option"; option: AdminProductOptionInput }
    | { action: "delete_admin_product_option"; optionId: string }
    | { action: "save_admin_product_option_value"; optionValue: AdminProductOptionValueInput }
    | { action: "delete_admin_product_option_value"; optionValueId: string }
    | { action: "save_admin_product_variant"; variant: AdminProductVariantInput }
    | { action: "delete_admin_product_variant"; variantId: string }
    | { action: "save_admin_product_custom_field"; field: AdminProductCustomFieldInput }
    | { action: "delete_admin_product_custom_field"; fieldId: string }
    | { action: "clone_flow_template"; templateId: string }
    | {
        action: "save_business_flow_draft";
        flowJson: FlowDefinition;
        flowName?: string;
        versionId: string;
        expectedRevision: number;
      }
    | { action: "restore_business_flow_version"; versionId: string }
    | { action: "publish_business_flow"; versionId: string },
) {
  const result = await apiFetch<ApiResult<AdminBusinessDetails>>(
    `/api/connect/admin/businesses/${encodeURIComponent(businessId)}`,
    {
      method: "POST",
      body: JSON.stringify(action),
    },
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function inspectAdminCustomerConversation(businessId: string, customerPhone: string) {
  const result = await apiFetch<ApiResult<AdminConversationDiagnostics>>(
    `/api/connect/admin/businesses/${encodeURIComponent(businessId)}`,
    {
      method: "POST",
      body: JSON.stringify({
        action: "inspect_customer_conversation",
        customerPhone,
      }),
    },
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function resetAdminCustomerConversation(businessId: string, customerPhone: string) {
  const result = await apiFetch<ApiResult<AdminConversationDiagnostics>>(
    `/api/connect/admin/businesses/${encodeURIComponent(businessId)}`,
    {
      method: "POST",
      body: JSON.stringify({
        action: "reset_customer_conversation",
        customerPhone,
      }),
    },
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getFlowTemplates() {
  const result = await apiFetch<ApiResult<FlowTemplateRow[]>>("/api/connect/admin/flow-templates");
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
  const result = await apiFetch<ApiResult<FlowTemplateDetails>>(
    "/api/connect/admin/flow-templates",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getFlowTemplateDetails(templateId: string) {
  const result = await apiFetch<ApiResult<FlowTemplateDetails>>(
    `/api/connect/admin/flow-templates/${encodeURIComponent(templateId)}`,
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
    `/api/connect/admin/flow-templates/${encodeURIComponent(templateId)}`,
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
    `/api/connect/admin/businesses/${encodeURIComponent(businessId)}/flow`,
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function uploadAdminFlowImage(businessId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const result = await apiFetch<ApiResult<{ path: string; url: string }>>(
    `/api/connect/admin/businesses/${encodeURIComponent(businessId)}/flow-image`,
    {
      method: "POST",
      body: formData,
    },
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getAdminLogs(businessId?: string) {
  const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : "";
  const result = await apiFetch<ApiResult<{ webhooks: unknown[]; audit: unknown[] }>>(
    `/api/connect/admin/logs${query}`,
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getReviewConnections() {
  const result = await apiFetch<ApiResult<ReviewConnectionSummary[]>>(
    "/api/connect/admin/review-connections",
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
    `/api/connect/admin/message-events${query}`,
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function sendReviewWhatsAppMessage(input: {
  connectionId: string;
  recipientPhone: string;
  body?: string;
  templateName?: string;
  language?: string;
}) {
  const result = await apiFetch<
    ApiResult<{
      connection: ReviewConnectionSummary;
      result: SendResult;
      sentAt: string;
    }>
  >("/api/connect/admin/send-review-message", {
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
  >(`/api/connect/admin/whatsapp-templates${query}`);
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
  >("/api/connect/admin/whatsapp-templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const isFormData = init.body instanceof FormData;
  const response = await fetch(path, {
    ...init,
    headers: isFormData
      ? init.headers
      : {
          "Content-Type": "application/json",
          ...init.headers,
        },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.error || data?.message || response.statusText) as Error & {
      code?: string;
      status?: number;
    };
    error.code = typeof data?.code === "string" ? data.code : undefined;
    error.status = response.status;
    throw error;
  }
  return data as T;
}
