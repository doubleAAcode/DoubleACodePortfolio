import { createFileRoute } from "@tanstack/react-router";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { enterpriseSecurity, complianceCerts, auditExports } from "@/features/connect/flow-manager-ui/preview-data/mock-enterprise";
import { ShieldCheck, KeyRound, Globe, Lock, FileDown, Users, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";

export const Route = createFileRoute("/connect/client/enterprise")({
  head: () => ({ meta: [{ title: "Enterprise — Client Dashboard" }] }),
  component: ClientEnterprise,
});

function ClientEnterprise() {
  const s = enterpriseSecurity;
  return (
    <>
      <ClientTopBar
        title="Enterprise"
        subtitle="SSO, SCIM, data residency, compliance, and audit."
        actions={<Badge className="bg-gradient-to-r from-primary to-primary/70">Enterprise plan</Badge>}
      />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <Tabs className="min-w-0" defaultValue="security">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="sso">SSO & SCIM</TabsTrigger>
            <TabsTrigger value="residency">Data residency</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="audit">Audit export</TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Access controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <label className="flex items-center justify-between"><span>Require 2FA for all members</span><Switch defaultChecked /></label>
                <label className="flex items-center justify-between"><span>Session timeout after 30 min idle</span><Switch defaultChecked /></label>
                <label className="flex items-center justify-between"><span>Block downloads from unmanaged devices</span><Switch /></label>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">IP allowlist ({s.ipAllowlist.length})</div>
                  <div className="space-y-1">
                    {s.ipAllowlist.map(ip => (
                      <div key={ip} className="flex items-center justify-between rounded border px-2 py-1 font-mono text-xs">
                        {ip}<button className="text-muted-foreground hover:text-destructive">remove</button>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="mt-2"><Plus className="h-3.5 w-3.5" />Add IP or CIDR</Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" />Encryption</CardTitle>
                <CardDescription>All data encrypted at rest (AES-256) and in transit (TLS 1.3).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <label className="flex items-center justify-between"><span>Customer-managed KMS key (BYOK)</span><Switch defaultChecked={s.encryption.customerManagedKey} /></label>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">KMS Key alias</div>
                  <Input defaultValue={s.encryption.kmsAlias} className="font-mono text-xs" />
                </div>
                <div className="grid gap-2 sm:grid-cols-3 pt-2">
                  <div className="rounded border p-2">
                    <div className="text-[11px] text-muted-foreground">Conversations</div>
                    <div className="text-sm font-semibold">{s.retention.conversations}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-[11px] text-muted-foreground">Audit logs</div>
                    <div className="text-sm font-semibold">{s.retention.audit}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-[11px] text-muted-foreground">PII</div>
                    <div className="text-sm font-semibold">{s.retention.pii}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sso" className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" />Single Sign-On</CardTitle>
                <CardDescription>SAML 2.0 and OIDC. Enforce for the entire workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-md border p-3 bg-emerald-500/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="font-medium">Connected via {s.sso.provider}</div>
                      <div className="text-xs text-muted-foreground">{s.sso.protocol} · {s.sso.domain}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">{s.sso.enforced ? "Enforced" : "Optional"}</Badge>
                </div>
                <label className="flex items-center justify-between"><span>Enforce SSO (block password login)</span><Switch defaultChecked={s.sso.enforced} /></label>
                <label className="flex items-center justify-between"><span>Just-in-time provisioning</span><Switch defaultChecked /></label>
                <div className="grid gap-2 sm:grid-cols-2 pt-2">
                  <Button variant="outline" size="sm">Download metadata</Button>
                  <Button variant="outline" size="sm">Test SAML response</Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />SCIM provisioning</CardTitle>
                <CardDescription>Automate user + group lifecycle from your IdP.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <label className="flex items-center justify-between"><span>SCIM enabled</span><Switch defaultChecked={s.scim.enabled} /></label>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">SCIM endpoint</div>
                  <Input defaultValue={s.scim.endpoint} readOnly className="font-mono text-xs" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Bearer token</div>
                  <div className="flex gap-2">
                    <Input defaultValue="scim_••••••••••••••e4a2" readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="sm" onClick={() => toast.success("SCIM token rotated")}>Rotate</Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Last sync {formatDistanceToNow(s.scim.lastSync)} · 34 users synced</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="residency" className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" />Data residency</CardTitle>
                <CardDescription>Choose the region where customer data is stored and processed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {s.residencyOptions.map(r => {
                  const active = r === s.dataResidency;
                  return (
                    <label key={r} className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-accent/40">
                      <div className="flex items-center gap-2">
                        <input type="radio" name="residency" defaultChecked={active} />
                        <span className="text-sm">{r}</span>
                      </div>
                      {active && <Badge>Current</Badge>}
                    </label>
                  );
                })}
                <div className="text-xs text-muted-foreground">Changing region triggers a scheduled migration (~24 hours) with zero downtime.</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sub-processors</CardTitle>
                <CardDescription>Third parties that process customer data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { name: "Meta (WhatsApp Cloud API)", region: "Global", role: "Channel provider" },
                  { name: "AWS", region: "me-central-1", role: "Infra & storage" },
                  { name: "OpenAI", region: "US (contractual EU/US DPF)", role: "AI models (opt-in)" },
                  { name: "ElevenLabs", region: "US", role: "Voice synthesis (opt-in)" },
                  { name: "Twilio", region: "Global", role: "Voice + SMS" },
                ].map(sp => (
                  <div key={sp.name} className="flex items-center justify-between rounded border p-2">
                    <div>
                      <div className="font-medium">{sp.name}</div>
                      <div className="text-xs text-muted-foreground">{sp.role} · {sp.region}</div>
                    </div>
                    <Button variant="ghost" size="sm">DPA</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {complianceCerts.map(c => (
              <Card key={c.name}>
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <div className="font-semibold">{c.name}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{c.status}</div>
                  <div className="text-[11px] text-muted-foreground">Updated {c.updated}</div>
                  <Button size="sm" variant="outline" className="w-full mt-2">Download report</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="audit" className="mt-4 space-y-3">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Audit log export</CardTitle>
                  <CardDescription>Full immutable audit trail — SIEM-ready (JSONL, CSV, or streamed to S3).</CardDescription>
                </div>
                <Button onClick={() => toast.success("Export queued — you'll get an email")}>
                  <FileDown className="h-4 w-4" />New export
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr><th className="text-left p-3">Range</th><th className="text-left p-3">Events</th><th className="text-left p-3">Size</th><th className="text-left p-3">Requested by</th><th className="text-left p-3">When</th><th className="p-3"></th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditExports.map(e => (
                      <tr key={e.id}>
                        <td className="p-3 font-medium">{e.range}</td>
                        <td className="p-3 tabular-nums">{e.events.toLocaleString()}</td>
                        <td className="p-3">{e.size}</td>
                        <td className="p-3">{e.by}</td>
                        <td className="p-3 text-xs text-muted-foreground">{formatDistanceToNow(e.ts)}</td>
                        <td className="p-3 text-right"><Button size="sm" variant="outline">Download</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Streaming</CardTitle>
                <CardDescription>Push every event to your SIEM in real time.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-3">
                {["Splunk HEC", "Datadog", "AWS S3 + Kinesis"].map(t => (
                  <div key={t} className="rounded border p-3 flex items-center justify-between text-sm">
                    <span>{t}</span>
                    <Button size="sm" variant="outline">Configure</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
