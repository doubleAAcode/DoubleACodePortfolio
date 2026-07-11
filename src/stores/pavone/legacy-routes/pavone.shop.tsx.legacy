import { createFileRoute, Link } from "@tanstack/react-router";
import { ProductCard } from "@/stores/pavone/components/ProductCard";
import type { CategorySlug } from "@/stores/pavone/data/products";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PavoneShell } from "@/stores/pavone/PavoneShell";
import { PavoneDataState, usePavoneCatalog } from "@/stores/pavone/lib/use-pavone-data";

export const Route = createFileRoute("/stores/pavone/shop")({
  head: () => ({
    meta: [
      { title: "Shop All — Pavone.lb" },
      { name: "description", content: "Browse all Pavone.lb modest fashion: dresses, sets, scarves, formal wear and the latest collection." },
      { property: "og:title", content: "Shop All — Pavone.lb" },
      { property: "og:description", content: "Browse all Pavone.lb modest fashion." },
      { property: "og:url", content: "/stores/pavone/shop" },
    ],
    links: [{ rel: "canonical", href: "/stores/pavone/shop" }],
  }),
  component: PavoneShopRoute,
});

function PavoneShopRoute() {
  return (
    <PavoneShell>
      <ShopPage />
    </PavoneShell>
  );
}

function ShopPage() {
  const { data, loading, error } = usePavoneCatalog();
  const { products, categories } = data;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategorySlug | "all">("all");
  const [maxPrice, setMaxPrice] = useState(300);
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc" | "new">("featured");

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      const price = p.salePrice ?? p.price;
      if (price > maxPrice) return false;
      if (q && !`${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    if (sort === "price-desc") list = [...list].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    if (sort === "new") list = [...list].sort((a, b) => Number(b.tags?.includes("new")) - Number(a.tags?.includes("new")));
    return list;
  }, [products, q, cat, maxPrice, sort]);

  return (
    <PavoneDataState loading={loading} error={error} empty={products.length === 0}>
    <div className="container-page py-12 md:py-16">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-display text-5xl md:text-6xl">The Collection</h1>
        <p className="mt-3 text-muted-foreground">Every piece, hand-selected. Filter, search, and find your next favorite.</p>
      </div>

      <div className="mt-10 grid lg:grid-cols-[260px_1fr] gap-10">
        <aside className="space-y-7">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full pl-9 pr-3 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Category</div>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={cat === "all"} onClick={() => setCat("all")}>All</FilterChip>
              {categories.map((c) => (
                <FilterChip key={c.slug} active={cat === c.slug} onClick={() => setCat(c.slug)}>{c.name}</FilterChip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Max price: ${maxPrice}</div>
            <input type="range" min={40} max={300} step={5} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-cocoa" />
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Sort</div>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
              className="w-full px-3 py-2.5 rounded-full border border-border bg-background text-sm">
              <option value="featured">Featured</option>
              <option value="new">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>
        </aside>

        <div>
          <div className="text-sm text-muted-foreground mb-4">{filtered.length} pieces</div>
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-2xl">Nothing matches just yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Try widening your filters or <Link to="/stores/pavone/shop" className="underline">reset</Link>.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-8">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
    </PavoneDataState>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs tracking-wide border transition-colors ${
        active ? "bg-cocoa text-ivory border-cocoa" : "bg-background border-border hover:border-taupe"
      }`}
    >
      {children}
    </button>
  );
}
