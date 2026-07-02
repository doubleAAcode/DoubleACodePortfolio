import type { DashboardCatalogAction, WaDashboardData } from "./dashboard-store.server";

export type WaDashboardSessionResult = {
  ok: boolean;
  configured: boolean;
  authenticated: boolean;
  session: { username: string; businessId: string } | null;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getWaDashboardSession() {
  return apiFetch<WaDashboardSessionResult>("/api/wa-dashboard/session");
}

export async function loginWaDashboard(username: string, password: string) {
  return apiFetch<{ ok: true }>("/api/wa-dashboard/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logoutWaDashboard() {
  return apiFetch<{ ok: true }>("/api/wa-dashboard/logout", { method: "POST" });
}

export async function getWaDashboardCatalog() {
  const result = await apiFetch<ApiResult<WaDashboardData>>("/api/wa-dashboard/catalog");
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function applyWaDashboardCatalogAction(action: DashboardCatalogAction) {
  const result = await apiFetch<ApiResult<WaDashboardData>>("/api/wa-dashboard/catalog", {
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
  >("/api/wa-dashboard/upload", {
    method: "POST",
    body: formData,
  });
  if (!result.ok) throw new Error(result.error);
  return result.image;
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
