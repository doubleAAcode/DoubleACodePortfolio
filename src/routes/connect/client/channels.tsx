import { createFileRoute } from "@tanstack/react-router";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { channelStatuses } from "@/features/connect/flow-manager-ui/preview-data/mock-client";
import { ChannelBadge } from "@/features/connect/flow-manager-ui/components/channel-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";

export const Route = createFileRoute("/connect/client/channels")({
  head: () => ({ meta: [{ title: "Channels — Client Dashboard" }] }),
  component: ClientChannels,
});

function ClientChannels() {
  return (
    <>
      <ClientTopBar
        title="Channels"
        subtitle="Every place your customers can reach you."
        actions={<Button>Add channel</Button>}
      />
      <div className="px-4 sm:px-6 pb-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {channelStatuses.map(c => (
          <Card key={c.channel}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <ChannelBadge channel={c.channel} />
                  <div className="mt-3 text-sm font-semibold">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.handle}</div>
                </div>
                {c.quality && (
                  <span className={`h-2 w-2 rounded-full ${
                    c.quality === "green" ? "bg-emerald-500" : c.quality === "yellow" ? "bg-amber-500" : "bg-red-500"
                  }`} />
                )}
              </div>
              {c.tier && <div className="mt-2 text-[11px] text-muted-foreground">{c.tier}</div>}
              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs font-medium ${
                  c.status === "connected" ? "text-emerald-600" :
                  c.status === "action-required" ? "text-amber-600" : "text-muted-foreground"
                }`}>
                  {c.status === "connected" ? "● Connected" : c.status === "action-required" ? "● Action required" : "○ Not connected"}
                </span>
                <Button
                  size="sm" variant="outline"
                  onClick={() => toast(c.status === "connected" ? "Settings opened" : "Connect flow started")}
                >
                  {c.status === "connected" ? "Manage" : "Connect"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
