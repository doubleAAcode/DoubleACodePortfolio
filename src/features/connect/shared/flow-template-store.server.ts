import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import {
  createDefaultFlowDefinition,
  flowToBotFlowSettings,
  type FlowCategory,
  type FlowDefinition,
  type FlowTemplateStatus,
  type FlowValidationResult,
} from "./flow-template-types";
import { validateFlowForEditor } from "./flow-editor";
import { withCanonicalFlowDocument } from "./flow-document";
import { flowDiagnosticsToLegacyResult, validateFlow } from "./flow-validation";

export type FlowTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: FlowCategory;
  status: FlowTemplateStatus;
  created_by_admin_user_id: string;
  created_at: string;
  updated_at: string;
};

export type FlowTemplateVersionRow = {
  id: string;
  template_id: string;
  version_number: number;
  status: FlowTemplateStatus;
  flow_json: FlowDefinition;
  validation_result: FlowValidationResult;
  created_by_admin_user_id: string;
  published_at: string | null;
  created_at: string;
};

export type BusinessFlowRow = {
  id: string;
  business_id: string;
  source_template_id: string | null;
  name: string;
  status: FlowTemplateStatus;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessFlowVersionRow = {
  id: string;
  business_flow_id: string;
  version_number: number;
  status: FlowTemplateStatus;
  flow_json: FlowDefinition;
  validation_result: FlowValidationResult;
  created_by_user_id: string;
  published_at: string | null;
  created_at: string;
};

export type FlowTemplateDetails = {
  template: FlowTemplateRow;
  versions: FlowTemplateVersionRow[];
};

export type BusinessFlowDetails = {
  flow: BusinessFlowRow | null;
  versions: BusinessFlowVersionRow[];
  activeVersion: BusinessFlowVersionRow | null;
};

export type ActiveBusinessFlow = {
  businessFlowId: string;
  flowVersionId: string;
  versionNumber: number;
  flow: FlowDefinition;
};

const memoryTemplates = new Map<string, FlowTemplateRow>();
const memoryTemplateVersions = new Map<string, FlowTemplateVersionRow>();
const memoryBusinessFlows = new Map<string, BusinessFlowRow>();
const memoryBusinessFlowVersions = new Map<string, BusinessFlowVersionRow>();

export async function ensureDefaultFlowTemplates(adminUser = "system") {
  for (const category of ["ECOMMERCE", "RESTAURANT", "GREETING_STORE_INFO"] as FlowCategory[]) {
    const flow = createDefaultFlowDefinition(category);
    const templateId = flow.id;
    const existing = await getFlowTemplateDetails(templateId).catch(() => null);
    if (
      existing?.template.status === "PUBLISHED" &&
      existing.versions.some((version) => version.status === "PUBLISHED")
    ) {
      continue;
    }

    await createFlowTemplate({
      input: {
        id: templateId,
        name: flow.name,
        description: `${flow.name} deterministic WhatsApp store flow.`,
        category,
        flowJson: flow,
        publish: true,
      },
      adminUser,
    });
  }
}

export async function listFlowTemplates() {
  await ensureDefaultFlowTemplates();
  if (!isServerSupabaseConfigured()) {
    return [...memoryTemplates.values()].sort(sortUpdatedDesc);
  }
  return supabaseServerRest<FlowTemplateRow[]>(
    "/wa_flow_templates?select=*&order=updated_at.desc",
  ).catch((error) => {
    if (isMissingFlowTable(error)) return [];
    throw error;
  });
}

export async function getFlowTemplateDetails(templateId: string): Promise<FlowTemplateDetails> {
  const templates = await listTemplatesByIds(getTemplateIdCandidates(templateId));
  const template = templates[0];
  if (!template) throw new Error("Flow template was not found.");
  const versions = await listTemplateVersions(template.id);
  return { template, versions };
}

export async function createFlowTemplate({
  input,
  adminUser,
}: {
  input: {
    id?: string;
    name: string;
    description?: string;
    category: FlowCategory;
    flowJson?: FlowDefinition;
    publish?: boolean;
  };
  adminUser: string;
}) {
  const flow = withCanonicalFlowDocument(
    input.flowJson ?? createDefaultFlowDefinition(input.category),
  );
  const validation = validateForPersistence(flow, input.publish ? "publish" : "draft");
  if (input.publish && !validation.ok) throw new Error(formatValidationError(validation));
  const templateId = templateSlug(input.id || input.name || flow.id);
  const now = new Date().toISOString();
  const template: FlowTemplateRow = {
    id: templateId,
    name: input.name || flow.name,
    description: input.description || null,
    category: input.category,
    status: input.publish ? "PUBLISHED" : "DRAFT",
    created_by_admin_user_id: adminUser,
    created_at: now,
    updated_at: now,
  };
  const version: FlowTemplateVersionRow = {
    id: `${templateId}-v1`,
    template_id: templateId,
    version_number: 1,
    status: input.publish ? "PUBLISHED" : "DRAFT",
    flow_json: flow,
    validation_result: validation,
    created_by_admin_user_id: adminUser,
    published_at: input.publish ? now : null,
    created_at: now,
  };

  if (!isServerSupabaseConfigured()) {
    memoryTemplates.set(template.id, template);
    memoryTemplateVersions.set(version.id, version);
    return getFlowTemplateDetails(template.id);
  }

  await supabaseServerRest("/wa_flow_templates?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(template),
  });
  await supabaseServerRest("/wa_flow_template_versions?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(version),
  });
  return getFlowTemplateDetails(template.id);
}

export async function saveTemplateDraftVersion({
  templateId,
  flowJson,
  adminUser,
}: {
  templateId: string;
  flowJson: FlowDefinition;
  adminUser: string;
}) {
  const flow = withCanonicalFlowDocument(flowJson);
  const saveValidation = validateForPersistence(flow, "save");
  if (!saveValidation.ok) throw new Error(formatValidationError(saveValidation));
  const validation = validateForPersistence(flow, "draft");
  const versions = await listTemplateVersions(templateId);
  const draft = versions.find((version) => version.status === "DRAFT");
  const versionNumber =
    draft?.version_number ?? Math.max(0, ...versions.map((version) => version.version_number)) + 1;
  const version: FlowTemplateVersionRow = {
    id: draft?.id ?? `${templateId}-v${versionNumber}`,
    template_id: templateId,
    version_number: versionNumber,
    status: "DRAFT",
    flow_json: flow,
    validation_result: validation,
    created_by_admin_user_id: adminUser,
    published_at: null,
    created_at: draft?.created_at ?? new Date().toISOString(),
  };
  await upsertTemplateVersion(version);
  return getFlowTemplateDetails(templateId);
}

export async function publishTemplateVersion({
  templateId,
  versionId,
}: {
  templateId: string;
  versionId: string;
}) {
  const version = (await listTemplateVersions(templateId)).find((entry) => entry.id === versionId);
  if (!version) throw new Error("Template version was not found.");
  const flow = withCanonicalFlowDocument(version.flow_json);
  const validation = validateForPersistence(flow, "publish");
  if (!validation.ok) throw new Error(formatValidationError(validation));
  const now = new Date().toISOString();
  const versionNumber =
    Math.max(0, ...(await listTemplateVersions(templateId)).map((entry) => entry.version_number)) +
    1;
  const publishedVersion: FlowTemplateVersionRow = {
    id: `${templateId}-v${versionNumber}`,
    template_id: templateId,
    version_number: versionNumber,
    status: "PUBLISHED",
    flow_json: flow,
    validation_result: validation,
    created_by_admin_user_id: version.created_by_admin_user_id,
    published_at: now,
    created_at: now,
  };
  await upsertTemplateVersion(publishedVersion);
  await archiveOtherTemplateVersions(templateId, publishedVersion.id);
  await updateTemplateStatus(templateId, "PUBLISHED");
  return getFlowTemplateDetails(templateId);
}

export async function cloneTemplateToBusiness({
  businessId,
  templateId,
  adminUser,
  publish = false,
}: {
  businessId: string;
  templateId: string;
  adminUser: string;
  publish?: boolean;
}) {
  const template = await getFlowTemplateDetails(templateId);
  const sourceVersion = template.versions.find((version) => version.status === "PUBLISHED");
  if (!sourceVersion) throw new Error("Template has no published version to clone.");
  const flowJson = withCanonicalFlowDocument(sourceVersion.flow_json);
  const validation = validateForPersistence(flowJson, publish ? "publish" : "draft");
  if (!validation.ok) throw new Error(formatValidationError(validation));
  const now = new Date().toISOString();
  const existingFlow = (await listBusinessFlows(businessId))[0] ?? null;
  const existingVersions = existingFlow ? await listBusinessFlowVersions(existingFlow.id) : [];
  const flowId = existingFlow?.id ?? `bf-${slug(businessId)}`;
  const versionNumber = publish
    ? Math.max(0, ...existingVersions.map((version) => version.version_number)) + 1
    : Math.max(0, ...existingVersions.map((version) => version.version_number)) + 1;
  const versionId = `${flowId}-v${versionNumber}`;
  const flow: BusinessFlowRow = {
    id: flowId,
    business_id: businessId,
    source_template_id: template.template.id,
    name: `${template.template.name} for ${businessId}`,
    status: publish ? "PUBLISHED" : (existingFlow?.status ?? "DRAFT"),
    active_version_id: publish ? null : (existingFlow?.active_version_id ?? null),
    created_at: existingFlow?.created_at ?? now,
    updated_at: now,
  };
  const version: BusinessFlowVersionRow = {
    id: versionId,
    business_flow_id: flowId,
    version_number: versionNumber,
    status: publish ? "PUBLISHED" : "DRAFT",
    flow_json: flowJson,
    validation_result: validation,
    created_by_user_id: adminUser,
    published_at: publish ? now : null,
    created_at: now,
  };
  await upsertBusinessFlow(flow);
  if (!publish) {
    await archiveBusinessDraftVersions(flowId);
  }
  await upsertBusinessFlowVersion(version);
  if (publish) {
    await archiveOtherBusinessVersions(flowId, versionId);
    await upsertBusinessFlow({ ...flow, active_version_id: versionId, updated_at: now });
  }
  return getBusinessFlowDetails(businessId);
}

export async function getBusinessFlowDetails(businessId: string): Promise<BusinessFlowDetails> {
  let flows = await listBusinessFlows(businessId);
  if (!flows[0] && isLegacyTestBusiness(businessId)) {
    await ensureDefaultFlowTemplates();
    await cloneTemplateToBusiness({
      businessId,
      templateId: "ecommerce",
      adminUser: "system",
      publish: true,
    });
    flows = await listBusinessFlows(businessId);
  }
  const flow = flows[0] ?? null;
  if (!flow) return { flow: null, versions: [], activeVersion: null };
  const versions = await listBusinessFlowVersions(flow.id);
  return {
    flow,
    versions,
    activeVersion: versions.find((version) => version.id === flow.active_version_id) ?? null,
  };
}

export async function saveBusinessFlowDraft({
  businessId,
  flowJson,
  adminUser,
  flowName,
}: {
  businessId: string;
  flowJson: FlowDefinition;
  adminUser: string;
  flowName?: string;
}) {
  let details = await getBusinessFlowDetails(businessId);
  const now = new Date().toISOString();
  if (!details.flow) {
    const flowId = `bf-${slug(businessId)}`;
    await upsertBusinessFlow({
      id: flowId,
      business_id: businessId,
      source_template_id: null,
      name: flowName?.trim() || flowJson.name || "Custom WhatsApp conversation",
      status: "DRAFT",
      active_version_id: null,
      created_at: now,
      updated_at: now,
    });
    details = await getBusinessFlowDetails(businessId);
  } else if (flowName?.trim() && flowName.trim() !== details.flow.name) {
    await upsertBusinessFlow({
      ...details.flow,
      name: flowName.trim(),
      updated_at: now,
    });
    details = await getBusinessFlowDetails(businessId);
  }
  if (!details.flow) throw new Error("Business flow could not be created.");
  const flow = withCanonicalFlowDocument(flowJson);
  const saveValidation = validateForPersistence(flow, "save");
  if (!saveValidation.ok) throw new Error(formatValidationError(saveValidation));
  const validation = validateForPersistence(flow, "draft");
  const draft = details.versions.find((version) => version.status === "DRAFT");
  const versionNumber =
    draft?.version_number ??
    Math.max(0, ...details.versions.map((version) => version.version_number)) + 1;
  const version: BusinessFlowVersionRow = {
    id: draft?.id ?? `${details.flow.id}-v${versionNumber}`,
    business_flow_id: details.flow.id,
    version_number: versionNumber,
    status: "DRAFT",
    flow_json: flow,
    validation_result: validation,
    created_by_user_id: adminUser,
    published_at: null,
    created_at: draft?.created_at ?? now,
  };
  await upsertBusinessFlowVersion(version);
  return getBusinessFlowDetails(businessId);
}

export async function publishBusinessFlowVersion({
  businessId,
  versionId,
}: {
  businessId: string;
  versionId: string;
}) {
  const details = await getBusinessFlowDetails(businessId);
  if (!details.flow) throw new Error("Business flow was not found.");
  const version = details.versions.find((entry) => entry.id === versionId);
  if (!version) throw new Error("Business flow version was not found.");
  const flow = withCanonicalFlowDocument(version.flow_json);
  const validation = validateForPersistence(flow, "publish");
  if (!validation.ok) throw new Error(formatValidationError(validation));
  const now = new Date().toISOString();
  const versionNumber = Math.max(0, ...details.versions.map((entry) => entry.version_number)) + 1;
  const publishedVersion: BusinessFlowVersionRow = {
    id: `${details.flow.id}-v${versionNumber}`,
    business_flow_id: details.flow.id,
    version_number: versionNumber,
    status: "PUBLISHED",
    flow_json: flow,
    validation_result: validation,
    created_by_user_id: version.created_by_user_id,
    published_at: now,
    created_at: now,
  };
  await upsertBusinessFlowVersion(publishedVersion);
  await archiveOtherBusinessVersions(details.flow.id, publishedVersion.id);
  await upsertBusinessFlow({
    ...details.flow,
    status: "PUBLISHED",
    active_version_id: publishedVersion.id,
    updated_at: now,
  });
  return getBusinessFlowDetails(businessId);
}

export async function getActiveBusinessFlow(
  businessId: string,
): Promise<ActiveBusinessFlow | null> {
  const details = await getBusinessFlowDetails(businessId);
  if (!details.flow || !details.activeVersion) return null;
  if (details.flow.status !== "PUBLISHED" || details.activeVersion.status !== "PUBLISHED") {
    return null;
  }
  const flow = withCanonicalFlowDocument(details.activeVersion.flow_json);
  const validation = validateForPersistence(flow, "publish");
  if (!validation.ok) return null;
  return {
    businessFlowId: details.flow.id,
    flowVersionId: details.activeVersion.id,
    versionNumber: details.activeVersion.version_number,
    flow,
  };
}

export async function getBusinessFlowVersion({
  businessId,
  versionId,
}: {
  businessId: string;
  versionId: string;
}): Promise<ActiveBusinessFlow | null> {
  const details = await getBusinessFlowDetails(businessId);
  if (!details.flow) return null;
  const version = details.versions.find((entry) => entry.id === versionId);
  if (!version) return null;
  const flow = withCanonicalFlowDocument(version.flow_json);
  const validation = validateForPersistence(flow, "publish");
  if (!validation.ok) return null;
  return {
    businessFlowId: details.flow.id,
    flowVersionId: version.id,
    versionNumber: version.version_number,
    flow,
  };
}

export async function getBusinessFlowRuntimeSettings(businessId: string) {
  const activeFlow = await getActiveBusinessFlow(businessId);
  return activeFlow ? flowToBotFlowSettings(businessId, activeFlow.flow) : null;
}

export function validateBusinessFlowJson(flowJson: unknown) {
  return validateForPersistence(flowJson, "draft");
}

function listTemplates(filter?: string) {
  if (!isServerSupabaseConfigured()) {
    const rows = [...memoryTemplates.values()];
    return Promise.resolve(filter ? rows.filter((row) => filter.includes(row.id)) : rows);
  }
  const suffix = filter ? `&${filter}` : "";
  return supabaseServerRest<FlowTemplateRow[]>(
    `/wa_flow_templates?select=*&order=updated_at.desc${suffix}`,
  ).catch((error) => {
    if (isMissingFlowTable(error)) return [];
    throw error;
  });
}

function listTemplatesByIds(ids: string[]) {
  if (!isServerSupabaseConfigured()) {
    return Promise.resolve([...memoryTemplates.values()].filter((row) => ids.includes(row.id)));
  }
  const encodedIds = ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
  return supabaseServerRest<FlowTemplateRow[]>(
    `/wa_flow_templates?select=*&id=in.(${encodedIds})`,
  ).catch((error) => {
    if (isMissingFlowTable(error)) return [];
    throw error;
  });
}

function listTemplateVersions(templateId: string) {
  if (!isServerSupabaseConfigured()) {
    return Promise.resolve(
      [...memoryTemplateVersions.values()]
        .filter((version) => version.template_id === templateId)
        .sort((a, b) => b.version_number - a.version_number),
    );
  }
  return supabaseServerRest<FlowTemplateVersionRow[]>(
    `/wa_flow_template_versions?select=*&template_id=eq.${encodeURIComponent(
      templateId,
    )}&order=version_number.desc`,
  ).catch((error) => {
    if (isMissingFlowTable(error)) return [];
    throw error;
  });
}

function listBusinessFlows(businessId: string) {
  if (!isServerSupabaseConfigured()) {
    return Promise.resolve(
      [...memoryBusinessFlows.values()].filter((flow) => flow.business_id === businessId),
    );
  }
  return supabaseServerRest<BusinessFlowRow[]>(
    `/wa_business_flows?select=*&business_id=eq.${encodeURIComponent(businessId)}&limit=1`,
  ).catch((error) => {
    if (isMissingFlowTable(error)) return [];
    throw error;
  });
}

function listBusinessFlowVersions(businessFlowId: string) {
  if (!isServerSupabaseConfigured()) {
    return Promise.resolve(
      [...memoryBusinessFlowVersions.values()]
        .filter((version) => version.business_flow_id === businessFlowId)
        .sort((a, b) => b.version_number - a.version_number),
    );
  }
  return supabaseServerRest<BusinessFlowVersionRow[]>(
    `/wa_business_flow_versions?select=*&business_flow_id=eq.${encodeURIComponent(
      businessFlowId,
    )}&order=version_number.desc`,
  ).catch((error) => {
    if (isMissingFlowTable(error)) return [];
    throw error;
  });
}

async function upsertTemplateVersion(version: FlowTemplateVersionRow) {
  if (!isServerSupabaseConfigured()) {
    memoryTemplateVersions.set(version.id, version);
    return;
  }
  await supabaseServerRest("/wa_flow_template_versions?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(version),
  });
}

async function upsertBusinessFlow(flow: BusinessFlowRow) {
  if (!isServerSupabaseConfigured()) {
    memoryBusinessFlows.set(flow.business_id, flow);
    return;
  }
  await supabaseServerRest("/wa_business_flows?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(flow),
  });
}

async function upsertBusinessFlowVersion(version: BusinessFlowVersionRow) {
  if (!isServerSupabaseConfigured()) {
    memoryBusinessFlowVersions.set(version.id, version);
    return;
  }
  await supabaseServerRest("/wa_business_flow_versions?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(version),
  });
}

async function updateTemplateStatus(templateId: string, status: FlowTemplateStatus) {
  if (!isServerSupabaseConfigured()) {
    const template = memoryTemplates.get(templateId);
    if (template) memoryTemplates.set(templateId, { ...template, status });
    return;
  }
  await supabaseServerRest(`/wa_flow_templates?id=eq.${encodeURIComponent(templateId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
}

async function archiveOtherTemplateVersions(templateId: string, exceptVersionId: string) {
  const versions = await listTemplateVersions(templateId);
  await Promise.all(
    versions
      .filter((version) => version.id !== exceptVersionId && version.status === "PUBLISHED")
      .map((version) => upsertTemplateVersion({ ...version, status: "ARCHIVED" })),
  );
}

async function archiveOtherBusinessVersions(businessFlowId: string, exceptVersionId: string) {
  const versions = await listBusinessFlowVersions(businessFlowId);
  await Promise.all(
    versions
      .filter((version) => version.id !== exceptVersionId && version.status === "PUBLISHED")
      .map((version) => upsertBusinessFlowVersion({ ...version, status: "ARCHIVED" })),
  );
}

async function archiveBusinessDraftVersions(businessFlowId: string) {
  const versions = await listBusinessFlowVersions(businessFlowId);
  await Promise.all(
    versions
      .filter((version) => version.status === "DRAFT")
      .map((version) => upsertBusinessFlowVersion({ ...version, status: "ARCHIVED" })),
  );
}

function sortUpdatedDesc(a: FlowTemplateRow, b: FlowTemplateRow) {
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function templateSlug(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  if (normalized === "standard-online-store") return "standard_online_store";
  if (normalized === "e-commerce" || normalized === "ecommerce") return "ecommerce";
  if (normalized === "restaurant") return "restaurant";
  if (normalized === "greeting-store-info") return "greeting_store_info";
  if (normalized === "jewelry-store") return "jewelry_store";
  if (normalized === "clothing-store") return "clothing_store";
  return normalized;
}

function getTemplateIdCandidates(templateId: string) {
  const clean = templateId.trim();
  return [
    ...new Set([clean, templateSlug(clean), clean.replace(/_/g, "-"), clean.replace(/-/g, "_")]),
  ].filter(Boolean);
}

function formatValidationError(validation: FlowValidationResult) {
  return validation.issues
    .filter((issue) => issue.severity === "ERROR")
    .map((issue) => issue.message)
    .join(" ");
}

function validateForPersistence(
  flowJson: unknown,
  mode: "save" | "draft" | "publish",
): FlowValidationResult {
  const canonicalValidation = validateFlow(flowJson, { mode });
  const canonicalResult = flowDiagnosticsToLegacyResult(canonicalValidation.diagnostics);
  if (mode !== "publish") return canonicalResult;
  const legacyResult = validateFlowForEditor(flowJson as FlowDefinition);
  return {
    ok: canonicalResult.ok && legacyResult.ok,
    issues: [...canonicalResult.issues, ...legacyResult.issues],
  };
}

function isMissingFlowTable(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("wa_flow_templates") ||
    message.includes("wa_flow_template_versions") ||
    message.includes("wa_business_flows") ||
    message.includes("wa_business_flow_versions") ||
    message.includes("relation")
  );
}

function isLegacyTestBusiness(businessId: string) {
  return businessId === "double-a-test-business" || businessId === "double-a-partner-test-business";
}
