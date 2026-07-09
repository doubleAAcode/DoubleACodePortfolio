import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { Product } from "@/stores/pavone/data/products";
import { deleteOutfitInspiration, upsertOutfitInspiration, type OutfitInspiration } from "@/stores/pavone/lib/pavone-api";
import { usePavoneCatalog, usePavoneOutfits } from "@/stores/pavone/lib/use-pavone-data";

export const Route = createFileRoute("/stores/pavone/admin/inspirations")({
  component: AdminInspirations,
});

type Draft = {
  id?: string;
  title: string;
  note: string;
  productIds: string[];
  isActive: boolean;
  sortOrder: number;
};

function AdminInspirations() {
  const catalog = usePavoneCatalog();
  const outfits = usePavoneOutfits(true);
  const products = catalog.data.products;
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function openNew() {
    setError("");
    setEditing({
      title: "",
      note: "",
      productIds: products.slice(0, 3).map((p) => p.id),
      isActive: true,
      sortOrder: outfits.data.length,
    });
  }

  function openEdit(outfit: OutfitInspiration) {
    setError("");
    setEditing({
      id: outfit.id,
      title: outfit.title,
      note: outfit.note,
      productIds: outfit.productIds,
      isActive: outfit.isActive,
      sortOrder: outfit.sortOrder,
    });
  }

  async function save() {
    if (!editing) return;
    setError("");
    const uniqueIds = [...new Set(editing.productIds.filter(Boolean))];
    if (!editing.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (uniqueIds.length < 3) {
      setError("Choose at least 3 products for an outfit inspiration.");
      return;
    }
    await upsertOutfitInspiration({ ...editing, title: editing.title.trim(), note: editing.note.trim(), productIds: uniqueIds });
    await outfits.reload();
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this outfit inspiration?")) return;
    await deleteOutfitInspiration(id);
    await outfits.reload();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-cocoa">Outfit Inspirations</h1>
          <p className="text-sm text-muted-foreground mt-1">Create homepage looks from 3 or more products.</p>
          {(catalog.error || outfits.error) && <p className="mt-2 text-sm text-destructive">{catalog.error || outfits.error}</p>}
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-cocoa text-ivory px-4 py-2.5 text-sm hover:bg-cocoa/90">
          <Plus className="h-4 w-4" /> Add inspiration
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {outfits.data.map((outfit) => {
          const items = outfit.productIds
            .map((id) => productById.get(id))
            .filter((item): item is Product => Boolean(item));
          return (
            <article key={outfit.id} className="rounded-2xl border border-border bg-background p-4">
              <div className="grid grid-cols-5 gap-2">
                {items.slice(0, 3).map((item, index) => (
                  <div key={item.id} className={`${index === 0 ? "col-span-3 row-span-2 aspect-[3/4]" : "col-span-2 aspect-square"} overflow-hidden rounded-xl bg-cream`}>
                    <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-cocoa">{outfit.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{outfit.note}</p>
                  <div className="mt-2 text-xs text-muted-foreground">{items.length} item(s) · {outfit.isActive ? "Active" : "Hidden"}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(outfit)} className="rounded-md p-2 text-muted-foreground hover:bg-cream hover:text-cocoa">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => void remove(outfit.id)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {outfits.data.length === 0 && (
          <div className="rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground lg:col-span-3">
            No outfit inspirations yet.
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-2xl text-cocoa">{editing.id ? "Edit inspiration" : "New inspiration"}</h2>
              <button onClick={() => setEditing(null)} className="rounded-md p-2 hover:bg-cream"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4 p-6">
              <Field label="Title">
                <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Note">
                <textarea rows={2} value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <select value={editing.isActive ? "1" : "0"} onChange={(e) => setEditing({ ...editing, isActive: e.target.value === "1" })} className={inputCls}>
                    <option value="1">Active</option>
                    <option value="0">Hidden</option>
                  </select>
                </Field>
                <Field label="Sort order">
                  <input type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} className={inputCls} />
                </Field>
              </div>

              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">Products</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {products.map((product) => {
                    const checked = editing.productIds.includes(product.id);
                    return (
                      <label key={product.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${checked ? "border-pink bg-blush/20" : "border-border bg-background"}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setEditing({
                              ...editing,
                              productIds: e.target.checked
                                ? [...editing.productIds, product.id]
                                : editing.productIds.filter((id) => id !== product.id),
                            });
                          }}
                        />
                        <img src={product.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                        <span className="min-w-0">
                          <span className="block truncate text-cocoa">{product.name}</span>
                          <span className="text-xs text-muted-foreground">${product.salePrice ?? product.price}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-border bg-cream/30 px-6 py-4">
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm hover:bg-cream">Cancel</button>
              <button onClick={() => void save()} className="rounded-lg bg-cocoa px-4 py-2 text-sm text-ivory hover:bg-cocoa/90">Save inspiration</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-pink/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
