import { uploadAdminFlowImage } from "./admin-client";
import { uploadWaDashboardImage } from "./dashboard-client";

export function uploadConnectFlowImage(businessId: string, file: File) {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/connect/client")) {
    return uploadWaDashboardImage(file);
  }
  return uploadAdminFlowImage(businessId, file);
}
