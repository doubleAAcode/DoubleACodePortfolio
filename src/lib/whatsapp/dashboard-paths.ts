export function getWaDashboardBasePath() {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard-2")) {
    return "/dashboard-2";
  }

  return "/dashboard";
}
