import "@tanstack/react-start/server-only";

import {
  clearDashboardSessionCookie,
  createDashboardSessionCookie,
  getDashboardSessionFromRequest,
  isDashboardAuthConfigured,
  validateDashboardCredentials,
} from "./dashboard-auth.server";
import { getWaDiagnostics } from "./diagnostics.server";
import {
  applyWaDashboardAction,
  getWaDashboardData,
  saveWaDashboardFlowSettings,
  type DashboardCatalogAction,
  type DashboardFlowSettingsInput,
  uploadWaFlowImage,
  uploadWaProductImage,
} from "./dashboard-store.server";
import {
  cloneTemplateToBusiness,
  FlowVersionActionError,
  getBusinessFlowDetails,
  listFlowTemplates,
  publishBusinessFlowVersion,
  restoreBusinessFlowVersionToDraft,
  saveBusinessFlowDraft,
} from "./flow-template-store.server";
import { FlowDraftConflictError } from "./flow-draft-conflict";
import type { FlowDefinition } from "./flow-template-types";
import {
  acceptDashboardOrder,
  getDashboardOrderDetails,
  listDashboardOrders,
  rejectDashboardOrder,
  transitionDashboardOrder,
  type DashboardLifecycleAction,
  type DashboardOrderStatus,
} from "./order-dashboard-store.server";
import {
  getOwnerNotificationsDashboard,
  markAllOwnerNotificationsRead,
  markOwnerNotificationRead,
  runOwnerReminderCheck,
} from "./owner-notifications.server";

export function createDashboardSessionHandlers(envSuffix = "") {
  return {
    GET: ({ request }: { request: Request }) => {
      const session = getDashboardSessionFromRequest(request, envSuffix);

      return Response.json({
        ok: true,
        configured: isDashboardAuthConfigured(envSuffix),
        authenticated: Boolean(session),
        session,
      });
    },
  };
}

export function createDashboardLoginHandlers(envSuffix = "") {
  return {
    POST: async ({ request }: { request: Request }) => {
      const body = (await request.json().catch(() => null)) as {
        username?: string;
        password?: string;
      } | null;

      if (!isDashboardAuthConfigured(envSuffix)) {
        return Response.json(
          {
            ok: false,
            error:
              "Dashboard auth is not configured. Add the dashboard password and session secret in Vercel.",
          },
          { status: 500 },
        );
      }

      const username = body?.username?.trim() || "";
      const password = body?.password || "";

      if (!validateDashboardCredentials(username, password, envSuffix)) {
        return Response.json(
          { ok: false, error: "Invalid dashboard credentials." },
          { status: 401 },
        );
      }

      return Response.json(
        { ok: true },
        {
          headers: {
            "Set-Cookie": createDashboardSessionCookie(username, envSuffix),
          },
        },
      );
    },
  };
}

export function createDashboardLogoutHandlers(envSuffix = "") {
  return {
    POST: () =>
      Response.json(
        { ok: true },
        {
          headers: {
            "Set-Cookie": clearDashboardSessionCookie(envSuffix),
          },
        },
      ),
  };
}

export function createDashboardCatalogHandlers(envSuffix = "") {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        const session = getDashboardSessionFromRequest(request, envSuffix);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }
        const data = await getWaDashboardData(session.businessId);

        return Response.json({ ok: true, data });
      } catch (error) {
        return dashboardApiError(error);
      }
    },
    POST: async ({ request }: { request: Request }) => {
      try {
        const session = getDashboardSessionFromRequest(request, envSuffix);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }
        const action = (await request.json()) as DashboardCatalogAction;
        const data = await applyWaDashboardAction(session.businessId, action);

        return Response.json({ ok: true, data });
      } catch (error) {
        return dashboardApiError(error);
      }
    },
  };
}

export function createDashboardFlowHandlers(envSuffix = "") {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        const session = getDashboardSessionFromRequest(request, envSuffix);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }
        return Response.json({
          ok: true,
          data: await getDashboardFlowSnapshot(session.businessId),
        });
      } catch (error) {
        return dashboardApiError(error);
      }
    },
    POST: async ({ request }: { request: Request }) => {
      try {
        const session = getDashboardSessionFromRequest(request, envSuffix);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }

        const action = (await request.json().catch(() => null)) as
          | {
              action: "save_draft";
              flowJson: FlowDefinition;
              flowName?: string;
              versionId?: string;
              expectedRevision?: number;
            }
          | { action: "publish_version"; versionId: string }
          | { action: "restore_version"; versionId: string }
          | { action: "clone_template"; templateId: string }
          | ({ action: "save_checkout_settings" } & DashboardFlowSettingsInput)
          | null;

        if (!action?.action) {
          return Response.json({ ok: false, error: "A flow action is required." }, { status: 400 });
        }

        const actor = `dashboard:${session.username}`;
        if (action.action === "save_draft") {
          if (!action.flowJson || typeof action.flowJson !== "object") {
            return Response.json({ ok: false, error: "Flow data is required." }, { status: 400 });
          }
          if (
            !action.versionId?.trim() ||
            typeof action.expectedRevision !== "number" ||
            !Number.isSafeInteger(action.expectedRevision) ||
            action.expectedRevision < 1
          ) {
            return Response.json(
              { ok: false, error: "A valid draft version and revision are required." },
              { status: 400 },
            );
          }
          await saveBusinessFlowDraft({
            businessId: session.businessId,
            flowJson: action.flowJson,
            flowName: action.flowName,
            adminUser: actor,
            versionId: action.versionId,
            expectedRevision: action.expectedRevision,
          });
        } else if (action.action === "publish_version") {
          if (!action.versionId?.trim()) {
            return Response.json(
              { ok: false, error: "A draft version is required." },
              { status: 400 },
            );
          }
          await publishBusinessFlowVersion({
            businessId: session.businessId,
            versionId: action.versionId,
          });
        } else if (action.action === "restore_version") {
          if (!action.versionId?.trim()) {
            return Response.json(
              { ok: false, error: "A history version is required." },
              { status: 400 },
            );
          }
          await restoreBusinessFlowVersionToDraft({
            businessId: session.businessId,
            versionId: action.versionId,
            adminUser: actor,
          });
        } else if (action.action === "clone_template") {
          if (!action.templateId?.trim()) {
            return Response.json({ ok: false, error: "A template is required." }, { status: 400 });
          }
          await cloneTemplateToBusiness({
            businessId: session.businessId,
            templateId: action.templateId,
            adminUser: actor,
          });
        } else if (action.action === "save_checkout_settings") {
          await saveWaDashboardFlowSettings(session.businessId, action);
        } else {
          return Response.json({ ok: false, error: "Unsupported flow action." }, { status: 400 });
        }

        return Response.json({
          ok: true,
          data: await getDashboardFlowSnapshot(session.businessId),
        });
      } catch (error) {
        return dashboardApiError(error);
      }
    },
  };
}

async function getDashboardFlowSnapshot(businessId: string) {
  const [details, templates, catalog] = await Promise.all([
    getBusinessFlowDetails(businessId),
    listFlowTemplates(),
    getWaDashboardData(businessId),
  ]);
  return {
    details,
    templates: templates.filter((template) => template.status === "PUBLISHED"),
    catalog,
  };
}

export function createDashboardUploadHandlers(envSuffix = "") {
  return createDashboardImageUploadHandlers(envSuffix, uploadWaProductImage);
}

export function createDashboardFlowImageUploadHandlers(envSuffix = "") {
  return createDashboardImageUploadHandlers(envSuffix, uploadWaFlowImage);
}

function createDashboardImageUploadHandlers(
  envSuffix: string,
  upload: (file: File, businessId: string) => Promise<{ path: string; url: string }>,
) {
  return {
    POST: async ({ request }: { request: Request }) => {
      try {
        const session = getDashboardSessionFromRequest(request, envSuffix);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
          return Response.json({ ok: false, error: "Choose an image to upload." }, { status: 400 });
        }

        const image = await upload(file, session.businessId);
        return Response.json({ ok: true, image });
      } catch (error) {
        return dashboardApiError(error);
      }
    },
  };
}

export function createDashboardOrdersHandlers(envSuffix = "") {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        const session = getDashboardSessionFromRequest(request, envSuffix);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }

        const url = new URL(request.url);
        const status = parseStatus(url.searchParams.get("status"));
        const orders = await listDashboardOrders({ businessId: session.businessId, status });

        return Response.json({ ok: true, data: orders });
      } catch (error) {
        return dashboardApiError(error);
      }
    },
  };
}

export function createDashboardDiagnosticsHandlers(envSuffix = "") {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        const session = getDashboardSessionFromRequest(request, envSuffix);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }

        const data = await getWaDiagnostics({
          businessId: session.businessId,
          configSuffix: envSuffix,
        });

        return Response.json({ ok: true, data });
      } catch (error) {
        return dashboardApiError(error);
      }
    },
  };
}

export function createDashboardNotificationHandlers(envSuffix = "") {
  return {
    GET: async ({ request }: { request: Request }) => {
      try {
        const session = getDashboardSessionFromRequest(request, envSuffix);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }

        const data = await getOwnerNotificationsDashboard({ businessId: session.businessId });
        return Response.json({ ok: true, data });
      } catch (error) {
        return dashboardApiError(error);
      }
    },
    POST: async ({ request }: { request: Request }) => {
      try {
        const session = getDashboardSessionFromRequest(request, envSuffix);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }

        const body = (await request.json().catch(() => null)) as {
          action?: string;
          notificationId?: string;
        } | null;

        if (body?.action === "mark_read" && body.notificationId) {
          await markOwnerNotificationRead({
            businessId: session.businessId,
            notificationId: body.notificationId,
          });
        } else if (body?.action === "mark_all_read") {
          await markAllOwnerNotificationsRead({ businessId: session.businessId });
        } else if (body?.action === "run_reminders") {
          await runOwnerReminderCheck({ businessId: session.businessId });
        } else {
          return Response.json(
            { ok: false, error: "Unsupported notification action." },
            { status: 400 },
          );
        }

        const data = await getOwnerNotificationsDashboard({ businessId: session.businessId });
        return Response.json({ ok: true, data });
      } catch (error) {
        return dashboardApiError(error);
      }
    },
  };
}

export function createDashboardOrderDetailsHandlers(envSuffix = "") {
  return {
    GET: async ({ request, params }: { request: Request; params: { orderId: string } }) => {
      try {
        const session = getDashboardSessionFromRequest(request, envSuffix);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }

        const order = await getDashboardOrderDetails({
          businessId: session.businessId,
          orderId: params.orderId,
        });

        return Response.json({ ok: true, data: order });
      } catch (error) {
        return dashboardApiError(error);
      }
    },
    POST: async ({ request, params }: { request: Request; params: { orderId: string } }) => {
      try {
        const session = getDashboardSessionFromRequest(request, envSuffix);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }

        const body = (await request.json().catch(() => null)) as {
          action?: string;
          reason?: string;
        } | null;

        if (body?.action === "accept") {
          const result = await acceptDashboardOrder({
            businessId: session.businessId,
            orderId: params.orderId,
            actor: session.username,
          });
          return Response.json({ ok: true, data: result });
        }

        if (body?.action === "reject") {
          const result = await rejectDashboardOrder({
            businessId: session.businessId,
            orderId: params.orderId,
            reason: body.reason,
            actor: session.username,
          });
          return Response.json({ ok: true, data: result });
        }

        const lifecycleAction = parseLifecycleAction(body?.action);
        if (lifecycleAction) {
          const result = await transitionDashboardOrder({
            businessId: session.businessId,
            orderId: params.orderId,
            action: lifecycleAction,
            reason: body?.reason,
            actor: session.username,
          });
          return Response.json({ ok: true, data: result });
        }

        return Response.json({ ok: false, error: "Unsupported order action." }, { status: 400 });
      } catch (error) {
        return dashboardApiError(error);
      }
    },
  };
}

function parseStatus(value: string | null): DashboardOrderStatus | "ALL" {
  if (
    value === "PENDING_OWNER_CONFIRMATION" ||
    value === "ACCEPTED" ||
    value === "PREPARING" ||
    value === "READY" ||
    value === "OUT_FOR_DELIVERY" ||
    value === "COMPLETED" ||
    value === "REJECTED" ||
    value === "CANCELLED" ||
    value === "ALL"
  ) {
    return value;
  }

  return "PENDING_OWNER_CONFIRMATION";
}

function parseLifecycleAction(value: string | undefined): DashboardLifecycleAction | undefined {
  if (
    value === "start_preparing" ||
    value === "mark_ready" ||
    value === "out_for_delivery" ||
    value === "complete" ||
    value === "cancel"
  ) {
    return value;
  }

  return undefined;
}

function dashboardApiError(error: unknown) {
  if (error instanceof FlowDraftConflictError) {
    return Response.json({ ok: false, code: error.code, error: error.message }, { status: 409 });
  }
  if (error instanceof FlowVersionActionError) {
    return Response.json(
      { ok: false, code: error.code, error: error.message },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Dashboard request failed.";
  console.error("[wa-dashboard:api] request failed", { message });
  return Response.json({ ok: false, error: message }, { status: 500 });
}
