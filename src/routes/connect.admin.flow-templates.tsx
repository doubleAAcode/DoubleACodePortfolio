import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { GitBranch, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { getFlowTemplates } from "@/features/connect/shared/admin-client";
import type { FlowTemplateRow } from "@/features/connect/shared/flow-template-store.server";

export const Route = createFileRoute("/connect/admin/flow-templates")({
  component: FlowTemplatesPage,
});

function FlowTemplatesPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showingTemplateDetails = pathname.replace(/\/+$/, "") !== "/connect/admin/flow-templates";
  const [templates, setTemplates] = useState<FlowTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getFlowTemplates()
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load templates."))
      .finally(() => setLoading(false));
  }, []);

  if (showingTemplateDetails) {
    return <Outlet />;
  }

  if (error) return <PageState text={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Flows</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Flow templates
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Versioned deterministic templates for reusable WhatsApp store conversations.
          </p>
        </div>
        <Link to="/connect/admin/flow-templates/new" className="studio-button-primary w-fit">
          <Plus className="h-4 w-4" />
          New template
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-surface/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="border-b border-border px-4 py-3 font-medium">Template</th>
                <th className="border-b border-border px-4 py-3 font-medium">Category</th>
                <th className="border-b border-border px-4 py-3 font-medium">Status</th>
                <th className="border-b border-border px-4 py-3 text-right font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-muted-foreground">
                    Loading templates...
                  </td>
                </tr>
              ) : templates.length ? (
                templates.map((template) => (
                  <tr key={template.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-4">
                      <Link
                        to="/connect/admin/flow-templates/$templateId"
                        params={{ templateId: template.id }}
                        className="inline-flex items-center gap-2 font-medium text-foreground hover:text-primary"
                      >
                        <GitBranch className="h-4 w-4" />
                        {template.name}
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground">{template.id}</div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {template.category.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-4">{template.status}</td>
                    <td className="px-4 py-4 text-right text-muted-foreground">
                      {formatDate(template.updated_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-muted-foreground">
                    No templates yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
