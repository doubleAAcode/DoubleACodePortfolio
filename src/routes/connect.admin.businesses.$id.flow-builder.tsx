import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import {
  GuidedFlowError,
  GuidedFlowLoading,
  GuidedFlowWorkspace,
} from "@/features/connect/flow-manager-ui/guided-flow-workspace";
import {
  applyAdminBusinessAction,
  getBusinessFlowDetails,
} from "@/features/connect/shared/admin-client";

export const Route = createFileRoute("/connect/admin/businesses/$id/flow-builder")({
  component: FlowBuilderPage,
});

function FlowBuilderPage() {
  const { id } = Route.useParams();
  const flowQuery = useQuery({
    queryKey: ["connect", "guided-flow", "admin", id],
    queryFn: () => getBusinessFlowDetails(id),
  });

  if (flowQuery.isLoading) return <GuidedFlowLoading />;
  if (flowQuery.error) {
    return (
      <GuidedFlowError message={flowQuery.error.message} onRetry={() => void flowQuery.refetch()} />
    );
  }
  if (!flowQuery.data) return <GuidedFlowLoading message="Preparing the flow workspace..." />;

  return (
    <GuidedFlowWorkspace
      details={flowQuery.data}
      onSaveDraft={async ({ flowJson, flowName }) => {
        await applyAdminBusinessAction(id, {
          action: "save_business_flow_draft",
          flowJson,
          flowName,
        });
        const refreshed = await flowQuery.refetch();
        if (!refreshed.data) throw new Error("The saved draft could not be reloaded.");
        return refreshed.data;
      }}
    />
  );
}
