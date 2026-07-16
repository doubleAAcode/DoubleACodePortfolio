type FlowManagerRouteRule = {
  path: string;
  includeChildren?: boolean;
};

export type FlowManagerFeatureStatus = "live" | "partial" | "future";

// Move a route here only after its reads, mutations, permissions, and tests are complete.
export const liveFlowManagerRoutes: FlowManagerRouteRule[] = [];

export const partialFlowManagerRoutes: FlowManagerRouteRule[] = [
  { path: "/connect/admin/businesses", includeChildren: true },
  { path: "/connect/client/automations", includeChildren: true },
];

export function getFlowManagerFeatureStatus(pathname: string): FlowManagerFeatureStatus {
  if (liveFlowManagerRoutes.some((rule) => matchesRoute(pathname, rule))) return "live";
  if (partialFlowManagerRoutes.some((rule) => matchesRoute(pathname, rule))) return "partial";
  return "future";
}

function matchesRoute(pathname: string, rule: FlowManagerRouteRule) {
  return (
    pathname === rule.path || Boolean(rule.includeChildren && pathname.startsWith(`${rule.path}/`))
  );
}
