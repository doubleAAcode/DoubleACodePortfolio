import "@tanstack/react-start/server-only";

import {
  clearInternalAdminSessionCookie,
  createInternalAdminSessionCookie,
  getInternalAdminSessionFromRequest,
  isInternalAdminConfigured,
  validateInternalAdminCredentials,
} from "./admin-auth.server";
import {
  checkWhatsAppConnectionHealth,
  createWhatsAppMessageTemplate,
  ensureWhatsAppApplicationSubscription,
  getReviewConnection,
  listLocalMetaTemplates,
  listReviewConnections,
  listWhatsAppMessageTemplates,
  type ReviewConnectionSummary,
} from "./app-review-demo.server";
import { getWhatsAppServerConfig } from "./config.server";
import {
  deleteConversationSession,
  getActiveConversationSession,
} from "./conversation-store.server";
import { uploadWaFlowImage, uploadWaProductImage } from "./dashboard-store.server";
import { listWaMessageEvents } from "./message-events.server";
import { getCustomerPhoneLookupCandidates, maskCustomerIdentifier } from "./reliability";
import { sendWhatsAppTemplate, sendWhatsAppText } from "./sender.server";
import {
  assignBusinessUser,
  createAdminBusiness,
  deleteAdminCatalogGroup,
  deleteAdminCatalogGroupValue,
  deleteAdminCategory,
  deleteAdminProduct,
  deleteAdminProductCustomField,
  deleteAdminProductOption,
  deleteAdminProductOptionValue,
  deleteAdminProductVariant,
  getAdminBusinessDetails,
  getAdminBusinesses,
  getAdminLogs,
  getAdminOverview,
  seedDefaultBusinessData,
  saveAdminCatalogGroup,
  saveAdminCatalogGroupValue,
  saveAdminCatalogValueProducts,
  saveAdminCategory,
  saveAdminCheckoutSettings,
  saveAdminProduct,
  saveAdminProductCustomField,
  saveAdminProductOption,
  saveAdminProductOptionValue,
  saveAdminProductVariant,
  setAdminBusinessStatus,
  upsertAdminConnection,
  recordAdminAuditLog,
  type AdminCheckoutSettingsInput,
  type AdminCatalogValueProductsInput,
  type AdminCatalogGroupInput,
  type AdminCatalogGroupValueInput,
  type AdminCategoryInput,
  type AdminProductCustomFieldInput,
  type AdminProductInput,
  type AdminProductOptionInput,
  type AdminProductOptionValueInput,
  type AdminProductVariantInput,
  type AdminBusinessStatus,
  type AdminBusinessTemplate,
  type CreateAdminBusinessInput,
} from "./admin-store.server";
import {
  cloneTemplateToBusiness,
  createFlowTemplate,
  getBusinessFlowDetails,
  getFlowTemplateDetails,
  listFlowTemplates,
  FlowVersionActionError,
  publishBusinessFlowVersion,
  publishTemplateVersion,
  restoreBusinessFlowVersionToDraft,
  saveBusinessFlowDraft,
  saveTemplateDraftVersion,
  validateBusinessFlowJson,
} from "./flow-template-store.server";
import { validateFlowForEditor } from "./flow-editor";
import { FlowDraftConflictError } from "./flow-draft-conflict";
import type { FlowCategory, FlowDefinition } from "./flow-template-types";

export function createInternalAdminSessionHandlers() {
  return {
    GET: ({ request }: { request: Request }) => {
      const session = getInternalAdminSessionFromRequest(request);
      return Response.json({
        ok: true,
        configured: isInternalAdminConfigured(),
        authenticated: Boolean(session),
        session,
      });
    },
  };
}

export function createInternalAdminLoginHandlers() {
  return {
    POST: async ({ request }: { request: Request }) => {
      const body = (await request.json().catch(() => null)) as {
        username?: string;
        password?: string;
      } | null;
      if (!isInternalAdminConfigured()) {
        return Response.json(
          { ok: false, error: "Internal admin auth is not configured." },
          { status: 500 },
        );
      }

      const username = body?.username?.trim() || "";
      const password = body?.password || "";
      if (!validateInternalAdminCredentials(username, password)) {
        return Response.json({ ok: false, error: "Invalid admin credentials." }, { status: 401 });
      }

      return Response.json(
        { ok: true },
        { headers: { "Set-Cookie": createInternalAdminSessionCookie(username) } },
      );
    },
  };
}

export function createInternalAdminLogoutHandlers() {
  return {
    POST: () =>
      Response.json({ ok: true }, { headers: { "Set-Cookie": clearInternalAdminSessionCookie() } }),
  };
}

export function createInternalAdminOverviewHandlers() {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        const session = requireAdmin(request);
        const data = await getAdminOverview();
        return Response.json({ ok: true, data, session });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminBusinessesHandlers() {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        requireAdmin(request);
        const data = await getAdminBusinesses();
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
    POST: async ({ request }: { request: Request }) => {
      try {
        const session = requireAdmin(request);
        const input = (await request.json()) as CreateAdminBusinessInput;
        const data = await createAdminBusiness({ input, adminUser: session.username, request });
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminBusinessDetailsHandlers() {
  return {
    GET: async ({ request, params }: { request: Request; params: { businessId: string } }) => {
      try {
        requireAdmin(request);
        const data = await getAdminBusinessDetails(params.businessId);
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
    POST: async ({ request, params }: { request: Request; params: { businessId: string } }) => {
      try {
        const session = requireAdmin(request);
        const body = (await request.json().catch(() => null)) as {
          action?: string;
          status?: AdminBusinessStatus;
          templateType?: AdminBusinessTemplate;
          email?: string;
          role?: "OWNER" | "MANAGER" | "STAFF";
          connection?: CreateAdminBusinessInput["connection"];
          settings?: AdminCheckoutSettingsInput;
          group?: AdminCatalogGroupInput;
          groupId?: string;
          value?: AdminCatalogGroupValueInput;
          valueId?: string;
          assignment?: AdminCatalogValueProductsInput;
          category?: AdminCategoryInput;
          categoryId?: string;
          product?: AdminProductInput;
          productId?: string;
          option?: AdminProductOptionInput;
          optionId?: string;
          variant?: AdminProductVariantInput;
          variantId?: string;
          field?: AdminProductCustomFieldInput;
          fieldId?: string;
          optionValue?: AdminProductOptionValueInput;
          optionValueId?: string;
          templateId?: string;
          flowJson?: unknown;
          flowName?: string;
          versionId?: string;
          expectedRevision?: number;
          customerPhone?: string;
        } | null;

        if (body?.action === "set_status" && body.status) {
          const data = await setAdminBusinessStatus({
            businessId: params.businessId,
            status: body.status,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "seed_defaults") {
          const data = await seedDefaultBusinessData({
            businessId: params.businessId,
            templateType: body.templateType || "ecommerce",
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "assign_user" && body.email) {
          await assignBusinessUser({
            businessId: params.businessId,
            email: body.email,
            role: body.role || "OWNER",
            adminUser: session.username,
            request,
          });
          return Response.json({
            ok: true,
            data: await getAdminBusinessDetails(params.businessId),
          });
        }

        if (body?.action === "save_connection" && body.connection) {
          await upsertAdminConnection({
            businessId: params.businessId,
            input: body.connection,
            adminUser: session.username,
            request,
          });
          return Response.json({
            ok: true,
            data: await getAdminBusinessDetails(params.businessId),
          });
        }

        if (body?.action === "save_checkout_settings" && body.settings) {
          const data = await saveAdminCheckoutSettings({
            businessId: params.businessId,
            input: body.settings,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "save_catalog_group" && body.group) {
          const data = await saveAdminCatalogGroup({
            businessId: params.businessId,
            input: body.group as AdminCatalogGroupInput,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "delete_catalog_group" && body.groupId) {
          const data = await deleteAdminCatalogGroup({
            businessId: params.businessId,
            groupId: body.groupId,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "save_catalog_group_value" && body.value) {
          const data = await saveAdminCatalogGroupValue({
            businessId: params.businessId,
            input: body.value as AdminCatalogGroupValueInput,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "delete_catalog_group_value" && body.valueId) {
          const data = await deleteAdminCatalogGroupValue({
            businessId: params.businessId,
            valueId: body.valueId,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "save_catalog_value_products" && body.assignment) {
          const data = await saveAdminCatalogValueProducts({
            businessId: params.businessId,
            input: body.assignment as AdminCatalogValueProductsInput,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "save_admin_category" && body.category) {
          const data = await saveAdminCategory({
            businessId: params.businessId,
            input: body.category as AdminCategoryInput,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "delete_admin_category" && body.categoryId) {
          const data = await deleteAdminCategory({
            businessId: params.businessId,
            categoryId: body.categoryId,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "save_admin_product" && body.product) {
          const data = await saveAdminProduct({
            businessId: params.businessId,
            input: body.product as AdminProductInput,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "delete_admin_product" && body.productId) {
          const data = await deleteAdminProduct({
            businessId: params.businessId,
            productId: body.productId,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "save_admin_product_option" && body.option) {
          const data = await saveAdminProductOption({
            businessId: params.businessId,
            input: body.option as AdminProductOptionInput,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "delete_admin_product_option" && body.optionId) {
          const data = await deleteAdminProductOption({
            businessId: params.businessId,
            optionId: body.optionId,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "save_admin_product_option_value" && body.optionValue) {
          const data = await saveAdminProductOptionValue({
            businessId: params.businessId,
            input: body.optionValue as AdminProductOptionValueInput,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "delete_admin_product_option_value" && body.optionValueId) {
          const data = await deleteAdminProductOptionValue({
            businessId: params.businessId,
            valueId: body.optionValueId,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "save_admin_product_variant" && body.variant) {
          const data = await saveAdminProductVariant({
            businessId: params.businessId,
            input: body.variant as AdminProductVariantInput,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "delete_admin_product_variant" && body.variantId) {
          const data = await deleteAdminProductVariant({
            businessId: params.businessId,
            variantId: body.variantId,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "save_admin_product_custom_field" && body.field) {
          const data = await saveAdminProductCustomField({
            businessId: params.businessId,
            input: body.field as AdminProductCustomFieldInput,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "delete_admin_product_custom_field" && body.fieldId) {
          const data = await deleteAdminProductCustomField({
            businessId: params.businessId,
            fieldId: body.fieldId,
            adminUser: session.username,
            request,
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "clone_flow_template" && body.templateId) {
          const data = await cloneTemplateToBusiness({
            businessId: params.businessId,
            templateId: body.templateId,
            adminUser: session.username,
          });
          await recordAdminAuditLog({
            adminUser: session.username,
            request,
            businessId: params.businessId,
            action: "FLOW_TEMPLATE_CLONED_TO_BUSINESS",
            targetType: "BUSINESS_FLOW",
            targetId: data.flow?.id,
            newValue: { templateId: body.templateId, activeVersionId: data.activeVersion?.id },
          });
          return Response.json({
            ok: true,
            data: await getAdminBusinessDetails(params.businessId),
          });
        }

        if (body?.action === "save_business_flow_draft" && body.flowJson) {
          if (
            !body.versionId?.trim() ||
            typeof body.expectedRevision !== "number" ||
            !Number.isSafeInteger(body.expectedRevision) ||
            body.expectedRevision < 1
          ) {
            return Response.json(
              { ok: false, error: "A valid draft version and revision are required." },
              { status: 400 },
            );
          }
          const validation = validateBusinessFlowJson(body.flowJson);
          const data = await saveBusinessFlowDraft({
            businessId: params.businessId,
            flowJson: body.flowJson as never,
            adminUser: session.username,
            flowName: typeof body.flowName === "string" ? body.flowName : undefined,
            versionId: body.versionId,
            expectedRevision: body.expectedRevision,
          });
          await recordAdminAuditLog({
            adminUser: session.username,
            request,
            businessId: params.businessId,
            action: "BUSINESS_FLOW_EDITED",
            targetType: "BUSINESS_FLOW",
            targetId: data.flow?.id,
            newValue: { validation },
          });
          return Response.json({
            ok: true,
            data: await getAdminBusinessDetails(params.businessId),
          });
        }

        if (body?.action === "publish_business_flow" && body.versionId) {
          const data = await publishBusinessFlowVersion({
            businessId: params.businessId,
            versionId: body.versionId,
          });
          await recordAdminAuditLog({
            adminUser: session.username,
            request,
            businessId: params.businessId,
            action: "BUSINESS_FLOW_PUBLISHED",
            targetType: "BUSINESS_FLOW_VERSION",
            targetId: body.versionId,
            newValue: { activeVersionId: data.activeVersion?.id },
          });
          return Response.json({
            ok: true,
            data: await getAdminBusinessDetails(params.businessId),
          });
        }

        if (body?.action === "restore_business_flow_version" && body.versionId) {
          const data = await restoreBusinessFlowVersionToDraft({
            businessId: params.businessId,
            versionId: body.versionId,
            adminUser: session.username,
          });
          const draft = data.versions.find((version) => version.status === "DRAFT");
          await recordAdminAuditLog({
            adminUser: session.username,
            request,
            businessId: params.businessId,
            action: "BUSINESS_FLOW_VERSION_RESTORED",
            targetType: "BUSINESS_FLOW_VERSION",
            targetId: draft?.id,
            newValue: {
              sourceVersionId: body.versionId,
              draftVersionId: draft?.id,
              activeVersionId: data.activeVersion?.id,
            },
          });
          return Response.json({
            ok: true,
            data: await getAdminBusinessDetails(params.businessId),
          });
        }

        if (body?.action === "inspect_customer_conversation" && body.customerPhone) {
          const customerPhone = String(body.customerPhone).trim();
          const candidates = getCustomerPhoneLookupCandidates(customerPhone);
          const [sessionMatches, eventGroups] = await Promise.all([
            Promise.all(
              candidates.map(async (candidate) => ({
                customerPhone: candidate,
                session: await getActiveConversationSession({
                  businessId: params.businessId,
                  customerPhone: candidate,
                }),
              })),
            ),
            Promise.all(
              candidates.map((candidate) =>
                listWaMessageEvents({
                  businessId: params.businessId,
                  customerPhone: candidate,
                  limit: 75,
                }),
              ),
            ),
          ]);
          const sessionMatch =
            sessionMatches.find((match) => Boolean(match.session)) ?? sessionMatches[0];
          const sessionData = sessionMatch?.session;
          const events = mergeMessageEvents(eventGroups, 75);
          await recordAdminAuditLog({
            adminUser: session.username,
            request,
            businessId: params.businessId,
            action: "CUSTOMER_CONVERSATION_INSPECTED",
            targetType: "WA_CONVERSATION_SESSION",
            targetId: maskCustomerIdentifier(customerPhone),
          });
          return Response.json({
            ok: true,
            data: {
              customerPhoneMasked: maskCustomerIdentifier(customerPhone),
              matchedCustomerPhoneMasked:
                sessionMatch && sessionMatch.customerPhone !== customerPhone
                  ? maskCustomerIdentifier(sessionMatch.customerPhone)
                  : undefined,
              lookupCandidatesMasked: candidates.map(maskCustomerIdentifier),
              session: sessionData
                ? {
                    currentStep: sessionData.currentStep,
                    language: sessionData.language,
                    businessFlowId: sessionData.businessFlowId,
                    flowVersionId: sessionData.flowVersionId,
                    currentNodeId: sessionData.currentNodeId,
                    context: sessionData.context,
                    flowVariables: sessionData.flowVariables,
                    lastCustomerMessageAt: sessionData.lastCustomerMessageAt,
                    expiresAt: sessionData.expiresAt,
                    createdAt: sessionData.createdAt,
                    updatedAt: sessionData.updatedAt,
                  }
                : null,
              events,
            },
          });
        }

        if (body?.action === "reset_customer_conversation" && body.customerPhone) {
          const customerPhone = String(body.customerPhone).trim();
          const candidates = getCustomerPhoneLookupCandidates(customerPhone);
          await Promise.all(
            candidates.map((candidate) =>
              deleteConversationSession({
                businessId: params.businessId,
                customerPhone: candidate,
              }),
            ),
          );
          const eventGroups = await Promise.all(
            candidates.map((candidate) =>
              listWaMessageEvents({
                businessId: params.businessId,
                customerPhone: candidate,
                limit: 25,
              }),
            ),
          );
          const events = mergeMessageEvents(eventGroups, 25);
          await recordAdminAuditLog({
            adminUser: session.username,
            request,
            businessId: params.businessId,
            action: "CUSTOMER_CONVERSATION_RESET",
            targetType: "WA_CONVERSATION_SESSION",
            targetId: maskCustomerIdentifier(customerPhone),
          });
          return Response.json({
            ok: true,
            data: {
              customerPhoneMasked: maskCustomerIdentifier(customerPhone),
              lookupCandidatesMasked: candidates.map(maskCustomerIdentifier),
              session: null,
              events,
              resetAt: new Date().toISOString(),
            },
          });
        }

        return Response.json({ ok: false, error: "Unsupported admin action." }, { status: 400 });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

function mergeMessageEvents(
  eventGroups: Awaited<ReturnType<typeof listWaMessageEvents>>[],
  limit: number,
) {
  const eventsById = new Map<string, Awaited<ReturnType<typeof listWaMessageEvents>>[number]>();
  for (const events of eventGroups) {
    for (const event of events) {
      eventsById.set(event.id, event);
    }
  }
  return Array.from(eventsById.values())
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, limit);
}

export function createInternalAdminFlowTemplatesHandlers() {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        requireAdmin(request);
        const data = await listFlowTemplates();
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
    POST: async ({ request }: { request: Request }) => {
      try {
        const session = requireAdmin(request);
        const body = (await request.json().catch(() => null)) as {
          id?: string;
          name?: string;
          description?: string;
          category?: FlowCategory;
          flowJson?: unknown;
          publish?: boolean;
        } | null;
        const data = await createFlowTemplate({
          input: {
            id: body?.id,
            name: body?.name || "Untitled flow template",
            description: body?.description,
            category: body?.category || "ECOMMERCE",
            flowJson: body?.flowJson as never,
            publish: Boolean(body?.publish),
          },
          adminUser: session.username,
        });
        await recordAdminAuditLog({
          adminUser: session.username,
          request,
          action: "FLOW_TEMPLATE_CREATED",
          targetType: "FLOW_TEMPLATE",
          targetId: data.template.id,
          newValue: { category: data.template.category, status: data.template.status },
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminFlowTemplateDetailsHandlers() {
  return {
    GET: async ({ request, params }: { request: Request; params: { templateId: string } }) => {
      try {
        requireAdmin(request);
        const data = await getFlowTemplateDetails(params.templateId);
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
    POST: async ({ request, params }: { request: Request; params: { templateId: string } }) => {
      try {
        const session = requireAdmin(request);
        const body = (await request.json().catch(() => null)) as {
          action?: string;
          flowJson?: unknown;
          versionId?: string;
        } | null;

        if (body?.action === "save_draft" && body.flowJson) {
          const data = await saveTemplateDraftVersion({
            templateId: params.templateId,
            flowJson: body.flowJson as never,
            adminUser: session.username,
          });
          await recordAdminAuditLog({
            adminUser: session.username,
            request,
            action: "FLOW_TEMPLATE_EDITED",
            targetType: "FLOW_TEMPLATE",
            targetId: params.templateId,
            newValue: { validation: validateFlowForEditor(body.flowJson as FlowDefinition) },
          });
          return Response.json({ ok: true, data });
        }

        if (body?.action === "publish_version" && body.versionId) {
          const data = await publishTemplateVersion({
            templateId: params.templateId,
            versionId: body.versionId,
          });
          await recordAdminAuditLog({
            adminUser: session.username,
            request,
            action: "FLOW_TEMPLATE_VERSION_PUBLISHED",
            targetType: "FLOW_TEMPLATE_VERSION",
            targetId: body.versionId,
            newValue: { templateId: params.templateId },
          });
          return Response.json({ ok: true, data });
        }

        return Response.json(
          { ok: false, error: "Unsupported flow template action." },
          { status: 400 },
        );
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminBusinessFlowHandlers() {
  return {
    GET: async ({ request, params }: { request: Request; params: { businessId: string } }) => {
      try {
        requireAdmin(request);
        const data = await getBusinessFlowDetails(params.businessId);
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminBusinessFlowImageUploadHandlers() {
  return {
    POST: async ({ request, params }: { request: Request; params: { businessId: string } }) => {
      try {
        const session = requireAdmin(request);
        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
          return Response.json({ ok: false, error: "Choose an image to upload." }, { status: 400 });
        }

        const image = await uploadWaFlowImage(file, params.businessId);
        await recordAdminAuditLog({
          adminUser: session.username,
          request,
          businessId: params.businessId,
          action: "FLOW_IMAGE_UPLOADED",
          targetType: "WA_FLOW_IMAGE",
          targetId: image.path,
          newValue: image,
        });

        return Response.json({ ok: true, data: image });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminBusinessProductImageUploadHandlers() {
  return {
    POST: async ({ request, params }: { request: Request; params: { businessId: string } }) => {
      try {
        const session = requireAdmin(request);
        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
          return Response.json({ ok: false, error: "Choose an image to upload." }, { status: 400 });
        }

        const image = await uploadWaProductImage(file, params.businessId);
        await recordAdminAuditLog({
          adminUser: session.username,
          request,
          businessId: params.businessId,
          action: "PRODUCT_IMAGE_UPLOADED",
          targetType: "WA_PRODUCT_IMAGE",
          targetId: image.path,
          newValue: image,
        });

        return Response.json({ ok: true, data: image });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminLogsHandlers() {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        requireAdmin(request);
        const url = new URL(request.url);
        const data = await getAdminLogs({
          businessId: url.searchParams.get("businessId") || undefined,
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminReviewConnectionsHandlers() {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        requireAdmin(request);
        const data = await listReviewConnections();
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminWhatsAppHealthHandlers() {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        requireAdmin(request);
        const connectionId = new URL(request.url).searchParams.get("connectionId") || "";
        const data = await checkWhatsAppConnectionHealth(connectionId);
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
    POST: async ({ request }: { request: Request }) => {
      try {
        const session = requireAdmin(request);
        const body = (await request.json().catch(() => null)) as {
          connectionId?: string;
        } | null;
        const data = await ensureWhatsAppApplicationSubscription(body?.connectionId || "");
        await recordAdminAuditLog({
          adminUser: session.username,
          request,
          businessId: data.connection.businessId,
          action: "WHATSAPP_APP_SUBSCRIPTION_ENSURED",
          targetType: "WHATSAPP_CONNECTION",
          targetId: data.connection.connectionId,
          newValue: {
            appId: data.subscription.appId,
            wabaSubscribed: data.subscription.wabaSubscribed,
            callbackMatches: data.subscription.callbackMatches,
            messagesSubscribed: data.subscription.messagesSubscribed,
          },
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminMessageEventsHandlers() {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        requireAdmin(request);
        const url = new URL(request.url);
        const connectionId = url.searchParams.get("connectionId") || undefined;
        const businessId = url.searchParams.get("businessId") || undefined;
        const data = await listWaMessageEvents({ connectionId, businessId, limit: 75 });
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminSendReviewMessageHandlers() {
  return {
    POST: async ({ request }: { request: Request }) => {
      try {
        const session = requireAdmin(request);
        const body = (await request.json().catch(() => null)) as {
          connectionId?: string;
          recipientPhone?: string;
          body?: string;
          templateName?: string;
          language?: string;
        } | null;
        const connection = await getReviewConnection(body?.connectionId || "");
        validateDemoSendInput(
          connection,
          body?.recipientPhone || "",
          body?.body || "",
          body?.templateName || "",
          body?.language || "",
        );

        const logContext = {
          businessId: connection.businessId,
          connectionId: connection.connectionId,
          senderType: "SYSTEM" as const,
        };
        const result = body?.templateName?.trim()
          ? await sendWhatsAppTemplate({
              phoneNumberId: connection.phoneNumberId,
              recipient: body.recipientPhone?.trim() || "",
              templateName: body.templateName.trim(),
              language: body.language?.trim() || "en_US",
              config: getWhatsAppServerConfig(connection.configSuffix),
              logContext,
            })
          : await sendWhatsAppText({
              phoneNumberId: connection.phoneNumberId,
              recipient: body?.recipientPhone?.trim() || "",
              message: body?.body?.trim() || "",
              config: getWhatsAppServerConfig(connection.configSuffix),
              logContext,
            });
        await recordAdminAuditLog({
          adminUser: session.username,
          request,
          businessId: connection.businessId,
          action: "APP_REVIEW_DEMO_MESSAGE_SENT",
          targetType: "WHATSAPP_CONNECTION",
          targetId: connection.connectionId,
          newValue: { ok: result.ok, messageId: result.ok ? result.messageId : undefined },
        });
        return Response.json({
          ok: true,
          data: { connection, result, sentAt: new Date().toISOString() },
        });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

export function createInternalAdminWhatsAppTemplatesHandlers() {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        requireAdmin(request);
        const url = new URL(request.url);
        const connectionId = url.searchParams.get("connectionId") || undefined;
        const includeMeta = url.searchParams.get("includeMeta") === "true";
        const local = await listLocalMetaTemplates({ connectionId, limit: 75 });
        const meta =
          includeMeta && connectionId
            ? await listWhatsAppMessageTemplates({ connectionId }).catch((error) => ({
                error: error instanceof Error ? error.message : "Could not fetch Meta templates.",
              }))
            : null;
        return Response.json({ ok: true, data: { local, meta } });
      } catch (error) {
        return adminApiError(error);
      }
    },
    POST: async ({ request }: { request: Request }) => {
      try {
        const session = requireAdmin(request);
        const body = (await request.json().catch(() => null)) as {
          connectionId?: string;
          name?: string;
          language?: string;
          category?: string;
          body?: string;
        } | null;
        const data = await createWhatsAppMessageTemplate({
          connectionId: body?.connectionId || "",
          name: body?.name || "",
          language: body?.language || "en_US",
          category: body?.category || "UTILITY",
          body: body?.body || "",
          adminUser: session.username,
        });
        await recordAdminAuditLog({
          adminUser: session.username,
          request,
          businessId: data.connection.businessId,
          action: "META_MESSAGE_TEMPLATE_CREATED",
          targetType: "WA_META_TEMPLATE",
          targetId: data.template.id,
          newValue: {
            name: data.template.name,
            status: data.template.status,
            metaTemplateId: data.template.meta_template_id,
          },
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return adminApiError(error);
      }
    },
  };
}

function validateDemoSendInput(
  connection: ReviewConnectionSummary,
  recipientPhone: string,
  messageBody: string,
  templateName: string,
  language: string,
) {
  if (!connection.isActive || connection.status !== "ACTIVE") {
    throw new Error("Select an ACTIVE WhatsApp connection before sending a demo message.");
  }
  if (connection.missingConfigKeys.length) {
    throw new Error(`Missing WhatsApp config: ${connection.missingConfigKeys.join(", ")}`);
  }
  if (!/^\+[1-9]\d{7,14}$/.test(recipientPhone.trim())) {
    throw new Error("Recipient phone must be in E.164 format, for example +15551234567.");
  }
  const cleanTemplateName = templateName.trim();
  if (cleanTemplateName) {
    if (!/^[a-z0-9_]{1,512}$/.test(cleanTemplateName)) {
      throw new Error("Template name is invalid.");
    }
    if (language.trim() && !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language.trim())) {
      throw new Error("Template language is invalid.");
    }
    return;
  }
  if (!messageBody.trim()) throw new Error("Message body is required.");
  if (messageBody.length > 1000) throw new Error("Demo message must be 1000 characters or less.");
}

function requireAdmin(request: Request) {
  const session = getInternalAdminSessionFromRequest(request);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

function adminApiError(error: unknown) {
  if (error instanceof Response) return error;
  if (error instanceof FlowDraftConflictError) {
    return Response.json({ ok: false, code: error.code, error: error.message }, { status: 409 });
  }
  if (error instanceof FlowVersionActionError) {
    return Response.json(
      { ok: false, code: error.code, error: error.message },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Internal admin request failed.";
  console.error("[wa-admin:api] request failed", { message });
  return Response.json({ ok: false, error: message }, { status: 500 });
}
