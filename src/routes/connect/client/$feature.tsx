import { createFileRoute } from "@tanstack/react-router";

import { getConnectFeature } from "@/features/connect/shell/feature-registry";
import { ConnectFeaturePreview } from "@/features/connect/shell/preview-page";

export const Route = createFileRoute("/connect/client/$feature")({
  component: ClientFeaturePage,
});

function ClientFeaturePage() {
  const { feature: featureId } = Route.useParams();
  const feature = getConnectFeature("client", featureId);

  if (!feature || feature.id === "home") {
    return <p className="text-sm text-muted-foreground">This client feature does not exist.</p>;
  }

  return <ConnectFeaturePreview feature={feature} />;
}
