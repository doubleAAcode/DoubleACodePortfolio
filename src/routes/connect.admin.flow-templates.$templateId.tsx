import { Link, createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, FileJson, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { getFlowTemplateDetails } from "@/features/connect/shared/admin-client";
import type { FlowTemplateDetails } from "@/features/connect/shared/flow-template-store.server";

export const Route = createFileRoute("/connect/admin/flow-templates/$templateId")({
  component: FlowTemplateDetailsPage,
});

function FlowTemplateDetailsPage() {
  const { templateId } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showingVersion = pathname.includes("/versions/");
  const [details, setDetails] = useState<FlowTemplateDetails>();
  const [error, setError] = useState("");

  useEffect(() => {
    getFlowTemplateDetails(templateId)
      .then(setDetails)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load template."));
  }, [templateId]);

  if (showingVersion) return <Outlet />;
  if (error) return <PageState text={error} />;
  if (!details) return <PageState text="Loading template..." />;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/connect/admin/flow-templates"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to flow templates
        </Link>
        <p className="mt-5 text-xs uppercase tracking-[0.22em] text-muted-foreground">Template</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {details.template.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {details.template.category.replaceAll("_", " ")} · {details.template.status}
        </p>
      </div>

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-display text-xl font-semibold">Versions</h2>
        <div className="mt-4 space-y-3">
          {details.versions.map((version) => (
            <Link
              key={version.id}
              to="/connect/admin/flow-templates/$templateId/versions/$versionId"
              params={{ templateId: details.template.id, versionId: version.id }}
              className="flex items-center justify-between gap-4 rounded-md border border-border bg-background p-3 transition hover:border-primary"
            >
              <div className="flex items-center gap-3">
                <FileJson className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">Version {version.version_number}</div>
                  <div className="text-xs text-muted-foreground">{version.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {version.validation_result.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span>{version.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-8 text-muted-foreground">
      {text}
    </div>
  );
}
