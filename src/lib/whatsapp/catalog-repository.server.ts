import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import type { ConversationLanguage } from "./conversation-store.server";

export const DOUBLE_A_TEST_BUSINESS_ID = "double-a-test-business";

export type StoreCategory = {
  id: string;
  businessId: string;
  nameEnglish: string;
  nameArabic: string;
  isActive: boolean;
  sortOrder: number;
};

export type StoreCatalogGroup = {
  id: string;
  businessId: string;
  nameEnglish: string;
  nameArabic: string;
  slug: string;
  source: "category" | "custom";
  isActive: boolean;
  sortOrder: number;
};

export type StoreCatalogGroupValue = {
  id: string;
  businessId: string;
  groupId: string;
  nameEnglish: string;
  nameArabic: string;
  slug: string;
  source: "category" | "custom";
  isActive: boolean;
  sortOrder: number;
};

export type StoreProduct = {
  id: string;
  businessId: string;
  categoryId: string;
  code: string;
  nameEnglish: string;
  nameArabic: string;
  descriptionEnglish: string;
  descriptionArabic: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  isAvailable: boolean;
  stockQuantity: number;
  variantSelectionMode: "step_by_step" | "variant_list";
  sortOrder: number;
};

export type StoreProductOption = {
  id: string;
  businessId: string;
  productId: string;
  nameEnglish: string;
  nameArabic: string;
  sortOrder: number;
  isRequired: boolean;
};

export type StoreProductOptionValue = {
  id: string;
  optionId: string;
  valueEnglish: string;
  valueArabic: string;
  sortOrder: number;
};

export type StoreProductVariant = {
  id: string;
  businessId: string;
  productId: string;
  sku: string;
  selectedOptionValueIds: string[];
  price: number;
  stockQuantity: number;
  isAvailable: boolean;
};

export type StoreProductCustomField = {
  id: string;
  businessId: string;
  productId: string;
  type: "short_text" | "long_text" | "number" | "yes_no" | "single_choice";
  labelEnglish: string;
  labelArabic: string;
  placeholderEnglish?: string;
  placeholderArabic?: string;
  isRequired: boolean;
  minimumLength?: number;
  maximumLength?: number;
  minimumValue?: number;
  maximumValue?: number;
  choices?: Array<{
    id: string;
    labelEnglish: string;
    labelArabic: string;
  }>;
  sortOrder: number;
};

type CategoryRow = {
  id: string;
  business_id: string;
  name_english: string;
  name_arabic: string;
  is_active: boolean;
  sort_order: number;
};

type ProductRow = {
  id: string;
  business_id: string;
  category_id: string;
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
  variant_selection_mode?: "step_by_step" | "variant_list" | null;
  sort_order: number;
};

type CatalogGroupRow = {
  id: string;
  business_id: string;
  name_english: string;
  name_arabic: string;
  slug: string;
  source?: "category" | "custom" | null;
  is_active: boolean;
  sort_order: number;
};

type CatalogGroupValueRow = {
  id: string;
  business_id: string;
  group_id: string;
  name_english: string;
  name_arabic: string;
  slug: string;
  source?: "category" | "custom" | null;
  is_active: boolean;
  sort_order: number;
};

type ProductGroupValueRow = {
  business_id: string;
  product_id: string;
  group_value_id: string;
};

type ProductOptionRow = {
  id: string;
  business_id: string;
  product_id: string;
  name_english: string;
  name_arabic: string;
  sort_order: number;
  is_required: boolean;
};

type ProductOptionValueRow = {
  id: string;
  option_id: string;
  value_english: string;
  value_arabic: string;
  sort_order: number;
};

type ProductVariantRow = {
  id: string;
  business_id: string;
  product_id: string;
  sku: string;
  selected_option_value_ids: string[];
  price: number | string;
  stock_quantity: number;
  is_available: boolean;
};

type ProductCustomFieldRow = {
  id: string;
  business_id: string;
  product_id: string;
  type: StoreProductCustomField["type"];
  label_english: string;
  label_arabic: string;
  placeholder_english: string | null;
  placeholder_arabic: string | null;
  is_required: boolean;
  minimum_length: number | null;
  maximum_length: number | null;
  minimum_value: number | string | null;
  maximum_value: number | string | null;
  choices: StoreProductCustomField["choices"] | null;
  sort_order: number;
};

const categories: StoreCategory[] = [
  {
    id: "cat-accessories",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    nameEnglish: "Accessories",
    nameArabic: "إكسسوارات",
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "cat-clothing",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    nameEnglish: "Clothing",
    nameArabic: "ملابس",
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "cat-gifts",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    nameEnglish: "Gifts",
    nameArabic: "هدايا",
    isActive: true,
    sortOrder: 3,
  },
];

const products: StoreProduct[] = [
  {
    id: "prod-gold-necklace",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    categoryId: "cat-accessories",
    code: "NCK-001",
    nameEnglish: "Gold Necklace",
    nameArabic: "قلادة ذهبية",
    descriptionEnglish: "A simple gold-plated necklace for everyday styling.",
    descriptionArabic: "قلادة مطلية بالذهب بتصميم بسيط للاستخدام اليومي.",
    price: 25,
    isActive: true,
    isAvailable: true,
    stockQuantity: 6,
    variantSelectionMode: "step_by_step",
    sortOrder: 1,
  },
  {
    id: "prod-silk-scarf",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    categoryId: "cat-accessories",
    code: "SCF-014",
    nameEnglish: "Silk Scarf",
    nameArabic: "وشاح حرير",
    descriptionEnglish: "Soft printed scarf with a light finish.",
    descriptionArabic: "وشاح ناعم بطبعة أنيقة وخامة خفيفة.",
    price: 18,
    isActive: true,
    isAvailable: false,
    stockQuantity: 0,
    variantSelectionMode: "step_by_step",
    sortOrder: 2,
  },
  {
    id: "prod-cotton-shirt",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    categoryId: "cat-clothing",
    code: "SHT-101",
    nameEnglish: "Cotton Shirt",
    nameArabic: "قميص قطني",
    descriptionEnglish: "Breathable cotton shirt with a clean tailored cut.",
    descriptionArabic: "قميص قطني مريح بقصة مرتبة وعملية.",
    price: 32,
    isActive: true,
    isAvailable: true,
    stockQuantity: 8,
    variantSelectionMode: "variant_list",
    sortOrder: 1,
  },
  {
    id: "prod-linen-dress",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    categoryId: "cat-clothing",
    code: "DRS-220",
    nameEnglish: "Linen Dress",
    nameArabic: "فستان كتان",
    descriptionEnglish: "Relaxed linen dress made for warm days.",
    descriptionArabic: "فستان كتان مريح مناسب للأيام الدافئة.",
    price: 48,
    isActive: true,
    isAvailable: true,
    stockQuantity: 3,
    variantSelectionMode: "step_by_step",
    sortOrder: 2,
  },
  {
    id: "prod-hidden-jacket",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    categoryId: "cat-clothing",
    code: "JKT-404",
    nameEnglish: "Archived Jacket",
    nameArabic: "جاكيت مؤرشف",
    descriptionEnglish: "Inactive product kept out of customer selection.",
    descriptionArabic: "منتج غير نشط لا يظهر للعملاء.",
    price: 65,
    isActive: false,
    isAvailable: true,
    stockQuantity: 2,
    variantSelectionMode: "step_by_step",
    sortOrder: 3,
  },
  {
    id: "prod-candle-set",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    categoryId: "cat-gifts",
    code: "GFT-330",
    nameEnglish: "Candle Set",
    nameArabic: "مجموعة شموع",
    descriptionEnglish: "Three scented candles packed as a ready gift.",
    descriptionArabic: "ثلاث شموع معطرة مغلفة كهدية جاهزة.",
    price: 22,
    isActive: true,
    isAvailable: true,
    stockQuantity: 10,
    variantSelectionMode: "step_by_step",
    sortOrder: 1,
  },
  {
    id: "prod-gift-box",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    categoryId: "cat-gifts",
    code: "GFT-500",
    nameEnglish: "Premium Gift Box",
    nameArabic: "علبة هدايا فاخرة",
    descriptionEnglish: "Curated gift box with accessories and a handwritten card.",
    descriptionArabic: "علبة هدايا مختارة مع إكسسوارات وبطاقة مكتوبة بخط اليد.",
    price: 55,
    isActive: true,
    isAvailable: true,
    stockQuantity: 4,
    variantSelectionMode: "step_by_step",
    sortOrder: 2,
  },
];

const productOptions: StoreProductOption[] = [
  {
    id: "opt-necklace-material",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-gold-necklace",
    nameEnglish: "Material",
    nameArabic: "الخامة",
    sortOrder: 1,
    isRequired: true,
  },
  {
    id: "opt-necklace-length",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-gold-necklace",
    nameEnglish: "Length",
    nameArabic: "الطول",
    sortOrder: 2,
    isRequired: true,
  },
  {
    id: "opt-shirt-size",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-cotton-shirt",
    nameEnglish: "Size",
    nameArabic: "المقاس",
    sortOrder: 1,
    isRequired: true,
  },
  {
    id: "opt-shirt-color",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-cotton-shirt",
    nameEnglish: "Color",
    nameArabic: "اللون",
    sortOrder: 2,
    isRequired: true,
  },
];

const productOptionValues: StoreProductOptionValue[] = [
  {
    id: "val-necklace-gold",
    optionId: "opt-necklace-material",
    valueEnglish: "Gold",
    valueArabic: "ذهبي",
    sortOrder: 1,
  },
  {
    id: "val-necklace-silver",
    optionId: "opt-necklace-material",
    valueEnglish: "Silver",
    valueArabic: "فضي",
    sortOrder: 2,
  },
  {
    id: "val-necklace-45",
    optionId: "opt-necklace-length",
    valueEnglish: "45 cm",
    valueArabic: "٤٥ سم",
    sortOrder: 1,
  },
  {
    id: "val-necklace-50",
    optionId: "opt-necklace-length",
    valueEnglish: "50 cm",
    valueArabic: "٥٠ سم",
    sortOrder: 2,
  },
  {
    id: "val-shirt-small",
    optionId: "opt-shirt-size",
    valueEnglish: "Small",
    valueArabic: "صغير",
    sortOrder: 1,
  },
  {
    id: "val-shirt-medium",
    optionId: "opt-shirt-size",
    valueEnglish: "Medium",
    valueArabic: "وسط",
    sortOrder: 2,
  },
  {
    id: "val-shirt-large",
    optionId: "opt-shirt-size",
    valueEnglish: "Large",
    valueArabic: "كبير",
    sortOrder: 3,
  },
  {
    id: "val-shirt-black",
    optionId: "opt-shirt-color",
    valueEnglish: "Black",
    valueArabic: "أسود",
    sortOrder: 1,
  },
  {
    id: "val-shirt-white",
    optionId: "opt-shirt-color",
    valueEnglish: "White",
    valueArabic: "أبيض",
    sortOrder: 2,
  },
];

const productVariants: StoreProductVariant[] = [
  {
    id: "var-necklace-gold-45",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-gold-necklace",
    sku: "NCK-001-G45",
    selectedOptionValueIds: ["val-necklace-gold", "val-necklace-45"],
    price: 25,
    stockQuantity: 4,
    isAvailable: true,
  },
  {
    id: "var-necklace-gold-50",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-gold-necklace",
    sku: "NCK-001-G50",
    selectedOptionValueIds: ["val-necklace-gold", "val-necklace-50"],
    price: 28,
    stockQuantity: 2,
    isAvailable: true,
  },
  {
    id: "var-necklace-silver-45",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-gold-necklace",
    sku: "NCK-001-S45",
    selectedOptionValueIds: ["val-necklace-silver", "val-necklace-45"],
    price: 23,
    stockQuantity: 0,
    isAvailable: false,
  },
  {
    id: "var-necklace-silver-50",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-gold-necklace",
    sku: "NCK-001-S50",
    selectedOptionValueIds: ["val-necklace-silver", "val-necklace-50"],
    price: 26,
    stockQuantity: 3,
    isAvailable: true,
  },
  {
    id: "var-shirt-medium-black",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-cotton-shirt",
    sku: "SHT-101-M-BLK",
    selectedOptionValueIds: ["val-shirt-medium", "val-shirt-black"],
    price: 32,
    stockQuantity: 3,
    isAvailable: true,
  },
  {
    id: "var-shirt-large-white",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-cotton-shirt",
    sku: "SHT-101-L-WHT",
    selectedOptionValueIds: ["val-shirt-large", "val-shirt-white"],
    price: 34,
    stockQuantity: 1,
    isAvailable: true,
  },
];

const customFields: StoreProductCustomField[] = [
  {
    id: "field-necklace-engraving",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-gold-necklace",
    type: "short_text",
    labelEnglish: "Engraving text",
    labelArabic: "نص الحفر",
    placeholderEnglish: "Example: Sarah",
    placeholderArabic: "مثال: سارة",
    isRequired: true,
    minimumLength: 2,
    maximumLength: 20,
    sortOrder: 1,
  },
  {
    id: "field-gift-message",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-gift-box",
    type: "long_text",
    labelEnglish: "Gift message",
    labelArabic: "رسالة الهدية",
    placeholderEnglish: "Write a short message or type skip.",
    placeholderArabic: "اكتب رسالة قصيرة أو اكتب تخطي.",
    isRequired: false,
    maximumLength: 120,
    sortOrder: 1,
  },
  {
    id: "field-candle-wrap",
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    productId: "prod-candle-set",
    type: "yes_no",
    labelEnglish: "Gift wrapping",
    labelArabic: "تغليف هدية",
    isRequired: true,
    sortOrder: 1,
  },
];

export async function listActiveCategories(businessId: string) {
  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<CategoryRow[]>(
      `/wa_categories?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&is_active=eq.true&order=sort_order.asc`,
    );
    return rows.map(toCategory);
  }

  return categories
    .filter((category) => category.businessId === businessId && category.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listActiveCatalogGroups(businessId: string) {
  const activeCategories = await listActiveCategories(businessId);
  const customGroups = await listCustomCatalogGroups(businessId);
  const categoryGroup = activeCategories.length ? [defaultCategoryGroup(businessId)] : [];
  return [...categoryGroup, ...customGroups];
}

export async function findActiveCatalogGroupById(businessId: string, groupId: string) {
  if (groupId === defaultCategoryGroupId(businessId)) {
    const activeCategories = await listActiveCategories(businessId);
    return activeCategories.length ? defaultCategoryGroup(businessId) : undefined;
  }

  const groups = await listCustomCatalogGroups(businessId);
  return groups.find((group) => group.id === groupId);
}

export async function listActiveCatalogGroupValues(businessId: string, groupId: string) {
  if (groupId === defaultCategoryGroupId(businessId)) {
    const activeCategories = await listActiveCategories(businessId);
    return activeCategories.map(categoryToGroupValue);
  }

  if (isServerSupabaseConfigured()) {
    try {
      const rows = await supabaseServerRest<CatalogGroupValueRow[]>(
        `/wa_catalog_group_values?select=*&business_id=eq.${encodeURIComponent(
          businessId,
        )}&group_id=eq.${encodeURIComponent(groupId)}&is_active=eq.true&order=sort_order.asc`,
      );
      return rows.map(toCatalogGroupValue);
    } catch (error) {
      if (isMissingCatalogGroupTableError(error)) return [];
      throw error;
    }
  }

  return [];
}

export async function listVisibleProductsByGroupValue(
  businessId: string,
  groupId: string,
  groupValueId: string,
) {
  if (groupId === defaultCategoryGroupId(businessId)) {
    return listVisibleProductsByCategory(businessId, groupValueId);
  }

  if (isServerSupabaseConfigured()) {
    try {
      const links = await supabaseServerRest<ProductGroupValueRow[]>(
        `/wa_product_group_values?select=business_id,product_id,group_value_id&business_id=eq.${encodeURIComponent(
          businessId,
        )}&group_value_id=eq.${encodeURIComponent(groupValueId)}`,
      );
      const ids = [...new Set(links.map((link) => link.product_id))];
      if (!ids.length) return [];
      const rows = await supabaseServerRest<ProductRow[]>(
        `/wa_products?select=*&business_id=eq.${encodeURIComponent(
          businessId,
        )}&id=in.(${ids.map((id) => `"${encodeURIComponent(id)}"`).join(",")})&is_active=eq.true&order=sort_order.asc`,
      );
      return rows.map(toProduct);
    } catch (error) {
      if (isMissingCatalogGroupTableError(error)) return [];
      throw error;
    }
  }

  return [];
}

async function listCustomCatalogGroups(businessId: string) {
  if (!isServerSupabaseConfigured()) return [];
  try {
    const rows = await supabaseServerRest<CatalogGroupRow[]>(
      `/wa_catalog_groups?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&is_active=eq.true&order=sort_order.asc`,
    );
    return rows.map(toCatalogGroup);
  } catch (error) {
    if (isMissingCatalogGroupTableError(error)) return [];
    throw error;
  }
}

export async function listVisibleProductsByCategory(businessId: string, categoryId: string) {
  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<ProductRow[]>(
      `/wa_products?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&category_id=eq.${encodeURIComponent(categoryId)}&is_active=eq.true&order=sort_order.asc`,
    );
    return rows.map(toProduct);
  }

  return products
    .filter(
      (product) =>
        product.businessId === businessId && product.categoryId === categoryId && product.isActive,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function findActiveCategoryById(businessId: string, categoryId: string) {
  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<CategoryRow[]>(
      `/wa_categories?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&id=eq.${encodeURIComponent(categoryId)}&is_active=eq.true&limit=1`,
    );
    return rows[0] ? toCategory(rows[0]) : undefined;
  }

  return categories.find(
    (category) =>
      category.businessId === businessId && category.id === categoryId && category.isActive,
  );
}

export async function findVisibleProductById(businessId: string, productId: string) {
  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<ProductRow[]>(
      `/wa_products?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&id=eq.${encodeURIComponent(productId)}&is_active=eq.true&limit=1`,
    );
    return rows[0] ? toProduct(rows[0]) : undefined;
  }

  return products.find(
    (product) => product.businessId === businessId && product.id === productId && product.isActive,
  );
}

export async function findVisibleProductByCode(businessId: string, code: string) {
  const normalizedCode = code.trim().toLowerCase();

  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<ProductRow[]>(
      `/wa_products?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&code=ilike.${encodeURIComponent(code.trim())}&is_active=eq.true&limit=1`,
    );
    return rows[0] ? toProduct(rows[0]) : undefined;
  }

  return products.find(
    (product) =>
      product.businessId === businessId &&
      product.isActive &&
      product.code.toLowerCase() === normalizedCode,
  );
}

export async function listProductOptions(businessId: string, productId: string) {
  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<ProductOptionRow[]>(
      `/wa_product_options?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&product_id=eq.${encodeURIComponent(productId)}&order=sort_order.asc`,
    );
    return rows.map(toProductOption);
  }

  return productOptions
    .filter((option) => option.businessId === businessId && option.productId === productId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listProductOptionValues(optionId: string) {
  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<ProductOptionValueRow[]>(
      `/wa_product_option_values?select=*&option_id=eq.${encodeURIComponent(
        optionId,
      )}&order=sort_order.asc`,
    );
    return rows.map(toProductOptionValue);
  }

  return productOptionValues
    .filter((value) => value.optionId === optionId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function findProductOptionValue(valueId: string) {
  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<ProductOptionValueRow[]>(
      `/wa_product_option_values?select=*&id=eq.${encodeURIComponent(valueId)}&limit=1`,
    );
    return rows[0] ? toProductOptionValue(rows[0]) : undefined;
  }

  return productOptionValues.find((value) => value.id === valueId);
}

export async function resolveProductVariant({
  businessId,
  productId,
  selectedOptionValueIds,
}: {
  businessId: string;
  productId: string;
  selectedOptionValueIds: string[];
}) {
  const selected = [...selectedOptionValueIds].sort().join("|");

  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<ProductVariantRow[]>(
      `/wa_product_variants?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&product_id=eq.${encodeURIComponent(productId)}`,
    );
    return rows.map(toProductVariant).find((variant) => {
      return [...variant.selectedOptionValueIds].sort().join("|") === selected;
    });
  }

  return productVariants.find(
    (variant) =>
      variant.businessId === businessId &&
      variant.productId === productId &&
    [...variant.selectedOptionValueIds].sort().join("|") === selected,
  );
}

export async function listProductVariants(businessId: string, productId: string) {
  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<ProductVariantRow[]>(
      `/wa_product_variants?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&product_id=eq.${encodeURIComponent(productId)}`,
    );
    return rows.map(toProductVariant);
  }

  return productVariants.filter(
    (variant) => variant.businessId === businessId && variant.productId === productId,
  );
}

export async function findProductVariant({
  businessId,
  variantId,
}: {
  businessId: string;
  variantId: string;
}) {
  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<ProductVariantRow[]>(
      `/wa_product_variants?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&id=eq.${encodeURIComponent(variantId)}&limit=1`,
    );
    return rows[0] ? toProductVariant(rows[0]) : undefined;
  }

  return productVariants.find(
    (variant) => variant.businessId === businessId && variant.id === variantId,
  );
}

export async function listProductCustomFields(businessId: string, productId: string) {
  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<ProductCustomFieldRow[]>(
      `/wa_product_custom_fields?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&product_id=eq.${encodeURIComponent(productId)}&order=sort_order.asc`,
    );
    return rows.map(toProductCustomField);
  }

  return customFields
    .filter((field) => field.businessId === businessId && field.productId === productId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCategoryName(category: StoreCategory, language: ConversationLanguage) {
  return language === "ar" ? category.nameArabic : category.nameEnglish;
}

export function getCatalogGroupName(
  group: StoreCatalogGroup,
  language: ConversationLanguage,
) {
  return language === "ar" ? group.nameArabic || group.nameEnglish : group.nameEnglish;
}

export function getCatalogGroupValueName(
  value: StoreCatalogGroupValue,
  language: ConversationLanguage,
) {
  return language === "ar" ? value.nameArabic || value.nameEnglish : value.nameEnglish;
}

export function getProductName(product: StoreProduct, language: ConversationLanguage) {
  return language === "ar" ? product.nameArabic : product.nameEnglish;
}

export function getProductDescription(product: StoreProduct, language: ConversationLanguage) {
  return language === "ar" ? product.descriptionArabic : product.descriptionEnglish;
}

export function getOptionName(option: StoreProductOption, language: ConversationLanguage) {
  return language === "ar" ? option.nameArabic : option.nameEnglish;
}

export function getOptionValueName(value: StoreProductOptionValue, language: ConversationLanguage) {
  return language === "ar" ? value.valueArabic : value.valueEnglish;
}

export function getCustomFieldLabel(
  field: StoreProductCustomField,
  language: ConversationLanguage,
) {
  return language === "ar" ? field.labelArabic : field.labelEnglish;
}

export function getCustomFieldPlaceholder(
  field: StoreProductCustomField,
  language: ConversationLanguage,
) {
  return language === "ar" ? field.placeholderArabic : field.placeholderEnglish;
}

function toCategory(row: CategoryRow): StoreCategory {
  return {
    id: row.id,
    businessId: row.business_id,
    nameEnglish: row.name_english,
    nameArabic: row.name_arabic,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function toCatalogGroup(row: CatalogGroupRow): StoreCatalogGroup {
  return {
    id: row.id,
    businessId: row.business_id,
    nameEnglish: row.name_english,
    nameArabic: row.name_arabic,
    slug: row.slug,
    source: row.source === "category" ? "category" : "custom",
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function toCatalogGroupValue(row: CatalogGroupValueRow): StoreCatalogGroupValue {
  return {
    id: row.id,
    businessId: row.business_id,
    groupId: row.group_id,
    nameEnglish: row.name_english,
    nameArabic: row.name_arabic,
    slug: row.slug,
    source: row.source === "category" ? "category" : "custom",
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function categoryToGroupValue(category: StoreCategory): StoreCatalogGroupValue {
  return {
    id: category.id,
    businessId: category.businessId,
    groupId: defaultCategoryGroupId(category.businessId),
    nameEnglish: category.nameEnglish,
    nameArabic: category.nameArabic,
    slug: category.id,
    source: "category",
    isActive: category.isActive,
    sortOrder: category.sortOrder,
  };
}

function defaultCategoryGroup(businessId: string): StoreCatalogGroup {
  return {
    id: defaultCategoryGroupId(businessId),
    businessId,
    nameEnglish: "Categories",
    nameArabic: "الفئات",
    slug: "categories",
    source: "category",
    isActive: true,
    sortOrder: 1,
  };
}

function defaultCategoryGroupId(businessId: string) {
  return `${businessId}-group-categories`;
}

function toProduct(row: ProductRow): StoreProduct {
  return {
    id: row.id,
    businessId: row.business_id,
    categoryId: row.category_id,
    code: row.code,
    nameEnglish: row.name_english,
    nameArabic: row.name_arabic,
    descriptionEnglish: row.description_english,
    descriptionArabic: row.description_arabic,
    price: toNumber(row.price),
    imageUrl: row.image_url ?? undefined,
    isActive: row.is_active,
    isAvailable: row.is_available,
    stockQuantity: row.stock_quantity,
    variantSelectionMode:
      row.variant_selection_mode === "variant_list" ? "variant_list" : "step_by_step",
    sortOrder: row.sort_order,
  };
}

function toProductOption(row: ProductOptionRow): StoreProductOption {
  return {
    id: row.id,
    businessId: row.business_id,
    productId: row.product_id,
    nameEnglish: row.name_english,
    nameArabic: row.name_arabic,
    sortOrder: row.sort_order,
    isRequired: row.is_required,
  };
}

function toProductOptionValue(row: ProductOptionValueRow): StoreProductOptionValue {
  return {
    id: row.id,
    optionId: row.option_id,
    valueEnglish: row.value_english,
    valueArabic: row.value_arabic,
    sortOrder: row.sort_order,
  };
}

function toProductVariant(row: ProductVariantRow): StoreProductVariant {
  return {
    id: row.id,
    businessId: row.business_id,
    productId: row.product_id,
    sku: row.sku,
    selectedOptionValueIds: row.selected_option_value_ids,
    price: toNumber(row.price),
    stockQuantity: row.stock_quantity,
    isAvailable: row.is_available,
  };
}

function toProductCustomField(row: ProductCustomFieldRow): StoreProductCustomField {
  return {
    id: row.id,
    businessId: row.business_id,
    productId: row.product_id,
    type: row.type,
    labelEnglish: row.label_english,
    labelArabic: row.label_arabic,
    placeholderEnglish: row.placeholder_english ?? undefined,
    placeholderArabic: row.placeholder_arabic ?? undefined,
    isRequired: row.is_required,
    minimumLength: row.minimum_length ?? undefined,
    maximumLength: row.maximum_length ?? undefined,
    minimumValue: row.minimum_value == null ? undefined : toNumber(row.minimum_value),
    maximumValue: row.maximum_value == null ? undefined : toNumber(row.maximum_value),
    choices: row.choices ?? undefined,
    sortOrder: row.sort_order,
  };
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
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
