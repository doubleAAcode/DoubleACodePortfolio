import { createFileRoute, Link } from "@tanstack/react-router";
import {
  setupChecklist,
  type ChecklistState,
} from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { useBusinessDetails } from "@/features/connect/admin/businesses/business-details-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle, Circle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/connect/admin/businesses/$id/")({
  component: SetupHubPage,
});

function stateMeta(s: ChecklistState) {
  switch (s) {
    case "complete":
      return {
        tone: "success" as const,
        label: "Complete",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case "attention":
      return {
        tone: "warning" as const,
        label: "Needs attention",
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    case "blocking":
      return {
        tone: "destructive" as const,
        label: "Blocking",
        icon: <XCircle className="h-3 w-3" />,
      };
    case "pending":
      return {
        tone: "neutral" as const,
        label: "Not started",
        icon: <Circle className="h-3 w-3" />,
      };
  }
}

function SetupHubPage() {
  const { id } = Route.useParams();
  const details = useBusinessDetails();
  const items = details ? toConnectedChecklist(id, details.checklist) : setupChecklist(id);
  const complete = items.filter((i) => i.state === "complete").length;
  const total = items.length;
  const pct = Math.round((complete / total) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Onboarding checklist</CardTitle>
              <CardDescription>Complete every item before publishing the flow.</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums">
                {complete}/{total}
              </div>
              <div className="text-xs text-muted-foreground">items complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={pct} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {items.map((item) => {
          const meta = stateMeta(item.state);
          return (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-muted text-muted-foreground">
                    {meta.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{item.title}</div>
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={item.to}>
                      {item.action}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function toConnectedChecklist(
  businessId: string,
  checklist: Array<{ label: string; complete: boolean }>,
) {
  return checklist.map((item, index) => {
    const destination = checklistDestination(businessId, item.label);
    return {
      id: `live-check-${index + 1}`,
      title: item.label,
      detail: item.complete
        ? "Verified from the current business configuration."
        : destination.detail,
      state: (item.complete ? "complete" : "pending") as ChecklistState,
      action: destination.action,
      to: destination.to,
    };
  });
}

function checklistDestination(businessId: string, label: string) {
  const base = `/connect/admin/businesses/${businessId}`;
  const normalized = label.toLowerCase();

  if (normalized.includes("owner user")) {
    return {
      to: "/connect/admin/settings/team",
      action: "Open team",
      detail: "Assign an active owner to this business.",
    };
  }
  if (normalized.includes("whatsapp")) {
    return {
      to: `${base}/whatsapp`,
      action: "Configure",
      detail: "Connect and verify the business WhatsApp number.",
    };
  }
  if (normalized.includes("catalog")) {
    return {
      to: `${base}/products`,
      action: "Open catalog",
      detail: "Add at least one active category and product.",
    };
  }
  if (
    normalized.includes("checkout") ||
    normalized.includes("payment") ||
    normalized.includes("notification")
  ) {
    return {
      to: `${base}/checkout`,
      action: "Configure",
      detail: "Finish the required checkout and order settings.",
    };
  }
  if (normalized.includes("test")) {
    return {
      to: `${base}/live-test`,
      action: "Open test",
      detail: "Complete this check using a real WhatsApp test conversation.",
    };
  }

  return {
    to: base,
    action: "Review",
    detail: "Review the current business configuration.",
  };
}
