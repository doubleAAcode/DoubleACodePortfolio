import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, PackagePlus, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  applyAdminBusinessAction,
  getAdminBusinessDetails,
} from "@/features/connect/shared/admin-client";
import type {
  AdminBusinessDetails,
  AdminProductCustomFieldInput,
  AdminProductInput,
  AdminProductOptionInput,
  AdminProductOptionValueInput,
  AdminProductVariantInput,
} from "@/features/connect/shared/admin-store.server";
import type {
  WaProductCustomFieldRow,
  WaProductOptionRow,
  WaProductOptionValueRow,
  WaProductRow,
  WaProductVariantRow,
} from "@/features/connect/shared/dashboard-store.server";

export const Route = createFileRoute("/connect/admin/businesses/$businessId/products")({
  component: AdminProductsPage,
});

const emptyProduct: AdminProductInput = {
  category_id: null,
  code: "",
  name_english: "",
  name_arabic: "",
  description_english: "",
  description_arabic: "",
  price: 0,
  image_url: "",
  is_active: true,
  is_available: true,
  stock_quantity: 0,
  variant_selection_mode: "step_by_step",
  group_value_ids: [],
  sort_order: 10,
};

const emptyOption: AdminProductOptionInput = {
  product_id: "",
  name_english: "",
  name_arabic: "",
  sort_order: 10,
  is_required: true,
};

const emptyOptionValue: AdminProductOptionValueInput = {
  option_id: "",
  value_english: "",
  value_arabic: "",
  image_url: "",
  sort_order: 10,
};

const emptyVariant: AdminProductVariantInput = {
  product_id: "",
  sku: "",
  selected_option_value_ids: [],
  price: 0,
  stock_quantity: 0,
  is_available: true,
};

const emptyCustomField: AdminProductCustomFieldInput = {
  product_id: "",
  type: "short_text",
  label_english: "",
  label_arabic: "",
  placeholder_english: null,
  placeholder_arabic: null,
  is_required: false,
  minimum_length: null,
  maximum_length: null,
  minimum_value: null,
  maximum_value: null,
  choices: null,
  sort_order: 10,
};

function AdminProductsPage() {
  const { businessId } = Route.useParams();
  const [details, setDetails] = useState<AdminBusinessDetails>();
  const [search, setSearch] = useState("");
  const [productForm, setProductForm] = useState<AdminProductInput>(emptyProduct);
  const [optionForm, setOptionForm] = useState<AdminProductOptionInput>(emptyOption);
  const [optionValueForm, setOptionValueForm] =
    useState<AdminProductOptionValueInput>(emptyOptionValue);
  const [variantForm, setVariantForm] = useState<AdminProductVariantInput>(emptyVariant);
  const [customFieldForm, setCustomFieldForm] =
    useState<AdminProductCustomFieldInput>(emptyCustomField);
  const [customFieldChoicesText, setCustomFieldChoicesText] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDetails(await getAdminBusinessDetails(businessId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const routeById = useMemo(
    () => new Map((details?.catalogGroups ?? []).map((route) => [route.id, route])),
    [details?.catalogGroups],
  );
  const routeValueGroups = useMemo(
    () =>
      [...(details?.catalogGroups ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((route) => ({
          route,
          values: [...(details?.catalogGroupValues ?? [])]
            .filter((value) => value.group_id === route.id)
            .sort((a, b) => a.sort_order - b.sort_order),
        })),
    [details?.catalogGroups, details?.catalogGroupValues],
  );
  const productRouteValueIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of details?.productGroupValues ?? []) {
      map.set(entry.product_id, [...(map.get(entry.product_id) ?? []), entry.group_value_id]);
    }
    return map;
  }, [details?.productGroupValues]);

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...(details?.catalogProducts ?? [])]
      .filter((product) => {
        if (!query) return true;
        const routeValueLabels = (productRouteValueIds.get(product.id) ?? [])
          .map((id) => details?.catalogGroupValues.find((value) => value.id === id))
          .filter(Boolean)
          .map(
            (value) =>
              `${routeById.get(value?.group_id ?? "")?.name_english ?? ""} ${value?.name_english ?? ""}`,
          );
        return [product.code, product.name_english, product.name_arabic, ...routeValueLabels]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => a.sort_order - b.sort_order || a.name_english.localeCompare(b.name_english));
  }, [
    details?.catalogGroupValues,
    details?.catalogProducts,
    productRouteValueIds,
    routeById,
    search,
  ]);

  async function run(label: string, action: () => Promise<AdminBusinessDetails>) {
    setSaving(label);
    setError("");
    try {
      const nextDetails = await action();
      setDetails(nextDetails);
      return nextDetails;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product action failed.");
      throw err;
    } finally {
      setSaving("");
    }
  }

  function openNewProduct() {
    setProductForm({
      ...emptyProduct,
      sort_order: (details?.catalogProducts.length ?? 0) + 10,
    });
    resetAdvancedForms();
    setEditorOpen(true);
  }

  function openProduct(product: WaProductRow) {
    setProductForm({
      id: product.id,
      category_id: product.category_id ?? null,
      code: product.code,
      name_english: product.name_english,
      name_arabic: product.name_arabic,
      description_english: product.description_english,
      description_arabic: product.description_arabic,
      price: Number(product.price),
      image_url: product.image_url ?? "",
      is_active: product.is_active,
      is_available: product.is_available,
      stock_quantity: product.stock_quantity,
      variant_selection_mode:
        product.variant_selection_mode === "variant_list" ? "variant_list" : "step_by_step",
      group_value_ids: productRouteValueIds.get(product.id) ?? [],
      sort_order: product.sort_order,
    });
    resetAdvancedForms(product.id);
    setEditorOpen(true);
  }

  function resetAdvancedForms(productId = "") {
    setOptionForm({ ...emptyOption, product_id: productId });
    setOptionValueForm(emptyOptionValue);
    setVariantForm({ ...emptyVariant, product_id: productId });
    setCustomFieldForm({ ...emptyCustomField, product_id: productId });
    setCustomFieldChoicesText("");
  }

  async function submitProduct() {
    const validation = validateProduct(productForm);
    if (validation) {
      setError(validation);
      return;
    }
    const nextDetails = await run("product", () =>
      applyAdminBusinessAction(businessId, {
        action: "save_admin_product",
        product: productForm,
      }),
    );
    const saved =
      (productForm.id
        ? nextDetails.catalogProducts.find((product) => product.id === productForm.id)
        : null) ??
      nextDetails.catalogProducts.find(
        (product) => product.code === productForm.code.trim().toUpperCase(),
      );
    if (saved) openProduct(saved);
  }

  const selectedProductId = productForm.id ?? "";
  const productOptions = useMemo(
    () =>
      [...(details?.productOptions ?? [])]
        .filter((option) => option.product_id === selectedProductId)
        .sort(
          (a, b) => a.sort_order - b.sort_order || a.name_english.localeCompare(b.name_english),
        ),
    [details?.productOptions, selectedProductId],
  );
  const productOptionIds = useMemo(
    () => new Set(productOptions.map((option) => option.id)),
    [productOptions],
  );
  const productOptionValues = useMemo(
    () =>
      [...(details?.productOptionValues ?? [])]
        .filter((value) => productOptionIds.has(value.option_id))
        .sort(
          (a, b) => a.sort_order - b.sort_order || a.value_english.localeCompare(b.value_english),
        ),
    [details?.productOptionValues, productOptionIds],
  );
  const optionGroups = useMemo(
    () =>
      productOptions.map((option) => ({
        option,
        values: productOptionValues.filter((value) => value.option_id === option.id),
      })),
    [productOptionValues, productOptions],
  );
  const productVariants = useMemo(
    () =>
      [...(details?.productVariants ?? [])]
        .filter((variant) => variant.product_id === selectedProductId)
        .sort((a, b) => a.sku.localeCompare(b.sku)),
    [details?.productVariants, selectedProductId],
  );
  const productCustomFields = useMemo(
    () =>
      [...(details?.productCustomFields ?? [])]
        .filter((field) => field.product_id === selectedProductId)
        .sort(
          (a, b) => a.sort_order - b.sort_order || a.label_english.localeCompare(b.label_english),
        ),
    [details?.productCustomFields, selectedProductId],
  );

  async function submitOption() {
    if (!selectedProductId) {
      setError("Save the product basics before adding option groups.");
      return;
    }
    if (!optionForm.name_english.trim() || !optionForm.name_arabic.trim()) {
      setError("Add option group labels in English and Arabic.");
      return;
    }
    const nextDetails = await run("product-option", () =>
      applyAdminBusinessAction(businessId, {
        action: "save_admin_product_option",
        option: { ...optionForm, product_id: selectedProductId },
      }),
    );
    const saved =
      (optionForm.id
        ? nextDetails.productOptions.find((option) => option.id === optionForm.id)
        : null) ??
      nextDetails.productOptions.find(
        (option) =>
          option.product_id === selectedProductId &&
          option.name_english.trim().toLowerCase() === optionForm.name_english.trim().toLowerCase(),
      );
    setOptionForm({ ...emptyOption, product_id: selectedProductId });
    if (saved && !optionValueForm.option_id) {
      setOptionValueForm({ ...emptyOptionValue, option_id: saved.id });
    }
  }

  async function deleteOption(option: WaProductOptionRow) {
    if (!window.confirm(`Delete option group ${option.name_english}?`)) return;
    await run(`delete-product-option-${option.id}`, () =>
      applyAdminBusinessAction(businessId, {
        action: "delete_admin_product_option",
        optionId: option.id,
      }),
    );
    if (optionForm.id === option.id)
      setOptionForm({ ...emptyOption, product_id: selectedProductId });
  }

  async function submitOptionValue() {
    if (!optionValueForm.option_id) {
      setError("Choose an option group before adding a value.");
      return;
    }
    if (!optionValueForm.value_english.trim() || !optionValueForm.value_arabic.trim()) {
      setError("Add option value labels in English and Arabic.");
      return;
    }
    await run("product-option-value", () =>
      applyAdminBusinessAction(businessId, {
        action: "save_admin_product_option_value",
        optionValue: optionValueForm,
      }),
    );
    setOptionValueForm({ ...emptyOptionValue, option_id: optionValueForm.option_id });
  }

  async function deleteOptionValue(value: WaProductOptionValueRow) {
    if (!window.confirm(`Delete option value ${value.value_english}?`)) return;
    await run(`delete-product-option-value-${value.id}`, () =>
      applyAdminBusinessAction(businessId, {
        action: "delete_admin_product_option_value",
        optionValueId: value.id,
      }),
    );
    if (optionValueForm.id === value.id) {
      setOptionValueForm({ ...emptyOptionValue, option_id: value.option_id });
    }
  }

  async function submitVariant() {
    if (!selectedProductId) {
      setError("Save the product basics before adding variants.");
      return;
    }
    if (!variantForm.selected_option_value_ids.length) {
      setError("Choose at least one option value for this variant.");
      return;
    }
    await run("product-variant", () =>
      applyAdminBusinessAction(businessId, {
        action: "save_admin_product_variant",
        variant: { ...variantForm, product_id: selectedProductId },
      }),
    );
    setVariantForm({ ...emptyVariant, product_id: selectedProductId, price: productForm.price });
  }

  async function deleteVariant(variant: WaProductVariantRow) {
    if (!window.confirm(`Delete variant ${variant.sku || variant.id}?`)) return;
    await run(`delete-product-variant-${variant.id}`, () =>
      applyAdminBusinessAction(businessId, {
        action: "delete_admin_product_variant",
        variantId: variant.id,
      }),
    );
    if (variantForm.id === variant.id) {
      setVariantForm({ ...emptyVariant, product_id: selectedProductId, price: productForm.price });
    }
  }

  async function submitCustomField() {
    if (!selectedProductId) {
      setError("Save the product basics before adding product questions.");
      return;
    }
    if (!customFieldForm.label_english.trim() || !customFieldForm.label_arabic.trim()) {
      setError("Add question labels in English and Arabic.");
      return;
    }
    await run("product-custom-field", () =>
      applyAdminBusinessAction(businessId, {
        action: "save_admin_product_custom_field",
        field: {
          ...customFieldForm,
          product_id: selectedProductId,
          placeholder_english: customFieldForm.placeholder_english?.trim() || null,
          placeholder_arabic: customFieldForm.placeholder_arabic?.trim() || null,
          choices: parseChoices(customFieldChoicesText),
        },
      }),
    );
    setCustomFieldForm({ ...emptyCustomField, product_id: selectedProductId });
    setCustomFieldChoicesText("");
  }

  async function deleteCustomField(field: WaProductCustomFieldRow) {
    if (!window.confirm(`Delete question ${field.label_english}?`)) return;
    await run(`delete-product-custom-field-${field.id}`, () =>
      applyAdminBusinessAction(businessId, {
        action: "delete_admin_product_custom_field",
        fieldId: field.id,
      }),
    );
    if (customFieldForm.id === field.id) {
      setCustomFieldForm({ ...emptyCustomField, product_id: selectedProductId });
      setCustomFieldChoicesText("");
    }
  }

  const busy = loading || Boolean(saving);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <a
            href={`/connect/admin/businesses/${businessId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to business
          </a>
          <h1 className="mt-2 font-display text-2xl font-semibold">Products</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Admin-owned product setup. Each product must belong to at least one route value before
            it can be saved.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/connect/admin/businesses/${businessId}/catalog-routes`}
            className="studio-button-secondary"
          >
            Manage routes
          </a>
          <a
            href={`/connect/admin/businesses/${businessId}/catalog-route-values`}
            className="studio-button-secondary"
          >
            Manage route values
          </a>
          <button
            type="button"
            disabled={busy}
            className="studio-button-secondary disabled:cursor-wait disabled:opacity-60"
            onClick={() => void load()}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-md border border-border bg-surface/60 p-5 text-sm text-muted-foreground">
          Loading products...
        </div>
      ) : !details ? (
        <div className="rounded-md border border-border bg-surface/60 p-5 text-sm text-muted-foreground">
          Product data is not available. Refresh and try again.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-surface/60 p-4 lg:flex-row lg:items-center">
            <label className="relative min-w-0 lg:w-96">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products"
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
              />
            </label>
            <button type="button" className="studio-button-primary" onClick={openNewProduct}>
              <PackagePlus className="h-4 w-4" />
              Add product
            </button>
          </div>

          {!details?.catalogGroupValues.length ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              Add route values before creating products. Products require at least one route value.
            </div>
          ) : null}

          {!editorOpen ? (
            <ProductList
              products={products}
              details={details}
              routeById={routeById}
              productRouteValueIds={productRouteValueIds}
              onEdit={openProduct}
              onDelete={(product) => {
                if (!window.confirm(`Delete ${product.name_english}?`)) return;
                void run(`delete-product-${product.id}`, () =>
                  applyAdminBusinessAction(businessId, {
                    action: "delete_admin_product",
                    productId: product.id,
                  }),
                );
              }}
            />
          ) : (
            <ProductEditor
              form={productForm}
              routeValueGroups={routeValueGroups}
              saving={saving === "product"}
              onChange={setProductForm}
              onClose={() => setEditorOpen(false)}
              onSave={() => void submitProduct()}
              optionGroups={optionGroups}
              optionForm={optionForm}
              optionValueForm={optionValueForm}
              variants={productVariants}
              variantForm={variantForm}
              customFields={productCustomFields}
              customFieldForm={customFieldForm}
              customFieldChoicesText={customFieldChoicesText}
              onOptionChange={setOptionForm}
              onOptionValueChange={setOptionValueForm}
              onVariantChange={setVariantForm}
              onCustomFieldChange={setCustomFieldForm}
              onCustomFieldChoicesTextChange={setCustomFieldChoicesText}
              onSaveOption={() => void submitOption()}
              onDeleteOption={(option) => void deleteOption(option)}
              onSaveOptionValue={() => void submitOptionValue()}
              onDeleteOptionValue={(value) => void deleteOptionValue(value)}
              onSaveVariant={() => void submitVariant()}
              onDeleteVariant={(variant) => void deleteVariant(variant)}
              onSaveCustomField={() => void submitCustomField()}
              onDeleteCustomField={(field) => void deleteCustomField(field)}
              savingAdvanced={saving}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ProductList({
  products,
  details,
  routeById,
  productRouteValueIds,
  onEdit,
  onDelete,
}: {
  products: WaProductRow[];
  details: AdminBusinessDetails;
  routeById: Map<string, AdminBusinessDetails["catalogGroups"][number]>;
  productRouteValueIds: Map<string, string[]>;
  onEdit: (product: WaProductRow) => void;
  onDelete: (product: WaProductRow) => void;
}) {
  if (!products.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface/60 p-6 text-sm text-muted-foreground">
        No products yet.
      </div>
    );
  }

  return (
    <section className="grid gap-3 xl:grid-cols-2">
      {products.map((product) => {
        const assignedValues = (productRouteValueIds.get(product.id) ?? [])
          .map((id) => details.catalogGroupValues.find((value) => value.id === id))
          .filter(Boolean);
        return (
          <div key={product.id} className="rounded-lg border border-border bg-surface/60 p-4">
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => onEdit(product)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{product.name_english}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{product.code}</p>
                </div>
                <span
                  className={`rounded-md border px-2 py-1 text-xs ${
                    product.is_active && product.is_available
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {product.is_active && product.is_available ? "Selling" : "Needs attention"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {assignedValues.length ? (
                  assignedValues.map((value) => (
                    <span
                      key={value?.id}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                    >
                      {routeById.get(value?.group_id ?? "")?.name_english}: {value?.name_english}
                    </span>
                  ))
                ) : (
                  <span className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    Missing route value
                  </span>
                )}
              </div>
            </button>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="studio-button-secondary"
                onClick={() => onEdit(product)}
              >
                Edit product
              </button>
              <button
                type="button"
                className="studio-button-secondary text-destructive"
                onClick={() => onDelete(product)}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ProductEditor({
  form,
  routeValueGroups,
  saving,
  savingAdvanced,
  optionGroups,
  optionForm,
  optionValueForm,
  variants,
  variantForm,
  customFields,
  customFieldForm,
  customFieldChoicesText,
  onChange,
  onClose,
  onSave,
  onOptionChange,
  onOptionValueChange,
  onVariantChange,
  onCustomFieldChange,
  onCustomFieldChoicesTextChange,
  onSaveOption,
  onDeleteOption,
  onSaveOptionValue,
  onDeleteOptionValue,
  onSaveVariant,
  onDeleteVariant,
  onSaveCustomField,
  onDeleteCustomField,
}: {
  form: AdminProductInput;
  routeValueGroups: Array<{
    route: AdminBusinessDetails["catalogGroups"][number];
    values: AdminBusinessDetails["catalogGroupValues"];
  }>;
  saving: boolean;
  savingAdvanced: string;
  optionGroups: Array<{ option: WaProductOptionRow; values: WaProductOptionValueRow[] }>;
  optionForm: AdminProductOptionInput;
  optionValueForm: AdminProductOptionValueInput;
  variants: WaProductVariantRow[];
  variantForm: AdminProductVariantInput;
  customFields: WaProductCustomFieldRow[];
  customFieldForm: AdminProductCustomFieldInput;
  customFieldChoicesText: string;
  onChange: (form: AdminProductInput) => void;
  onClose: () => void;
  onSave: () => void;
  onOptionChange: (form: AdminProductOptionInput) => void;
  onOptionValueChange: (form: AdminProductOptionValueInput) => void;
  onVariantChange: (form: AdminProductVariantInput) => void;
  onCustomFieldChange: (form: AdminProductCustomFieldInput) => void;
  onCustomFieldChoicesTextChange: (value: string) => void;
  onSaveOption: () => void;
  onDeleteOption: (option: WaProductOptionRow) => void;
  onSaveOptionValue: () => void;
  onDeleteOptionValue: (value: WaProductOptionValueRow) => void;
  onSaveVariant: () => void;
  onDeleteVariant: (variant: WaProductVariantRow) => void;
  onSaveCustomField: () => void;
  onDeleteCustomField: (field: WaProductCustomFieldRow) => void;
}) {
  const selectedRouteValueIds = form.group_value_ids ?? [];
  const productSaved = Boolean(form.id);
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-lg border border-border bg-surface/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {form.id ? "Edit product" : "Add product"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Control the product data, route placement, variants, and questions from admin.
            </p>
          </div>
          <button type="button" className="studio-button-secondary" onClick={onClose}>
            Back to list
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <TextField
            label="Product code"
            value={form.code}
            onChange={(value) => onChange({ ...form, code: value })}
          />
          <TextField
            label="Name EN"
            value={form.name_english}
            onChange={(value) => onChange({ ...form, name_english: value })}
          />
          <TextField
            label="Name AR"
            value={form.name_arabic}
            dir="rtl"
            onChange={(value) => onChange({ ...form, name_arabic: value })}
          />
          <NumberField
            label="Price"
            value={form.price}
            onChange={(value) => onChange({ ...form, price: value })}
          />
          <NumberField
            label="Stock"
            value={form.stock_quantity}
            onChange={(value) => onChange({ ...form, stock_quantity: value })}
          />
          <NumberField
            label="Sort order"
            value={form.sort_order}
            onChange={(value) => onChange({ ...form, sort_order: value })}
          />
          <SelectField
            label="Variant selection mode"
            value={form.variant_selection_mode ?? "step_by_step"}
            onChange={(value) =>
              onChange({
                ...form,
                variant_selection_mode: value === "variant_list" ? "variant_list" : "step_by_step",
              })
            }
          >
            <option value="step_by_step">Ask each option separately</option>
            <option value="variant_list">Show variant list</option>
          </SelectField>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <TextAreaField
            label="Description EN"
            value={form.description_english}
            onChange={(value) => onChange({ ...form, description_english: value })}
          />
          <TextAreaField
            label="Description AR"
            value={form.description_arabic}
            dir="rtl"
            onChange={(value) => onChange({ ...form, description_arabic: value })}
          />
        </div>
        <TextField
          label="Image URL"
          value={form.image_url ?? ""}
          onChange={(value) => onChange({ ...form, image_url: value })}
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Toggle
            label="Active"
            checked={form.is_active}
            onChange={(checked) => onChange({ ...form, is_active: checked })}
          />
          <Toggle
            label="Available"
            checked={form.is_available}
            onChange={(checked) => onChange({ ...form, is_available: checked })}
          />
        </div>

        {!productSaved ? (
          <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            Save the product basics first, then add variants, variant values, and product questions.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <ProductOptionsSection
              optionGroups={optionGroups}
              optionForm={optionForm}
              optionValueForm={optionValueForm}
              savingAdvanced={savingAdvanced}
              onOptionChange={onOptionChange}
              onOptionValueChange={onOptionValueChange}
              onSaveOption={onSaveOption}
              onDeleteOption={onDeleteOption}
              onSaveOptionValue={onSaveOptionValue}
              onDeleteOptionValue={onDeleteOptionValue}
            />
            <ProductVariantsSection
              optionGroups={optionGroups}
              variants={variants}
              variantForm={variantForm}
              savingAdvanced={savingAdvanced}
              onVariantChange={onVariantChange}
              onSaveVariant={onSaveVariant}
              onDeleteVariant={onDeleteVariant}
            />
            <ProductCustomFieldsSection
              customFields={customFields}
              customFieldForm={customFieldForm}
              customFieldChoicesText={customFieldChoicesText}
              savingAdvanced={savingAdvanced}
              onCustomFieldChange={onCustomFieldChange}
              onCustomFieldChoicesTextChange={onCustomFieldChoicesTextChange}
              onSaveCustomField={onSaveCustomField}
              onDeleteCustomField={onDeleteCustomField}
            />
          </div>
        )}
      </div>

      <aside className="rounded-lg border border-border bg-surface/60 p-4">
        <h3 className="font-display text-lg font-semibold">Product route values</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Required. Choose at least one route value so the product can appear in WhatsApp browse
          routes.
        </p>
        <div className="mt-4 max-h-[560px] space-y-4 overflow-y-auto pr-1">
          {routeValueGroups.length ? (
            routeValueGroups.map((group) => (
              <div
                key={group.route.id}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="text-sm font-medium">{group.route.name_english}</div>
                <div className="mt-3 space-y-2">
                  {group.values.length ? (
                    group.values.map((value) => {
                      const checked = selectedRouteValueIds.includes(value.id);
                      return (
                        <label key={value.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const nextIds = event.target.checked
                                ? [...selectedRouteValueIds, value.id]
                                : selectedRouteValueIds.filter((id) => id !== value.id);
                              onChange({ ...form, group_value_ids: Array.from(new Set(nextIds)) });
                            }}
                          />
                          {value.name_english}
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground">No values in this route.</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              No route values exist yet.
            </div>
          )}
        </div>
        <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
          <span className={selectedRouteValueIds.length ? "text-emerald-300" : "text-destructive"}>
            {selectedRouteValueIds.length} selected route value(s)
          </span>
        </div>
        <button
          type="button"
          disabled={saving}
          className="studio-button-primary mt-4 w-full disabled:cursor-wait disabled:opacity-60"
          onClick={onSave}
        >
          {saving ? "Saving product..." : "Save product"}
        </button>
      </aside>
    </section>
  );
}

function ProductOptionsSection({
  optionGroups,
  optionForm,
  optionValueForm,
  savingAdvanced,
  onOptionChange,
  onOptionValueChange,
  onSaveOption,
  onDeleteOption,
  onSaveOptionValue,
  onDeleteOptionValue,
}: {
  optionGroups: Array<{ option: WaProductOptionRow; values: WaProductOptionValueRow[] }>;
  optionForm: AdminProductOptionInput;
  optionValueForm: AdminProductOptionValueInput;
  savingAdvanced: string;
  onOptionChange: (form: AdminProductOptionInput) => void;
  onOptionValueChange: (form: AdminProductOptionValueInput) => void;
  onSaveOption: () => void;
  onDeleteOption: (option: WaProductOptionRow) => void;
  onSaveOptionValue: () => void;
  onDeleteOptionValue: (value: WaProductOptionValueRow) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Variants and options</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add option groups like Size or Color, then add the values customers can choose.
          </p>
        </div>
        <button
          type="button"
          className="studio-button-secondary"
          onClick={() => onOptionChange({ ...emptyOption, product_id: optionForm.product_id })}
        >
          New option group
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {optionGroups.length ? (
            optionGroups.map(({ option, values }) => (
              <div key={option.id} className="rounded-md border border-border bg-surface/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() =>
                      onOptionChange({
                        id: option.id,
                        product_id: option.product_id,
                        name_english: option.name_english,
                        name_arabic: option.name_arabic,
                        sort_order: option.sort_order,
                        is_required: option.is_required,
                      })
                    }
                  >
                    <div className="font-medium">{option.name_english}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.is_required ? "Required" : "Optional"} | {values.length} value(s)
                    </div>
                  </button>
                  <button
                    type="button"
                    className="text-xs text-destructive"
                    onClick={() => onDeleteOption(option)}
                  >
                    Delete
                  </button>
                </div>
                {values.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {values.map((value) => (
                      <button
                        key={value.id}
                        type="button"
                        className="rounded-md border border-border bg-background px-2 py-1 text-left text-xs"
                        onClick={() =>
                          onOptionValueChange({
                            id: value.id,
                            option_id: value.option_id,
                            value_english: value.value_english,
                            value_arabic: value.value_arabic,
                            image_url: value.image_url ?? "",
                            sort_order: value.sort_order,
                          })
                        }
                      >
                        {value.value_english}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              No option groups yet.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface/60 p-3">
            <h4 className="font-medium">
              {optionForm.id ? "Edit option group" : "Create option group"}
            </h4>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <TextField
                label="Group label EN"
                value={optionForm.name_english}
                onChange={(value) => onOptionChange({ ...optionForm, name_english: value })}
              />
              <TextField
                label="Group label AR"
                value={optionForm.name_arabic}
                dir="rtl"
                onChange={(value) => onOptionChange({ ...optionForm, name_arabic: value })}
              />
              <NumberField
                label="Sort order"
                value={optionForm.sort_order}
                onChange={(value) => onOptionChange({ ...optionForm, sort_order: value })}
              />
              <Toggle
                label="Required"
                checked={optionForm.is_required}
                onChange={(checked) => onOptionChange({ ...optionForm, is_required: checked })}
              />
            </div>
            <button
              type="button"
              disabled={savingAdvanced === "product-option"}
              className="studio-button-primary mt-3 disabled:cursor-wait disabled:opacity-60"
              onClick={onSaveOption}
            >
              {savingAdvanced === "product-option" ? "Saving..." : "Save option group"}
            </button>
          </div>

          <div className="rounded-md border border-border bg-surface/60 p-3">
            <h4 className="font-medium">
              {optionValueForm.id ? "Edit option value" : "Create option value"}
            </h4>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <SelectField
                label="Option group"
                value={optionValueForm.option_id}
                onChange={(value) => onOptionValueChange({ ...optionValueForm, option_id: value })}
              >
                <option value="">Select group</option>
                {optionGroups.map(({ option }) => (
                  <option key={option.id} value={option.id}>
                    {option.name_english}
                  </option>
                ))}
              </SelectField>
              <NumberField
                label="Sort order"
                value={optionValueForm.sort_order}
                onChange={(value) => onOptionValueChange({ ...optionValueForm, sort_order: value })}
              />
              <TextField
                label="Value label EN"
                value={optionValueForm.value_english}
                onChange={(value) =>
                  onOptionValueChange({ ...optionValueForm, value_english: value })
                }
              />
              <TextField
                label="Value label AR"
                value={optionValueForm.value_arabic}
                dir="rtl"
                onChange={(value) =>
                  onOptionValueChange({ ...optionValueForm, value_arabic: value })
                }
              />
            </div>
            <TextField
              label="Image URL"
              value={optionValueForm.image_url ?? ""}
              onChange={(value) => onOptionValueChange({ ...optionValueForm, image_url: value })}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingAdvanced === "product-option-value"}
                className="studio-button-primary disabled:cursor-wait disabled:opacity-60"
                onClick={onSaveOptionValue}
              >
                {savingAdvanced === "product-option-value" ? "Saving..." : "Save option value"}
              </button>
              {optionValueForm.id ? (
                <button
                  type="button"
                  className="studio-button-secondary text-destructive"
                  onClick={() =>
                    onDeleteOptionValue({
                      id: optionValueForm.id ?? "",
                      option_id: optionValueForm.option_id,
                      value_english: optionValueForm.value_english,
                      value_arabic: optionValueForm.value_arabic,
                      image_url: optionValueForm.image_url || null,
                      sort_order: optionValueForm.sort_order,
                      updated_at: "",
                    })
                  }
                >
                  Delete value
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductVariantsSection({
  optionGroups,
  variants,
  variantForm,
  savingAdvanced,
  onVariantChange,
  onSaveVariant,
  onDeleteVariant,
}: {
  optionGroups: Array<{ option: WaProductOptionRow; values: WaProductOptionValueRow[] }>;
  variants: WaProductVariantRow[];
  variantForm: AdminProductVariantInput;
  savingAdvanced: string;
  onVariantChange: (form: AdminProductVariantInput) => void;
  onSaveVariant: () => void;
  onDeleteVariant: (variant: WaProductVariantRow) => void;
}) {
  const valueById = new Map(
    optionGroups.flatMap((group) => group.values.map((value) => [value.id, value] as const)),
  );
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <h3 className="font-display text-lg font-semibold">Variant rows</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Use variants when price or stock changes by option combination.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {variants.length ? (
            variants.map((variant) => (
              <div key={variant.id} className="rounded-md border border-border bg-surface/60 p-3">
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() =>
                    onVariantChange({
                      id: variant.id,
                      product_id: variant.product_id,
                      sku: variant.sku,
                      selected_option_value_ids: variant.selected_option_value_ids,
                      price: Number(variant.price),
                      stock_quantity: variant.stock_quantity,
                      is_available: variant.is_available,
                    })
                  }
                >
                  <div className="font-medium">{variant.sku || "Variant"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    ${Number(variant.price).toFixed(2)} | stock {variant.stock_quantity} |{" "}
                    {variant.is_available ? "Available" : "Unavailable"}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {variant.selected_option_value_ids
                      .map((id) => valueById.get(id)?.value_english)
                      .filter(Boolean)
                      .join(" / ") || "No option values"}
                  </div>
                </button>
                <button
                  type="button"
                  className="mt-2 text-xs text-destructive"
                  onClick={() => onDeleteVariant(variant)}
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              No variants yet.
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-surface/60 p-3">
          <h4 className="font-medium">{variantForm.id ? "Edit variant" : "Create variant"}</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <TextField
              label="SKU"
              value={variantForm.sku}
              onChange={(value) => onVariantChange({ ...variantForm, sku: value })}
            />
            <NumberField
              label="Price"
              value={variantForm.price}
              onChange={(value) => onVariantChange({ ...variantForm, price: value })}
            />
            <NumberField
              label="Stock"
              value={variantForm.stock_quantity}
              onChange={(value) => onVariantChange({ ...variantForm, stock_quantity: value })}
            />
            <Toggle
              label="Available"
              checked={variantForm.is_available}
              onChange={(checked) => onVariantChange({ ...variantForm, is_available: checked })}
            />
          </div>
          <div className="mt-4 space-y-3">
            {optionGroups.length ? (
              optionGroups.map(({ option, values }) => (
                <div key={option.id} className="rounded-md border border-border p-3">
                  <div className="text-sm font-medium">{option.name_english}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {values.length ? (
                      values.map((value) => {
                        const checked = variantForm.selected_option_value_ids.includes(value.id);
                        return (
                          <label
                            key={value.id}
                            className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const nextIds = event.target.checked
                                  ? [...variantForm.selected_option_value_ids, value.id]
                                  : variantForm.selected_option_value_ids.filter(
                                      (id) => id !== value.id,
                                    );
                                onVariantChange({
                                  ...variantForm,
                                  selected_option_value_ids: Array.from(new Set(nextIds)),
                                });
                              }}
                            />
                            {value.value_english}
                          </label>
                        );
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground">No values yet.</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                Add option groups and values before creating variants.
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={savingAdvanced === "product-variant"}
            className="studio-button-primary mt-3 disabled:cursor-wait disabled:opacity-60"
            onClick={onSaveVariant}
          >
            {savingAdvanced === "product-variant" ? "Saving..." : "Save variant"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ProductCustomFieldsSection({
  customFields,
  customFieldForm,
  customFieldChoicesText,
  savingAdvanced,
  onCustomFieldChange,
  onCustomFieldChoicesTextChange,
  onSaveCustomField,
  onDeleteCustomField,
}: {
  customFields: WaProductCustomFieldRow[];
  customFieldForm: AdminProductCustomFieldInput;
  customFieldChoicesText: string;
  savingAdvanced: string;
  onCustomFieldChange: (form: AdminProductCustomFieldInput) => void;
  onCustomFieldChoicesTextChange: (value: string) => void;
  onSaveCustomField: () => void;
  onDeleteCustomField: (field: WaProductCustomFieldRow) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <h3 className="font-display text-lg font-semibold">Product questions</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Ask extra questions after this product is selected. Required questions are enforced by the
        bot before checkout continues.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {customFields.length ? (
            customFields.map((field) => (
              <div key={field.id} className="rounded-md border border-border bg-surface/60 p-3">
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => {
                    onCustomFieldChange({
                      id: field.id,
                      product_id: field.product_id,
                      type: field.type,
                      label_english: field.label_english,
                      label_arabic: field.label_arabic,
                      placeholder_english: field.placeholder_english,
                      placeholder_arabic: field.placeholder_arabic,
                      is_required: field.is_required,
                      minimum_length: field.minimum_length,
                      maximum_length: field.maximum_length,
                      minimum_value: field.minimum_value,
                      maximum_value: field.maximum_value,
                      choices: field.choices,
                      sort_order: field.sort_order,
                    });
                    onCustomFieldChoicesTextChange(choicesToText(field.choices));
                  }}
                >
                  <div className="font-medium">{field.label_english}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {field.type} | {field.is_required ? "Required" : "Optional"}
                  </div>
                </button>
                <button
                  type="button"
                  className="mt-2 text-xs text-destructive"
                  onClick={() => onDeleteCustomField(field)}
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              No product questions yet.
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-surface/60 p-3">
          <h4 className="font-medium">
            {customFieldForm.id ? "Edit question" : "Create question"}
          </h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <SelectField
              label="Question type"
              value={customFieldForm.type}
              onChange={(value) =>
                onCustomFieldChange({
                  ...customFieldForm,
                  type: value as AdminProductCustomFieldInput["type"],
                })
              }
            >
              <option value="short_text">Short text</option>
              <option value="long_text">Long text</option>
              <option value="number">Number</option>
              <option value="single_choice">Single choice</option>
            </SelectField>
            <NumberField
              label="Sort order"
              value={customFieldForm.sort_order}
              onChange={(value) => onCustomFieldChange({ ...customFieldForm, sort_order: value })}
            />
            <TextField
              label="Question label EN"
              value={customFieldForm.label_english}
              onChange={(value) =>
                onCustomFieldChange({ ...customFieldForm, label_english: value })
              }
            />
            <TextField
              label="Question label AR"
              value={customFieldForm.label_arabic}
              dir="rtl"
              onChange={(value) => onCustomFieldChange({ ...customFieldForm, label_arabic: value })}
            />
            <TextField
              label="Placeholder EN"
              value={customFieldForm.placeholder_english ?? ""}
              onChange={(value) =>
                onCustomFieldChange({ ...customFieldForm, placeholder_english: value })
              }
            />
            <TextField
              label="Placeholder AR"
              value={customFieldForm.placeholder_arabic ?? ""}
              dir="rtl"
              onChange={(value) =>
                onCustomFieldChange({ ...customFieldForm, placeholder_arabic: value })
              }
            />
            <Toggle
              label="Required"
              checked={customFieldForm.is_required}
              onChange={(checked) =>
                onCustomFieldChange({ ...customFieldForm, is_required: checked })
              }
            />
          </div>
          <TextField
            label="Choices for single choice, comma separated"
            value={customFieldChoicesText}
            onChange={onCustomFieldChoicesTextChange}
          />
          <button
            type="button"
            disabled={savingAdvanced === "product-custom-field"}
            className="studio-button-primary mt-3 disabled:cursor-wait disabled:opacity-60"
            onClick={onSaveCustomField}
          >
            {savingAdvanced === "product-custom-field" ? "Saving..." : "Save question"}
          </button>
        </div>
      </div>
    </section>
  );
}

function parseChoices(text: string): AdminProductCustomFieldInput["choices"] {
  const choices = text
    .split(",")
    .map((choice) => choice.trim())
    .filter(Boolean)
    .map((choice, index) => ({
      id:
        choice
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `choice-${index + 1}`,
      labelEnglish: choice,
      labelArabic: choice,
    }));
  return choices.length ? choices : null;
}

function choicesToText(choices: WaProductCustomFieldRow["choices"]) {
  return (choices ?? []).map((choice) => choice.labelEnglish).join(", ");
}

function validateProduct(product: AdminProductInput) {
  if (!product.code.trim()) return "Add a product code.";
  if (!product.name_english.trim() || !product.name_arabic.trim()) {
    return "Add product names in English and Arabic.";
  }
  if (Number(product.price) < 0) return "Price cannot be negative.";
  if (Number(product.stock_quantity) < 0) return "Stock cannot be negative.";
  if (!(product.group_value_ids ?? []).length) {
    return "Choose at least one route value for this product.";
  }
  return "";
}

function TextField({
  label,
  value,
  dir,
  onChange,
}: {
  label: string;
  value: string;
  dir?: "rtl" | "ltr";
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  dir,
  onChange,
}: {
  label: string;
  value: string;
  dir?: "rtl" | "ltr";
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <textarea
        value={value}
        dir={dir}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  children,
  onChange,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      >
        {children}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
