import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Edit2,
  Filter,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBusinessDetails } from "@/features/connect/admin/businesses/business-details-context";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  applyAdminBusinessAction,
  type AdminBusinessDetailsResult,
} from "@/features/connect/shared/admin-client";
import type {
  WaCatalogGroupRow,
  WaCatalogGroupValueRow,
  WaCategoryRow,
  WaProductRow,
} from "@/features/connect/shared/dashboard-store.server";

export const Route = createFileRoute("/connect/admin/businesses/$id/products")({
  component: ProductsPage,
});

type ProductFormState = {
  id?: string;
  categoryId: string;
  code: string;
  nameEnglish: string;
  nameArabic: string;
  descriptionEnglish: string;
  descriptionArabic: string;
  price: string;
  imageUrl: string;
  isActive: boolean;
  isAvailable: boolean;
  stockQuantity: number;
  variantSelectionMode: "step_by_step" | "variant_list";
  sortOrder: number;
  groupValueIds: string[];
};

const NO_CATEGORY = "__none";
const ALL_CATEGORIES = "__all";

function ProductsPage() {
  const { id } = Route.useParams();
  const initialDetails = useBusinessDetails();
  const [details, setDetails] = useState<AdminBusinessDetailsResult | null>(initialDetails);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(() => emptyProductForm());
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [savingAction, setSavingAction] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "destructive"; message: string } | null>(
    null,
  );
  const editorFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    setDetails(initialDetails);
  }, [initialDetails]);

  const products = useMemo(
    () => sortProducts(details?.catalogProducts ?? []),
    [details?.catalogProducts],
  );
  const categories = useMemo(
    () => sortCategories(details?.catalogCategories ?? []),
    [details?.catalogCategories],
  );
  const routeGroups = useMemo(
    () => sortGroups(details?.catalogGroups ?? []),
    [details?.catalogGroups],
  );
  const routeValues = useMemo(
    () => sortValues(details?.catalogGroupValues ?? []),
    [details?.catalogGroupValues],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("newProduct") !== "1") return;
    if (!routeValues.length) {
      setNotice({
        tone: "destructive",
        message: "Create at least one route value before adding products.",
      });
      return;
    }
    setForm(emptyProductForm(nextSortOrder(products)));
    setDeleteTargetId("");
    setNotice(null);
    setEditorOpen(true);
    url.searchParams.delete("newProduct");
    window.history.replaceState(null, "", url);
  }, [products, routeValues]);

  if (!details) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Live products require a loaded business session.
        </CardContent>
      </Card>
    );
  }

  const productStats = getProductStats(details);
  const deleteTarget = products.find((product) => product.id === deleteTargetId);
  const filteredProducts = products.filter((product) => {
    const text = `${product.name_english} ${product.name_arabic} ${product.code}`.toLowerCase();
    const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
    const matchesCategory =
      categoryFilter === ALL_CATEGORIES ||
      (categoryFilter === NO_CATEGORY
        ? !product.category_id
        : product.category_id === categoryFilter);
    return matchesQuery && matchesCategory;
  });
  const inactiveCount = products.filter((product) => !product.is_active).length;
  const unavailableCount = products.filter((product) => !product.is_available).length;
  const unplacedCount = products.filter(
    (product) => (productStats.get(product.id)?.routeValueIds.length ?? 0) === 0,
  ).length;

  function openCreateEditor() {
    if (!routeValues.length) {
      setNotice({
        tone: "destructive",
        message: "Create at least one route value before adding products.",
      });
      return;
    }
    setForm(emptyProductForm(nextSortOrder(products)));
    setDeleteTargetId("");
    setNotice(null);
    setEditorOpen(true);
  }

  function openEditEditor(product: WaProductRow) {
    setForm(toProductForm(product, productStats.get(product.id)?.routeValueIds ?? []));
    setDeleteTargetId("");
    setNotice(null);
    setEditorOpen(true);
  }

  async function saveProduct(nextForm = form) {
    if (!nextForm.code.trim()) {
      setNotice({ tone: "destructive", message: "Product code is required." });
      return;
    }
    if (!nextForm.nameEnglish.trim() || !nextForm.nameArabic.trim()) {
      setNotice({ tone: "destructive", message: "English and Arabic product names are required." });
      return;
    }
    if (!nextForm.groupValueIds.length) {
      setNotice({
        tone: "destructive",
        message: "Choose at least one WhatsApp route value for this product.",
      });
      return;
    }

    setSavingAction(nextForm.id ? `save:${nextForm.id}` : "create");
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_admin_product",
        product: {
          id: nextForm.id,
          category_id: nextForm.categoryId || null,
          code: nextForm.code,
          name_english: nextForm.nameEnglish,
          name_arabic: nextForm.nameArabic,
          description_english: nextForm.descriptionEnglish,
          description_arabic: nextForm.descriptionArabic,
          price: Number.parseFloat(nextForm.price) || 0,
          image_url: nextForm.imageUrl || null,
          is_active: nextForm.isActive,
          is_available: nextForm.isAvailable,
          stock_quantity: nextForm.stockQuantity,
          variant_selection_mode: nextForm.variantSelectionMode,
          group_value_ids: nextForm.groupValueIds,
          sort_order: nextForm.sortOrder,
        },
      });
      setDetails(nextDetails);
      setEditorOpen(false);
      setNotice({
        tone: "success",
        message: nextForm.id ? "Product saved." : "Product created.",
      });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not save this product.",
      });
    } finally {
      setSavingAction("");
    }
  }

  async function saveQuickProduct(
    product: WaProductRow,
    patch: Partial<ProductFormState>,
    successMessage: string,
  ) {
    const currentRouteValueIds = productStats.get(product.id)?.routeValueIds ?? [];
    const nextForm = {
      ...toProductForm(product, currentRouteValueIds),
      ...patch,
    };
    await saveProduct(nextForm);
    setNotice((current) =>
      current?.tone === "success" ? { tone: "success", message: successMessage } : current,
    );
  }

  async function deleteProduct(product: WaProductRow) {
    setSavingAction(`delete:${product.id}`);
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "delete_admin_product",
        productId: product.id,
      });
      setDetails(nextDetails);
      setDeleteTargetId("");
      setNotice({ tone: "success", message: "Product deleted." });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not delete this product.",
      });
    } finally {
      setSavingAction("");
    }
  }

  return (
    <div className="space-y-4" data-business-products-live="true">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                Real WhatsApp catalog products, stock, availability, and browse placement.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" asChild>
                <Link to="/connect/admin/businesses/$id/route-values" params={{ id }}>
                  Route values
                </Link>
              </Button>
              <Button
                type="button"
                onClick={openCreateEditor}
                data-testid="business-product-create"
              >
                <Plus className="h-4 w-4" />
                New product
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice ? (
            <div
              className={`rounded-md border p-3 text-sm ${
                notice.tone === "success"
                  ? "border-success/30 bg-success/5 text-success"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              }`}
            >
              {notice.message}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product name or code..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
              }}
            >
              <SelectTrigger>
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
                <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name_english}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{products.length} products</span>
            <span>{inactiveCount} inactive</span>
            <span>{unavailableCount} unavailable</span>
            <span>{unplacedCount} without route placement</span>
          </div>

          {!routeValues.length ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
              Products need route values before they can be created. Add values in Route Values
              first.
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Placement</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((product) => {
                  const stats = productStats.get(product.id);
                  const category = categories.find((entry) => entry.id === product.category_id);
                  const busy = savingAction.endsWith(product.id);
                  return (
                    <tr key={product.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <ProductImage product={product} />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{product.name_english}</div>
                            <div className="truncate text-xs text-muted-foreground" dir="rtl">
                              {product.name_arabic}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {category?.name_english ?? "No category"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {product.code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {(stats?.placements ?? []).slice(0, 4).map((placement) => (
                            <span
                              key={`${product.id}-${placement.groupValueId}`}
                              className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground"
                            >
                              {placement.groupName}: {placement.valueName}
                            </span>
                          ))}
                          {(stats?.placements.length ?? 0) > 4 ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              +{(stats?.placements.length ?? 0) - 4}
                            </span>
                          ) : null}
                          {!stats?.placements.length ? (
                            <StatusBadge tone="warning">No route</StatusBadge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatMoney(product.price)}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {product.stock_quantity === 0 ? (
                          <span className="text-destructive">0</span>
                        ) : product.stock_quantity < 5 ? (
                          <span className="text-warning-foreground">{product.stock_quantity}</span>
                        ) : (
                          product.stock_quantity
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <StatusBadge
                            tone={
                              !product.is_active
                                ? "neutral"
                                : !product.is_available
                                  ? "warning"
                                  : "success"
                            }
                          >
                            {!product.is_active
                              ? "Inactive"
                              : !product.is_available
                                ? "Unavailable"
                                : "Available"}
                          </StatusBadge>
                          <div className="flex items-center gap-2">
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            <Switch
                              checked={product.is_active}
                              aria-label={`Toggle active ${product.name_english}`}
                              disabled={Boolean(savingAction)}
                              onCheckedChange={(checked) =>
                                void saveQuickProduct(
                                  product,
                                  { isActive: checked },
                                  checked ? "Product activated." : "Product deactivated.",
                                )
                              }
                            />
                            <span className="text-xs text-muted-foreground">Active</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={product.is_available}
                              aria-label={`Toggle available ${product.name_english}`}
                              disabled={Boolean(savingAction)}
                              onCheckedChange={(checked) =>
                                void saveQuickProduct(
                                  product,
                                  { isAvailable: checked },
                                  checked ? "Product available." : "Product unavailable.",
                                )
                              }
                            />
                            <span className="text-xs text-muted-foreground">Sellable</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div>{stats?.optionCount ?? 0} options</div>
                        <div>{stats?.variantCount ?? 0} variants</div>
                        <div>{stats?.customFieldCount ?? 0} custom fields</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${product.name_english}`}
                            disabled={Boolean(savingAction)}
                            onClick={() => openEditEditor(product)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${product.name_english}`}
                            className="text-destructive"
                            disabled={Boolean(savingAction)}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              setEditorOpen(false);
                              setNotice(null);
                              setDeleteTargetId(product.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter" && event.key !== " ") return;
                              event.preventDefault();
                              setEditorOpen(false);
                              setNotice(null);
                              setDeleteTargetId(product.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredProducts.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                      No products match this view.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {deleteTarget ? (
        <Card
          className="border-destructive/30 bg-destructive/5"
          data-testid="business-product-delete-confirm"
        >
          <CardHeader>
            <CardTitle>Delete product?</CardTitle>
            <CardDescription>
              This removes {deleteTarget.name_english} from the business catalog. The backend will
              block unsafe deletes if related order data prevents removal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {productStats.get(deleteTarget.id)?.placements.length ?? 0} route placements linked
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setDeleteTargetId("")}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  aria-label={`Confirm delete ${deleteTarget.name_english}`}
                  disabled={Boolean(savingAction)}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    void deleteProduct(deleteTarget);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    void deleteProduct(deleteTarget);
                  }}
                >
                  {savingAction === `delete:${deleteTarget.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-sm font-medium text-destructive">Delete product</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {editorOpen ? (
        <Card data-testid="business-product-editor">
          <CardHeader>
            <CardTitle>{form.id ? "Edit product" : "Create product"}</CardTitle>
            <CardDescription>
              Product details are trusted by WhatsApp flows for price, stock, and browse placement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              ref={editorFormRef}
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void saveProduct(readProductForm(event.currentTarget, form));
              }}
            >
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem]">
                <div className="space-y-1">
                  <Label htmlFor="product-name-en" className="text-xs">
                    Name (EN)
                  </Label>
                  <Input
                    id="product-name-en"
                    name="nameEnglish"
                    value={form.nameEnglish}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, nameEnglish: event.target.value }))
                    }
                    placeholder="iPhone 15"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="product-code" className="text-xs">
                    Code
                  </Label>
                  <Input
                    id="product-code"
                    name="code"
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, code: event.target.value }))
                    }
                    placeholder="IPHONE-15"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="product-price" className="text-xs">
                    Price
                  </Label>
                  <Input
                    id="product-price"
                    name="price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, price: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem]">
                <div className="space-y-1">
                  <Label htmlFor="product-name-ar" className="text-xs">
                    Name (AR)
                  </Label>
                  <Input
                    id="product-name-ar"
                    name="nameArabic"
                    dir="rtl"
                    value={form.nameArabic}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, nameArabic: event.target.value }))
                    }
                    placeholder="Arabic product name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="product-stock" className="text-xs">
                    Stock
                  </Label>
                  <Input
                    id="product-stock"
                    name="stockQuantity"
                    type="number"
                    min={0}
                    value={form.stockQuantity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        stockQuantity: Number.parseInt(event.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="product-sort" className="text-xs">
                    Sort
                  </Label>
                  <Input
                    id="product-sort"
                    name="sortOrder"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sortOrder: Number.parseInt(event.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="product-description-en" className="text-xs">
                    Description (EN)
                  </Label>
                  <Textarea
                    id="product-description-en"
                    name="descriptionEnglish"
                    value={form.descriptionEnglish}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        descriptionEnglish: event.target.value,
                      }))
                    }
                    placeholder="Short WhatsApp-friendly product description"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="product-description-ar" className="text-xs">
                    Description (AR)
                  </Label>
                  <Textarea
                    id="product-description-ar"
                    name="descriptionArabic"
                    dir="rtl"
                    value={form.descriptionArabic}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        descriptionArabic: event.target.value,
                      }))
                    }
                    placeholder="Arabic description"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem_14rem]">
                <div className="space-y-1">
                  <Label htmlFor="product-image-url" className="text-xs">
                    Image URL
                  </Label>
                  <Input
                    id="product-image-url"
                    name="imageUrl"
                    value={form.imageUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, imageUrl: event.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="product-category" className="text-xs">
                    Category
                  </Label>
                  <Select
                    value={form.categoryId || NO_CATEGORY}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        categoryId: value === NO_CATEGORY ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger id="product-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name_english}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="product-variant-mode" className="text-xs">
                    Variant mode
                  </Label>
                  <Select
                    value={form.variantSelectionMode}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        variantSelectionMode:
                          value === "variant_list" ? "variant_list" : "step_by_step",
                      }))
                    }
                  >
                    <SelectTrigger id="product-variant-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="step_by_step">Step by step</SelectItem>
                      <SelectItem value="variant_list">Variant list</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-md border p-3">
                  <span>
                    <span className="block text-sm font-medium">Active in catalog</span>
                    <span className="block text-xs text-muted-foreground">
                      Inactive products stay saved but are hidden from customer flows.
                    </span>
                  </span>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, isActive: checked }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border p-3">
                  <span>
                    <span className="block text-sm font-medium">Available to sell</span>
                    <span className="block text-xs text-muted-foreground">
                      Unavailable products can remain visible for admin cleanup.
                    </span>
                  </span>
                  <Switch
                    checked={form.isAvailable}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, isAvailable: checked }))
                    }
                  />
                </label>
              </div>

              <div className="space-y-3" data-testid="business-product-route-placement">
                <div>
                  <h3 className="text-sm font-semibold">WhatsApp route placement</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose where this product appears when customers browse. At least one route
                    value is required.
                  </p>
                </div>
                {routeGroups.length ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {routeGroups.map((group) => {
                      const values = routeValues.filter((value) => value.group_id === group.id);
                      return (
                        <div key={group.id} className="rounded-md border p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div>
                              <div className="font-medium">{group.name_english}</div>
                              <div className="text-xs text-muted-foreground">
                                {values.length} values
                              </div>
                            </div>
                            {group.is_active ? (
                              <StatusBadge tone="success">Active</StatusBadge>
                            ) : (
                              <StatusBadge tone="neutral">Inactive</StatusBadge>
                            )}
                          </div>
                          {values.length ? (
                            <div className="space-y-2">
                              {values.map((value) => {
                                const checked = form.groupValueIds.includes(value.id);
                                return (
                                  <label
                                    key={value.id}
                                    className="flex items-start gap-3 rounded-md border p-2 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-1"
                                      checked={checked}
                                      onChange={(event) =>
                                        setForm((current) => ({
                                          ...current,
                                          groupValueIds: event.target.checked
                                            ? Array.from(
                                                new Set([...current.groupValueIds, value.id]),
                                              )
                                            : current.groupValueIds.filter((id) => id !== value.id),
                                        }))
                                      }
                                    />
                                    <span className="min-w-0">
                                      <span className="block truncate font-medium">
                                        {value.name_english}
                                      </span>
                                      <span className="block truncate text-xs text-muted-foreground">
                                        {value.slug}
                                        {!value.is_active ? " / inactive" : ""}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No values in this route yet.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
                    Create Catalog Routes and Route Values before saving products.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="icon"
                  aria-label="Save product"
                  disabled={Boolean(savingAction)}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    if (!editorFormRef.current) return;
                    void saveProduct(readProductForm(editorFormRef.current, form));
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    if (!editorFormRef.current) return;
                    void saveProduct(readProductForm(editorFormRef.current, form));
                  }}
                >
                  {savingAction ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
                <span className="self-center text-sm font-medium">Save product</span>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ProductImage({ product }: { product: WaProductRow }) {
  if (product.image_url) {
    return (
      <div className="h-11 w-11 overflow-hidden rounded-md border bg-muted">
        <img
          src={product.image_url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid h-11 w-11 place-items-center rounded-md bg-muted text-muted-foreground">
      <Package className="h-5 w-5" />
    </div>
  );
}

function getProductStats(details: AdminBusinessDetailsResult) {
  const routeGroupsById = new Map(details.catalogGroups.map((group) => [group.id, group]));
  const routeValuesById = new Map(details.catalogGroupValues.map((value) => [value.id, value]));
  const stats = new Map<
    string,
    {
      routeValueIds: string[];
      placements: Array<{ groupName: string; groupValueId: string; valueName: string }>;
      optionCount: number;
      variantCount: number;
      customFieldCount: number;
    }
  >();

  for (const product of details.catalogProducts) {
    stats.set(product.id, {
      routeValueIds: [],
      placements: [],
      optionCount: 0,
      variantCount: 0,
      customFieldCount: 0,
    });
  }

  for (const link of details.productGroupValues) {
    const entry = stats.get(link.product_id);
    const value = routeValuesById.get(link.group_value_id);
    if (!entry || !value) continue;
    const group = routeGroupsById.get(value.group_id);
    entry.routeValueIds.push(value.id);
    entry.placements.push({
      groupName: group?.name_english ?? "Route",
      groupValueId: value.id,
      valueName: value.name_english,
    });
  }

  for (const option of details.productOptions) {
    const entry = stats.get(option.product_id);
    if (entry) entry.optionCount += 1;
  }
  for (const variant of details.productVariants) {
    const entry = stats.get(variant.product_id);
    if (entry) entry.variantCount += 1;
  }
  for (const field of details.productCustomFields) {
    const entry = stats.get(field.product_id);
    if (entry) entry.customFieldCount += 1;
  }

  return stats;
}

function emptyProductForm(sortOrder = 0): ProductFormState {
  return {
    categoryId: "",
    code: "",
    nameEnglish: "",
    nameArabic: "",
    descriptionEnglish: "",
    descriptionArabic: "",
    price: "0",
    imageUrl: "",
    isActive: true,
    isAvailable: true,
    stockQuantity: 0,
    variantSelectionMode: "step_by_step",
    sortOrder,
    groupValueIds: [],
  };
}

function toProductForm(product: WaProductRow, groupValueIds: string[]): ProductFormState {
  return {
    id: product.id,
    categoryId: product.category_id ?? "",
    code: product.code,
    nameEnglish: product.name_english,
    nameArabic: product.name_arabic,
    descriptionEnglish: product.description_english,
    descriptionArabic: product.description_arabic,
    price: String(product.price ?? 0),
    imageUrl: product.image_url ?? "",
    isActive: product.is_active,
    isAvailable: product.is_available,
    stockQuantity: product.stock_quantity,
    variantSelectionMode:
      product.variant_selection_mode === "variant_list" ? "variant_list" : "step_by_step",
    sortOrder: product.sort_order,
    groupValueIds,
  };
}

function readProductForm(
  formElement: HTMLFormElement,
  current: ProductFormState,
): ProductFormState {
  const submitted = new FormData(formElement);
  return {
    ...current,
    code: String(submitted.get("code") ?? ""),
    nameEnglish: String(submitted.get("nameEnglish") ?? ""),
    nameArabic: String(submitted.get("nameArabic") ?? ""),
    descriptionEnglish: String(submitted.get("descriptionEnglish") ?? ""),
    descriptionArabic: String(submitted.get("descriptionArabic") ?? ""),
    price: String(submitted.get("price") ?? "0"),
    imageUrl: String(submitted.get("imageUrl") ?? ""),
    stockQuantity: Number.parseInt(String(submitted.get("stockQuantity") ?? ""), 10) || 0,
    sortOrder: Number.parseInt(String(submitted.get("sortOrder") ?? ""), 10) || 0,
  };
}

function nextSortOrder(products: WaProductRow[]) {
  const lastSortOrder = products.reduce((max, product) => Math.max(max, product.sort_order), -10);
  return lastSortOrder + 10;
}

function sortProducts(products: WaProductRow[]) {
  return [...products].sort(
    (left, right) =>
      left.sort_order - right.sort_order || left.name_english.localeCompare(right.name_english),
  );
}

function sortCategories(categories: WaCategoryRow[]) {
  return [...categories].sort(
    (left, right) =>
      left.sort_order - right.sort_order || left.name_english.localeCompare(right.name_english),
  );
}

function sortGroups(groups: WaCatalogGroupRow[]) {
  return [...groups].sort(
    (left, right) =>
      left.sort_order - right.sort_order || left.name_english.localeCompare(right.name_english),
  );
}

function sortValues(values: WaCatalogGroupValueRow[]) {
  return [...values].sort(
    (left, right) =>
      left.sort_order - right.sort_order || left.name_english.localeCompare(right.name_english),
  );
}

function formatMoney(value: number | string) {
  const price = Number(value);
  if (!Number.isFinite(price)) return String(value);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(price);
}
