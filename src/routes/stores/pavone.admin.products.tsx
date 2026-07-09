import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { Product, CategorySlug } from "@/stores/pavone/data/products";
import { Plus, Pencil, Trash2, Search, X, Upload } from "lucide-react";
import { deleteProduct, upsertProduct } from "@/stores/pavone/lib/pavone-api";
import { usePavoneCatalog } from "@/stores/pavone/lib/use-pavone-data";
import { uploadPavoneImage } from "@/stores/pavone/lib/supabase";

export const Route = createFileRoute("/stores/pavone/admin/products")({
  component: AdminProducts,
});

function AdminProducts() {
  const { data, error, reload } = usePavoneCatalog();
  const { products, categories } = data;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | CategorySlug>("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [products, q, cat]);

  function openNew() {
    setEditing({
      id: "p" + Math.random().toString(36).slice(2, 8),
      slug: "new-product",
      name: "",
      description: "",
      category: "dresses",
      price: 0,
      images: [""],
      sizes: ["S", "M", "L"],
      colors: [{ name: "Default", hex: "#f4b8d8" }],
      inStock: true,
    });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing({ ...p });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    const slug = editing.slug || editing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await upsertProduct({ ...editing, slug });
    await reload();
    setOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-cocoa">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} items in your catalog</p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-cocoa text-ivory px-4 py-2.5 text-sm hover:bg-cocoa/90">
          <Plus className="h-4 w-4" /> Add product
        </button>
      </header>

      <div className="flex flex-wrap gap-3 items-center bg-background rounded-xl border border-border p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-pink/40"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value as typeof cat)}
          className="px-3 py-2 text-sm rounded-md border border-input bg-background"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream/60 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Category</th>
              <th className="text-left px-4 py-3">Price</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Stock</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-cream/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-cream" />
                    )}
                    <div>
                      <div className="font-medium text-cocoa">{p.name || <span className="italic text-muted-foreground">Untitled</span>}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">/{p.slug}</span>
                        {p.tags?.includes("new") && (
                          <span className="rounded-full bg-pink/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-pink">
                            New arrival
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell capitalize">{p.category.replace("-", " ")}</td>
                <td className="px-4 py-3">
                  {p.salePrice ? (
                    <span><span className="line-through text-muted-foreground">${p.price}</span> <span className="text-pink font-medium">${p.salePrice}</span></span>
                  ) : (
                    <span>${p.price}</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.inStock ? "bg-mint/50 text-cocoa" : "bg-destructive/15 text-destructive"}`}>
                    {p.inStock ? "In stock" : "Sold out"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-2 rounded-md hover:bg-cream text-muted-foreground hover:text-cocoa">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => { if (confirm(`Delete "${p.name}"?`)) { await deleteProduct(p.id); await reload(); } }}
                      className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-sm text-muted-foreground">No products match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && editing && (
        <ProductDialog
          product={editing}
          categories={categories}
          onChange={setEditing}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={save}
        />
      )}
    </div>
  );
}

function ProductDialog({
  product, categories, onChange, onClose, onSave,
}: {
  product: Product;
  categories: { slug: CategorySlug; name: string }[];
  onChange: (p: Product) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const url = await uploadPavoneImage(file, "products");
      onChange({ ...product, images: [url, ...product.images.slice(1)] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not upload image.");
    } finally {
      setUploading(false);
    }
  }

  function toggleNewArrival(checked: boolean) {
    const tags = product.tags ?? [];
    const nextTags: Product["tags"] = checked
      ? Array.from(new Set([...tags, "new"]))
      : tags.filter((tag) => tag !== "new");
    onChange({ ...product, tags: nextTags });
  }

  return (
    <div className="fixed inset-0 z-50 bg-cocoa/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl max-w-2xl w-full my-8 shadow-soft border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-2xl text-cocoa">{product.name ? "Edit product" : "New product"}</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-cream"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <Field label="Name">
            <input value={product.name} onChange={(e) => onChange({ ...product, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Slug">
            <input value={product.slug} onChange={(e) => onChange({ ...product, slug: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Description">
            <textarea rows={3} value={product.description} onChange={(e) => onChange({ ...product, description: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select value={product.category} onChange={(e) => onChange({ ...product, category: e.target.value as CategorySlug })} className={inputCls}>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="In stock">
              <select value={product.inStock ? "1" : "0"} onChange={(e) => onChange({ ...product, inStock: e.target.value === "1" })} className={inputCls}>
                <option value="1">In stock</option>
                <option value="0">Sold out</option>
              </select>
            </Field>
            <Field label="Price ($)">
              <input type="number" value={product.price} onChange={(e) => onChange({ ...product, price: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Sale price ($)">
              <input type="number" value={product.salePrice ?? ""} onChange={(e) => onChange({ ...product, salePrice: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />
            </Field>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-cream/35 p-4">
            <input
              type="checkbox"
              checked={product.tags?.includes("new") ?? false}
              onChange={(e) => toggleNewArrival(e.target.checked)}
              className="mt-1 h-4 w-4 accent-pink"
            />
            <span>
              <span className="block text-sm font-medium text-cocoa">Show in New Arrivals</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Checked products appear in the homepage New Arrivals section.</span>
            </span>
          </label>
          <Field label="Product image">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-cream/40 px-4 py-4 text-sm text-cocoa hover:bg-cream">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload image"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => void uploadImage(e.target.files?.[0])}
              />
            </label>
            {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
            <input
              value={product.images[0] ?? ""}
              onChange={(e) => onChange({ ...product, images: [e.target.value, ...product.images.slice(1)] })}
              className={`${inputCls} mt-2`}
              placeholder="https://..."
            />
            {product.images[0] && <img src={product.images[0]} alt="" className="mt-2 h-32 w-32 rounded-lg object-cover" />}
          </Field>
          <Field label="Sizes (comma separated)">
            <input
              value={product.sizes.join(", ")}
              onChange={(e) => onChange({ ...product, sizes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-cream/30">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-cream">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 text-sm rounded-lg bg-cocoa text-ivory hover:bg-cocoa/90">Save product</button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-pink/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
