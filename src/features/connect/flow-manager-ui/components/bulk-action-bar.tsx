import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function BulkActionBar({
  count,
  onClear,
  actions,
}: {
  count: number;
  onClear: () => void;
  actions: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-2 rounded-full border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
        {count} selected
      </span>
      <div className="flex items-center gap-1">{actions}</div>
      <Button variant="ghost" size="icon" onClick={onClear} aria-label="Clear selection">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
