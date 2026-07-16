import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { products } from "@/features/connect/flow-manager-ui/preview-data/mock-enterprise";
import { Plus, Search, Image as ImageIcon, Send, Sparkles, Star, ShoppingBag, Camera } from "lucide-react";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connect/client/catalog")({
  head: () => ({ meta: [{ title: "Catalog — Client Dashboard" }] }),
  component: ClientCatalog,
});

function ClientCatalog() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const filtered = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()));

  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <>
      <ClientTopBar
        title="Product catalog"
        subtitle="Sync with Shopify. Send rich product cards, carousels, and AI-powered image search."
        actions={
          <div className="flex gap-2">
            <Button variant="outline"><ImageIcon className="h-4 w-4" />Generate variants</Button>
            <Button><Plus className="h-4 w-4" />Add product</Button>
          </div>
        }
      />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <Tabs className="min-w-0" defaultValue="grid">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <TabsList className="max-w-full justify-start overflow-x-auto">
              <TabsTrigger value="grid">All products</TabsTrigger>
              <TabsTrigger value="carousel">Send carousel</TabsTrigger>
              <TabsTrigger value="image-search">AI image search</TabsTrigger>
            </TabsList>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU or name" className="pl-8 h-9" />
            </div>
          </div>

          <TabsContent value="grid" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map(p => (
                <Card key={p.id} className="overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-muted to-muted/40 grid place-items-center text-6xl">
                    {p.image}
                  </div>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{p.sku}</div>
                      </div>
                      <Badge variant={p.status === "active" ? "default" : p.status === "out" ? "destructive" : "secondary"} className="shrink-0 text-[10px]">
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-semibold">AED {p.price.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />{p.rating}
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground">Stock: {p.stock} · {p.category}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="carousel" className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Build a product carousel</CardTitle>
                <CardDescription>Pick up to 10 items — they render as a swipeable card set on WhatsApp / Instagram DM.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {products.map(p => {
                  const on = selected.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={cn(
                        "text-left rounded-md border p-2 flex gap-2 items-center transition",
                        on ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent/40"
                      )}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-muted text-xl">{p.image}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">AED {p.price}</div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border p-3 space-y-2">
                    <div className="text-xs text-muted-foreground">To: +971 50 991 0022 · WhatsApp</div>
                    <div className="rounded-md bg-background border p-2 text-sm">Here are some options I think you'd love 👇</div>
                    {selected.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-6 rounded-md border border-dashed">
                        Pick products to preview the carousel
                      </div>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {selected.map(id => {
                          const p = products.find(x => x.id === id)!;
                          return (
                            <div key={id} className="w-32 shrink-0 rounded-md border bg-background overflow-hidden">
                              <div className="aspect-square grid place-items-center text-3xl bg-muted">{p.image}</div>
                              <div className="p-1.5">
                                <div className="text-[11px] font-medium truncate">{p.name}</div>
                                <div className="text-[10px] text-muted-foreground">AED {p.price}</div>
                                <Button size="sm" variant="outline" className="w-full h-6 text-[10px] mt-1">Buy</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Button
                className="w-full" disabled={selected.length === 0}
                onClick={() => { toast.success(`Carousel of ${selected.length} products queued`); setSelected([]); }}
              >
                <Send className="h-4 w-4" />Send carousel ({selected.length})
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="image-search" className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Camera className="h-4 w-4" />Image → product match</CardTitle>
                <CardDescription>Customer sends a photo — AI matches it to your catalog.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-dashed p-6 grid place-items-center text-center bg-muted/20">
                  <div className="text-4xl">📱</div>
                  <div className="mt-2 text-sm font-medium">Customer photo</div>
                  <div className="text-xs text-muted-foreground">"Do you have this in stock?"</div>
                </div>
                <Button className="w-full" variant="outline" onClick={() => toast.success("Running visual match…")}>
                  <Sparkles className="h-4 w-4" />Run visual match
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top matches</CardTitle>
                <CardDescription>Based on CLIP embeddings of your catalog images.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[products[0], products[2], products[7]].map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-md border p-2">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded bg-muted text-2xl">{p.image}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">AED {p.price} · Similarity {94 - i * 8}%</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => toast.success("Product card sent")}>
                      <ShoppingBag className="h-3.5 w-3.5" />Send
                    </Button>
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
