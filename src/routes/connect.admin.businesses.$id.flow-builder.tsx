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
  uploadAdminFlowImage,
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
      onUploadImage={(file) => uploadAdminFlowImage(id, file)}
      onRestoreVersion={async (versionId) => {
        await applyAdminBusinessAction(id, {
          action: "restore_business_flow_version",
          versionId,
        });
        const refreshed = await flowQuery.refetch();
        if (!refreshed.data) throw new Error("The restored draft could not be reloaded.");
        return refreshed.data;
      }}
      onPublishVersion={async (versionId) => {
        await applyAdminBusinessAction(id, {
          action: "publish_business_flow",
          versionId,
        });
        const refreshed = await flowQuery.refetch();
        if (!refreshed.data) throw new Error("The published flow could not be reloaded.");
        return refreshed.data;
      }}
      onSaveDraft={async ({ flowJson, flowName, versionId, expectedRevision }) => {
        await applyAdminBusinessAction(id, {
          action: "save_business_flow_draft",
          flowJson,
          flowName,
          versionId,
          expectedRevision,
        });
        const refreshed = await flowQuery.refetch();
        if (!refreshed.data) throw new Error("The saved draft could not be reloaded.");
        return refreshed.data;
      }}
    />
  );
}
