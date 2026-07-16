import type React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { Input } from "@/components/ui/input";
import { metaTemplates, type MetaStatus, type MetaCategory } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Sparkles, AlertTriangle, CheckCircle2, Clock, XCircle, PauseCircle } from "lucide-react";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";
import { useState } from "react";

export const Route = createFileRoute("/connect/admin/whatsapp-templates")({
  head: () => ({ meta: [{ title: "WhatsApp templates — WA Admin" }] }),
  component: TemplatesPage,
});

const statusMeta: Record<MetaStatus, { tone: "success" | "info" | "warning" | "destructive" | "neutral"; icon: React.ReactNode; label: string }> = {
  approved: { tone: "success", icon: <CheckCircle2 className="h-3 w-3" />, label: "Approved" },
  in_review: { tone: "info", icon: <Clock className="h-3 w-3" />, label: "In review" },
  rejected: { tone: "destructive", icon: <XCircle className="h-3 w-3" />, label: "Rejected" },
  paused: { tone: "warning", icon: <PauseCircle className="h-3 w-3" />, label: "Paused" },
  draft: { tone: "neutral", icon: <Clock className="h-3 w-3" />, label: "Draft" },
};

const categoryTone: Record<MetaCategory, "info" | "success" | "warning"> = {
  marketing: "info",
  utility: "success",
  authentication: "warning",
};

function TemplatesPage() {
  const [filter, setFilter] = useState<"all" | MetaStatus>("all");

  const list = metaTemplates.filter((t) => filter === "all" || t.status === filter);

  return (
    <>
      <TopBar
        title="WhatsApp templates"
        subtitle="Manage Meta-approved message templates: submit, monitor status, and track quality."
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" />Submit new template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Submit template to Meta</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Name</Label><Input placeholder="promo_launch_v1" /></div>
                  <div>
                    <Label>Category</Label>
                    <Select defaultValue="marketing">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="authentication">Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Languages</Label>
                  <Input placeholder="en, ar" />
                </div>
                <div>
                  <Label>Body</Label>
                  <Textarea placeholder="Hi {{1}}, your order {{2}} is on the way." className="min-h-[80px]" />
                </div>
                <div>
                  <Label>Footer (optional)</Label>
                  <Input placeholder="Reply STOP to opt out" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => toast.success("Template submitted to Meta for review")}>Submit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="px-4 sm:px-6 pb-10 space-y-4">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-warning/15 text-warning-foreground shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <div className="font-medium">Phone number quality: High · Messaging tier 100k</div>
              <div className="text-muted-foreground">Keep read rates above 60% to stay in Tier 100k. Marketing templates count against 24h window.</div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="in_review">In review</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="paused">Paused</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const s = statusMeta[t.status];
            return (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-mono truncate">{t.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <StatusBadge tone={categoryTone[t.category]}>{t.category}</StatusBadge>
                        {t.languages.map((l) => (
                          <span key={l} className="text-[11px] uppercase text-muted-foreground">{l}</span>
                        ))}
                      </CardDescription>
                    </div>
                    <StatusBadge tone={s.tone} icon={s.icon}>{s.label}</StatusBadge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border bg-muted/40 p-2.5 text-sm">{t.body}</div>
                  {t.rejectionReason && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                      <strong>Rejection:</strong> {t.rejectionReason}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Quality: {t.quality}
                    </span>
                    <span>{t.lastUsed ? `Used ${formatDistanceToNow(t.lastUsed)}` : "Never used"}</span>
                  </div>
                  {t.usedByBusinesses.length > 0 && (
                    <div className="text-xs text-muted-foreground">Used by: {t.usedByBusinesses.join(", ")}</div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" size="sm">View history</Button>
                    {t.status === "rejected" ? (
                      <Button size="sm" onClick={() => toast("Resubmitted to Meta")}>Resubmit</Button>
                    ) : t.status === "paused" ? (
                      <Button size="sm" onClick={() => toast.success("Resumed")}>Resume</Button>
                    ) : (
                      <Button variant="outline" size="sm">Edit</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
