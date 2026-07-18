import { getFlowManagerFeatureStatus } from "@/features/connect/flow-manager-ui/feature-status";

export function FlowManagerFutureBadge({ route }: { route: string }) {
  const status = getFlowManagerFeatureStatus(route);
  if (status === "live") return null;

  const partial = status === "partial";

  return (
    <span
      className={
        partial
          ? "ml-auto shrink-0 rounded-sm border border-sky-300 bg-sky-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-sky-800 group-data-[collapsible=icon]:hidden"
          : "ml-auto shrink-0 rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800 group-data-[collapsible=icon]:hidden"
      }
      aria-label={partial ? "In progress" : "Future work"}
    >
      {partial ? "In progress" : "Future"}
    </span>
  );
}
