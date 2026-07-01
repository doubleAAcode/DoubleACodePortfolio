import "@tanstack/react-start/server-only";

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
  sortOrder: number;
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
    sortOrder: 2,
  },
];

export async function listActiveCategories(businessId: string) {
  return categories
    .filter((category) => category.businessId === businessId && category.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listVisibleProductsByCategory(businessId: string, categoryId: string) {
  return products
    .filter(
      (product) =>
        product.businessId === businessId && product.categoryId === categoryId && product.isActive,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function findActiveCategoryById(businessId: string, categoryId: string) {
  return categories.find(
    (category) =>
      category.businessId === businessId && category.id === categoryId && category.isActive,
  );
}

export async function findVisibleProductById(businessId: string, productId: string) {
  return products.find(
    (product) => product.businessId === businessId && product.id === productId && product.isActive,
  );
}

export async function findVisibleProductByCode(businessId: string, code: string) {
  const normalizedCode = code.trim().toLowerCase();

  return products.find(
    (product) =>
      product.businessId === businessId &&
      product.isActive &&
      product.code.toLowerCase() === normalizedCode,
  );
}

export function getCategoryName(category: StoreCategory, language: ConversationLanguage) {
  return language === "ar" ? category.nameArabic : category.nameEnglish;
}

export function getProductName(product: StoreProduct, language: ConversationLanguage) {
  return language === "ar" ? product.nameArabic : product.nameEnglish;
}

export function getProductDescription(product: StoreProduct, language: ConversationLanguage) {
  return language === "ar" ? product.descriptionArabic : product.descriptionEnglish;
}
