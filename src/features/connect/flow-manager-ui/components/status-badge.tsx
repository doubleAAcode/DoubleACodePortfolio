import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "success" | "warning" | "destructive" | "info" | "neutral";

const toneClass: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  tone = "neutral",
  children,
  icon,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", toneClass[tone], className)}>
      {icon}
      {children}
    </Badge>
  );
}

export function BusinessStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "live":
      return (
        <StatusBadge tone="success" icon={<CheckCircle2 className="h-3 w-3" />}>
          Live
        </StatusBadge>
      );
    case "draft":
      return (
        <StatusBadge tone="info" icon={<Clock className="h-3 w-3" />}>
          Draft in progress
        </StatusBadge>
      );
    case "onboarding":
      return (
        <StatusBadge tone="warning" icon={<AlertTriangle className="h-3 w-3" />}>
          Onboarding
        </StatusBadge>
      );
    case "paused":
      return (
        <StatusBadge tone="neutral" icon={<XCircle className="h-3 w-3" />}>
          Paused
        </StatusBadge>
      );
    default:
      return <StatusBadge>{status}</StatusBadge>;
  }
}
