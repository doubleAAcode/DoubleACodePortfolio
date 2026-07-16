export function getWaDashboardBasePath() {
  if (
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/connect/dashboard-2")
  ) {
    return "/connect/dashboard-2";
  }

  return "/connect/dashboard";
}
