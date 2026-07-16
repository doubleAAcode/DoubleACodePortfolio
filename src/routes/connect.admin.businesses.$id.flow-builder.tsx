import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { flowSteps, type FlowStep, type FlowOption } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import {
  Plus,
  MessageSquare,
  Image as ImageIcon,
  ListTree,
  User,
  Square,
  ArrowRight,
  AlertTriangle,
  XCircle,
  Save,
  UploadCloud,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FlowCanvas } from "@/features/connect/flow-manager-ui/components/flow-canvas";

export const Route = createFileRoute("/connect/admin/businesses/$id/flow-builder")({
  component: FlowBuilderPage,
});

function stepIcon(t: FlowStep["type"]) {
  const cls = "h-4 w-4";
  switch (t) {
    case "Welcome":
    case "Message":
    case "Menu":
      return <MessageSquare className={cls} />;
    case "Image":
      return <ImageIcon className={cls} />;
    case "Catalog":
      return <ListTree className={cls} />;
    case "Handoff":
      return <User className={cls} />;
    case "End":
      return <Square className={cls} />;
  }
}

function statusBadge(s: FlowStep["status"]) {
  if (s === "ok") return <StatusBadge tone="success">OK</StatusBadge>;
  if (s === "warning")
    return (
      <StatusBadge tone="warning">
        <AlertTriangle className="h-3 w-3" />1 warning
      </StatusBadge>
    );
  return (
    <StatusBadge tone="destructive">
      <XCircle className="h-3 w-3" />1 error
    </StatusBadge>
  );
}

function StepCard({
  step,
  selected,
  onSelect,
}: {
  step: FlowStep;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-64 shrink-0 rounded-lg border bg-card p-3 text-left shadow-sm transition-all hover:shadow ${
        selected ? "border-primary ring-2 ring-primary/20" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded bg-muted text-muted-foreground">
          {stepIcon(step.type)}
        </span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{step.type}</span>
        <span className="ml-auto">{statusBadge(step.status)}</span>
      </div>
      <div className="mt-2 truncate text-sm font-medium">{step.title}</div>
      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{step.preview}</div>
    </button>
  );
}

function OptionRow({ opt }: { opt: FlowOption }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs">
      <div className="min-w-0">
        <div className="truncate">
          <span className="text-muted-foreground">Customer taps:</span>{" "}
          <span className="font-medium">{opt.labelEn}</span>
        </div>
        <div className="truncate text-muted-foreground">
          Then: {opt.action} — {opt.actionDetail}
        </div>
      </div>
      {!opt.active && <StatusBadge tone="neutral">Off</StatusBadge>}
    </div>
  );
}

function JourneyTab({
  selectedId,
  setSelectedId,
}: {
  selectedId: string;
  setSelectedId: (s: string) => void;
}) {
  const welcome = flowSteps[0];
  const children = flowSteps.slice(1);
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">Conversation journey</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              Add next step
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-start gap-4">
            <StepCard step={welcome} selected={selectedId === welcome.id} onSelect={() => setSelectedId(welcome.id)} />
            <ArrowRight className="mt-8 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-2">
              {welcome.options?.map((opt) => {
                const target = children.find((c) => c.id === opt.nextStepId);
                return (
                  <div key={opt.id} className="flex items-center gap-2">
                    <div className="w-56 rounded-md border bg-card px-2 py-1.5 text-xs">
                      <div className="truncate font-medium">↳ {opt.labelEn}</div>
                      <div className="truncate text-muted-foreground">{opt.action}</div>
                    </div>
                    {target && (
                      <>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <StepCard step={target} selected={selectedId === target.id} onSelect={() => setSelectedId(target.id)} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Welcome message options</CardTitle>
          <CardDescription>What customers see and what happens when they tap each option.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {welcome.options?.map((opt) => (
            <OptionRow key={opt.id} opt={opt} />
          ))}
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              Add WhatsApp option
            </Button>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              Add reply / action
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SelectedStepTab({ step }: { step: FlowStep }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Admin title</Label>
              <Input defaultValue={step.title} />
            </div>
            <div className="space-y-1">
              <Label>Step type</Label>
              <Select defaultValue={step.type}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Welcome", "Message", "Menu", "Image", "Catalog", "Handoff", "End"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer-facing message</CardTitle>
            <CardDescription>Written in English and Arabic.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Message (EN)</Label>
              <Textarea rows={4} defaultValue="Hi 👋 Welcome to Atlas Electronics. How can we help you today?" />
            </div>
            <div className="space-y-1">
              <Label>Message (AR)</Label>
              <Textarea rows={4} dir="rtl" defaultValue="مرحباً 👋 أهلاً بك في أطلس للإلكترونيات. كيف يمكننا مساعدتك؟" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">WhatsApp options</CardTitle>
                <CardDescription>Buttons the customer sees after this message.</CardDescription>
              </div>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add WhatsApp option
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {step.options?.map((opt) => (
              <div key={opt.id} className="rounded-md border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Button text (EN)</Label>
                    <Input defaultValue={opt.labelEn} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Button text (AR)</Label>
                    <Input dir="rtl" defaultValue={opt.labelAr} />
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="space-y-1">
                    <Label className="text-xs">After customer taps</Label>
                    <Select defaultValue={opt.action}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[
                          "Send text message",
                          "Send image / price list",
                          "Browse catalog route",
                          "Product purchase path",
                          "Talk to human",
                          "End conversation",
                          "Show this same menu again",
                          "Go to another step",
                        ].map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-0.5">
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked={opt.active} id={`active-${opt.id}`} />
                      <Label htmlFor={`active-${opt.id}`} className="text-xs">Active</Label>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{opt.actionDetail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Image / media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid h-32 place-items-center rounded-md border-2 border-dashed bg-muted/40 text-xs text-muted-foreground">
              No image attached
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <UploadCloud className="h-4 w-4" />
              Upload image
            </Button>
            <div className="space-y-1">
              <Label className="text-xs">Caption (EN)</Label>
              <Textarea rows={2} placeholder="Optional caption shown with the image" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Caption (AR)</Label>
              <Textarea rows={2} dir="rtl" placeholder="تعليق اختياري يظهر مع الصورة" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">After image behavior</Label>
              <Select defaultValue="menu">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="menu">Show this same menu again</SelectItem>
                  <SelectItem value="end">End conversation</SelectItem>
                  <SelectItem value="go">Go to another step</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Routing behavior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Repeat menu after action</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span>Timeout returns to Welcome</span>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PreviewTab() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">WhatsApp preview</CardTitle>
              <CardDescription>How this journey looks on a real device.</CardDescription>
            </div>
            <div className="flex gap-1 rounded-md border p-0.5 text-xs">
              <button
                onClick={() => setLang("en")}
                className={`rounded px-2 py-1 ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >EN</button>
              <button
                onClick={() => setLang("ar")}
                className={`rounded px-2 py-1 ${lang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >AR</button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            dir={dir}
            className="mx-auto max-w-md space-y-2 rounded-lg p-4"
            style={{ background: "#e5ddd5" }}
          >
            <div className="max-w-[80%] rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
              {lang === "en"
                ? "Hi 👋 Welcome to Atlas Electronics. How can we help you today?"
                : "مرحباً 👋 أهلاً بك في أطلس للإلكترونيات. كيف يمكننا مساعدتك؟"}
              <div className="mt-2 space-y-1 border-t pt-2">
                {["Store info", "iPhone price list", "Shop products", "Talk to human"].map((b) => (
                  <div key={b} className="rounded border py-1 text-center text-xs text-primary">
                    {b}
                  </div>
                ))}
              </div>
            </div>
            <div className={`ml-auto max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm`} style={{ background: "#dcf8c6" }}>
              {lang === "en" ? "iPhone price list" : "أسعار الآيفون"}
            </div>
            <div className="max-w-[80%] rounded-lg bg-white px-2 py-2 text-sm shadow-sm">
              <div className="grid h-32 place-items-center rounded bg-muted text-xs text-muted-foreground">
                [ Price list image ]
              </div>
              <div className="mt-2 text-sm">
                {lang === "en" ? "Here's our current iPhone lineup 📱" : "إليك تشكيلة الآيفون الحالية 📱"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What happens next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="rounded-md border bg-muted/40 p-3">
            After the image is sent, the bot will <span className="font-medium">show the same menu again</span> so the customer can pick another option.
          </div>
          <div className="text-xs text-muted-foreground">
            Preview reflects Draft v15. Publish changes to make it live for real customers.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ValidationTab() {
  const diagnostics = [
    {
      severity: "error" as const,
      step: "iPhone Price List",
      issue: "This step needs an image before publishing.",
      fix: "Upload a price list image in the Selected Step tab.",
    },
    {
      severity: "error" as const,
      step: "Checkout",
      issue: "Checkout cannot be published because delivery and pickup are both disabled.",
      fix: "Enable at least one fulfillment method in Checkout Settings.",
    },
    {
      severity: "warning" as const,
      step: "Welcome Message",
      issue: "One option (\"Shop products\") has no Arabic label set.",
      fix: "Add an Arabic button label so Arabic customers see a proper name.",
    },
  ];
  return (
    <div className="space-y-3">
      {diagnostics.map((d, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
              <div className={`grid h-8 w-8 place-items-center rounded-md ${d.severity === "error" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning-foreground"}`}>
                {d.severity === "error" ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={d.severity === "error" ? "destructive" : "warning"}>
                    {d.severity === "error" ? "Error" : "Warning"}
                  </StatusBadge>
                  <span className="text-sm font-medium">{d.step}</span>
                </div>
                <p className="mt-1 text-sm">{d.issue}</p>
                <p className="mt-1 text-xs text-muted-foreground">Suggested fix: {d.fix}</p>
              </div>
              <Button size="sm" variant="outline">Focus step</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdvancedTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Raw JSON (draft v15)</CardTitle></CardHeader>
        <CardContent>
          <pre className="max-h-[420px] overflow-auto rounded-md bg-muted/60 p-3 font-mono text-xs">
{`{
  "version": 15,
  "steps": [
    { "id": "step_welcome", "type": "welcome", "options": [
      { "id": "opt_store_info", "label_en": "Store info", "action": "send_text" },
      { "id": "opt_iphone", "label_en": "iPhone price list", "action": "send_image" }
    ]},
    { "id": "step_iphone", "type": "image", "asset_id": null }
  ]
}`}
          </pre>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Runtime details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Flow engine</span><span className="font-mono">v2026.07.02</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Runtime region</span><span className="font-mono">me-central-1</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Draft node IDs</span><span className="font-mono">5</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Manual / debug tools</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">Force-recompile draft</Button>
            <Button variant="outline" size="sm" className="w-full justify-start">Export JSON snapshot</Button>
            <Button variant="destructive" size="sm" className="w-full justify-start">Reset draft to live</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FlowBuilderPage() {
  const [selectedId, setSelectedId] = useState(flowSteps[0].id);
  const step = flowSteps.find((s) => s.id === selectedId) ?? flowSteps[0];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Editing</div>
          <div className="text-lg font-semibold">Flow Builder</div>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="draft-15">
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft-15">Draft v15 (editing)</SelectItem>
              <SelectItem value="live-14">Live v14 (read only)</SelectItem>
              <SelectItem value="v13">v13 (archived)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <Button size="sm">Publish changes</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Duplicate flow</DropdownMenuItem>
              <DropdownMenuItem>Export as JSON</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Discard draft</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs className="min-w-0" defaultValue="journey">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="journey">Guided</TabsTrigger>
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="selected">Selected Step</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <TabsContent value="journey" className="mt-4">
          <JourneyTab selectedId={selectedId} setSelectedId={setSelectedId} />
        </TabsContent>
        <TabsContent value="canvas" className="mt-4">
          <FlowCanvas onSelect={setSelectedId} />
        </TabsContent>
        <TabsContent value="selected" className="mt-4">
          <SelectedStepTab step={step} />
        </TabsContent>
        <TabsContent value="preview" className="mt-4">
          <PreviewTab />
        </TabsContent>
        <TabsContent value="validation" className="mt-4">
          <ValidationTab />
        </TabsContent>
        <TabsContent value="advanced" className="mt-4">
          <AdvancedTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
