import { Sparkles, ThumbsUp, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function AICopilotPanel() {
  const explainFuture = () =>
    toast.info("Future work", {
      description: "AI-assisted replies and conversation insights are planned for a later phase.",
    });

  return (
    <aside className="hidden w-[300px] shrink-0 border-l bg-gradient-to-b from-primary/5 to-transparent p-4 xl:block">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-sm font-semibold">AI Copilot</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            Suggested reply
            <FutureLabel />
          </div>
        </div>
      </div>

      <button
        data-flow-manager-live-action
        type="button"
        onClick={explainFuture}
        className="min-h-[120px] w-full rounded-md border bg-background p-3 text-left text-xs text-muted-foreground hover:bg-accent"
      >
        No suggestion available.
      </button>

      <div className="mt-3 flex gap-2">
        <Button data-flow-manager-live-action size="sm" className="flex-1" onClick={explainFuture}>
          Use draft
        </Button>
        <Button data-flow-manager-live-action size="sm" variant="outline" onClick={explainFuture}>
          <Wand2 className="h-3.5 w-3.5" />
          <span className="sr-only">Regenerate suggestion</span>
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Thread insight</div>
        <button
          data-flow-manager-live-action
          type="button"
          onClick={explainFuture}
          className="w-full rounded-md border bg-background p-2.5 text-left text-xs text-muted-foreground hover:bg-accent"
        >
          Not available in this phase.
        </button>
      </div>

      <div className="mt-4 flex gap-1.5">
        <Button
          data-flow-manager-live-action
          size="sm"
          variant="ghost"
          className="flex-1 text-xs"
          onClick={explainFuture}
        >
          Summarize
        </Button>
        <Button
          data-flow-manager-live-action
          size="sm"
          variant="ghost"
          className="text-xs"
          onClick={explainFuture}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          <span className="sr-only">Rate suggestion</span>
        </Button>
      </div>
    </aside>
  );
}

function FutureLabel() {
  return (
    <span className="rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800">
      Future
    </span>
  );
}
