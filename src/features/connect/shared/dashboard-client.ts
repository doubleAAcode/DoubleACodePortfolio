import type { DashboardCatalogAction, WaDashboardData } from "./dashboard-store.server";
import type {
  DashboardLifecycleAction,
  DashboardOrderDetails,
  DashboardOrderStatus,
  DashboardOrderSummary,
} from "./order-dashboard-store.server";
import type { OwnerNotificationRow, OwnerNotificationSettings } from "./owner-notifications.server";

export type WaDashboardSessionResult = {
  ok: boolean;
  configured: boolean;
  authenticated: boolean;
  session: { username: string; businessId: string } | null;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
export type OwnerNotificationDashboardSnapshot = {
  settings: OwnerNotificationSettings;
  notifications: OwnerNotificationRow[];
  unreadCount: number;
};

export async function getWaDashboardSession() {
  return apiFetch<WaDashboardSessionResult>(dashboardApiPath("/session"));
}

export async function loginWaDashboard(username: string, password: string) {
  return apiFetch<{ ok: true }>(dashboardApiPath("/login"), {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logoutWaDashboard() {
  return apiFetch<{ ok: true }>(dashboardApiPath("/logout"), { method: "POST" });
}

export async function getWaDashboardCatalog() {
  const result = await apiFetch<ApiResult<WaDashboardData>>(dashboardApiPath("/catalog"));
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function applyWaDashboardCatalogAction(action: DashboardCatalogAction) {
  const result = await apiFetch<ApiResult<WaDashboardData>>(dashboardApiPath("/catalog"), {
    method: "POST",
    body: JSON.stringify(action),
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function uploadWaDashboardImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const result = await apiFetch<
    { ok: true; image: { path: string; url: string } } | { ok: false; error: string }
  >(dashboardApiPath("/upload"), {
    method: "POST",
    body: formData,
  });
  if (!result.ok) throw new Error(result.error);
  return result.image;
}

export async function getWaDashboardOrders(status: DashboardOrderStatus | "ALL") {
  const result = await apiFetch<ApiResult<DashboardOrderSummary[]>>(
    dashboardApiPath(`/orders?status=${encodeURIComponent(status)}`),
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getWaDashboardOrder(orderId: string) {
  const result = await apiFetch<ApiResult<DashboardOrderDetails>>(
    dashboardApiPath(`/orders/${encodeURIComponent(orderId)}`),
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function decideWaDashboardOrder(
  orderId: string,
  action: "accept" | "reject" | DashboardLifecycleAction,
  reason?: string,
) {
  const result = await apiFetch<
    ApiResult<{
      order: DashboardOrderDetails;
      notification:
        | { ok: true; messageId?: string }
        | { ok: false; status: number; errorCode?: string; errorMessage: string };
    }>
  >(dashboardApiPath(`/orders/${encodeURIComponent(orderId)}`), {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function getWaOwnerNotifications() {
  const result = await apiFetch<ApiResult<OwnerNotificationDashboardSnapshot>>(
    dashboardApiPath("/notifications"),
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function applyWaOwnerNotificationAction(
  action:
    | { action: "mark_read"; notificationId: string }
    | { action: "mark_all_read" }
    | { action: "run_reminders" },
) {
  const result = await apiFetch<ApiResult<OwnerNotificationDashboardSnapshot>>(
    dashboardApiPath("/notifications"),
    {
      method: "POST",
      body: JSON.stringify(action),
    },
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

function dashboardApiPath(path: string) {
  const base =
    typeof window !== "undefined" && window.location.pathname.startsWith("/connect/dashboard-2")
      ? "/api/connect/dashboard-2"
      : "/api/connect/dashboard";
  return `${base}${path}`;
}

async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    headers:
      init.body instanceof FormData
        ? init.headers
        : {
            "Content-Type": "application/json",
            ...init.headers,
          },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || data?.message || response.statusText);
  }

  return data as T;
}
