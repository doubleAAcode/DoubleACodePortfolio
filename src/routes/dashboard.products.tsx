import { createFileRoute } from "@tanstack/react-router";
import { Check, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { uploadWaDashboardImage } from "@/lib/whatsapp/dashboard-client";
import type {
  WaProductCustomFieldRow,
  WaProductOptionRow,
  WaProductOptionValueRow,
  WaProductRow,
  WaProductVariantRow,
} from "@/lib/whatsapp/dashboard-store.server";
import { formatMoney, useWaDashboardData } from "@/lib/whatsapp/use-wa-dashboard-data";

export const Route = createFileRoute("/dashboard/products")({
  component: ProductsPage,
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
  sort_order: 10,
};

const emptyOption = {
  id: "",
  product_id: "",
  name_english: "",
  name_arabic: "",
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

export function ProductsPage() {
  const { data, loading, saving, error, notice, setError, applyAction } = useWaDashboardData();
  const [search, setSearch] = useState("");
  const [productForm, setProductForm] = useState(emptyProduct);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [optionForm, setOptionForm] = useState(emptyOption);
  const [valueForm, setValueForm] = useState(emptyValue);
  const [variantForm, setVariantForm] = useState(emptyVariant);
  const [fieldForm, setFieldForm] = useState(emptyField);
  const [uploading, setUploading] = useState(false);

  const products = useMemo(() => {
    const value = search.trim().toLowerCase();
    return [...(data?.products ?? [])]
      .filter((product) => {
        if (!value) return true;
        return [product.code, product.name_english, product.name_arabic]
          .join(" ")
          .toLowerCase()
          .includes(value);
      })
      .sort((a, b) => a.sort_order - b.sort_order || a.name_english.localeCompare(b.name_english));
  }, [data?.products, search]);

  const selectedProduct =
    data?.products.find((product) => product.id === selectedProductId) ?? products[0];
  const selectedId = selectedProduct?.id ?? "";
  const productOptions = data?.options.filter((option) => option.product_id === selectedId) ?? [];
  const optionIds = new Set(productOptions.map((option) => option.id));
  const productValues = data?.optionValues.filter((value) => optionIds.has(value.option_id)) ?? [];
  const productVariants =
    data?.variants.filter((variant) => variant.product_id === selectedId) ?? [];
  const productFields = data?.customFields.filter((field) => field.product_id === selectedId) ?? [];
  const variantOptionGroups = productOptions
    .map((option) => ({
      option,
      values: productValues.filter((value) => value.option_id === option.id),
    }))
    .filter((group) => group.values.length > 0);
  const variantCombinations = buildVariantCombinations(variantOptionGroups);
  const existingVariantKeys = new Set(
    productVariants.map((variant) => combinationKey(variant.selected_option_value_ids)),
  );
  const missingVariantCombinations = variantCombinations.filter(
    (combination) => !existingVariantKeys.has(combinationKey(combination.map((value) => value.id))),
  );
  const availableVariantCount = productVariants.filter((variant) => variant.is_available).length;
  const totalVariantStock = productVariants.reduce(
    (total, variant) => total + Math.max(0, variant.stock_quantity),
    0,
  );
  const missingVariantPreview = missingVariantCombinations
    .slice(0, 3)
    .map((combination) => combination.map((value) => value.value_english).join(" / "));

  async function submitProduct() {
    const payload = { ...productForm, id: productForm.id || undefined };
    const next = await applyAction({ type: "saveProduct", payload }, "Product saved.");
    const saved = next.products.find((product) => product.code === payload.code.toUpperCase());
    if (saved) setSelectedProductId(saved.id);
    setProductForm(emptyProduct);
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
    await applyAction(
      {
        type: "saveOption",
        payload: { ...optionForm, id: optionForm.id || undefined, product_id: selectedId },
      },
      "Option saved.",
    );
    setOptionForm(emptyOption);
  }

  async function submitValue() {
    await applyAction(
      { type: "saveOptionValue", payload: { ...valueForm, id: valueForm.id || undefined } },
      "Option value saved.",
    );
    setValueForm(emptyValue);
  }

  async function submitVariant() {
    await applyAction(
      {
        type: "saveVariant",
        payload: {
          ...variantForm,
          id: variantForm.id || undefined,
          product_id: selectedId,
          selected_option_value_ids: buildSelectedOptionValueIds(
            variantForm.selected_option_value_ids,
            variantOptionGroups,
          ),
        },
      },
      "Variant saved.",
    );
    setVariantForm(emptyVariant);
  }

  async function generateMissingVariants() {
    if (!selectedProduct || !missingVariantCombinations.length) return;

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
        "Variant generated.",
      );
    }

    setVariantForm(emptyVariant);
  }

  async function submitField() {
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
      "Product question saved.",
    );
    setFieldForm(emptyField);
  }

  if (loading) return <Status loading={loading} error="" notice="" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Catalog</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Products</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Set up what customers can buy, the choices that affect price or stock, and the extra questions the bot should ask.
          </p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary lg:w-72"
        />
      </div>

      <Status loading={false} error={error} notice={notice} />

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-display text-xl font-semibold">
          {productForm.id ? "Edit product basics" : "Add product basics"}
        </h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <TextInput
            label="Code"
            value={productForm.code}
            onChange={(value) => setProductForm({ ...productForm, code: value })}
          />
          <SelectInput
            label="Category"
            value={productForm.category_id}
            onChange={(value) => setProductForm({ ...productForm, category_id: value })}
          >
            <option value="">Choose</option>
            {data?.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name_english}
              </option>
            ))}
          </SelectInput>
          <NumberInput
            label="Base price"
            value={productForm.price}
            onChange={(value) => setProductForm({ ...productForm, price: value })}
          />
          <NumberInput
            label="Base stock"
            value={productForm.stock_quantity}
            onChange={(value) => setProductForm({ ...productForm, stock_quantity: value })}
          />
          <TextInput
            label="English name"
            value={productForm.name_english}
            onChange={(value) => setProductForm({ ...productForm, name_english: value })}
          />
          <TextInput
            label="Arabic name"
            dir="rtl"
            value={productForm.name_arabic}
            onChange={(value) => setProductForm({ ...productForm, name_arabic: value })}
          />
          <div className="flex gap-2">
            <Toggle
              label="Active"
              checked={productForm.is_active}
              onChange={(value) => setProductForm({ ...productForm, is_active: value })}
            />
            <Toggle
              label="Available"
              checked={productForm.is_available}
              onChange={(value) => setProductForm({ ...productForm, is_available: value })}
            />
          </div>
          <TextArea
            label="English description"
            value={productForm.description_english}
            onChange={(value) => setProductForm({ ...productForm, description_english: value })}
          />
          <TextArea
            label="Arabic description"
            dir="rtl"
            value={productForm.description_arabic}
            onChange={(value) => setProductForm({ ...productForm, description_arabic: value })}
          />
          <div className="space-y-2 lg:col-span-2">
            <span className="block text-sm text-muted-foreground">Product image</span>
            <div className="flex flex-wrap items-center gap-3">
              {productForm.image_url ? (
                <img
                  src={productForm.image_url}
                  alt=""
                  className="h-16 w-16 rounded-md object-cover"
                />
              ) : null}
              <label className="studio-button cursor-pointer">
                <ImagePlus className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload"}
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
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void submitProduct()}
            className="studio-button-primary"
          >
            {productForm.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {productForm.id ? "Save product" : "Add product"}
          </button>
          {productForm.id ? (
            <button
              type="button"
              onClick={() => setProductForm(emptyProduct)}
              className="studio-button"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          {products.length ? (
            products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                selected={product.id === selectedId}
                categoryName={
                  data?.categories.find((category) => category.id === product.category_id)
                    ?.name_english ?? "No category"
                }
                currency={data?.business.currency ?? "USD"}
                onSelect={() => setSelectedProductId(product.id)}
                onEdit={() => {
                  setSelectedProductId(product.id);
                  setProductForm({
                    id: product.id,
                    category_id: product.category_id,
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
                    sort_order: product.sort_order,
                  });
                }}
                onDelete={() => {
                  if (window.confirm(`Delete ${product.name_english}?`)) {
                    void applyAction(
                      { type: "deleteProduct", payload: { id: product.id } },
                      "Product deleted.",
                    );
                  }
                }}
              />
            ))
          ) : (
            <div className="rounded-lg border border-border bg-surface/60 p-8 text-center text-sm text-muted-foreground">
              No products found.
            </div>
          )}
        </div>

        <div className="space-y-4">
          {selectedProduct ? (
            <>
              <ProductSetupGuide
                product={selectedProduct}
                currency={data?.business.currency ?? "USD"}
                optionsCount={productOptions.length}
                valuesCount={productValues.length}
                variantsCount={productVariants.length}
                availableVariantsCount={availableVariantCount}
                totalVariantStock={totalVariantStock}
                questionsCount={productFields.length}
              />

              <NestedSection
                title="Sellable choices"
                description="Use this for anything that can change price, stock, SKU, or availability, like size or color."
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <TextInput
                    label="Choice name (English)"
                    value={optionForm.name_english}
                    onChange={(value) => setOptionForm({ ...optionForm, name_english: value })}
                  />
                  <TextInput
                    label="Choice name (Arabic)"
                    dir="rtl"
                    value={optionForm.name_arabic}
                    onChange={(value) => setOptionForm({ ...optionForm, name_arabic: value })}
                  />
                  <button
                    type="button"
                    className="studio-button-primary self-end"
                    onClick={() => void submitOption()}
                  >
                    <Plus className="h-4 w-4" />
                    Save choice
                  </button>
                </div>
                <PillList
                  items={productOptions}
                  label={(option) => option.name_english}
                  onEdit={(option) => setOptionForm(option)}
                  onDelete={(option) => {
                    if (window.confirm(`Delete ${option.name_english}?`))
                      void applyAction(
                        { type: "deleteOption", payload: { id: option.id } },
                        "Option deleted.",
                      );
                  }}
                />
              </NestedSection>

              <NestedSection
                title="Choice values"
                description="Add the values customers will choose. For Size, add Small, Medium, and Large."
              >
                <div className="grid gap-3 md:grid-cols-4">
                  <SelectInput
                    label="Option"
                    value={valueForm.option_id}
                    onChange={(value) => setValueForm({ ...valueForm, option_id: value })}
                  >
                    <option value="">Choose</option>
                    {productOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name_english}
                      </option>
                    ))}
                  </SelectInput>
                  <TextInput
                    label="Value (English)"
                    value={valueForm.value_english}
                    onChange={(value) => setValueForm({ ...valueForm, value_english: value })}
                  />
                  <TextInput
                    label="Value (Arabic)"
                    dir="rtl"
                    value={valueForm.value_arabic}
                    onChange={(value) => setValueForm({ ...valueForm, value_arabic: value })}
                  />
                  <button
                    type="button"
                    className="studio-button-primary self-end"
                    onClick={() => void submitValue()}
                  >
                    <Plus className="h-4 w-4" />
                    Save value
                  </button>
                </div>
                <PillList
                  items={productValues}
                  label={(value) =>
                    `${optionLabel(productOptions, value.option_id)}: ${value.value_english}`
                  }
                  onEdit={(value) => setValueForm({ ...value, image_url: value.image_url ?? "" })}
                  onDelete={(value) => {
                    if (window.confirm(`Delete ${value.value_english}?`))
                      void applyAction(
                        { type: "deleteOptionValue", payload: { id: value.id } },
                        "Option value deleted.",
                      );
                  }}
                />
              </NestedSection>

              <NestedSection
                title="Variant prices and stock"
                description="Each row is a final sellable item. This is where size, color, flavor, or any choice gets its own price, stock, and availability."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile label="Variant rows" value={`${productVariants.length}`} />
                  <MetricTile label="Available rows" value={`${availableVariantCount}`} />
                  <MetricTile label="Total stock" value={`${totalVariantStock}`} />
                </div>

                <div className="rounded-md border border-border bg-background/60 p-4 text-sm">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div>
                      <div className="font-medium">Generate all missing sellable rows</div>
                      <p className="mt-1 text-muted-foreground">
                        After adding values like Small, Medium, and Large, generate rows so each one can have its own price and quantity.
                      </p>
                      {missingVariantPreview.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Missing: {missingVariantPreview.join(", ")}
                          {missingVariantCombinations.length > missingVariantPreview.length ? "..." : ""}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="studio-button-primary w-fit"
                      disabled={!missingVariantCombinations.length || saving}
                      onClick={() => void generateMissingVariants()}
                    >
                      <Plus className="h-4 w-4" />
                      Generate {missingVariantCombinations.length || ""} rows
                    </button>
                  </div>
                </div>

                {!variantOptionGroups.length ? (
                  <div className="rounded-md border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                    Add at least one sellable choice and value first. Example: Size -> Small, Medium, Large.
                  </div>
                ) : null}

                <div className="rounded-md border border-border bg-background/60 p-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-medium">{variantForm.id ? "Edit variant row" : "Add or edit one row"}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Choose the final customer choice, then set the price and stock for that exact row.
                      </p>
                    </div>
                    {variantForm.id ? (
                      <button type="button" className="studio-button" onClick={() => setVariantForm(emptyVariant)}>
                        Cancel edit
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {variantOptionGroups.map((group) => (
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
                      label="Stock quantity"
                      value={variantForm.stock_quantity}
                      onChange={(value) => setVariantForm({ ...variantForm, stock_quantity: value })}
                    />
                    <Toggle
                      label="Available to sell"
                      checked={variantForm.is_available}
                      onChange={(value) => setVariantForm({ ...variantForm, is_available: value })}
                    />
                  </div>
                  <button
                    type="button"
                    className="studio-button-primary mt-4"
                    onClick={() => void submitVariant()}
                  >
                    {variantForm.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {variantForm.id ? "Save variant" : "Add variant"}
                  </button>
                </div>

                <VariantList
                  variants={productVariants}
                  values={productValues}
                  currency={data?.business.currency ?? "USD"}
                  onEdit={(variant) => setVariantForm({ ...variant, price: Number(variant.price) })}
                  onDelete={(variant) => {
                    if (window.confirm(`Delete ${variant.sku}?`))
                      void applyAction(
                        { type: "deleteVariant", payload: { id: variant.id } },
                        "Variant deleted.",
                      );
                  }}
                />
              </NestedSection>
              <NestedSection
                title="Extra product questions"
                description="Use this only for extra customer info that does not change price or stock, like notes, names, or delivery preferences."
              >
                <div className="grid gap-3 md:grid-cols-4">
                  <SelectInput
                    label="Answer type"
                    value={fieldForm.type}
                    onChange={(value) =>
                      setFieldForm({
                        ...fieldForm,
                        type: value as WaProductCustomFieldRow["type"],
                        choicesText: value === "single_choice" ? fieldForm.choicesText : "",
                        minimum_value: value === "number" ? fieldForm.minimum_value : null,
                        maximum_value: value === "number" ? fieldForm.maximum_value : null,
                        minimum_length:
                          value === "short_text" || value === "long_text"
                            ? fieldForm.minimum_length
                            : null,
                        maximum_length:
                          value === "short_text" || value === "long_text"
                            ? fieldForm.maximum_length
                            : null,
                      })
                    }
                  >
                    <option value="short_text">Short text</option>
                    <option value="long_text">Long text</option>
                    <option value="number">Number</option>
                    <option value="yes_no">Yes/no</option>
                    <option value="single_choice">Single choice</option>
                  </SelectInput>
                  <TextInput
                    label="English question"
                    value={fieldForm.label_english}
                    onChange={(value) => setFieldForm({ ...fieldForm, label_english: value })}
                  />
                  <TextInput
                    label="Arabic question"
                    dir="rtl"
                    value={fieldForm.label_arabic}
                    onChange={(value) => setFieldForm({ ...fieldForm, label_arabic: value })}
                  />
                  {(fieldForm.type === "short_text" || fieldForm.type === "long_text") ? (
                    <>
                      <TextInput
                        label="English helper text"
                        value={fieldForm.placeholder_english}
                        onChange={(value) =>
                          setFieldForm({ ...fieldForm, placeholder_english: value })
                        }
                      />
                      <TextInput
                        label="Arabic helper text"
                        dir="rtl"
                        value={fieldForm.placeholder_arabic}
                        onChange={(value) =>
                          setFieldForm({ ...fieldForm, placeholder_arabic: value })
                        }
                      />
                      <OptionalNumberInput
                        label="Minimum length"
                        value={fieldForm.minimum_length}
                        onChange={(value) => setFieldForm({ ...fieldForm, minimum_length: value })}
                      />
                      <OptionalNumberInput
                        label="Maximum length"
                        value={fieldForm.maximum_length}
                        onChange={(value) => setFieldForm({ ...fieldForm, maximum_length: value })}
                      />
                    </>
                  ) : null}
                  {fieldForm.type === "number" ? (
                    <>
                      <OptionalNumberInput
                        label="Minimum value"
                        value={fieldForm.minimum_value}
                        onChange={(value) => setFieldForm({ ...fieldForm, minimum_value: value })}
                      />
                      <OptionalNumberInput
                        label="Maximum value"
                        value={fieldForm.maximum_value}
                        onChange={(value) => setFieldForm({ ...fieldForm, maximum_value: value })}
                      />
                    </>
                  ) : null}
                  {fieldForm.type === "single_choice" ? (
                    <TextArea
                      label="Choices, one per line: English | Arabic"
                      value={fieldForm.choicesText}
                      onChange={(value) => setFieldForm({ ...fieldForm, choicesText: value })}
                    />
                  ) : null}
                  <Toggle
                    label="Required"
                    checked={fieldForm.is_required}
                    onChange={(value) => setFieldForm({ ...fieldForm, is_required: value })}
                  />
                </div>
                <button
                  type="button"
                  className="studio-button-primary mt-3"
                  onClick={() => void submitField()}
                >
                  <Plus className="h-4 w-4" />
                  Save question
                </button>
                <PillList
                  items={productFields}
                  label={(field) =>
                    `${field.sort_order}. ${field.label_english} (${questionTypeLabel(field.type)}${
                      field.is_required ? ", required" : ", optional"
                    })`
                  }
                  onEdit={(field) =>
                    setFieldForm({
                      ...field,
                      placeholder_english: field.placeholder_english ?? "",
                      placeholder_arabic: field.placeholder_arabic ?? "",
                      minimum_value:
                        field.minimum_value === null ? null : Number(field.minimum_value),
                      maximum_value:
                        field.maximum_value === null ? null : Number(field.maximum_value),
                      choicesText: formatChoicesForEditing(field.choices),
                    })
                  }
                  onDelete={(field) => {
                    if (window.confirm(`Delete ${field.label_english}?`))
                      void applyAction(
                        { type: "deleteCustomField", payload: { id: field.id } },
                        "Product question deleted.",
                      );
                  }}
                />
              </NestedSection>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-surface/60 p-8 text-sm text-muted-foreground">
              Add a product before configuring options and variants.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProductRow({
  product,
  selected,
  categoryName,
  currency,
  onSelect,
  onEdit,
  onDelete,
}: {
  product: WaProductRow;
  selected: boolean;
  categoryName: string;
  currency: string;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={`rounded-lg border bg-surface/60 p-4 ${selected ? "border-primary" : "border-border"}`}
    >
      <div className="flex gap-3">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="h-16 w-16 rounded-md object-cover" />
        ) : null}
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-semibold">{product.name_english}</span>
            <span className="text-xs text-muted-foreground">{product.code}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {categoryName} - {formatMoney(product.price, currency)} - {product.stock_quantity} stock
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {product.is_active ? "Active" : "Hidden"} -{" "}
            {product.is_available ? "Available" : "Unavailable"}
          </p>
        </button>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label="Edit product"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-destructive"
            aria-label="Delete product"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductSetupGuide({
  product,
  currency,
  optionsCount,
  valuesCount,
  variantsCount,
  availableVariantsCount,
  totalVariantStock,
  questionsCount,
}: {
  product: WaProductRow;
  currency: string;
  optionsCount: number;
  valuesCount: number;
  variantsCount: number;
  availableVariantsCount: number;
  totalVariantStock: number;
  questionsCount: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/60 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-display text-lg font-semibold">{product.name_english}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Base product: {formatMoney(product.price, currency)} - {product.stock_quantity} base stock
          </p>
        </div>
        <span className="w-fit rounded-md border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
          {product.is_available ? "Available" : "Unavailable"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Sellable choices" value={`${optionsCount}`} detail={`${valuesCount} values`} />
        <MetricTile label="Variant rows" value={`${variantsCount}`} detail={`${availableVariantsCount} available`} />
        <MetricTile label="Variant stock" value={`${totalVariantStock}`} detail="from variant rows" />
        <MetricTile label="Extra questions" value={`${questionsCount}`} detail="do not change price" />
      </div>
    </section>
  );
}

function MetricTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/60 p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}
function NestedSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/60 p-4">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function PillList<T extends { id: string }>({
  items,
  label,
  onEdit,
  onDelete,
}: {
  items: T[];
  label: (item: T) => string;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No records yet.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background/70 px-3 py-1.5 text-xs"
        >
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="font-medium hover:text-primary"
          >
            {label(item)}
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            aria-label="Delete"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

function VariantList({
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
      <div className="rounded-md border border-dashed border-border bg-background/50 p-5 text-sm text-muted-foreground">
        No variant rows yet. Generate rows after adding choices, then set the price and stock for each final item.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background/60">
      <div className="grid grid-cols-[1.3fr_0.9fr_0.7fr_0.7fr_0.7fr_auto] gap-3 border-b border-border px-3 py-2 text-xs uppercase tracking-[0.14em] text-muted-foreground max-lg:hidden">
        <span>Customer choice</span>
        <span>SKU</span>
        <span>Price</span>
        <span>Stock</span>
        <span>Status</span>
        <span />
      </div>
      <div className="divide-y divide-border">
        {variants.map((variant) => (
          <div
            key={variant.id}
            className="grid gap-3 px-3 py-3 text-sm lg:grid-cols-[1.3fr_0.9fr_0.7fr_0.7fr_0.7fr_auto] lg:items-center"
          >
            <button type="button" onClick={() => onEdit(variant)} className="text-left hover:text-primary">
              <span className="font-medium">{variantChoiceLabel(variant, values)}</span>
              <span className="mt-1 block text-xs text-muted-foreground lg:hidden">{variant.sku}</span>
            </button>
            <span className="text-muted-foreground max-lg:hidden">{variant.sku}</span>
            <span className="font-medium">{formatMoney(variant.price, currency)}</span>
            <span className={variant.stock_quantity <= 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
              {variant.stock_quantity}
            </span>
            <span
              className={`w-fit rounded-md px-2 py-1 text-xs ${
                variant.is_available && variant.stock_quantity > 0
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {variantAvailabilityLabel(variant)}
            </span>
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => onEdit(variant)}
                aria-label="Edit variant"
                className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(variant)}
                aria-label="Delete variant"
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl";
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
    <label className="text-sm lg:col-span-2">
      <span className="mb-2 block text-muted-foreground">{label}</span>
      <textarea
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
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

function OptionalNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-2 block text-muted-foreground">{label}</span>
      <input
        type="number"
        min="0"
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
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
  children: React.ReactNode;
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
    <label className="flex min-h-10 items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function optionLabel(options: WaProductOptionRow[], optionId: string) {
  return options.find((option) => option.id === optionId)?.name_english ?? "Option";
}

type VariantOptionGroup = { option: WaProductOptionRow; values: WaProductOptionValueRow[] };

function buildVariantCombinations(groups: VariantOptionGroup[]) {
  if (!groups.length) return [] as WaProductOptionValueRow[][];

  return groups.reduce<WaProductOptionValueRow[][]>(
    (combinations, group) =>
      combinations.flatMap((combination) =>
        group.values.map((value) => [...combination, value]),
      ),
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
  const suffix = values.map((value) => makeSkuPart(value.value_english)).filter(Boolean).join("-");
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

function parseChoices(value: string) {
  const lines = value
    .split(/\r?\n|,/)
    .map((choice) => choice.trim())
    .filter(Boolean);
  const choices = lines.map((choice, index) => {
    const [english, arabic] = choice.split("|").map((part) => part.trim());
    return {
      id: `choice-${index + 1}`,
      labelEnglish: english,
      labelArabic: arabic || english,
    };
  });

  return choices.length ? choices : null;
}

function formatChoicesForEditing(
  choices: WaProductCustomFieldRow["choices"],
) {
  return choices
    ?.map((choice) =>
      choice.labelArabic && choice.labelArabic !== choice.labelEnglish
        ? `${choice.labelEnglish} | ${choice.labelArabic}`
        : choice.labelEnglish,
    )
    .join("\n") ?? "";
}

function questionTypeLabel(type: WaProductCustomFieldRow["type"]) {
  return type.replace(/_/g, " ");
}
