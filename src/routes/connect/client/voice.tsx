import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { voiceProfiles, voiceCallLog } from "@/features/connect/flow-manager-ui/preview-data/mock-enterprise";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { Mic, Play, Pause, Phone, PhoneIncoming, PhoneOutgoing, Volume2, Waves, Sparkles } from "lucide-react";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connect/client/voice")({
  head: () => ({ meta: [{ title: "Voice — Client Dashboard" }] }),
  component: ClientVoice,
});

function ClientVoice() {
  const [selectedVoice, setSelectedVoice] = useState(voiceProfiles[0].id);
  const [playing, setPlaying] = useState<string | null>(null);
  const [ttsText, setTtsText] = useState("Marhaba! Your order has shipped and will arrive Thursday between 2 and 5 pm.");
  const [stability, setStability] = useState([65]);
  const [clarity, setClarity] = useState([80]);

  const togglePlay = (id: string) => {
    setPlaying(p => (p === id ? null : id));
    if (playing !== id) setTimeout(() => setPlaying(null), 1800);
  };

  return (
    <>
      <ClientTopBar
        title="Voice"
        subtitle="Text-to-speech, voice notes, and AI calling agent."
        actions={
          <Button onClick={() => toast.success("Voice agent redeployed")}>
            <Sparkles className="h-4 w-4" /> Deploy voice agent
          </Button>
        }
      />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <Tabs className="min-w-0" defaultValue="tts">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="tts">Text-to-speech</TabsTrigger>
            <TabsTrigger value="notes">Voice notes</TabsTrigger>
            <TabsTrigger value="calling">AI calling agent</TabsTrigger>
            <TabsTrigger value="calls">Call log</TabsTrigger>
          </TabsList>

          <TabsContent value="tts" className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Voice library</CardTitle>
                  <CardDescription>Pick the voice your AI uses on WhatsApp voice notes and calls.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {voiceProfiles.map(v => {
                    const active = selectedVoice === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVoice(v.id)}
                        className={cn(
                          "text-left rounded-lg border p-3 hover:bg-accent/40 transition",
                          active && "border-primary ring-1 ring-primary bg-primary/5"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                            <Mic className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold flex items-center gap-2">
                              {v.name}
                              {active && <Badge className="h-4 px-1.5 text-[9px]">SELECTED</Badge>}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{v.provider} · {v.gender} · {v.accent}</div>
                          </div>
                          <Button
                            size="icon" variant="ghost"
                            onClick={(e) => { e.stopPropagation(); togglePlay(v.id); }}
                          >
                            {playing === v.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="mt-2 h-8 rounded bg-muted overflow-hidden relative">
                          <div className="absolute inset-0 flex items-center gap-0.5 px-1">
                            {Array.from({ length: 40 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "flex-1 rounded-sm transition-all",
                                  playing === v.id ? "bg-primary" : "bg-muted-foreground/30"
                                )}
                                style={{ height: `${20 + Math.abs(Math.sin(i * 0.6 + parseInt(v.id.replace("v",""))) * 60)}%` }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{v.language}</div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Volume2 className="h-4 w-4" />Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea value={ttsText} onChange={(e) => setTtsText(e.target.value)} rows={4} />
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Stability</span><span>{stability[0]}%</span></div>
                    <Slider value={stability} onValueChange={setStability} max={100} step={1} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Clarity + similarity</span><span>{clarity[0]}%</span></div>
                    <Slider value={clarity} onValueChange={setClarity} max={100} step={1} />
                  </div>
                  <Button className="w-full" onClick={() => { togglePlay("preview"); toast.success("Generating audio…"); }}>
                    <Waves className="h-4 w-4" />Generate preview
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Usage this month</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">TTS characters</span><span className="tabular-nums font-semibold">184,220 / 500k</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Voice notes sent</span><span className="tabular-nums font-semibold">1,842</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Call minutes</span><span className="tabular-nums font-semibold">312</span></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-4 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Voice-note replies</CardTitle>
                <CardDescription>Let the AI send voice notes on WhatsApp instead of text.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <label className="flex items-center justify-between"><span>Enable outbound voice notes</span><Switch defaultChecked /></label>
                <label className="flex items-center justify-between"><span>Auto-reply with voice when customer sends voice</span><Switch defaultChecked /></label>
                <label className="flex items-center justify-between"><span>Fallback to text if voice fails</span><Switch defaultChecked /></label>
                <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                  Voice notes count as Utility conversations under Meta pricing when initiated by the business.
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Incoming voice → text</CardTitle>
                <CardDescription>Transcribe voice messages so agents can search & respond fast.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <label className="flex items-center justify-between"><span>Transcribe incoming voice</span><Switch defaultChecked /></label>
                <label className="flex items-center justify-between"><span>Auto-translate to English in the sidebar</span><Switch defaultChecked /></label>
                <label className="flex items-center justify-between"><span>Redact PII in transcripts</span><Switch /></label>
                <div className="rounded-md border p-3 bg-background">
                  <div className="text-xs font-medium mb-1">Sample transcript</div>
                  <div className="text-sm">"Hi, I received the wrong colour earbuds — the box says white but they're black. Can I swap them?"</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">whisper-large-v3 · 0.94 confidence · Arabic → English</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calling" className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Phone className="h-4 w-4" />AI voice agent</CardTitle>
                <CardDescription>Answers inbound calls, qualifies, books, and hands off. Powered by Twilio + ElevenLabs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  <div className="rounded border p-3">
                    <div className="text-xs text-muted-foreground">Business number</div>
                    <div className="font-mono">+971 4 555 0100</div>
                  </div>
                  <div className="rounded border p-3">
                    <div className="text-xs text-muted-foreground">Concurrent calls</div>
                    <div className="font-semibold">Up to 25</div>
                  </div>
                  <div className="rounded border p-3">
                    <div className="text-xs text-muted-foreground">Avg latency</div>
                    <div className="font-semibold text-emerald-600">640 ms</div>
                  </div>
                  <div className="rounded border p-3">
                    <div className="text-xs text-muted-foreground">Interruption handling</div>
                    <div className="font-semibold">Barge-in enabled</div>
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <label className="flex items-center justify-between text-sm"><span>Answer inbound after hours</span><Switch defaultChecked /></label>
                  <label className="flex items-center justify-between text-sm"><span>Outbound follow-ups on abandoned carts</span><Switch /></label>
                  <label className="flex items-center justify-between text-sm"><span>Record calls (with consent prompt)</span><Switch defaultChecked /></label>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Handoff to human</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="text-muted-foreground">When AI can't handle it, warm-transfer to on-call agent with full transcript context.</p>
                <div className="rounded border p-2 bg-muted/30 text-xs">
                  <div className="font-medium">On-call now</div>
                  <div>Amira K. · +971 50 220 4411</div>
                </div>
                <Button variant="outline" className="w-full">Configure escalation script</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calls" className="mt-4">
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Contact</th>
                    <th className="text-left p-3">Direction</th>
                    <th className="text-left p-3">Duration</th>
                    <th className="text-left p-3">Outcome</th>
                    <th className="text-left p-3">Transcript preview</th>
                    <th className="text-left p-3">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {voiceCallLog.map(c => (
                    <tr key={c.id} className="hover:bg-accent/30">
                      <td className="p-3">
                        <div className="font-medium">{c.contact}</div>
                        <div className="text-xs text-muted-foreground font-mono">{c.number}</div>
                      </td>
                      <td className="p-3">
                        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
                          c.direction === "inbound" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                        )}>
                          {c.direction === "inbound" ? <PhoneIncoming className="h-3 w-3" /> : <PhoneOutgoing className="h-3 w-3" />}
                          {c.direction}
                        </span>
                      </td>
                      <td className="p-3 tabular-nums">{Math.floor(c.durationSec / 60)}:{String(c.durationSec % 60).padStart(2, "0")}</td>
                      <td className="p-3">{c.outcome}</td>
                      <td className="p-3 text-muted-foreground max-w-sm truncate">"{c.transcript}"</td>
                      <td className="p-3 text-xs text-muted-foreground">{formatDistanceToNow(c.ts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
