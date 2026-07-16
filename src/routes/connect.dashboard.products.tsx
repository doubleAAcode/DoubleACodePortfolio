import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ImagePlus,
  Loader2,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { uploadWaDashboardImage } from "@/features/connect/shared/dashboard-client";
import type {
  WaCategoryRow,
  WaProductCustomFieldRow,
  WaProductOptionRow,
  WaProductOptionValueRow,
  WaProductRow,
  WaProductVariantRow,
} from "@/features/connect/shared/dashboard-store.server";
import { formatMoney, useWaDashboardData } from "@/features/connect/shared/use-wa-dashboard-data";

export const Route = createFileRoute("/connect/dashboard/products")({
  component: ProductsPage,
  errorComponent: ProductsRouteError,
});

const emptyProduct = {
  id: "",
  category_id: "",
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
  variant_selection_mode: "step_by_step" as "step_by_step" | "variant_list",
  sort_order: 10,
};

const emptyOption = {
  id: "",
  product_id: "",
  name_english: "",
  name_arabic: "",
  valuesText: "",
  sort_order: 10,
  is_required: true,
};

const emptyValue = {
  id: "",
  option_id: "",
  value_english: "",
  value_arabic: "",
  image_url: "",
  sort_order: 10,
};

const emptyVariant = {
  id: "",
  product_id: "",
  sku: "",
  selected_option_value_ids: [] as string[],
  price: 0,
  stock_quantity: 0,
  is_available: true,
};

const emptyField = {
  id: "",
  product_id: "",
  type: "short_text" as WaProductCustomFieldRow["type"],
  label_english: "",
  label_arabic: "",
  placeholder_english: "",
  placeholder_arabic: "",
  is_required: false,
  minimum_length: null as number | null,
  maximum_length: null as number | null,
  minimum_value: null as number | null,
  maximum_value: null as number | null,
  choicesText: "",
  sort_order: 10,
};

type SavingAction = "product" | "option" | "value" | "variant" | "field" | null;
type EditorStep = "basics" | "options" | "stock" | "questions" | "preview";

function ProductsRouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const diagnostics = buildRouteErrorDiagnostics(error);

  return (
    <div className="dark min-h-screen bg-background px-4 py-8 text-foreground">
      <main className="mx-auto max-w-5xl space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Dashboard products
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-destructive">
            Products page failed to load
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            The full error is shown below so we can fix the exact failing line instead of guessing.
          </p>
        </div>

        <section className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <h2 className="font-display text-lg font-semibold text-destructive">Error message</h2>
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-background p-3 text-sm text-destructive">
            {diagnostics.message}
          </pre>
        </section>

        <details open className="rounded-lg border border-border bg-surface/60 p-4">
          <summary className="cursor-pointer font-display text-lg font-semibold">
            Expandable diagnostic log
          </summary>
          <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
            {diagnostics.fullText}
          </pre>
        </details>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="studio-button-primary"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </button>
          <button
            type="button"
            className="studio-button"
            onClick={() => void navigator.clipboard?.writeText(diagnostics.fullText)}
          >
            Copy log
          </button>
          <a href="/connect/dashboard" className="studio-button">
            Back to dashboard
          </a>
        </div>
      </main>
    </div>
  );
}

function buildRouteErrorDiagnostics(error: Error) {
  const locationDetails =
    typeof window === "undefined"
      ? "URL: unavailable during server render"
      : [`URL: ${window.location.href}`, `User agent: ${window.navigator.userAgent}`].join("\n");
  const cause =
    "cause" in error ? formatUnknownError((error as Error & { cause?: unknown }).cause) : "";
  const parts = [
    `Time: ${new Date().toISOString()}`,
    locationDetails,
    `Name: ${error.name || "Error"}`,
    `Message: ${error.message || "No error message was provided."}`,
    cause ? `Cause: ${cause}` : "",
    "Stack:",
    error.stack || "No stack trace was provided.",
  ].filter(Boolean);

  return {
    message: error.message || "No error message was provided.",
    fullText: parts.join("\n\n"),
  };
}

function formatUnknownError(value: unknown) {
  if (value instanceof Error) return `${value.name}: ${value.message}\n${value.stack ?? ""}`.trim();
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ProductsPage() {
  const { data, loading, saving, error, notice, setError, applyAction } = useWaDashboardData();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<EditorStep>("basics");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [optionForm, setOptionForm] = useState(emptyOption);
  const [valueForm, setValueForm] = useState(emptyValue);
  const [variantForm, setVariantForm] = useState(emptyVariant);
  const [fieldForm, setFieldForm] = useState(emptyField);
  const [uploading, setUploading] = useState(false);
  const [savingAction, setSavingAction] = useState<SavingAction>(null);

  const currency = data?.business.currency ?? "USD";
  const categories = useMemo(() => data?.categories ?? [], [data?.categories]);
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const products = useMemo(() => {
    const value = search.trim().toLowerCase();
    return [...(data?.products ?? [])]
      .filter((product) => {
        if (!value) return true;
        const category = product.category_id ? categoryById.get(product.category_id) : undefined;
        return [
          product.code,
          product.name_english,
          product.name_arabic,
          category?.name_english,
          category?.name_arabic,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(value);
      })
      .sort((a, b) => a.sort_order - b.sort_order || a.name_english.localeCompare(b.name_english));
  }, [categoryById, data?.products, search]);

  const selectedProduct =
    data?.products.find((product) => product.id === selectedProductId) ?? products[0];
  const selectedId = selectedProduct?.id ?? "";
  const productOptions = data?.options.filter((option) => option.product_id === selectedId) ?? [];
  const optionIds = new Set(productOptions.map((option) => option.id));
  const productValues = data?.optionValues.filter((value) => optionIds.has(value.option_id)) ?? [];
  const productVariants =
    data?.variants.filter((variant) => variant.product_id === selectedId) ?? [];
  const productFields = data?.customFields.filter((field) => field.product_id === selectedId) ?? [];
  const optionGroups = productOptions.map((option) => ({
    option,
    values: productValues
      .filter((value) => value.option_id === option.id)
      .sort(
        (a, b) => a.sort_order - b.sort_order || a.value_english.localeCompare(b.value_english),
      ),
  }));
  const variantGroups = optionGroups.filter((group) => group.values.length);
  const existingVariantKeys = new Set(
    productVariants.map((variant) => combinationKey(variant.selected_option_value_ids)),
  );
  const missingVariantCombinations = buildVariantCombinations(variantGroups).filter(
    (combination) => !existingVariantKeys.has(combinationKey(combination.map((value) => value.id))),
  );
  const availableVariantCount = productVariants.filter(
    (variant) => variant.is_available && variant.stock_quantity > 0,
  ).length;
  const totalVariantStock = productVariants.reduce(
    (total, variant) => total + Math.max(0, Number(variant.stock_quantity) || 0),
    0,
  );
  const productWarnings = selectedProduct
    ? getProductWarnings(selectedProduct, productOptions, productValues, productVariants)
    : [];

  function openNewProduct() {
    setProductForm({
      ...emptyProduct,
      category_id: "",
      sort_order: (data?.products.length ?? 0) + 10,
    });
    setSelectedProductId("");
    setEditorOpen(true);
    setActiveStep("basics");
    resetNestedForms();
  }

  function openProduct(product: WaProductRow) {
    setSelectedProductId(product.id);
    setProductForm(productToForm(product));
    setEditorOpen(true);
    setActiveStep("basics");
    resetNestedForms();
  }

  function closeEditor() {
    setEditorOpen(false);
    setProductForm(emptyProduct);
    resetNestedForms();
  }

  function resetNestedForms() {
    setOptionForm(emptyOption);
    setValueForm(emptyValue);
    setVariantForm(emptyVariant);
    setFieldForm(emptyField);
    setShowAdvanced(false);
  }

  async function runSave<T>(action: Exclude<SavingAction, null>, task: () => Promise<T>) {
    setSavingAction(action);
    setError("");
    try {
      return await task();
    } catch (err) {
      setError(err instanceof Error ? makeFriendlyError(err.message) : "Could not save changes.");
      throw err;
    } finally {
      setSavingAction(null);
    }
  }

  async function submitProduct() {
    const message = validateProductForm(productForm, categories);
    if (message) {
      setError(message);
      return;
    }

    await runSave("product", async () => {
      const payload = { ...productForm, id: productForm.id || undefined };
      const next = await applyAction({ type: "saveProduct", payload }, "Product saved.");
      const saved =
        (payload.id ? next.products.find((product) => product.id === payload.id) : null) ??
        next.products.find((product) => product.code === payload.code.trim().toUpperCase());
      if (saved) {
        setSelectedProductId(saved.id);
        setProductForm(productToForm(saved));
      }
      setEditorOpen(true);
    });
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const image = await uploadWaDashboardImage(file);
      setProductForm((current) => ({ ...current, image_url: image.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submitOption() {
    if (!selectedId) {
      setError("Save the product before adding customer options.");
      return;
    }
    if (!optionForm.name_english.trim() || !optionForm.name_arabic.trim()) {
      setError("Add the option question in English and Arabic.");
      return;
    }

    await runSave("option", async () => {
      const next = await applyAction(
        {
          type: "saveOption",
          payload: {
            id: optionForm.id || undefined,
            product_id: selectedId,
            name_english: optionForm.name_english,
            name_arabic: optionForm.name_arabic,
            sort_order: optionForm.sort_order,
            is_required: optionForm.is_required,
          },
        },
        "Customer option saved.",
      );

      const savedOption =
        (optionForm.id ? next.options.find((option) => option.id === optionForm.id) : null) ??
        next.options.find(
          (option) =>
            option.product_id === selectedId &&
            option.name_english.trim().toLowerCase() ===
              optionForm.name_english.trim().toLowerCase(),
        );

      if (savedOption && optionForm.valuesText.trim()) {
        const existingValues = next.optionValues.filter(
          (value) => value.option_id === savedOption.id,
        );
        for (const [index, label] of parseCommaLabels(optionForm.valuesText).entries()) {
          const exists = existingValues.some(
            (value) => value.value_english.trim().toLowerCase() === label.toLowerCase(),
          );
          if (!exists) {
            await applyAction(
              {
                type: "saveOptionValue",
                payload: {
                  option_id: savedOption.id,
                  value_english: label,
                  value_arabic: label,
                  sort_order: existingValues.length + index + 1,
                },
              },
              "Choice added.",
            );
          }
        }
      }

      setOptionForm(emptyOption);
    });
  }

  async function submitValue() {
    if (!valueForm.option_id) {
      setError("Choose the option this choice belongs to.");
      return;
    }
    if (!valueForm.value_english.trim() || !valueForm.value_arabic.trim()) {
      setError("Add the choice label in English and Arabic.");
      return;
    }

    await runSave("value", async () => {
      await applyAction(
        { type: "saveOptionValue", payload: { ...valueForm, id: valueForm.id || undefined } },
        "Choice saved.",
      );
      setValueForm(emptyValue);
    });
  }

  async function submitVariant(nextVariant = variantForm) {
    if (!selectedId) {
      setError("Save the product before editing stock rows.");
      return;
    }
    await runSave("variant", async () => {
      await applyAction(
        {
          type: "saveVariant",
          payload: { ...nextVariant, id: nextVariant.id || undefined, product_id: selectedId },
        },
        "Stock row saved.",
      );
      setVariantForm(emptyVariant);
    });
  }

  async function generateMissingVariants() {
    if (!selectedProduct || !missingVariantCombinations.length) return;

    await runSave("variant", async () => {
      for (const combination of missingVariantCombinations) {
        await applyAction(
          {
            type: "saveVariant",
            payload: {
              product_id: selectedId,
              sku: buildVariantSku(selectedProduct.code, combination),
              selected_option_value_ids: combination.map((value) => value.id),
              price: Number(selectedProduct.price),
              stock_quantity: selectedProduct.stock_quantity,
              is_available: selectedProduct.is_available,
            },
          },
          "Stock rows generated.",
        );
      }
      setVariantForm(emptyVariant);
    });
  }

  async function submitField() {
    if (!selectedId) {
      setError("Save the product before adding customer questions.");
      return;
    }
    if (!fieldForm.label_english.trim() || !fieldForm.label_arabic.trim()) {
      setError("Add the customer question in English and Arabic.");
      return;
    }

    await runSave("field", async () => {
      await applyAction(
        {
          type: "saveCustomField",
          payload: {
            id: fieldForm.id || undefined,
            product_id: selectedId,
            type: fieldForm.type,
            label_english: fieldForm.label_english,
            label_arabic: fieldForm.label_arabic,
            placeholder_english: fieldForm.placeholder_english || null,
            placeholder_arabic: fieldForm.placeholder_arabic || null,
            is_required: fieldForm.is_required,
            minimum_length: fieldForm.minimum_length,
            maximum_length: fieldForm.maximum_length,
            minimum_value: fieldForm.minimum_value,
            maximum_value: fieldForm.maximum_value,
            choices: parseChoices(fieldForm.choicesText),
            sort_order: fieldForm.sort_order,
          },
        },
        "Customer question saved.",
      );
      setFieldForm(emptyField);
    });
  }

  if (loading) return <Status loading error="" notice="" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Catalog</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Products</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Add products, decide what customers choose in WhatsApp, and keep prices and stock clear.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <button type="button" className="studio-button-primary" onClick={openNewProduct}>
            <PackagePlus className="h-4 w-4" />
            Add product
          </button>
        </div>
      </div>

      <Status loading={false} error={error} notice={notice} />

      {!editorOpen ? (
        <ProductList
          products={products}
          categories={categoryById}
          currency={currency}
          selectedProductId={selectedId}
          onEdit={openProduct}
          onDelete={(product) => {
            if (window.confirm(`Delete ${product.name_english}?`)) {
              void applyAction(
                { type: "deleteProduct", payload: { id: product.id } },
                "Product deleted.",
              );
            }
          }}
          onAdd={openNewProduct}
        />
      ) : (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <EditorHeader
              productName={productForm.name_english || "New product"}
              isNew={!productForm.id}
              activeStep={activeStep}
              onStepChange={setActiveStep}
              onClose={closeEditor}
            />

            {productWarnings.length ? <WarningsList warnings={productWarnings} /> : null}

            {activeStep === "basics" ? (
              <EditorPanel
                title="Basic info"
                description="This is what customers see before choosing or ordering the product."
                footer={
                  <EditorActions
                    saving={savingAction === "product"}
                    disabled={saving}
                    primaryLabel={productForm.id ? "Save product" : "Create product"}
                    savingLabel="Saving product..."
                    onPrimary={() => void submitProduct()}
                    onCancel={closeEditor}
                  />
                }
              >
                <div className="grid gap-3 lg:grid-cols-2">
                  <TextInput
                    label="Product name EN"
                    value={productForm.name_english}
                    onChange={(value) => setProductForm({ ...productForm, name_english: value })}
                  />
                  <TextInput
                    label="Product name AR"
                    dir="rtl"
                    value={productForm.name_arabic}
                    onChange={(value) => setProductForm({ ...productForm, name_arabic: value })}
                  />
                  <SelectInput
                    label="Legacy category"
                    value={productForm.category_id}
                    onChange={(value) => setProductForm({ ...productForm, category_id: value })}
                  >
                    <option value="">No legacy category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name_english}
                      </option>
                    ))}
                  </SelectInput>
                  <p className="self-end text-xs text-muted-foreground">
                    Optional. WhatsApp placement is controlled by admin route values.
                  </p>
                  <TextInput
                    label="Product code"
                    value={productForm.code}
                    onChange={(value) => setProductForm({ ...productForm, code: value })}
                    hint="Unique code used internally. Example: NCK-001"
                  />
                  <NumberInput
                    label="Base price"
                    value={productForm.price}
                    onChange={(value) => setProductForm({ ...productForm, price: value })}
                  />
                  <NumberInput
                    label="Stock if no options"
                    value={productForm.stock_quantity}
                    onChange={(value) => setProductForm({ ...productForm, stock_quantity: value })}
                  />
                  <SelectInput
                    label="How customers choose variants"
                    value={productForm.variant_selection_mode}
                    onChange={(value) =>
                      setProductForm({
                        ...productForm,
                        variant_selection_mode:
                          value === "variant_list" ? "variant_list" : "step_by_step",
                      })
                    }
                  >
                    <option value="step_by_step">Ask each option one by one</option>
                    <option value="variant_list">Show one list of final variants</option>
                  </SelectInput>
                  <p className="self-end rounded-md border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                    Variant list example: Large / Red - $25.00. Extra required questions still come
                    after the variant choice.
                  </p>
                  <TextArea
                    label="Description EN"
                    value={productForm.description_english}
                    onChange={(value) =>
                      setProductForm({ ...productForm, description_english: value })
                    }
                  />
                  <TextArea
                    label="Description AR"
                    dir="rtl"
                    value={productForm.description_arabic}
                    onChange={(value) =>
                      setProductForm({ ...productForm, description_arabic: value })
                    }
                  />
                  <div className="space-y-2 lg:col-span-2">
                    <span className="block text-sm text-muted-foreground">Product image</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <ProductImagePreview
                        src={productForm.image_url}
                        name={productForm.name_english}
                      />
                      <label className="studio-button cursor-pointer">
                        <ImagePlus className="h-4 w-4" />
                        {uploading ? "Uploading..." : "Upload image"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void uploadImage(file);
                          }}
                        />
                      </label>
                      {productForm.image_url ? (
                        <button
                          type="button"
                          className="studio-button"
                          onClick={() => setProductForm({ ...productForm, image_url: "" })}
                        >
                          <X className="h-4 w-4" />
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <Toggle
                    label="Visible in WhatsApp"
                    checked={productForm.is_active}
                    onChange={(value) => setProductForm({ ...productForm, is_active: value })}
                  />
                  <Toggle
                    label="Available to order"
                    checked={productForm.is_available}
                    onChange={(value) => setProductForm({ ...productForm, is_available: value })}
                  />
                </div>
              </EditorPanel>
            ) : null}

            {activeStep === "options" ? (
              <EditorPanel
                title="Options customers choose"
                description="Use options for things like size, color, or flavor. Customers will choose these before ordering."
              >
                {!selectedId ? (
                  <SaveFirstMessage />
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-lg border border-border bg-background/50 p-4">
                      <h3 className="font-display text-lg font-semibold">
                        {optionForm.id ? "Edit option" : "Add option"}
                      </h3>
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <TextInput
                          label="Question shown to customer EN"
                          value={optionForm.name_english}
                          onChange={(value) =>
                            setOptionForm({ ...optionForm, name_english: value })
                          }
                          hint="Example: Choose size"
                        />
                        <TextInput
                          label="Question shown to customer AR"
                          dir="rtl"
                          value={optionForm.name_arabic}
                          onChange={(value) => setOptionForm({ ...optionForm, name_arabic: value })}
                        />
                        <TextInput
                          label="Add choices at once"
                          value={optionForm.valuesText}
                          onChange={(value) => setOptionForm({ ...optionForm, valuesText: value })}
                          hint="Example: Small, Medium, Large"
                        />
                        <Toggle
                          label="Customer must choose"
                          checked={optionForm.is_required}
                          onChange={(value) => setOptionForm({ ...optionForm, is_required: value })}
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <SaveButton
                          disabled={saving}
                          saving={savingAction === "option"}
                          savingLabel="Saving option..."
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => void submitOption()}
                        >
                          {optionForm.id ? "Save option" : "Add option"}
                        </SaveButton>
                        {optionForm.id ? (
                          <button
                            type="button"
                            className="studio-button"
                            onClick={() => setOptionForm(emptyOption)}
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <OptionGroups
                      groups={optionGroups}
                      onEditOption={(option) =>
                        setOptionForm({
                          id: option.id,
                          product_id: option.product_id,
                          name_english: option.name_english,
                          name_arabic: option.name_arabic,
                          valuesText: "",
                          sort_order: option.sort_order,
                          is_required: option.is_required,
                        })
                      }
                      onDeleteOption={(option) => {
                        if (window.confirm(`Delete option ${option.name_english}?`)) {
                          void applyAction(
                            { type: "deleteOption", payload: { id: option.id } },
                            "Option deleted.",
                          );
                        }
                      }}
                      onEditValue={(value) =>
                        setValueForm({ ...value, image_url: value.image_url ?? "" })
                      }
                      onDeleteValue={(value) => {
                        if (window.confirm(`Delete choice ${value.value_english}?`)) {
                          void applyAction(
                            { type: "deleteOptionValue", payload: { id: value.id } },
                            "Choice deleted.",
                          );
                        }
                      }}
                    />

                    <details className="rounded-lg border border-border bg-surface/60 p-4">
                      <summary className="cursor-pointer font-display text-lg font-semibold">
                        Add or edit one choice manually
                      </summary>
                      <div className="mt-4 grid gap-3 lg:grid-cols-4">
                        <SelectInput
                          label="Option"
                          value={valueForm.option_id}
                          onChange={(value) => setValueForm({ ...valueForm, option_id: value })}
                        >
                          <option value="">Choose option</option>
                          {productOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name_english}
                            </option>
                          ))}
                        </SelectInput>
                        <TextInput
                          label="Choice EN"
                          value={valueForm.value_english}
                          onChange={(value) => setValueForm({ ...valueForm, value_english: value })}
                        />
                        <TextInput
                          label="Choice AR"
                          dir="rtl"
                          value={valueForm.value_arabic}
                          onChange={(value) => setValueForm({ ...valueForm, value_arabic: value })}
                        />
                        <NumberInput
                          label="Sort"
                          value={valueForm.sort_order}
                          onChange={(value) => setValueForm({ ...valueForm, sort_order: value })}
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <SaveButton
                          disabled={saving || !valueForm.option_id}
                          saving={savingAction === "value"}
                          savingLabel="Saving choice..."
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => void submitValue()}
                        >
                          {valueForm.id ? "Save choice" : "Add choice"}
                        </SaveButton>
                        {valueForm.id ? (
                          <button
                            type="button"
                            className="studio-button"
                            onClick={() => setValueForm(emptyValue)}
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </details>
                  </div>
                )}
              </EditorPanel>
            ) : null}

            {activeStep === "stock" ? (
              <EditorPanel
                title="Stock and pricing"
                description="If the product has options, set stock and price for each final customer choice."
              >
                {!selectedId || !selectedProduct ? (
                  <SaveFirstMessage />
                ) : productOptions.length === 0 ? (
                  <div className="rounded-lg border border-border bg-background/50 p-4">
                    <h3 className="font-display text-lg font-semibold">Simple product stock</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This product has no customer options. Use the base price and stock in Basic
                      info.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MetricTile
                        label="Price"
                        value={formatMoney(selectedProduct.price, currency)}
                        detail="base price"
                      />
                      <MetricTile
                        label="Stock"
                        value={`${selectedProduct.stock_quantity}`}
                        detail="available units"
                      />
                      <MetricTile
                        label="Status"
                        value={selectedProduct.is_available ? "Selling" : "Unavailable"}
                        detail={selectedProduct.is_active ? "visible" : "hidden"}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-background/50 p-4 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="font-display text-lg font-semibold">Stock rows</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {productVariants.length} rows created, {availableVariantCount} currently
                          selling.
                        </p>
                      </div>
                      <SaveButton
                        className="studio-button-primary"
                        disabled={saving || missingVariantCombinations.length === 0}
                        saving={savingAction === "variant"}
                        savingLabel="Generating..."
                        icon={<Plus className="h-4 w-4" />}
                        onClick={() => void generateMissingVariants()}
                      >
                        Generate missing rows ({missingVariantCombinations.length})
                      </SaveButton>
                    </div>

                    <StockMatrix
                      variants={productVariants}
                      values={productValues}
                      currency={currency}
                      onEdit={(variant) =>
                        setVariantForm({ ...variant, price: Number(variant.price) })
                      }
                      onDelete={(variant) => {
                        if (window.confirm(`Delete stock row ${variant.sku}?`)) {
                          void applyAction(
                            { type: "deleteVariant", payload: { id: variant.id } },
                            "Stock row deleted.",
                          );
                        }
                      }}
                    />

                    <details className="rounded-lg border border-border bg-surface/60 p-4">
                      <summary className="cursor-pointer font-display text-lg font-semibold">
                        {variantForm.id ? "Edit selected stock row" : "Create stock row manually"}
                      </summary>
                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <TextInput
                          label="SKU"
                          value={variantForm.sku}
                          onChange={(value) => setVariantForm({ ...variantForm, sku: value })}
                        />
                        <NumberInput
                          label="Price"
                          value={variantForm.price}
                          onChange={(value) => setVariantForm({ ...variantForm, price: value })}
                        />
                        <NumberInput
                          label="Stock"
                          value={variantForm.stock_quantity}
                          onChange={(value) =>
                            setVariantForm({ ...variantForm, stock_quantity: value })
                          }
                        />
                        <Toggle
                          label="Available"
                          checked={variantForm.is_available}
                          onChange={(value) =>
                            setVariantForm({ ...variantForm, is_available: value })
                          }
                        />
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {variantGroups.map((group) => (
                          <SelectInput
                            key={group.option.id}
                            label={group.option.name_english}
                            value={getSelectedValueForOption(
                              variantForm.selected_option_value_ids,
                              group.option.id,
                              productValues,
                            )}
                            onChange={(value) =>
                              setVariantForm({
                                ...variantForm,
                                selected_option_value_ids: replaceVariantOptionValue(
                                  variantForm.selected_option_value_ids,
                                  group.option.id,
                                  value,
                                  productValues,
                                ),
                              })
                            }
                          >
                            <option value="">Choose</option>
                            {group.values.map((value) => (
                              <option key={value.id} value={value.id}>
                                {value.value_english}
                              </option>
                            ))}
                          </SelectInput>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <SaveButton
                          disabled={saving || !selectedId}
                          saving={savingAction === "variant"}
                          savingLabel="Saving stock row..."
                          icon={<Check className="h-4 w-4" />}
                          onClick={() => {
                            const selectedValues = buildSelectedOptionValueIds(
                              variantForm.selected_option_value_ids,
                              variantGroups,
                            );
                            const selectedValueRows = selectedValues
                              .map((id) => productValues.find((value) => value.id === id))
                              .filter(Boolean) as WaProductOptionValueRow[];
                            const nextVariant = {
                              ...variantForm,
                              selected_option_value_ids: selectedValues,
                              sku:
                                variantForm.sku ||
                                buildVariantSku(selectedProduct.code, selectedValueRows),
                            };
                            setVariantForm(nextVariant);
                            void submitVariant(nextVariant);
                          }}
                        >
                          Save stock row
                        </SaveButton>
                        {variantForm.id ? (
                          <button
                            type="button"
                            className="studio-button"
                            onClick={() => setVariantForm(emptyVariant)}
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </details>
                  </div>
                )}
              </EditorPanel>
            ) : null}

            {activeStep === "questions" ? (
              <EditorPanel
                title="Extra questions"
                description="Ask for details that do not change price or stock, like engraving text or delivery notes."
              >
                {!selectedId ? (
                  <SaveFirstMessage />
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <SelectInput
                        label="Question type"
                        value={fieldForm.type}
                        onChange={(value) =>
                          setFieldForm({
                            ...fieldForm,
                            type: value as WaProductCustomFieldRow["type"],
                          })
                        }
                      >
                        <option value="short_text">Short answer</option>
                        <option value="long_text">Long answer</option>
                        <option value="number">Number</option>
                        <option value="yes_no">Yes or no</option>
                        <option value="single_choice">Single choice</option>
                      </SelectInput>
                      <Toggle
                        label="Customer must answer"
                        checked={fieldForm.is_required}
                        onChange={(value) => setFieldForm({ ...fieldForm, is_required: value })}
                      />
                      <TextInput
                        label="Question EN"
                        value={fieldForm.label_english}
                        onChange={(value) => setFieldForm({ ...fieldForm, label_english: value })}
                        hint="Example: What name should we engrave?"
                      />
                      <TextInput
                        label="Question AR"
                        dir="rtl"
                        value={fieldForm.label_arabic}
                        onChange={(value) => setFieldForm({ ...fieldForm, label_arabic: value })}
                      />
                      <TextInput
                        label="Placeholder EN"
                        value={fieldForm.placeholder_english}
                        onChange={(value) =>
                          setFieldForm({ ...fieldForm, placeholder_english: value })
                        }
                      />
                      <TextInput
                        label="Placeholder AR"
                        dir="rtl"
                        value={fieldForm.placeholder_arabic}
                        onChange={(value) =>
                          setFieldForm({ ...fieldForm, placeholder_arabic: value })
                        }
                      />
                      <TextInput
                        label="Choices if single choice"
                        value={fieldForm.choicesText}
                        onChange={(value) => setFieldForm({ ...fieldForm, choicesText: value })}
                        hint="Example: Red, Blue, Green"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <SaveButton
                        disabled={saving}
                        saving={savingAction === "field"}
                        savingLabel="Saving question..."
                        icon={<Plus className="h-4 w-4" />}
                        onClick={() => void submitField()}
                      >
                        {fieldForm.id ? "Save question" : "Add question"}
                      </SaveButton>
                      {fieldForm.id ? (
                        <button
                          type="button"
                          className="studio-button"
                          onClick={() => setFieldForm(emptyField)}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                    <QuestionList
                      fields={productFields}
                      onEdit={(field) =>
                        setFieldForm({
                          ...field,
                          placeholder_english: field.placeholder_english ?? "",
                          placeholder_arabic: field.placeholder_arabic ?? "",
                          minimum_value:
                            field.minimum_value === null ? null : Number(field.minimum_value),
                          maximum_value:
                            field.maximum_value === null ? null : Number(field.maximum_value),
                          choicesText:
                            field.choices?.map((choice) => choice.labelEnglish).join(", ") ?? "",
                        })
                      }
                      onDelete={(field) => {
                        if (window.confirm(`Delete question ${field.label_english}?`)) {
                          void applyAction(
                            { type: "deleteCustomField", payload: { id: field.id } },
                            "Question deleted.",
                          );
                        }
                      }}
                    />
                  </div>
                )}
              </EditorPanel>
            ) : null}

            {activeStep === "preview" ? (
              <EditorPanel
                title="WhatsApp preview"
                description="A quick view of what the customer should understand before ordering."
              >
                <WhatsAppPreview
                  product={productForm}
                  category={
                    productForm.category_id ? categoryById.get(productForm.category_id) : undefined
                  }
                  optionGroups={optionGroups}
                  fields={productFields}
                  currency={currency}
                />
              </EditorPanel>
            ) : null}

            <details
              open={showAdvanced}
              onToggle={(event) => setShowAdvanced(event.currentTarget.open)}
              className="rounded-lg border border-border bg-surface/60 p-4"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 font-display text-lg font-semibold">
                Advanced catalog details
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </summary>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <MetricTile label="Product id" value={selectedId || "Not saved"} />
                <MetricTile label="Options" value={`${productOptions.length}`} />
                <MetricTile label="Choices" value={`${productValues.length}`} />
                <MetricTile label="Stock rows" value={`${productVariants.length}`} />
              </div>
            </details>
          </div>

          <aside className="space-y-4">
            <ProductSummary
              product={productForm}
              category={
                productForm.category_id ? categoryById.get(productForm.category_id) : undefined
              }
              currency={currency}
              optionCount={productOptions.length}
              questionCount={productFields.length}
              totalVariantStock={totalVariantStock}
            />
            <WhatsAppPreview
              product={productForm}
              category={
                productForm.category_id ? categoryById.get(productForm.category_id) : undefined
              }
              optionGroups={optionGroups}
              fields={productFields}
              currency={currency}
              compact
            />
          </aside>
        </section>
      )}
    </div>
  );
}

function ProductList({
  products,
  categories,
  currency,
  selectedProductId,
  onEdit,
  onDelete,
  onAdd,
}: {
  products: WaProductRow[];
  categories: Map<string, WaCategoryRow>;
  currency: string;
  selectedProductId: string;
  onEdit: (product: WaProductRow) => void;
  onDelete: (product: WaProductRow) => void;
  onAdd: () => void;
}) {
  if (!products.length) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-surface/60 p-10 text-center">
        <PackagePlus className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 font-display text-2xl font-semibold">No products yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Add your first product with a photo, price, stock, and the options customers choose in
          WhatsApp.
        </p>
        <button type="button" className="studio-button-primary mt-5" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add product
        </button>
      </section>
    );
  }

  return (
    <section className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {products.map((product) => {
        const category = product.category_id ? categories.get(product.category_id) : undefined;
        const selected = product.id === selectedProductId;

        return (
          <article
            key={product.id}
            className={`rounded-lg border bg-surface/60 p-4 transition ${
              selected ? "border-primary" : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex gap-3">
              <ProductImagePreview src={product.image_url ?? ""} name={product.name_english} />
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">{product.name_english}</h2>
                  <StatusPill product={product} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {category?.name_english ?? "No category"} - {formatMoney(product.price, currency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {product.stock_quantity} in base stock - Code {product.code}
                </p>
              </button>
              <button
                type="button"
                onClick={() => onDelete(product)}
                className="h-fit rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-destructive"
                aria-label="Delete product"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className="studio-button mt-4 w-full"
              onClick={() => onEdit(product)}
            >
              Edit product
            </button>
          </article>
        );
      })}
    </section>
  );
}

function EditorHeader({
  productName,
  isNew,
  activeStep,
  onStepChange,
  onClose,
}: {
  productName: string;
  isNew: boolean;
  activeStep: EditorStep;
  onStepChange: (step: EditorStep) => void;
  onClose: () => void;
}) {
  const steps: Array<{ key: EditorStep; label: string }> = [
    { key: "basics", label: "Basic info" },
    { key: "options", label: "Options" },
    { key: "stock", label: "Stock" },
    { key: "questions", label: "Questions" },
    { key: "preview", label: "Preview" },
  ];

  return (
    <section className="rounded-lg border border-border bg-surface/60 p-4">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {isNew ? "New product" : "Editing product"}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">{productName}</h2>
        </div>
        <button type="button" className="studio-button" onClick={onClose}>
          <X className="h-4 w-4" />
          Close editor
        </button>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {steps.map((step, index) => (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepChange(step.key)}
            className={`shrink-0 rounded-md border px-3 py-2 text-sm transition ${
              activeStep === step.key
                ? "border-primary bg-primary/14 text-foreground"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {index + 1}. {step.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function EditorPanel({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/60 p-5">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
      {footer ? <div className="mt-5 border-t border-border pt-4">{footer}</div> : null}
    </section>
  );
}

function EditorActions({
  saving,
  disabled,
  primaryLabel,
  savingLabel,
  onPrimary,
  onCancel,
}: {
  saving: boolean;
  disabled: boolean;
  primaryLabel: string;
  savingLabel: string;
  onPrimary: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <SaveButton
        disabled={disabled}
        saving={saving}
        savingLabel={savingLabel}
        icon={<Check className="h-4 w-4" />}
        onClick={onPrimary}
      >
        {primaryLabel}
      </SaveButton>
      <button type="button" className="studio-button" onClick={onCancel}>
        Back to products
      </button>
    </div>
  );
}

function ProductSummary({
  product,
  category,
  currency,
  optionCount,
  questionCount,
  totalVariantStock,
}: {
  product: typeof emptyProduct;
  category?: WaCategoryRow;
  currency: string;
  optionCount: number;
  questionCount: number;
  totalVariantStock: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/60 p-4">
      <div className="flex gap-3">
        <ProductImagePreview src={product.image_url} name={product.name_english} />
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">
            {product.name_english || "Product name"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {category?.name_english ?? "No category selected"}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricTile label="Price" value={formatMoney(product.price, currency)} />
        <MetricTile
          label="Stock"
          value={`${optionCount ? totalVariantStock : product.stock_quantity}`}
          detail={optionCount ? "from options" : "base stock"}
        />
        <MetricTile label="Options" value={`${optionCount}`} />
        <MetricTile label="Questions" value={`${questionCount}`} />
        <MetricTile
          label="Variant flow"
          value={
            product.variant_selection_mode === "variant_list" ? "Variant list" : "Step by step"
          }
        />
      </div>
    </section>
  );
}

function OptionGroups({
  groups,
  onEditOption,
  onDeleteOption,
  onEditValue,
  onDeleteValue,
}: {
  groups: Array<{ option: WaProductOptionRow; values: WaProductOptionValueRow[] }>;
  onEditOption: (option: WaProductOptionRow) => void;
  onDeleteOption: (option: WaProductOptionRow) => void;
  onEditValue: (value: WaProductOptionValueRow) => void;
  onDeleteValue: (value: WaProductOptionValueRow) => void;
}) {
  if (!groups.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground">
        This product has no options. Customers will order it directly.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <section
          key={group.option.id}
          className="rounded-lg border border-border bg-background/50 p-4"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h3 className="font-display text-lg font-semibold">{group.option.name_english}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {group.values.length} choices - {group.option.is_required ? "Required" : "Optional"}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="studio-button"
                onClick={() => onEditOption(group.option)}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-destructive"
                aria-label="Delete option"
                onClick={() => onDeleteOption(group.option)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.values.length ? (
              group.values.map((value) => (
                <span
                  key={value.id}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/70 px-3 py-1.5 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => onEditValue(value)}
                    className="hover:text-primary"
                  >
                    {value.value_english}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteValue(value)}
                    aria-label="Delete choice"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))
            ) : (
              <p className="text-sm text-destructive">This option needs at least one choice.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function StockMatrix({
  variants,
  values,
  currency,
  onEdit,
  onDelete,
}: {
  variants: WaProductVariantRow[];
  values: WaProductOptionValueRow[];
  currency: string;
  onEdit: (variant: WaProductVariantRow) => void;
  onDelete: (variant: WaProductVariantRow) => void;
}) {
  if (!variants.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground">
        No stock rows yet. Generate rows from the product options, then edit stock and price.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background/60">
      <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_auto] gap-3 border-b border-border px-3 py-2 text-xs uppercase tracking-[0.14em] text-muted-foreground max-lg:hidden">
        <span>Customer choice</span>
        <span>Price</span>
        <span>Stock</span>
        <span>Status</span>
        <span />
      </div>
      <div className="divide-y divide-border">
        {variants.map((variant) => (
          <div
            key={variant.id}
            className="grid gap-3 px-3 py-3 text-sm lg:grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_auto] lg:items-center"
          >
            <button
              type="button"
              onClick={() => onEdit(variant)}
              className="text-left hover:text-primary"
            >
              <span className="font-medium">{variantChoiceLabel(variant, values)}</span>
              <span className="mt-1 block text-xs text-muted-foreground">SKU {variant.sku}</span>
            </button>
            <span>{formatMoney(variant.price, currency)}</span>
            <span className={variant.stock_quantity <= 0 ? "font-medium text-destructive" : ""}>
              {variant.stock_quantity}
            </span>
            <span
              className={`w-fit rounded-md px-2 py-1 text-xs ${
                variant.is_available && variant.stock_quantity > 0
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {variantAvailabilityLabel(variant)}
            </span>
            <div className="flex justify-end gap-1">
              <button type="button" className="studio-button" onClick={() => onEdit(variant)}>
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(variant)}
                aria-label="Delete stock row"
                className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionList({
  fields,
  onEdit,
  onDelete,
}: {
  fields: WaProductCustomFieldRow[];
  onEdit: (field: WaProductCustomFieldRow) => void;
  onDelete: (field: WaProductCustomFieldRow) => void;
}) {
  if (!fields.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground">
        No extra questions. Customers will only choose options and quantity.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <div
          key={field.id}
          className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-background/50 p-3 sm:flex-row sm:items-center"
        >
          <div>
            <p className="font-medium">{field.label_english}</p>
            <p className="text-xs text-muted-foreground">
              {field.type.replace("_", " ")} - {field.is_required ? "Required" : "Optional"}
            </p>
          </div>
          <div className="flex gap-1">
            <button type="button" className="studio-button" onClick={() => onEdit(field)}>
              Edit
            </button>
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-destructive"
              aria-label="Delete question"
              onClick={() => onDelete(field)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function WhatsAppPreview({
  product,
  category,
  optionGroups,
  fields,
  currency,
  compact = false,
}: {
  product: typeof emptyProduct;
  category?: WaCategoryRow;
  optionGroups: Array<{ option: WaProductOptionRow; values: WaProductOptionValueRow[] }>;
  fields: WaProductCustomFieldRow[];
  currency: string;
  compact?: boolean;
}) {
  return (
    <section className="rounded-lg border border-border bg-[#0b141a] p-4 text-sm text-slate-100">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          WhatsApp preview
        </h2>
        <span className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300">EN</span>
      </div>
      <div className="rounded-lg bg-[#202c33] p-3">
        <p className="font-semibold">{product.name_english || "Product name"}</p>
        <p className="mt-1 text-slate-300">{category?.name_english ?? "Category"}</p>
        <p className="mt-2">{formatMoney(product.price, currency)}</p>
        {product.description_english ? (
          <p className="mt-2 whitespace-pre-wrap text-slate-300">{product.description_english}</p>
        ) : null}
      </div>
      {!compact && product.image_url ? (
        <img
          src={product.image_url}
          alt=""
          className="mt-3 aspect-video w-full rounded-lg object-cover"
        />
      ) : null}
      <div className="mt-3 space-y-2">
        {optionGroups.map((group) => (
          <div key={group.option.id} className="rounded-lg bg-[#111b21] p-3">
            <p className="text-slate-300">{group.option.name_english}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.values.length ? (
                group.values.map((value) => (
                  <span
                    key={value.id}
                    className="rounded-md border border-cyan-900/70 px-3 py-1 text-cyan-200"
                  >
                    {value.value_english}
                  </span>
                ))
              ) : (
                <span className="text-xs text-amber-200">No choices yet</span>
              )}
            </div>
          </div>
        ))}
        {fields.map((field) => (
          <div key={field.id} className="rounded-lg bg-[#111b21] p-3 text-slate-300">
            {field.label_english}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductImagePreview({ src, name }: { src: string; name: string }) {
  return src ? (
    <img
      src={src}
      alt={name ? `${name} product` : ""}
      className="h-16 w-16 rounded-md object-cover"
    />
  ) : (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-background/70 text-xs text-muted-foreground">
      No image
    </div>
  );
}

function StatusPill({ product }: { product: WaProductRow }) {
  const label = !product.is_active ? "Hidden" : product.is_available ? "Selling" : "Unavailable";
  const tone =
    product.is_active && product.is_available
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : "border-destructive/30 bg-destructive/10 text-destructive";

  return <span className={`rounded-md border px-2 py-0.5 text-xs ${tone}`}>{label}</span>;
}

function WarningsList({ warnings }: { warnings: string[] }) {
  return (
    <section className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
      <p className="font-medium">Needs attention</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </section>
  );
}

function SaveFirstMessage() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground">
      Save the product basic info first. Then you can add customer options, stock rows, questions,
      and preview the WhatsApp flow.
    </div>
  );
}

function MetricTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/60 p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 break-words text-xl font-semibold">{value}</div>
      {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

function Status({ loading, error, notice }: { loading: boolean; error: string; notice: string }) {
  if (loading)
    return (
      <p className="rounded-md border border-border bg-surface/60 p-3 text-sm text-muted-foreground">
        Loading products...
      </p>
    );
  if (error)
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  if (notice)
    return (
      <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
        {notice}
      </p>
    );
  return null;
}

function TextInput({
  label,
  value,
  onChange,
  dir,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl";
  hint?: string;
}) {
  return (
    <label className="text-sm">
      <span className="mb-2 block text-muted-foreground">{label}</span>
      <input
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
      />
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl";
}) {
  return (
    <label className="text-sm">
      <span className="mb-2 block text-muted-foreground">{label}</span>
      <textarea
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
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
        min="0"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="mb-2 block text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
      >
        {children}
      </select>
    </label>
  );
}

function SaveButton({
  children,
  className = "studio-button-primary",
  disabled = false,
  icon,
  saving,
  savingLabel,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  icon: ReactNode;
  saving: boolean;
  savingLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={className}
      disabled={disabled || saving}
      aria-busy={saving}
      onClick={onClick}
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {saving ? savingLabel : children}
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-10 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/50 ${
        checked
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-input bg-background text-muted-foreground hover:border-border hover:text-foreground"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function productToForm(product: WaProductRow): typeof emptyProduct {
  return {
    id: product.id,
    category_id: product.category_id ?? "",
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
    sort_order: product.sort_order,
  };
}

function validateProductForm(product: typeof emptyProduct, categories: WaCategoryRow[]) {
  if (product.category_id && !categories.some((category) => category.id === product.category_id)) {
    return "Choose a valid legacy category or leave it empty.";
  }
  if (!product.name_english.trim() || !product.name_arabic.trim()) {
    return "Add the product name in English and Arabic.";
  }
  if (!product.code.trim()) return "Add a unique product code.";
  if (product.price < 0) return "Price cannot be negative.";
  if (product.stock_quantity < 0) return "Stock cannot be negative.";
  return "";
}

function getProductWarnings(
  product: WaProductRow,
  options: WaProductOptionRow[],
  values: WaProductOptionValueRow[],
  variants: WaProductVariantRow[],
) {
  const warnings: string[] = [];
  if (!product.is_active) warnings.push("This product is hidden from WhatsApp.");
  if (!product.is_available) warnings.push("This product is visible but unavailable to order.");
  if (options.some((option) => !values.some((value) => value.option_id === option.id))) {
    warnings.push("One or more options have no choices.");
  }
  if (options.length && !variants.length) {
    warnings.push("This product has options but no stock rows yet.");
  }
  if (!options.length && product.stock_quantity <= 0) {
    warnings.push("This product has no stock.");
  }
  return warnings;
}

function makeFriendlyError(message: string) {
  if (message.includes("Product code already exists")) {
    return "This product code already exists. Use a different code.";
  }
  if (message.includes("duplicate key")) {
    return "This record already exists. Change the duplicated value and try again.";
  }
  return message;
}

type VariantOptionGroup = { option: WaProductOptionRow; values: WaProductOptionValueRow[] };

function buildVariantCombinations(groups: VariantOptionGroup[]) {
  if (!groups.length) return [] as WaProductOptionValueRow[][];

  return groups.reduce<WaProductOptionValueRow[][]>(
    (combinations, group) =>
      combinations.flatMap((combination) => group.values.map((value) => [...combination, value])),
    [[]],
  );
}

function combinationKey(ids: string[]) {
  return [...new Set(ids.filter(Boolean))].sort().join("|");
}

function getSelectedValueForOption(
  selectedIds: string[],
  optionId: string,
  values: WaProductOptionValueRow[],
) {
  return (
    selectedIds.find((id) => values.find((value) => value.id === id)?.option_id === optionId) ?? ""
  );
}

function replaceVariantOptionValue(
  selectedIds: string[],
  optionId: string,
  nextValueId: string,
  values: WaProductOptionValueRow[],
) {
  const withoutOption = selectedIds.filter(
    (id) => values.find((value) => value.id === id)?.option_id !== optionId,
  );
  return nextValueId ? [...withoutOption, nextValueId] : withoutOption;
}

function buildSelectedOptionValueIds(selectedIds: string[], groups: VariantOptionGroup[]) {
  return groups
    .map((group) => getSelectedValueForOption(selectedIds, group.option.id, group.values))
    .filter(Boolean);
}

function buildVariantSku(baseCode: string, values: WaProductOptionValueRow[]) {
  const suffix = values
    .map((value) => makeSkuPart(value.value_english))
    .filter(Boolean)
    .join("-");
  return [makeSkuPart(baseCode), suffix].filter(Boolean).join("-");
}

function makeSkuPart(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function variantChoiceLabel(variant: WaProductVariantRow, values: WaProductOptionValueRow[]) {
  return (
    variant.selected_option_value_ids
      .map((id) => values.find((value) => value.id === id)?.value_english ?? id)
      .join(" / ") || "Base product"
  );
}

function variantAvailabilityLabel(variant: WaProductVariantRow) {
  if (!variant.is_available) return "Hidden";
  if (variant.stock_quantity <= 0) return "Sold out";
  return "Selling";
}

function parseCommaLabels(value: string) {
  return value
    .split(",")
    .map((choice) => choice.trim())
    .filter(Boolean);
}

function parseChoices(value: string) {
  const choices = parseCommaLabels(value).map((choice, index) => ({
    id: `choice-${index + 1}`,
    labelEnglish: choice,
    labelArabic: choice,
  }));

  return choices.length ? choices : null;
}
