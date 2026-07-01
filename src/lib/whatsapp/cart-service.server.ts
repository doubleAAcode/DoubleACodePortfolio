import "@tanstack/react-start/server-only";

import {
  findProductOptionValue,
  findProductVariant,
  findVisibleProductById,
  getOptionValueName,
  getProductName,
  type StoreProduct,
  type StoreProductCustomField,
  type StoreProductVariant,
} from "./catalog-repository.server";
import type { ConversationLanguage } from "./conversation-store.server";

export type CartItemOption = {
  optionValueId: string;
  label: string;
  value: string;
};

export type CartItemCustomFieldAnswer = {
  fieldId: string;
  label: string;
  value: string;
};

export type CartItem = {
  id: string;
  productId: string;
  variantId?: string;
  productCode: string;
  productName: string;
  selectedOptions: CartItemOption[];
  customFieldAnswers: CartItemCustomFieldAnswer[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PendingItem = {
  productId: string;
  selectedOptionValueIds: string[];
  resolvedVariantId?: string;
  customFieldAnswers: Record<string, string>;
  quantity?: number;
};

export function calculateCart(cart: CartItem[]) {
  return {
    items: cart,
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: cart.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}

export async function buildCartItem({
  businessId,
  language,
  product,
  variant,
  selectedOptionLabels,
  customFields,
  pendingItem,
}: {
  businessId: string;
  language: ConversationLanguage;
  product: StoreProduct;
  variant?: StoreProductVariant;
  selectedOptionLabels: Array<{ optionValueId: string; label: string }>;
  customFields: StoreProductCustomField[];
  pendingItem: PendingItem;
}): Promise<CartItem> {
  const quantity = pendingItem.quantity ?? 1;
  const unitPrice = variant?.price ?? product.price;
  const selectedOptions = await Promise.all(
    selectedOptionLabels.map(async (entry) => {
      const value = await findProductOptionValue(entry.optionValueId);
      return {
        optionValueId: entry.optionValueId,
        label: entry.label,
        value: value ? getOptionValueName(value, language) : entry.optionValueId,
      };
    }),
  );
  const customFieldAnswers = customFields
    .map((field) => {
      const value = pendingItem.customFieldAnswers[field.id];
      if (!value) return undefined;
      return {
        fieldId: field.id,
        label: language === "ar" ? field.labelArabic : field.labelEnglish,
        value,
      };
    })
    .filter((answer): answer is CartItemCustomFieldAnswer => Boolean(answer));

  return {
    id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: product.id,
    variantId: variant?.id,
    productCode: variant?.sku ?? product.code,
    productName: getProductName(product, language),
    selectedOptions,
    customFieldAnswers,
    quantity,
    unitPrice,
    lineTotal: unitPrice * quantity,
  };
}

export function getCartFromContext(context: Record<string, unknown>): CartItem[] {
  return Array.isArray(context.cart) ? (context.cart as CartItem[]) : [];
}

export function getPendingItemFromContext(
  context: Record<string, unknown>,
): PendingItem | undefined {
  if (!context.pendingItem || typeof context.pendingItem !== "object") return undefined;
  return context.pendingItem as PendingItem;
}

export async function getStockLimit({
  businessId,
  productId,
  variantId,
}: {
  businessId: string;
  productId: string;
  variantId?: string;
}) {
  if (variantId) {
    const variant = await findProductVariant(variantId);
    return variant?.isAvailable ? variant.stockQuantity : 0;
  }

  const product = await findVisibleProductById(businessId, productId);
  return product?.isAvailable ? product.stockQuantity : 0;
}
