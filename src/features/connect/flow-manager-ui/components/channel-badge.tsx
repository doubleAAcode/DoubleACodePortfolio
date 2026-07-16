import type { Channel } from "@/features/connect/flow-manager-ui/preview-data/mock-client";
import { MessageCircle, Instagram, Facebook, Globe, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const config: Record<Channel, { label: string; icon: typeof MessageCircle; className: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  instagram: { label: "Instagram", icon: Instagram, className: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400" },
  messenger: { label: "Messenger", icon: Facebook, className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  webchat: { label: "Webchat", icon: Globe, className: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  email: { label: "Email", icon: Mail, className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  sms: { label: "SMS", icon: Phone, className: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
};

export function ChannelBadge({ channel, showLabel = true, size = "sm" }: { channel: Channel; showLabel?: boolean; size?: "sm" | "xs" }) {
  const c = config[channel];
  const Icon = c.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded font-medium",
      c.className,
      size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
    )}>
      <Icon className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {showLabel && c.label}
    </span>
  );
}

export function ChannelIcon({ channel, className }: { channel: Channel; className?: string }) {
  const Icon = config[channel].icon;
  return <Icon className={cn("h-4 w-4", config[channel].className.split(" ").find(s => s.startsWith("text-")), className)} />;
}
