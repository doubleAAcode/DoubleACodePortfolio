import { createFileRoute } from "@tanstack/react-router";

import { getConnectFeature } from "@/features/connect/shell/feature-registry";
import { ConnectFeaturePreview } from "@/features/connect/shell/preview-page";

export const Route = createFileRoute("/connect/admin/$feature")({
  component: AdminFeaturePage,
});

function AdminFeaturePage() {
  const { feature: featureId } = Route.useParams();
  const feature = getConnectFeature("admin", featureId);

  if (!feature || feature.id === "overview") {
    return <p className="text-sm text-muted-foreground">This admin feature does not exist.</p>;
  }

  return <ConnectFeaturePreview feature={feature} />;
}
