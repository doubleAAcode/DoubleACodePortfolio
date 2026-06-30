import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { TEST_BUSINESS_ID } from "@/stores/store-bot/seed";
import { makeId } from "@/stores/store-bot/storage";
import type { Product, ProductVariant } from "@/stores/store-bot/types";
import { useStoreBotState } from "@/stores/store-bot/use-store-bot-state";

export const Route = createFileRoute("/dashboard/products")({
  component: ProductsPage,
});

const emptyProduct = {
  name: "",
  description: "",
  categoryId: "",
  basePrice: 0,
  stockQuantity: 0,
  isActive: true,
};

function ProductsPage() {
  const { state, save } = useStoreBotState();
  const categories = state.categories.filter(
    (category) => category.businessId === TEST_BUSINESS_ID,
  );
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState("");
  const [variantForm, setVariantForm] = useState({
    productId: "",
    variantType: "Option",
    name: "",
    priceDelta: 0,
    stockQuantity: 0,
  });

  const products = useMemo(
    () => state.products.filter((product) => product.businessId === TEST_BUSINESS_ID),
    [state.products],
  );

  function submitProduct() {
    if (!productForm.name.trim() || !productForm.categoryId) return;
    const nextProduct: Product = {
      id: editingProductId || makeId("prod"),
      businessId: TEST_BUSINESS_ID,
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      categoryId: productForm.categoryId,
      basePrice: Number(productForm.basePrice) || 0,
      stockQuantity: Number(productForm.stockQuantity) || 0,
      isActive: productForm.isActive,
    };
    save({
      ...state,
      products: editingProductId
        ? state.products.map((product) => (product.id === editingProductId ? nextProduct : product))
        : [...state.products, nextProduct],
    });
    setProductForm(emptyProduct);
    setEditingProductId("");
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      basePrice: product.basePrice,
      stockQuantity: product.stockQuantity,
      isActive: product.isActive,
    });
  }

  function submitVariant() {
    if (!variantForm.productId || !variantForm.name.trim()) return;
    const variant: ProductVariant = {
      id: makeId("var"),
      businessId: TEST_BUSINESS_ID,
      productId: variantForm.productId,
      variantType: variantForm.variantType.trim() || "Option",
      name: variantForm.name.trim(),
      priceDelta: Number(variantForm.priceDelta) || 0,
      stockQuantity: Number(variantForm.stockQuantity) || 0,
      isActive: true,
    };
    save({ ...state, variants: [...state.variants, variant] });
    setVariantForm({
      productId: "",
      variantType: "Option",
      name: "",
      priceDelta: 0,
      stockQuantity: 0,
    });
  }

  function removeProduct(productId: string) {
    save({
      ...state,
      products: state.products.filter((product) => product.id !== productId),
      variants: state.variants.filter((variant) => variant.productId !== productId),
    });
  }

  function removeVariant(variantId: string) {
    save({ ...state, variants: state.variants.filter((variant) => variant.id !== variantId) });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Catalog</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Products</h1>
      </div>

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_120px_120px_120px_auto] lg:items-end">
          <Input
            label="Name"
            value={productForm.name}
            onChange={(value) => setProductForm({ ...productForm, name: value })}
          />
          <Input
            label="Description"
            value={productForm.description}
            onChange={(value) => setProductForm({ ...productForm, description: value })}
          />
          <label className="text-sm">
            <span className="mb-2 block text-muted-foreground">Category</span>
            <select
              value={productForm.categoryId}
              onChange={(event) =>
                setProductForm({ ...productForm, categoryId: event.target.value })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
            >
              <option value="">Choose</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <NumberInput
            label="Price"
            value={productForm.basePrice}
            onChange={(value) => setProductForm({ ...productForm, basePrice: value })}
          />
          <NumberInput
            label="Stock"
            value={productForm.stockQuantity}
            onChange={(value) => setProductForm({ ...productForm, stockQuantity: value })}
          />
          <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={productForm.isActive}
              onChange={(event) =>
                setProductForm({ ...productForm, isActive: event.target.checked })
              }
            />
            Active
          </label>
          <button type="button" onClick={submitProduct} className="studio-button-primary">
            {editingProductId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingProductId ? "Save" : "Add"}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-display text-xl font-semibold">Add Variant</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_1fr_120px_120px_auto] md:items-end">
          <label className="text-sm">
            <span className="mb-2 block text-muted-foreground">Product</span>
            <select
              value={variantForm.productId}
              onChange={(event) =>
                setVariantForm({ ...variantForm, productId: event.target.value })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
            >
              <option value="">Choose</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Type"
            value={variantForm.variantType}
            onChange={(value) => setVariantForm({ ...variantForm, variantType: value })}
          />
          <Input
            label="Name"
            value={variantForm.name}
            onChange={(value) => setVariantForm({ ...variantForm, name: value })}
          />
          <NumberInput
            label="Price +"
            value={variantForm.priceDelta}
            onChange={(value) => setVariantForm({ ...variantForm, priceDelta: value })}
          />
          <NumberInput
            label="Stock"
            value={variantForm.stockQuantity}
            onChange={(value) => setVariantForm({ ...variantForm, stockQuantity: value })}
          />
          <button type="button" onClick={submitVariant} className="studio-button">
            <Plus className="h-4 w-4" />
            Variant
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {products.map((product) => {
          const category = categories.find((item) => item.id === product.categoryId);
          const variants = state.variants.filter((variant) => variant.productId === product.id);
          return (
            <div key={product.id} className="rounded-lg border border-border bg-surface/60 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <button type="button" onClick={() => editProduct(product)} className="text-left">
                  <div className="font-display text-xl font-semibold hover:text-primary">
                    {product.name}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {category?.name ?? "No category"} · ${product.basePrice.toFixed(2)} ·{" "}
                    {product.stockQuantity} base stock
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    {product.description}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      product.isActive
                        ? "text-sm text-emerald-400"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {product.isActive ? "Active" : "Hidden"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProduct(product.id)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-destructive"
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {variants.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {variants.map((variant) => (
                    <span
                      key={variant.id}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      {variant.variantType}:{" "}
                      <strong className="text-foreground">{variant.name}</strong> +$
                      {variant.priceDelta.toFixed(2)} · {variant.stockQuantity} left
                      <button
                        type="button"
                        onClick={() => removeVariant(variant.id)}
                        aria-label={`Delete ${variant.name}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-2 block text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-2 block text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
      />
    </label>
  );
}
