import { useRouterState } from "@tanstack/react-router";
import { Clock3 } from "lucide-react";
import type { FormEvent, MouseEvent, ReactNode } from "react";

import { getFlowManagerFeatureStatus } from "@/features/connect/flow-manager-ui/feature-status";
import { cn } from "@/lib/utils";

const mutationLabel =
  /\b(save|send|submit|create|invite|export|import|pause|resume|assign|resolve|snooze|transfer|tag|delete|revoke|rotate|refund|remind|install|connect|re-index|redeploy|generate|queue|publish|test run|try it|new workflow|new api key|add endpoint)\b/i;

const partialRouteMessages: Record<string, string> = {
  "/connect/admin/inbox":
    "Conversation lists, timelines, WhatsApp text replies, lifecycle, assignment, priority, unread state, tags, notes, and canned replies use live tenant-safe APIs. Advanced operational folders, templates, media, and incident actions remain Future.",
  "/connect/client/inbox":
    "WhatsApp conversation lists, timelines, text replies, lifecycle, assignment, priority, unread state, tags, notes, and canned replies use live tenant-safe APIs. Other channels, templates, media, and AI assistance remain Future.",
  "/connect/admin/contacts":
    "Contact list, search, pagination, profile, attributes, consent evidence, tags, and conversation history use live tenant-safe APIs. Creation, import, export, broadcasts, and spend remain Future.",
  "/connect/client/contacts":
    "WhatsApp contacts, search, pagination, lifecycle, tags, and consent use the signed tenant-safe API. Creation, import, export, broadcasts, and other channels remain Future.",
  "/connect/admin/businesses":
    "Business records, search, status filters, setup checks, and WhatsApp connection health use live admin data. Creation and configuration changes remain future work.",
  "/connect/admin/businesses/live-test":
    "Connection data, approved test sends, and message events are live. Full roundtrip verification and diagnostics remain future work.",
  "/connect/admin/businesses/flow-builder":
    "Guided uses the real canonical WhatsApp draft. Step and reply mutations, stable routing, reference-safe deletion, field and media editing, version inspection and restore-to-draft, undo/redo, ordered problem repair, and Save draft are connected. Publishing and Canvas remain Future.",
  "/connect/client/automations":
    "The workflow list and Guided editor use the authorized canonical WhatsApp flow. Step and reply mutations, stable routing, reference-safe deletion, field and media editing, version inspection and restore-to-draft, undo/redo, ordered problem repair, and saving are connected. Publishing, run metrics, and Canvas remain Future.",
};

export function FlowManagerPreviewBoundary({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const status = getFlowManagerFeatureStatus(pathname);
  const partialMessage = pathname.endsWith("/live-test")
    ? partialRouteMessages["/connect/admin/businesses/live-test"]
    : pathname.endsWith("/flow-builder")
      ? partialRouteMessages["/connect/admin/businesses/flow-builder"]
      : pathname.startsWith("/connect/admin/inbox")
        ? partialRouteMessages["/connect/admin/inbox"]
        : pathname.startsWith("/connect/client/inbox")
          ? partialRouteMessages["/connect/client/inbox"]
          : pathname.startsWith("/connect/admin/contacts")
            ? partialRouteMessages["/connect/admin/contacts"]
            : pathname.startsWith("/connect/client/contacts")
              ? partialRouteMessages["/connect/client/contacts"]
              : pathname.startsWith("/connect/admin/businesses")
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
    if (button.hasAttribute("data-flow-manager-live-action")) return;

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
      <aside
        className={cn(
          "border-b px-4 py-2.5 sm:px-6",
          status === "partial"
            ? "border-sky-200 bg-sky-50 text-sky-950"
            : "border-amber-200 bg-amber-50 text-amber-950",
        )}
      >
        <div className="flex items-start gap-2.5">
          <Clock3
            className={cn(
              "mt-0.5 size-4 shrink-0",
              status === "partial" ? "text-sky-700" : "text-amber-700",
            )}
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase">
              {status === "partial" ? "In progress" : "Future"}
            </div>
            <p className="mt-0.5 hidden text-xs leading-5 opacity-80 sm:block">
              {partialMessage ??
                "Future work. UI preview only. Data is illustrative, and actions do not save or send."}
            </p>
          </div>
        </div>
      </aside>
      {children}
    </div>
  );
}
