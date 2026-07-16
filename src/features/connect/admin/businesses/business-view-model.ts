import type {
  AdminBusinessDetailsResult,
  AdminBusinessSummaryResult,
} from "@/features/connect/shared/admin-client";

export type FlowManagerBusinessStatus = "live" | "draft" | "onboarding" | "paused";

export type FlowManagerBusinessListItem = {
  id: string;
  name: string;
  owner: string;
  category: string;
  waNumber: string;
  status: FlowManagerBusinessStatus;
  progress: number;
  updatedAt: string;
};

export type FlowManagerBusinessHeader = Omit<
  FlowManagerBusinessListItem,
  "progress" | "updatedAt"
> & {
  connectionStatus: string;
  healthStatus: "OK" | "WARNING" | "ERROR";
};

export function toBusinessListItem(
  business: AdminBusinessSummaryResult,
): FlowManagerBusinessListItem {
  return {
    id: business.id,
    name: business.name,
    owner: business.ownerName || business.ownerEmail || "No owner assigned",
    category: formatBusinessCategory(business.template_type),
    waNumber: business.displayPhoneNumber || "Not connected",
    status: toFlowManagerBusinessStatus(business, business.connectionStatus),
    progress: calculateSetupProgress(business),
    updatedAt: business.updated_at,
  };
}

export function toBusinessHeader(details: AdminBusinessDetailsResult): FlowManagerBusinessHeader {
  const connection = details.connections[0];
  const owner = details.users.find((user) => user.role === "OWNER" && user.status !== "REMOVED");
  const connectionStatus = connection?.status ?? "MISSING";

  return {
    id: details.business.id,
    name: details.business.name,
    owner: owner?.display_name || owner?.email || "No owner assigned",
    category: formatBusinessCategory(details.business.template_type),
    waNumber: connection?.display_phone_number || "Not connected",
    status: toFlowManagerBusinessStatus(details.business, connectionStatus),
    connectionStatus,
    healthStatus: details.health.status,
  };
}

export function formatBusinessCategory(templateType?: string) {
  switch (templateType) {
    case "ecommerce":
    case "standard_online_store":
      return "E-commerce";
    case "restaurant":
      return "Restaurant";
    case "greeting_store_info":
      return "Greeting + Store Info";
    case "jewelry_store":
      return "Jewelry";
    case "clothing_store":
      return "Clothing";
    case "accessories_store":
      return "Accessories";
    case "custom_products":
      return "Custom products";
    default:
      return "Not configured";
  }
}

function toFlowManagerBusinessStatus(
  business: { is_active: boolean; status?: string },
  connectionStatus: string,
): FlowManagerBusinessStatus {
  const operationalStatus = business.status ?? (business.is_active ? "ACTIVE" : "SUSPENDED");

  if (!business.is_active || operationalStatus === "PAUSED" || operationalStatus === "SUSPENDED") {
    return "paused";
  }
  if (connectionStatus === "ACTIVE" && operationalStatus === "ACTIVE") return "live";
  if (connectionStatus === "DRAFT") return "draft";
  return "onboarding";
}

function calculateSetupProgress(business: AdminBusinessSummaryResult) {
  const checks = [
    Boolean(business.name && business.currency),
    Boolean(business.ownerEmail),
    business.connectionStatus !== "MISSING",
    business.connectionStatus === "ACTIVE",
    business.is_active && (business.status ?? "ACTIVE") === "ACTIVE",
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}
