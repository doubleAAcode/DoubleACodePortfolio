import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid place-items-center rounded-lg border border-dashed bg-card p-10 text-center", className)}>
      {icon && <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-muted text-muted-foreground">{icon}</div>}
      <div className="max-w-sm">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
