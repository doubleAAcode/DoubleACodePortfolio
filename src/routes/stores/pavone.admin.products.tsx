import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/stores/pavone-new/lib/brand";
import {
  catalogKeys,
  deleteProduct,
  fetchBrands,
  fetchCategories,
  fetchProducts,
  uploadBoutiqueImage,
  upsertProduct,
  type Product,
} from "@/stores/pavone-new/lib/catalog";

export const Route = createFileRoute("/stores/pavone/admin/products")({
  component: AdminProducts,
  head: () => ({ meta: [{ title: "Products - Admin" }, { name: "robots", content: "noindex" }] }),
});

interface FormState {
  id?: string;
  name: string;
  slug?: string;
  description: string;
  category_id: string;
  brand_id: string;
  price: string;
  sale_price: string;
  sizes: string;
  colors: string;
  stock_quantity: string;
  sku: string;
  is_featured: boolean;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  is_active: boolean;
  images: string[];
}

const EMPTY: FormState = {
  name: "",
  description: "",
  category_id: "",
  brand_id: "",
  price: "",
  sale_price: "",
  sizes: "XS, S, M, L",
  colors: "",
  stock_quantity: "0",
  sku: "",
  is_featured: false,
  is_best_seller: false,
  is_new_arrival: true,
  is_active: true,
  images: [],
};

function AdminProducts() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery({
    queryKey: catalogKeys.products,
    queryFn: () => fetchProducts(true),
  });
  const { data: categories = [] } = useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () => fetchCategories(true),
  });
  const { data: brands = [] } = useQuery({
    queryKey: catalogKeys.brands,
    queryFn: () => fetchBrands(true),
  });

  const [form, setForm] = useState<FormState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (product) =>
          product.name.toLowerCase().includes(q) || (product.sku ?? "").toLowerCase().includes(q),
      );
    }
    if (filterCategory) list = list.filter((product) => product.category_id === filterCategory);
    return list;
  }, [products, search, filterCategory]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: catalogKeys.products });
    queryClient.invalidateQueries({ queryKey: ["pavone-new", "product"] });
  };

  const save = useMutation({
    mutationFn: (values: FormState) =>
      upsertProduct({
        id: values.id,
        slug: values.slug,
        name: values.name,
        description: values.description.trim() || null,
        category_id: values.category_id || null,
        brand_id: values.brand_id || null,
        price: Number(values.price),
        sale_price: values.sale_price ? Number(values.sale_price) : null,
        sizes: csvToArray(values.sizes),
        colors: csvToArray(values.colors),
        stock_quantity: Number(values.stock_quantity) || 0,
        sku: values.sku.trim() || null,
        is_featured: values.is_featured,
        is_best_seller: values.is_best_seller,
        is_new_arrival: values.is_new_arrival,
        is_active: values.is_active,
        images: values.images,
      }),
    onSuccess: () => {
      invalidate();
      setForm(null);
      toast.success("Product saved");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      invalidate();
      toast.success("Product deleted");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Delete failed"),
  });

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadBoutiqueImage(file, "products");
        setForm((current) =>
          current ? { ...current, images: [...current.images, url] } : current,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by name or SKU..."
          className="input-elegant !w-auto min-w-52 flex-1 sm:flex-none"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="input-elegant !w-auto"
          value={filterCategory}
          onChange={(event) => setFilterCategory(event.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button
          className="btn-primary ml-auto !px-5 !py-2.5 text-xs"
          onClick={() => setForm(EMPTY)}
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      <div className="overflow-x-auto border border-border bg-background">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category / Brand</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td className="px-4 py-8 text-muted-foreground" colSpan={7}>
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted-foreground" colSpan={7}>
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr key={product.id} className={product.is_active ? "" : "opacity-50"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.product_images[0] ? (
                        <img
                          src={product.product_images[0].image_url}
                          alt=""
                          className="h-14 w-11 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-14 w-11 bg-secondary" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {product.category?.name ?? "-"}
                    <br />
                    {product.brand?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {product.sale_price != null ? (
                      <>
                        <span>{formatPrice(product.sale_price)}</span>{" "}
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      formatPrice(product.price)
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 ${product.stock_quantity <= 5 ? "text-destructive" : ""}`}
                  >
                    {product.stock_quantity}
                  </td>
                  <td className="px-4 py-3 text-[0.625rem] tracking-wider text-muted-foreground uppercase">
                    {[
                      product.is_featured && "Featured",
                      product.is_best_seller && "Best",
                      product.is_new_arrival && "New",
                    ]
                      .filter(Boolean)
                      .join(" / ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-[0.625rem] tracking-[0.12em] uppercase ${
                        product.is_active
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        aria-label="Edit"
                        className="border border-border p-2 hover:border-primary"
                        onClick={() => setForm(toForm(product))}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        aria-label="Delete"
                        className="border border-border p-2 text-destructive hover:border-destructive"
                        onClick={() => {
                          if (confirm(`Delete "${product.name}"?`)) remove.mutate(product.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForm(null)} />
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-border bg-background p-6">
            <h2 className="font-serif text-xl">{form.id ? "Edit Product" : "Add Product"}</h2>
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate(form);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name *" className="sm:col-span-2">
                  <input
                    required
                    className="input-elegant"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </Field>
                <Field label="Description" className="sm:col-span-2">
                  <textarea
                    rows={3}
                    className="input-elegant"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                </Field>
                <Field label="Category">
                  <select
                    className="input-elegant"
                    value={form.category_id}
                    onChange={(event) => setForm({ ...form, category_id: event.target.value })}
                  >
                    <option value="">None</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Brand">
                  <select
                    className="input-elegant"
                    value={form.brand_id}
                    onChange={(event) => setForm({ ...form, brand_id: event.target.value })}
                  >
                    <option value="">None</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Price *">
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-elegant"
                    value={form.price}
                    onChange={(event) => setForm({ ...form, price: event.target.value })}
                  />
                </Field>
                <Field label="Sale Price">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-elegant"
                    value={form.sale_price}
                    onChange={(event) => setForm({ ...form, sale_price: event.target.value })}
                  />
                </Field>
                <Field label="Sizes">
                  <input
                    className="input-elegant"
                    value={form.sizes}
                    onChange={(event) => setForm({ ...form, sizes: event.target.value })}
                  />
                </Field>
                <Field label="Colors">
                  <input
                    className="input-elegant"
                    value={form.colors}
                    onChange={(event) => setForm({ ...form, colors: event.target.value })}
                  />
                </Field>
                <Field label="Stock Quantity">
                  <input
                    type="number"
                    min="0"
                    className="input-elegant"
                    value={form.stock_quantity}
                    onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })}
                  />
                </Field>
                <Field label="SKU">
                  <input
                    className="input-elegant"
                    value={form.sku}
                    onChange={(event) => setForm({ ...form, sku: event.target.value })}
                  />
                </Field>
              </div>

              <div>
                <label className="label-elegant">Images</label>
                <div className="flex flex-wrap gap-3">
                  {form.images.map((url, index) => (
                    <div key={url + index} className="relative">
                      <img src={url} alt="" className="h-24 w-20 object-cover" />
                      <button
                        type="button"
                        aria-label="Remove image"
                        className="absolute -right-2 -top-2 rounded-full bg-primary p-1 text-primary-foreground"
                        onClick={() =>
                          setForm({
                            ...form,
                            images: form.images.filter((_, imageIndex) => imageIndex !== index),
                          })
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-24 w-20 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-border text-xs text-muted-foreground hover:border-primary">
                    <Upload className="h-4 w-4" strokeWidth={1.5} />
                    {uploading ? "..." : "Add"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => event.target.files && handleUpload(event.target.files)}
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {(
                  [
                    ["is_active", "Active"],
                    ["is_featured", "Featured"],
                    ["is_best_seller", "Best Seller"],
                    ["is_new_arrival", "New Arrival"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(event) => setForm({ ...form, [key]: event.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="btn-primary flex-1 !py-2.5 text-xs"
                  disabled={save.isPending || uploading}
                >
                  {save.isPending ? "Saving..." : "Save Product"}
                </button>
                <button
                  type="button"
                  className="btn-outline !py-2.5 text-xs"
                  onClick={() => setForm(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function toForm(product: Product): FormState {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description ?? "",
    category_id: product.category_id ?? "",
    brand_id: product.brand_id ?? "",
    price: String(product.price),
    sale_price: product.sale_price != null ? String(product.sale_price) : "",
    sizes: product.sizes.join(", "),
    colors: product.colors.join(", "),
    stock_quantity: String(product.stock_quantity),
    sku: product.sku ?? "",
    is_featured: product.is_featured,
    is_best_seller: product.is_best_seller,
    is_new_arrival: product.is_new_arrival,
    is_active: product.is_active,
    images: [...product.product_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => image.image_url),
  };
}

function csvToArray(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="label-elegant">{label}</span>
      {children}
    </label>
  );
}
