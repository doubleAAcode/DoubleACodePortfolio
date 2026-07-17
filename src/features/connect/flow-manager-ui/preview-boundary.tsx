import { useRouterState } from "@tanstack/react-router";
import { Clock3 } from "lucide-react";
import type { FormEvent, MouseEvent, ReactNode } from "react";

import { getFlowManagerFeatureStatus } from "@/features/connect/flow-manager-ui/feature-status";

const mutationLabel =
  /\b(save|send|submit|create|invite|export|import|pause|resume|assign|resolve|snooze|transfer|tag|delete|revoke|rotate|refund|remind|install|connect|re-index|redeploy|generate|queue|publish|test run|try it|new workflow|new api key|add endpoint)\b/i;

const partialRouteMessages: Record<string, string> = {
  "/connect/admin/businesses":
    "Business records, search, status filters, setup checks, and WhatsApp connection health use live admin data. Creation and configuration changes remain future work.",
  "/connect/client/automations":
    "The workflow list uses the authorized business backend. Canvas data, editing, and actions remain preview-only.",
};

export function FlowManagerPreviewBoundary({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const status = getFlowManagerFeatureStatus(pathname);
  const partialMessage = pathname.startsWith("/connect/admin/businesses")
    ? partialRouteMessages["/connect/admin/businesses"]
    : partialRouteMessages[pathname];

  if (status === "live") return <>{children}</>;

  function blockPreviewMutation(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest("button");
    if (!button || button.getAttribute("role") === "tab" || button.hasAttribute("aria-haspopup")) {
      return;
    }

    if (!mutationLabel.test(button.textContent || button.getAttribute("aria-label") || "")) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function blockPreviewSubmit(event: FormEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      data-flow-manager-status={status}
      onClickCapture={blockPreviewMutation}
      onSubmitCapture={blockPreviewSubmit}
    >
      {children}
      <aside className="fixed bottom-4 right-4 z-50 max-w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg">
        <div className="flex items-start gap-2.5">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Future</div>
            <p className="mt-0.5 text-xs leading-5">
              {partialMessage ??
                "Future work. UI preview only. Data is illustrative, and actions do not save or send."}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
