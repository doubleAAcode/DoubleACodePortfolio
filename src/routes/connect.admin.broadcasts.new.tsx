import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { metaTemplates, contacts } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { useState } from "react";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";

export const Route = createFileRoute("/connect/admin/broadcasts/new")({
  head: () => ({ meta: [{ title: "New broadcast — WA Admin" }] }),
  component: NewBroadcast,
});

const steps = ["Template", "Audience", "Schedule", "Review"];

function NewBroadcast() {
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState(metaTemplates.filter(t => t.status === "approved")[0]?.id ?? "");
  const [lifecycle, setLifecycle] = useState("all");
  const [name, setName] = useState("");
  const [when, setWhen] = useState("now");
  const navigate = useNavigate();

  const audience = contacts.filter((c) => c.optIn && (lifecycle === "all" || c.lifecycle === lifecycle));
  const selectedTpl = metaTemplates.find((t) => t.id === template);

  const submit = () => {
    toast.success("Broadcast created", { description: `${name || "Untitled"} → ${audience.length} recipients` });
    navigate({ to: "/connect/admin/broadcasts" });
  };

  return (
    <>
      <TopBar title="New broadcast" subtitle="Send an approved template to a segment of opted-in contacts." />
      <div className="px-4 sm:px-6 pb-10 max-w-3xl mx-auto space-y-4">
        <ol className="flex items-center gap-2 text-xs">
          {steps.map((s, i) => (
            <li key={s} className={`flex items-center gap-2 ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{i + 1}</span>
              {s}
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </li>
          ))}
        </ol>

        <Card>
          <CardHeader><CardTitle>{steps[step]}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-1"><Label>Broadcast name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekend promo — Atlas" /></div>
                <div className="space-y-1">
                  <Label>Approved template</Label>
                  <Select value={template} onValueChange={setTemplate}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {metaTemplates.filter(t => t.status === "approved").map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.languages.join("/")})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTpl && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">Preview</div>
                    {selectedTpl.body}
                  </div>
                )}
              </>
            )}
            {step === 1 && (
              <>
                <div className="space-y-1">
                  <Label>Segment by lifecycle</Label>
                  <Select value={lifecycle} onValueChange={setLifecycle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All opted-in contacts</SelectItem>
                      <SelectItem value="vip">VIP only</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="lead">Leads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-md border p-3 text-sm">
                  <div className="text-muted-foreground text-xs">Estimated audience</div>
                  <div className="text-2xl font-semibold">{audience.length.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Contacts with marketing opt-in matching your filter.</div>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="space-y-1">
                  <Label>When to send</Label>
                  <Select value={when} onValueChange={setWhen}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Send immediately</SelectItem>
                      <SelectItem value="scheduled">Schedule for later</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {when === "scheduled" && (
                  <div className="space-y-1"><Label>Send at</Label><Input type="datetime-local" /></div>
                )}
                <div className="space-y-1">
                  <Label>Throttle</Label>
                  <Input placeholder="Messages per second (default 20)" defaultValue="20" />
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between border-b py-2"><span className="text-muted-foreground">Name</span><span>{name || "Untitled"}</span></div>
                  <div className="flex justify-between border-b py-2"><span className="text-muted-foreground">Template</span><span>{selectedTpl?.name}</span></div>
                  <div className="flex justify-between border-b py-2"><span className="text-muted-foreground">Audience</span><span>{audience.length.toLocaleString()} contacts</span></div>
                  <div className="flex justify-between border-b py-2"><span className="text-muted-foreground">When</span><span>{when === "now" ? "Immediately" : "Scheduled"}</span></div>
                  <div className="flex justify-between border-b py-2"><span className="text-muted-foreground">Est. cost</span><span>${(audience.length * 0.06).toFixed(2)}</span></div>
                </div>
                <Textarea placeholder="Internal note (optional)" />
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
          ) : (
            <Button onClick={submit}><Send className="h-4 w-4" /> Create broadcast</Button>
          )}
        </div>
      </div>
    </>
  );
}
