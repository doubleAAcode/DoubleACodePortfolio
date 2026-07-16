import { createFileRoute } from "@tanstack/react-router";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { aiAgentConfig } from "@/features/connect/flow-manager-ui/preview-data/mock-client";
import { agentTools, handoffRules } from "@/features/connect/flow-manager-ui/preview-data/mock-enterprise";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, FileText, Link2, MessageSquareText, Table2, Plus, Send, Bot, ShieldCheck, Wrench, GitBranch, Upload, Search, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connect/client/ai-agent")({
  head: () => ({ meta: [{ title: "AI Agent — Client Dashboard" }] }),
  component: ClientAIAgent,
});

const iconFor = (k: string) => k === "url" ? Link2 : k === "doc" ? FileText : k === "sheet" ? Table2 : MessageSquareText;

const toolCategoryColor = {
  catalog: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  orders: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  scheduling: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  handoff: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  custom: "bg-muted text-muted-foreground",
} as const;

function ClientAIAgent() {
  const [enabled, setEnabled] = useState(aiAgentConfig.enabled);
  const [confidence, setConfidence] = useState([60]);
  const [testInput, setTestInput] = useState("");
  const [testLog, setTestLog] = useState<{ from: "you" | "ai" | "tool"; text: string; tool?: string; args?: string }[]>([
    { from: "ai", text: `Hi! I'm ${aiAgentConfig.name}. Ask me anything — I can search products, check stock, and place orders.` },
  ]);

  const sendTest = () => {
    if (!testInput.trim()) return;
    const msg = testInput;
    setTestLog(l => [...l, { from: "you", text: msg }]);
    setTestInput("");
    setTimeout(() => {
      setTestLog(l => [
        ...l,
        { from: "tool", text: "Calling search_products…", tool: "search_products", args: `{ "query": "${msg.slice(0, 30)}", "limit": 3 }` },
      ]);
    }, 400);
    setTimeout(() => {
      setTestLog(l => [
        ...l,
        { from: "ai", text: "I found 3 matches. The Atlas Pro Wireless Earbuds (AED 449) has 128 in stock in Dubai. Want me to reserve a pair and send a payment link?" },
      ]);
    }, 1100);
  };

  return (
    <>
      <ClientTopBar
        title="AI Agent"
        subtitle="Tool-calling, RAG, guardrails, and human handoff."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-sm">{enabled ? "Live" : "Paused"}</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        }
      />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <Tabs className="min-w-0" defaultValue="persona">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="persona"><Bot className="h-3.5 w-3.5" />Persona</TabsTrigger>
            <TabsTrigger value="tools"><Wrench className="h-3.5 w-3.5" />Tools</TabsTrigger>
            <TabsTrigger value="knowledge"><FileText className="h-3.5 w-3.5" />Knowledge (RAG)</TabsTrigger>
            <TabsTrigger value="handoff"><GitBranch className="h-3.5 w-3.5" />Handoff</TabsTrigger>
            <TabsTrigger value="playground"><Sparkles className="h-3.5 w-3.5" />Playground</TabsTrigger>
          </TabsList>

          <TabsContent value="persona" className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Persona & tone</CardTitle>
                  <CardDescription>How the AI should sound and behave.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Agent name</label>
                    <Input defaultValue={aiAgentConfig.name} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Persona instructions</label>
                    <Textarea defaultValue={aiAgentConfig.persona} rows={4} className="mt-1" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Model</label>
                      <Input defaultValue="gpt-4o + claude-3.5-sonnet (router)" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Fallback</label>
                      <Input defaultValue="gpt-4o-mini" className="mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Guardrails</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {aiAgentConfig.guardrails.map((g, i) => (
                      <li key={i} className="flex items-start gap-2 rounded-md border bg-muted/20 p-2.5 text-sm">
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="flex-1">{g}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" className="mt-3"><Plus className="h-3.5 w-3.5" />Add guardrail</Button>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Channels</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(aiAgentConfig.channels).map(([k, v]) => (
                  <label key={k} className="flex items-center justify-between rounded-md border bg-muted/20 p-3 text-sm cursor-pointer">
                    <span className="capitalize">{k}</span>
                    <Switch defaultChecked={v} />
                  </label>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold">Function-calling tools</div>
                <div className="text-xs text-muted-foreground">The AI decides when to call these to fulfil requests.</div>
              </div>
              <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5" />Add custom tool</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {agentTools.map(t => (
                <Card key={t.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono font-semibold">{t.name}</code>
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", toolCategoryColor[t.category])}>
                            {t.category}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
                      </div>
                      <Switch defaultChecked={t.enabled} />
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {t.params.map(p => (
                        <code key={p.name} className="text-[10px] rounded bg-muted px-1.5 py-0.5">
                          {p.name}: {p.type}{p.required && "*"}
                        </code>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                      <span>{t.calls30d.toLocaleString()} calls / 30d</span>
                      <span className={cn(t.successPct >= 95 ? "text-emerald-600" : "text-amber-600")}>{t.successPct}% success</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="knowledge" className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>Knowledge sources (RAG)</CardTitle>
                    <CardDescription>Embedded and cited when the AI answers.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Upload className="h-3.5 w-3.5" />Upload PDF</Button>
                    <Button size="sm"><Plus className="h-3.5 w-3.5" />Add source</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {aiAgentConfig.knowledgeSources.map(s => {
                      const Icon = iconFor(s.kind);
                      return (
                        <li key={s.id} className="flex items-center gap-3 py-2.5">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{s.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{s.value} · updated {formatDistanceToNow(s.updated)}</div>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">{s.kind}</Badge>
                          <Button variant="ghost" size="sm">Re-index</Button>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Search className="h-4 w-4" />Test retrieval</CardTitle>
                  <CardDescription>See which chunks the AI would pull for a question.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input placeholder="e.g. what's the warranty on earbuds?" />
                  <div className="space-y-1.5">
                    {[
                      { src: "returns-policy.pdf", score: 0.92, snippet: "Wireless audio products carry a 24-month manufacturer warranty covering defects…" },
                      { src: "faq", score: 0.81, snippet: "Q: How long is the warranty? A: 24 months from date of purchase for audio devices." },
                      { src: "atlaselectronics.ae/products", score: 0.64, snippet: "Every Atlas Pro model ships with our extended care option." },
                    ].map(c => (
                      <div key={c.src} className="rounded border p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <code className="text-primary">{c.src}</code>
                          <Badge variant="outline" className="text-[10px]">score {c.score}</Badge>
                        </div>
                        <div className="text-muted-foreground">"{c.snippet}"</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Embeddings</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Total chunks</span><span className="font-semibold tabular-nums">18,240</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="font-mono text-xs">text-embedding-3-large</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vector store</span><span className="font-mono text-xs">pgvector</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last full re-index</span><span>2 days ago</span></div>
                <Button variant="outline" className="w-full mt-2" onClick={() => toast.success("Re-index started")}>Re-index everything</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="handoff" className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Handoff rules</CardTitle>
                  <CardDescription>When the AI should escalate to a human.</CardDescription>
                </div>
                <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" />Add rule</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {handoffRules.map(r => (
                  <div key={r.id} className="flex items-center gap-3 rounded-md border p-3">
                    <Switch defaultChecked={r.enabled} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{r.when}</div>
                      <div className="text-xs text-muted-foreground">→ {r.to}</div>
                    </div>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Confidence threshold</CardTitle>
                <CardDescription>Below this, hand off to a human.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-semibold tabular-nums text-center">{confidence[0]}%</div>
                <Slider value={confidence} onValueChange={setConfidence} max={100} step={1} />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Autonomous</span><span>Copilot</span>
                </div>
                <div className="rounded border p-2 text-xs bg-muted/30">
                  <div className="font-medium mb-0.5">Copilot mode</div>
                  <div className="text-muted-foreground">Agent drafts reply, human clicks send.</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="playground" className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Live playground</CardTitle>
                <CardDescription>Watch tool calls in real time.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t max-h-[440px] overflow-y-auto p-3 space-y-2 bg-muted/20">
                  {testLog.map((m, i) => {
                    if (m.from === "tool") {
                      return (
                        <div key={i} className="mx-auto max-w-[85%] rounded-md border border-dashed bg-background p-2 text-xs font-mono">
                          <div className="flex items-center gap-1.5 text-primary mb-1">
                            <Wrench className="h-3 w-3" />tool_call · {m.tool}
                          </div>
                          <code className="text-muted-foreground">{m.args}</code>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm ${
                          m.from === "you" ? "bg-primary text-primary-foreground" : "bg-background border"
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t p-3 flex gap-2">
                  <Input
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendTest()}
                    placeholder="Try: do you have the Pro earbuds in stock?"
                  />
                  <Button size="icon" onClick={sendTest}><Send className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>This month</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Conversations handled</span><span className="font-semibold tabular-nums">2,441</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Deflection rate</span><span className="font-semibold text-emerald-600">68%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tool calls</span><span className="font-semibold tabular-nums">3,775</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Avg CSAT</span><span className="font-semibold">4.4 / 5</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Escalated to human</span><span className="font-semibold tabular-nums">312</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" />Top tool</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  <code className="font-mono font-semibold">search_products</code>
                  <div className="text-xs text-muted-foreground mt-1">1,842 calls · 98% success</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
