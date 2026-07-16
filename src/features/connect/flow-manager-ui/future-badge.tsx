import { getFlowManagerFeatureStatus } from "@/features/connect/flow-manager-ui/feature-status";

export function FlowManagerFutureBadge({ route }: { route: string }) {
  if (getFlowManagerFeatureStatus(route) === "live") return null;

  return (
    <span
      className="ml-auto shrink-0 rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800 group-data-[collapsible=icon]:hidden"
      aria-label="Future work"
    >
      Future
    </span>
  );
}
