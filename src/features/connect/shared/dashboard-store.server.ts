import "@tanstack/react-start/server-only";

import { getServerSupabaseConfig, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import {
  getBusinessBotFlowSettings,
  saveBusinessBotFlowSettings,
  type BotFlowSettingsInput,
  type BusinessBotFlowSettings,
} from "./bot-flow-settings.server";

export type WaBusinessRow = {
  id: string;
  name: string;
  default_language: string;
  currency: string;
  allow_delivery: boolean;
  allow_pickup: boolean;
  minimum_order_amount: number | string;
  order_confirmation_message_english: string;
  order_confirmation_message_arabic: string;
  require_owner_approval: boolean;
  is_active: boolean;
  updated_at: string;
};

export type WaCategoryRow = {
  id: string;
  business_id: string;
  name_english: string;
  name_arabic: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

export type WaProductRow = {
  id: string;
  business_id: string;
  category_id: string | null;
  code: string;
  name_english: string;
  name_arabic: string;
  description_english: string;
  description_arabic: string;
  price: number | string;
  image_url: string | null;
  is_active: boolean;
  is_available: boolean;
  stock_quantity: number;
  variant_selection_mode?: "step_by_step" | "variant_list";
  sort_order: number;
  updated_at: string;
};

export type WaProductOptionRow = {
  id: string;
  business_id: string;
  product_id: string;
  name_english: string;
  name_arabic: string;
  sort_order: number;
  is_required: boolean;
  updated_at: string;
};

export type WaProductOptionValueRow = {
  id: string;
  option_id: string;
  value_english: string;
  value_arabic: string;
  image_url: string | null;
  sort_order: number;
  updated_at: string;
};

export type WaProductVariantRow = {
  id: string;
  business_id: string;
  product_id: string;
  sku: string;
  selected_option_value_ids: string[];
  price: number | string;
  stock_quantity: number;
  is_available: boolean;
  updated_at: string;
};

export type WaCatalogGroupRow = {
  id: string;
  business_id: string;
  name_english: string;
  name_arabic: string;
  slug: string;
  source: "category" | "custom";
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

export type WaCatalogGroupValueRow = {
  id: string;
  business_id: string;
  group_id: string;
  name_english: string;
  name_arabic: string;
  slug: string;
  source: "category" | "custom";
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

export type WaProductGroupValueRow = {
  business_id: string;
  product_id: string;
  group_value_id: string;
};

export type WaProductCustomFieldRow = {
  id: string;
  business_id: string;
  product_id: string;
  type: "short_text" | "long_text" | "number" | "yes_no" | "single_choice";
  label_english: string;
  label_arabic: string;
  placeholder_english: string | null;
  placeholder_arabic: string | null;
  is_required: boolean;
  minimum_length: number | null;
  maximum_length: number | null;
  minimum_value: number | string | null;
  maximum_value: number | string | null;
  choices: Array<{ id: string; labelEnglish: string; labelArabic: string }> | null;
  sort_order: number;
  updated_at: string;
};

export type WaDeliveryAreaRow = {
  id: string;
  business_id: string;
  name_english: string;
  name_arabic: string;
  delivery_fee: number | string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

export type WaPickupLocationRow = {
  id: string;
  business_id: string;
  name_english: string;
  name_arabic: string;
  address_english: string;
  address_arabic: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

export type WaPaymentMethodRow = {
  id: string;
  business_id: string;
  label_english: string;
  label_arabic: string;
  fulfillment_methods: Array<"delivery" | "pickup">;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

export type WaDashboardData = {
  business: WaBusinessRow;
  botFlowSettings: BusinessBotFlowSettings;
  categories: WaCategoryRow[];
  products: WaProductRow[];
  options: WaProductOptionRow[];
  optionValues: WaProductOptionValueRow[];
  variants: WaProductVariantRow[];
  catalogGroups: WaCatalogGroupRow[];
  catalogGroupValues: WaCatalogGroupValueRow[];
  productGroupValues: WaProductGroupValueRow[];
  customFields: WaProductCustomFieldRow[];
  deliveryAreas: WaDeliveryAreaRow[];
  pickupLocations: WaPickupLocationRow[];
  paymentMethods: WaPaymentMethodRow[];
};

export type DashboardFlowSettingsInput = {
  botFlowSettings: BotFlowSettingsInput;
  orderConfirmationMessageEnglish: string;
  orderConfirmationMessageArabic: string;
};

export type SaveCategoryInput = {
  id?: string;
  name_english: string;
  name_arabic: string;
  is_active: boolean;
  sort_order: number;
};

export type SaveProductInput = {
  id?: string;
  category_id?: string | null;
  code: string;
  name_english: string;
  name_arabic: string;
  description_english: string;
  description_arabic: string;
  price: number;
  image_url?: string | null;
  is_active: boolean;
  is_available: boolean;
  stock_quantity: number;
  variant_selection_mode?: "step_by_step" | "variant_list";
  group_value_ids?: string[];
  sort_order: number;
};

type SaveCatalogGroupInput = {
  id?: string;
  name_english: string;
  name_arabic: string;
  slug?: string;
  is_active: boolean;
  sort_order: number;
};

type SaveCatalogGroupValueInput = {
  id?: string;
  group_id: string;
  name_english: string;
  name_arabic: string;
  slug?: string;
  is_active: boolean;
  sort_order: number;
};

export type SaveOptionInput = {
  id?: string;
  product_id: string;
  name_english: string;
  name_arabic: string;
  sort_order: number;
  is_required: boolean;
};

export type SaveOptionValueInput = {
  id?: string;
  option_id: string;
  value_english: string;
  value_arabic: string;
  image_url?: string | null;
  sort_order: number;
};

export type SaveVariantInput = {
  id?: string;
  product_id: string;
  sku: string;
  selected_option_value_ids: string[];
  price: number;
  stock_quantity: number;
  is_available: boolean;
};

export type SaveCustomFieldInput = Omit<
  WaProductCustomFieldRow,
  "id" | "business_id" | "updated_at"
> & {
  id?: string;
};

export type SaveBusinessInput = Pick<
  WaBusinessRow,
  | "name"
  | "default_language"
  | "currency"
  | "allow_delivery"
  | "allow_pickup"
  | "minimum_order_amount"
  | "require_owner_approval"
  | "is_active"
>;

export type SaveDeliveryAreaInput = {
  id?: string;
  name_english: string;
  name_arabic: string;
  delivery_fee: number;
  is_active: boolean;
  sort_order: number;
};

export type SavePickupLocationInput = {
  id?: string;
  name_english: string;
  name_arabic: string;
  address_english: string;
  address_arabic: string;
  is_active: boolean;
  sort_order: number;
};

export type SavePaymentMethodInput = {
  id?: string;
  label_english: string;
  label_arabic: string;
  fulfillment_methods: Array<"delivery" | "pickup">;
  is_active: boolean;
  sort_order: number;
};

export type DashboardCatalogAction =
  | { type: "saveCategory"; payload: SaveCategoryInput }
  | { type: "deleteCategory"; payload: { id: string } }
  | { type: "saveProduct"; payload: SaveProductInput }
  | { type: "deleteProduct"; payload: { id: string } }
  | { type: "saveCatalogGroup"; payload: SaveCatalogGroupInput }
  | { type: "deleteCatalogGroup"; payload: { id: string } }
  | { type: "saveCatalogGroupValue"; payload: SaveCatalogGroupValueInput }
  | { type: "deleteCatalogGroupValue"; payload: { id: string } }
  | { type: "saveOption"; payload: SaveOptionInput }
  | { type: "deleteOption"; payload: { id: string } }
  | { type: "saveOptionValue"; payload: SaveOptionValueInput }
  | { type: "deleteOptionValue"; payload: { id: string } }
  | { type: "saveVariant"; payload: SaveVariantInput }
  | { type: "deleteVariant"; payload: { id: string } }
  | { type: "saveCustomField"; payload: SaveCustomFieldInput }
  | { type: "deleteCustomField"; payload: { id: string } }
  | { type: "saveBusiness"; payload: SaveBusinessInput }
  | { type: "saveDeliveryArea"; payload: SaveDeliveryAreaInput }
  | { type: "deleteDeliveryArea"; payload: { id: string } }
  | { type: "savePickupLocation"; payload: SavePickupLocationInput }
  | { type: "deletePickupLocation"; payload: { id: string } }
  | { type: "savePaymentMethod"; payload: SavePaymentMethodInput }
  | { type: "deletePaymentMethod"; payload: { id: string } };

const STORAGE_BUCKET = process.env.WA_PRODUCT_IMAGE_BUCKET || "wa-product-images";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function getWaDashboardData(businessId: string): Promise<WaDashboardData> {
  const [
    businessRows,
    categories,
    products,
    options,
    variants,
    catalogGroups,
    catalogGroupValues,
    productGroupValues,
    customFields,
    deliveryAreas,
    pickupLocations,
    paymentMethods,
    botFlowSettings,
  ] = await Promise.all([
    supabaseServerRest<WaBusinessRow[]>(
      `/wa_businesses?select=*&id=eq.${encodeURIComponent(businessId)}&limit=1`,
    ),
    supabaseServerRest<WaCategoryRow[]>(
      `/wa_categories?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order=sort_order.asc`,
    ),
    supabaseServerRest<WaProductRow[]>(
      `/wa_products?select=*&business_id=eq.${encodeURIComponent(businessId)}&order=sort_order.asc`,
    ),
    supabaseServerRest<WaProductOptionRow[]>(
      `/wa_product_options?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order=sort_order.asc`,
    ),
    supabaseServerRest<WaProductVariantRow[]>(
      `/wa_product_variants?select=*&business_id=eq.${encodeURIComponent(businessId)}`,
    ),
    safeOptionalTable<WaCatalogGroupRow[]>(
      `/wa_catalog_groups?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order=sort_order.asc`,
    ),
    safeOptionalTable<WaCatalogGroupValueRow[]>(
      `/wa_catalog_group_values?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order=sort_order.asc`,
    ),
    safeOptionalTable<WaProductGroupValueRow[]>(
      `/wa_product_group_values?select=business_id,product_id,group_value_id&business_id=eq.${encodeURIComponent(
        businessId,
      )}`,
    ),
    supabaseServerRest<WaProductCustomFieldRow[]>(
      `/wa_product_custom_fields?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order=sort_order.asc`,
    ),
    supabaseServerRest<WaDeliveryAreaRow[]>(
      `/wa_delivery_areas?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order=sort_order.asc`,
    ),
    supabaseServerRest<WaPickupLocationRow[]>(
      `/wa_pickup_locations?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order=sort_order.asc`,
    ),
    supabaseServerRest<WaPaymentMethodRow[]>(
      `/wa_payment_methods?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order=sort_order.asc`,
    ),
    getBusinessBotFlowSettings(businessId),
  ]);

  const business = businessRows[0];
  if (!business) {
    throw new Error(`Business ${businessId} was not found.`);
  }

  const optionIds = options.map((option) => option.id);
  const optionValues = optionIds.length
    ? await supabaseServerRest<WaProductOptionValueRow[]>(
        `/wa_product_option_values?select=*&option_id=in.(${optionIds
          .map((id) => `"${encodeURIComponent(id)}"`)
          .join(",")})&order=sort_order.asc`,
      )
    : [];

  return {
    business,
    botFlowSettings,
    categories,
    products,
    options,
    optionValues,
    variants,
    catalogGroups,
    catalogGroupValues,
    productGroupValues,
    customFields,
    deliveryAreas,
    pickupLocations,
    paymentMethods,
  };
}

export async function saveWaDashboardFlowSettings(
  businessId: string,
  input: DashboardFlowSettingsInput,
) {
  await saveBusinessBotFlowSettings(businessId, input.botFlowSettings);
  await supabaseServerRest(`/wa_businesses?id=eq.${encodeURIComponent(businessId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({
      order_confirmation_message_english: requiredText(
        input.orderConfirmationMessageEnglish,
        "English confirmation message",
      ),
      order_confirmation_message_arabic: input.orderConfirmationMessageArabic.trim(),
      updated_at: new Date().toISOString(),
    }),
  });
  return getWaDashboardData(businessId);
}

export async function applyWaDashboardAction(businessId: string, action: DashboardCatalogAction) {
  const data = await getWaDashboardData(businessId);

  switch (action.type) {
    case "saveCategory":
      validateLanguagePair(
        action.payload.name_english,
        action.payload.name_arabic,
        "category name",
      );
      await upsertRow("/wa_categories?on_conflict=id", {
        id: action.payload.id || makeId("cat", action.payload.name_english),
        business_id: businessId,
        name_english: action.payload.name_english.trim(),
        name_arabic: action.payload.name_arabic.trim(),
        is_active: action.payload.is_active,
        sort_order: nonNegativeInt(action.payload.sort_order, "Sort order"),
        updated_at: new Date().toISOString(),
      });
      break;

    case "deleteCategory": {
      requireOwned(data.categories, action.payload.id, "Category");
      const productCount = data.products.filter(
        (product) => product.category_id === action.payload.id,
      ).length;
      if (productCount > 0) {
        throw new Error("Move or deactivate products before deleting this category.");
      }
      await deleteRow("/wa_categories", action.payload.id);
      break;
    }

    case "saveProduct":
      validateLanguagePair(action.payload.name_english, action.payload.name_arabic, "product name");
      validateUnique(
        data.products,
        action.payload.code.trim().toUpperCase(),
        "code",
        action.payload.id,
        "Product code already exists.",
      );
      validateProductGroupValues(data, action.payload.group_value_ids ?? []);
      {
        const categoryId = action.payload.category_id?.trim() || null;
        if (categoryId) requireOwned(data.categories, categoryId, "Category");
        const productId =
          action.payload.id || makeId("prod", action.payload.code || action.payload.name_english);
        await upsertRow("/wa_products?on_conflict=id", {
          id: productId,
          business_id: businessId,
          category_id: categoryId,
          code: requiredText(action.payload.code, "Product code").toUpperCase(),
          name_english: action.payload.name_english.trim(),
          name_arabic: action.payload.name_arabic.trim(),
          description_english: action.payload.description_english.trim(),
          description_arabic: action.payload.description_arabic.trim(),
          price: nonNegativeNumber(action.payload.price, "Price"),
          image_url: normalizeNullableText(action.payload.image_url),
          is_active: action.payload.is_active,
          is_available: action.payload.is_available,
          stock_quantity: nonNegativeInt(action.payload.stock_quantity, "Stock"),
          variant_selection_mode:
            action.payload.variant_selection_mode === "variant_list"
              ? "variant_list"
              : "step_by_step",
          sort_order: nonNegativeInt(action.payload.sort_order, "Sort order"),
          updated_at: new Date().toISOString(),
        });
        await replaceProductGroupValues(
          businessId,
          productId,
          action.payload.group_value_ids ?? [],
        );
      }
      break;

    case "saveCatalogGroup":
      validateLanguagePair(
        action.payload.name_english,
        action.payload.name_arabic,
        "browse route name",
      );
      await upsertRow("/wa_catalog_groups?on_conflict=id", {
        id: action.payload.id || makeId("group", action.payload.name_english),
        business_id: businessId,
        name_english: action.payload.name_english.trim(),
        name_arabic: action.payload.name_arabic.trim(),
        slug: normalizeSlug(action.payload.slug || action.payload.name_english, "group"),
        source: "custom",
        is_active: action.payload.is_active,
        sort_order: nonNegativeInt(action.payload.sort_order, "Sort order"),
        updated_at: new Date().toISOString(),
      });
      break;

    case "deleteCatalogGroup": {
      requireOwned(data.catalogGroups, action.payload.id, "Browse route");
      await deleteRow("/wa_catalog_groups", action.payload.id);
      break;
    }

    case "saveCatalogGroupValue":
      requireOwned(data.catalogGroups, action.payload.group_id, "Browse route");
      validateLanguagePair(
        action.payload.name_english,
        action.payload.name_arabic,
        "browse option name",
      );
      await upsertRow("/wa_catalog_group_values?on_conflict=id", {
        id: action.payload.id || makeId("group-value", action.payload.name_english),
        business_id: businessId,
        group_id: action.payload.group_id,
        name_english: action.payload.name_english.trim(),
        name_arabic: action.payload.name_arabic.trim(),
        slug: normalizeSlug(action.payload.slug || action.payload.name_english, "value"),
        source: "custom",
        is_active: action.payload.is_active,
        sort_order: nonNegativeInt(action.payload.sort_order, "Sort order"),
        updated_at: new Date().toISOString(),
      });
      break;

    case "deleteCatalogGroupValue": {
      const value = requireOwned(data.catalogGroupValues, action.payload.id, "Browse option");
      const productCount = data.productGroupValues.filter(
        (link) => link.group_value_id === value.id,
      ).length;
      if (productCount > 0) {
        throw new Error("Remove this browse option from products before deleting it.");
      }
      await deleteRow("/wa_catalog_group_values", action.payload.id);
      break;
    }

    case "deleteProduct":
      requireOwned(data.products, action.payload.id, "Product");
      await assertProductCanBeDeleted(businessId, data, action.payload.id);
      await deleteRow("/wa_products", action.payload.id);
      break;

    case "saveOption":
      requireOwned(data.products, action.payload.product_id, "Product");
      validateLanguagePair(action.payload.name_english, action.payload.name_arabic, "option name");
      await upsertRow("/wa_product_options?on_conflict=id", {
        id: action.payload.id || makeId("opt", action.payload.name_english),
        business_id: businessId,
        product_id: action.payload.product_id,
        name_english: action.payload.name_english.trim(),
        name_arabic: action.payload.name_arabic.trim(),
        sort_order: nonNegativeInt(action.payload.sort_order, "Sort order"),
        is_required: action.payload.is_required,
        updated_at: new Date().toISOString(),
      });
      break;

    case "deleteOption":
      requireOwned(data.options, action.payload.id, "Option");
      assertProductOptionCanBeDeleted(data, action.payload.id);
      await deleteRow("/wa_product_options", action.payload.id);
      break;

    case "saveOptionValue": {
      const option = requireOwned(data.options, action.payload.option_id, "Option");
      validateLanguagePair(
        action.payload.value_english,
        action.payload.value_arabic,
        "option value",
      );
      const duplicate = data.optionValues.find(
        (value) =>
          value.option_id === option.id &&
          value.id !== action.payload.id &&
          value.value_english.trim().toLowerCase() ===
            action.payload.value_english.trim().toLowerCase(),
      );
      if (duplicate) throw new Error("Option value already exists for this option.");
      await upsertRow("/wa_product_option_values?on_conflict=id", {
        id: action.payload.id || makeId("val", action.payload.value_english),
        option_id: option.id,
        value_english: action.payload.value_english.trim(),
        value_arabic: action.payload.value_arabic.trim(),
        image_url: normalizeNullableText(action.payload.image_url),
        sort_order: nonNegativeInt(action.payload.sort_order, "Sort order"),
        updated_at: new Date().toISOString(),
      });
      break;
    }

    case "deleteOptionValue":
      requireOptionValueOwned(data, action.payload.id);
      assertProductOptionValueCanBeDeleted(data, action.payload.id);
      await deleteRow("/wa_product_option_values", action.payload.id);
      break;

    case "saveVariant": {
      requireOwned(data.products, action.payload.product_id, "Product");
      validateUnique(
        data.variants,
        action.payload.sku.trim().toUpperCase(),
        "sku",
        action.payload.id,
        "SKU already exists.",
      );
      const selectedOptionValueIds = validateVariantCombination(data, action.payload);
      await upsertRow("/wa_product_variants?on_conflict=id", {
        id: action.payload.id || makeId("var", action.payload.sku),
        business_id: businessId,
        product_id: action.payload.product_id,
        sku: requiredText(action.payload.sku, "SKU").toUpperCase(),
        selected_option_value_ids: selectedOptionValueIds,
        price: nonNegativeNumber(action.payload.price, "Variant price"),
        stock_quantity: nonNegativeInt(action.payload.stock_quantity, "Variant stock"),
        is_available: action.payload.is_available,
        updated_at: new Date().toISOString(),
      });
      break;
    }

    case "deleteVariant":
      requireOwned(data.variants, action.payload.id, "Variant");
      await assertProductVariantCanBeDeleted(businessId, action.payload.id);
      await deleteRow("/wa_product_variants", action.payload.id);
      break;

    case "saveCustomField": {
      requireOwned(data.products, action.payload.product_id, "Product");
      validateLanguagePair(
        action.payload.label_english,
        action.payload.label_arabic,
        "question label",
      );
      const normalizedField = normalizeCustomField(action.payload);
      await upsertRow("/wa_product_custom_fields?on_conflict=id", {
        id: action.payload.id || makeId("field", action.payload.label_english),
        business_id: businessId,
        product_id: action.payload.product_id,
        type: normalizedField.type,
        label_english: action.payload.label_english.trim(),
        label_arabic: action.payload.label_arabic.trim(),
        placeholder_english: normalizeNullableText(action.payload.placeholder_english),
        placeholder_arabic: normalizeNullableText(action.payload.placeholder_arabic),
        is_required: action.payload.is_required,
        minimum_length: normalizedField.minimum_length,
        maximum_length: normalizedField.maximum_length,
        minimum_value: normalizedField.minimum_value,
        maximum_value: normalizedField.maximum_value,
        choices: normalizedField.choices,
        sort_order: nonNegativeInt(action.payload.sort_order, "Sort order"),
        updated_at: new Date().toISOString(),
      });
      break;
    }

    case "deleteCustomField":
      requireOwned(data.customFields, action.payload.id, "Custom field");
      await deleteRow("/wa_product_custom_fields", action.payload.id);
      break;

    case "saveBusiness":
      await updateRow("/wa_businesses", businessId, {
        name: requiredText(action.payload.name, "Business name"),
        default_language: action.payload.default_language === "ar" ? "ar" : "en",
        currency: requiredText(action.payload.currency, "Currency").toUpperCase(),
        allow_delivery: action.payload.allow_delivery,
        allow_pickup: action.payload.allow_pickup,
        minimum_order_amount: nonNegativeNumber(
          Number(action.payload.minimum_order_amount),
          "Minimum order",
        ),
        require_owner_approval: action.payload.require_owner_approval,
        is_active: action.payload.is_active,
        updated_at: new Date().toISOString(),
      });
      break;

    case "saveDeliveryArea":
      validateLanguagePair(action.payload.name_english, action.payload.name_arabic, "area name");
      await upsertRow("/wa_delivery_areas?on_conflict=id", {
        id: action.payload.id || makeId("area", action.payload.name_english),
        business_id: businessId,
        name_english: action.payload.name_english.trim(),
        name_arabic: action.payload.name_arabic.trim(),
        delivery_fee: nonNegativeNumber(action.payload.delivery_fee, "Delivery fee"),
        is_active: action.payload.is_active,
        sort_order: nonNegativeInt(action.payload.sort_order, "Sort order"),
        updated_at: new Date().toISOString(),
      });
      break;

    case "deleteDeliveryArea":
      requireOwned(data.deliveryAreas, action.payload.id, "Delivery area");
      await deleteRow("/wa_delivery_areas", action.payload.id);
      break;

    case "savePickupLocation":
      validateLanguagePair(action.payload.name_english, action.payload.name_arabic, "pickup name");
      await upsertRow("/wa_pickup_locations?on_conflict=id", {
        id: action.payload.id || makeId("pickup", action.payload.name_english),
        business_id: businessId,
        name_english: action.payload.name_english.trim(),
        name_arabic: action.payload.name_arabic.trim(),
        address_english: requiredText(action.payload.address_english, "English address"),
        address_arabic: requiredText(action.payload.address_arabic, "Arabic address"),
        is_active: action.payload.is_active,
        sort_order: nonNegativeInt(action.payload.sort_order, "Sort order"),
        updated_at: new Date().toISOString(),
      });
      break;

    case "deletePickupLocation":
      requireOwned(data.pickupLocations, action.payload.id, "Pickup location");
      await deleteRow("/wa_pickup_locations", action.payload.id);
      break;

    case "savePaymentMethod":
      validateLanguagePair(
        action.payload.label_english,
        action.payload.label_arabic,
        "payment label",
      );
      if (!action.payload.fulfillment_methods.length) {
        throw new Error("Choose at least one fulfillment method.");
      }
      await upsertRow("/wa_payment_methods?on_conflict=id", {
        id: action.payload.id || makeId("pay", action.payload.label_english),
        business_id: businessId,
        label_english: action.payload.label_english.trim(),
        label_arabic: action.payload.label_arabic.trim(),
        fulfillment_methods: action.payload.fulfillment_methods,
        is_active: action.payload.is_active,
        sort_order: nonNegativeInt(action.payload.sort_order, "Sort order"),
        updated_at: new Date().toISOString(),
      });
      break;

    case "deletePaymentMethod":
      requireOwned(data.paymentMethods, action.payload.id, "Payment method");
      await deleteRow("/wa_payment_methods", action.payload.id);
      break;
  }

  return getWaDashboardData(businessId);
}

async function uploadWaImage(
  file: File,
  businessId: string,
  folder: "products" | "flow-images",
  fallbackName: string,
) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Upload a JPG, PNG, or WebP image.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 3 MB or smaller.");
  }

  if (file.size <= 0) {
    throw new Error("The selected image is empty.");
  }

  const config = getServerSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) {
    throw new Error("Supabase server storage is not configured.");
  }

  const extension = extensionForType(file.type);
  const name = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  const path = `${businessId}/${folder}/${Date.now()}-${name || fallbackName}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();
  const response = await fetch(`${config.url}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: Buffer.from(arrayBuffer),
  });

  if (!response.ok) {
    console.error("[connect:image-upload] Supabase storage request failed", {
      businessId,
      folder,
      status: response.status,
    });
    throw new Error("Image upload failed. Try again.");
  }

  return {
    path,
    url: `${config.url}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`,
  };
}

export async function uploadWaProductImage(file: File, businessId: string) {
  return uploadWaImage(file, businessId, "products", "product");
}

export async function uploadWaFlowImage(file: File, businessId: string) {
  return uploadWaImage(file, businessId, "flow-images", "flow-image");
}

async function upsertRow(path: string, row: Record<string, unknown>) {
  await supabaseServerRest(path, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(row),
  });
}

async function updateRow(path: string, id: string, row: Record<string, unknown>) {
  await supabaseServerRest(`${path}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify(row),
  });
}

async function deleteRow(path: string, id: string) {
  await supabaseServerRest(`${path}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}

async function assertProductCanBeDeleted(
  businessId: string,
  data: WaDashboardData,
  productId: string,
) {
  const variantIds = data.variants
    .filter((variant) => variant.product_id === productId)
    .map((variant) => variant.id);
  const stockTargetIds = [productId, ...variantIds];

  const [directOrderItems, variantOrderItems, reservations] = await Promise.all([
    supabaseServerRest<Array<{ id: string }>>(
      `/wa_order_items?select=id&product_id=eq.${encodeURIComponent(productId)}&limit=1`,
    ),
    variantIds.length
      ? supabaseServerRest<Array<{ id: string }>>(
          `/wa_order_items?select=id&variant_id=in.(${formatInList(variantIds)})&limit=1`,
        )
      : Promise.resolve([]),
    supabaseServerRest<Array<{ id: string }>>(
      `/wa_stock_reservations?select=id&business_id=eq.${encodeURIComponent(
        businessId,
      )}&product_variant_id=in.(${formatInList(stockTargetIds)})&limit=1`,
    ),
  ]);

  if (directOrderItems.length || variantOrderItems.length || reservations.length) {
    throw new Error(
      "This product is already used by orders or stock reservations. Archive it instead of deleting it.",
    );
  }
}

async function assertProductVariantCanBeDeleted(businessId: string, variantId: string) {
  const [orderItems, reservations] = await Promise.all([
    supabaseServerRest<Array<{ id: string }>>(
      `/wa_order_items?select=id&variant_id=eq.${encodeURIComponent(variantId)}&limit=1`,
    ),
    supabaseServerRest<Array<{ id: string }>>(
      `/wa_stock_reservations?select=id&business_id=eq.${encodeURIComponent(
        businessId,
      )}&product_variant_id=eq.${encodeURIComponent(variantId)}&limit=1`,
    ),
  ]);

  if (orderItems.length || reservations.length) {
    throw new Error(
      "This variant is already used by orders or stock reservations. Mark it unavailable instead of deleting it.",
    );
  }
}

function assertProductOptionCanBeDeleted(data: WaDashboardData, optionId: string) {
  const valueCount = data.optionValues.filter((value) => value.option_id === optionId).length;
  if (valueCount > 0) {
    throw new Error("Remove this option's values before deleting the option.");
  }
}

function assertProductOptionValueCanBeDeleted(data: WaDashboardData, valueId: string) {
  const variantCount = data.variants.filter((variant) =>
    variant.selected_option_value_ids.includes(valueId),
  ).length;
  if (variantCount > 0) {
    throw new Error("Remove variants that use this option value before deleting it.");
  }
}

function formatInList(values: string[]) {
  return values.map((value) => `"${encodeURIComponent(value)}"`).join(",");
}

async function safeOptionalTable<T>(path: string): Promise<T> {
  try {
    return await supabaseServerRest<T>(path);
  } catch (error) {
    if (isMissingCatalogGroupTableError(error)) return [] as T;
    throw error;
  }
}

async function replaceProductGroupValues(
  businessId: string,
  productId: string,
  groupValueIds: string[],
) {
  await supabaseServerRest(
    `/wa_product_group_values?business_id=eq.${encodeURIComponent(
      businessId,
    )}&product_id=eq.${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
      prefer: "return=minimal",
    },
  ).catch((error) => {
    if (!isMissingCatalogGroupTableError(error)) throw error;
  });

  const uniqueIds = [...new Set(groupValueIds.filter(Boolean))];
  if (!uniqueIds.length) return;

  await supabaseServerRest(
    "/wa_product_group_values?on_conflict=business_id,product_id,group_value_id",
    {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify(
        uniqueIds.map((groupValueId) => ({
          business_id: businessId,
          product_id: productId,
          group_value_id: groupValueId,
        })),
      ),
    },
  );
}

function requireOwned<T extends { id: string }>(rows: T[], id: string, label: string) {
  const row = rows.find((item) => item.id === id);
  if (!row) throw new Error(`${label} was not found for this business.`);
  return row;
}

function validateProductGroupValues(data: WaDashboardData, groupValueIds: string[]) {
  const ids = [...new Set(groupValueIds.filter(Boolean))];
  for (const id of ids) {
    requireOwned(data.catalogGroupValues, id, "Browse option");
  }
}

function requireOptionValueOwned(data: WaDashboardData, id: string) {
  const value = data.optionValues.find((item) => item.id === id);
  if (!value) throw new Error("Option value was not found for this business.");
  const option = data.options.find((item) => item.id === value.option_id);
  if (!option) throw new Error("Option value was not found for this business.");
  return value;
}

function normalizeCustomField(input: SaveCustomFieldInput) {
  const allowedTypes: Array<WaProductCustomFieldRow["type"]> = [
    "short_text",
    "long_text",
    "number",
    "yes_no",
    "single_choice",
  ];
  if (!allowedTypes.includes(input.type)) throw new Error("Choose a valid question type.");

  const minimum_length =
    input.type === "short_text" || input.type === "long_text"
      ? nullableNonNegativeInt(input.minimum_length, "Minimum length")
      : null;
  const maximum_length =
    input.type === "short_text" || input.type === "long_text"
      ? nullableNonNegativeInt(input.maximum_length, "Maximum length")
      : null;
  if (minimum_length != null && maximum_length != null && minimum_length > maximum_length) {
    throw new Error("Minimum length cannot be greater than maximum length.");
  }

  const minimum_value =
    input.type === "number"
      ? nullableNonNegativeNumber(input.minimum_value, "Minimum value")
      : null;
  const maximum_value =
    input.type === "number"
      ? nullableNonNegativeNumber(input.maximum_value, "Maximum value")
      : null;
  if (minimum_value != null && maximum_value != null && minimum_value > maximum_value) {
    throw new Error("Minimum value cannot be greater than maximum value.");
  }

  const choices = input.type === "single_choice" ? normalizeQuestionChoices(input.choices) : null;
  if (input.type === "single_choice" && (!choices || choices.length < 1)) {
    throw new Error("Add at least one choice for a single-choice question.");
  }

  return {
    type: input.type,
    minimum_length,
    maximum_length,
    minimum_value,
    maximum_value,
    choices,
  };
}

function normalizeQuestionChoices(choices: SaveCustomFieldInput["choices"]) {
  const normalized = (choices ?? [])
    .map((choice, index) => {
      const labelEnglish = requiredText(choice.labelEnglish, "English choice");
      const labelArabic = choice.labelArabic.trim() || labelEnglish;
      return {
        id: choice.id || `choice-${index + 1}`,
        labelEnglish,
        labelArabic,
      };
    })
    .filter(
      (choice, index, all) =>
        all.findIndex(
          (entry) => entry.labelEnglish.toLowerCase() === choice.labelEnglish.toLowerCase(),
        ) === index,
    );

  return normalized.length ? normalized : null;
}

function validateVariantCombination(data: WaDashboardData, input: SaveVariantInput) {
  const selectedValueIds = input.selected_option_value_ids.filter(Boolean);
  const uniqueValueIds = [...new Set(selectedValueIds)];
  if (uniqueValueIds.length !== selectedValueIds.length) {
    throw new Error("Variant contains the same option value more than once.");
  }

  const productOptions = data.options.filter((option) => option.product_id === input.product_id);
  const optionIds = new Set(productOptions.map((option) => option.id));
  const valuesForProduct = data.optionValues.filter((value) => optionIds.has(value.option_id));
  const valueById = new Map(valuesForProduct.map((value) => [value.id, value]));

  const invalidValue = uniqueValueIds.find((valueId) => !valueById.has(valueId));
  if (invalidValue) throw new Error("Variant contains an option value from another product.");

  const selectedOptionIds = new Set<string>();
  for (const valueId of uniqueValueIds) {
    const value = valueById.get(valueId);
    if (!value) continue;
    if (selectedOptionIds.has(value.option_id)) {
      throw new Error("Choose only one value from each product option.");
    }
    selectedOptionIds.add(value.option_id);
  }

  const optionsWithValues = productOptions.filter((option) =>
    valuesForProduct.some((value) => value.option_id === option.id),
  );
  const missingOption = optionsWithValues.find((option) => !selectedOptionIds.has(option.id));
  if (missingOption) throw new Error("Choose one value for each product option.");

  const normalized = normalizeCombination(uniqueValueIds);
  const duplicate = data.variants.find(
    (variant) =>
      variant.product_id === input.product_id &&
      variant.id !== input.id &&
      normalizeCombination(variant.selected_option_value_ids) === normalized,
  );
  if (duplicate) throw new Error("A variant with this option combination already exists.");

  return productOptions
    .map((option) =>
      uniqueValueIds.find((valueId) => valueById.get(valueId)?.option_id === option.id),
    )
    .filter((valueId): valueId is string => Boolean(valueId));
}

function normalizeCombination(ids: string[]) {
  return [...new Set(ids.filter(Boolean))].sort().join("|");
}

function validateUnique<T extends { id: string }>(
  rows: T[],
  value: string,
  key: keyof T,
  currentId: string | undefined,
  message: string,
) {
  if (!value) throw new Error(message);
  const duplicate = rows.find(
    (row) =>
      row.id !== currentId &&
      String(row[key] ?? "")
        .trim()
        .toLowerCase() === value.trim().toLowerCase(),
  );
  if (duplicate) throw new Error(message);
}

function validateLanguagePair(english: string, arabic: string, label: string) {
  if (!english.trim() && !arabic.trim()) {
    throw new Error(`Enter at least one ${label}.`);
  }
}

function requiredText(value: string, label: string) {
  const next = value.trim();
  if (!next) throw new Error(`${label} is required.`);
  return next;
}

function nonNegativeNumber(value: number, label: string) {
  const next = Number(value);
  if (!Number.isFinite(next) || next < 0) throw new Error(`${label} must be zero or more.`);
  return next;
}

function nonNegativeInt(value: number, label: string) {
  const next = Math.trunc(Number(value));
  if (!Number.isFinite(next) || next < 0) throw new Error(`${label} must be zero or more.`);
  return next;
}

function nullableNonNegativeInt(value: number | null, label: string) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return nonNegativeInt(Number(value), label);
}

function nullableNonNegativeNumber(value: number | string | null, label: string) {
  if (value === null || value === undefined || value === "") return null;
  return nonNegativeNumber(Number(value), label);
}

function normalizeNullableText(value: string | null | undefined) {
  const next = value?.trim();
  return next || null;
}

function normalizeSlug(value: string, fallback: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || fallback
  );
}

function makeId(prefix: string, value: string) {
  const slug =
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "item";
  return `${prefix}-${slug}-${Date.now().toString(36)}`;
}

function isMissingCatalogGroupTableError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    (message.includes("wa_catalog_groups") ||
      message.includes("wa_catalog_group_values") ||
      message.includes("wa_product_group_values")) &&
    (message.includes("does not exist") || message.includes("schema cache"))
  );
}

function extensionForType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
