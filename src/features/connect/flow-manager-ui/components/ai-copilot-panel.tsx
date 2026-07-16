import { useState } from "react";
import { Sparkles, Wand2, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";

const drafts = [
  "Hi Fatima — happy to help with the return. Our policy allows returns within 30 days of delivery on unopened items. Would you like me to email you a return label now?",
  "Yes, absolutely — you have until Dec 3 to return the earbuds. Reply YES and I'll send the prepaid label to your registered address.",
];

export function AICopilotPanel({ onInsert }: { onInsert: (text: string) => void }) {
  const [suggestion, setSuggestion] = useState<string | null>(drafts[0]);
  const [loading, setLoading] = useState(false);

  const regenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setSuggestion(drafts[Math.floor(Math.random() * drafts.length)]);
      setLoading(false);
    }, 700);
  };

  return (
    <aside className="border-l bg-gradient-to-b from-primary/5 to-transparent p-4 w-[300px] shrink-0 hidden xl:block">
      <div className="flex items-center gap-2 mb-3">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-sm font-semibold">AI Copilot</div>
          <div className="text-[11px] text-muted-foreground">Suggested reply</div>
        </div>
      </div>

      <div className="rounded-md border bg-background p-3 text-sm min-h-[120px]">
        {loading ? (
          <div className="text-xs text-muted-foreground animate-pulse">Generating…</div>
        ) : (
          suggestion
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          size="sm" className="flex-1"
          onClick={() => suggestion && onInsert(suggestion)}
          disabled={loading || !suggestion}
        >
          Use draft
        </Button>
        <Button size="sm" variant="outline" onClick={regenerate} disabled={loading}>
          <Wand2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Thread insight</div>
        <div className="rounded-md border bg-background p-2.5 text-xs">
          <div className="font-medium mb-1">Intent: Return request</div>
          <div className="text-muted-foreground">Sentiment: neutral · Order #A2381 · Delivered 12 days ago · Within return window.</div>
        </div>
      </div>

      <div className="mt-4 flex gap-1.5">
        <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={() => toast("Summary sent to Slack")}>
          Summarize
        </Button>
        <Button size="sm" variant="ghost" className="text-xs" onClick={() => toast.success("Feedback recorded")}>
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}
