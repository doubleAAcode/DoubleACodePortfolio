import "@tanstack/react-start/server-only";

import {
  clearDashboardSessionCookie,
  createDashboardSessionCookie,
  getDashboardSessionFromRequest,
  isDashboardAuthConfigured,
  validateDashboardCredentials,
} from "./dashboard-auth.server";
import {
  applyWaDashboardAction,
  getWaDashboardData,
  type DashboardCatalogAction,
  uploadWaProductImage,
} from "./dashboard-store.server";
import {
  acceptDashboardOrder,
  getDashboardOrderDetails,
  listDashboardOrders,
  rejectDashboardOrder,
  type DashboardOrderStatus,
} from "./order-dashboard-store.server";

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

export function createDashboardUploadHandlers(envSuffix = "") {
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

        const image = await uploadWaProductImage(file, session.businessId);
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
    value === "REJECTED" ||
    value === "ALL"
  ) {
    return value;
  }

  return "PENDING_OWNER_CONFIRMATION";
}

function dashboardApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Dashboard request failed.";
  console.error("[wa-dashboard:api] request failed", { message });
  return Response.json({ ok: false, error: message }, { status: 500 });
}
