import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import { findProductVariant, findVisibleProductById } from "./catalog-repository.server";
import { calculateCart, getStockLimit, type CartItem } from "./cart-service.server";
import type {
  BusinessCheckoutSettings,
  FulfillmentMethod,
  PaymentMethod,
} from "./checkout-settings.server";
import type { ConversationLanguage } from "./conversation-store.server";
import { calculateAvailableStock } from "./reliability";

export type CheckoutDraft = {
  customerName?: string;
  alternatePhone?: string;
  fulfillmentMethod?: FulfillmentMethod;
  deliveryAreaId?: string;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  pickupLocationId?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
};

export type OrderStatus = "PENDING_OWNER_CONFIRMATION";
export type StockReservationStatus = "ACTIVE" | "COMMITTED" | "RELEASED" | "EXPIRED";

export type WhatsAppOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  productCode: string;
  productName: string;
  selectedOptions: CartItem["selectedOptions"];
  customFieldAnswers: CartItem["customFieldAnswers"];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type WhatsAppOrder = {
  id: string;
  businessId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  alternatePhone?: string;
  language: ConversationLanguage;
  status: OrderStatus;
  fulfillmentMethod: FulfillmentMethod;
  deliveryAreaId?: string;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  pickupLocationId?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: WhatsAppOrderItem[];
};

export type StockReservation = {
  id: string;
  businessId: string;
  orderId: string;
  productVariantId: string;
  quantity: number;
  status: StockReservationStatus;
  expiresAt: string;
  createdAt: string;
};

type CreateOrderInput = {
  businessId: string;
  customerPhone: string;
  language: ConversationLanguage;
  cart: CartItem[];
  checkout: CheckoutDraft;
  settings: BusinessCheckoutSettings;
  idempotencyKey: string;
  now?: Date;
};

const orders = new Map<string, WhatsAppOrder>();
const ordersByIdempotencyKey = new Map<string, string>();
const stockReservations: StockReservation[] = [];
let orderCounter = 0;

type CreateOrderRpcRow = {
  id: string;
  order_number: string;
  duplicate: boolean;
};

export async function createPendingOrder(
  input: CreateOrderInput,
): Promise<
  | { ok: true; order: WhatsAppOrder; duplicate: boolean }
  | { ok: false; error: string; itemName?: string }
> {
  const existingOrderId = !isServerSupabaseConfigured()
    ? ordersByIdempotencyKey.get(input.idempotencyKey)
    : undefined;
  if (existingOrderId) {
    const order = orders.get(existingOrderId);
    if (order) return { ok: true, order, duplicate: true };
  }

  const validation = await validateCartForOrder({
    businessId: input.businessId,
    cart: input.cart,
  });
  if (!validation.ok) return validation;

  const checkoutValidation = validateCheckout(input.checkout, input.settings);
  if (!checkoutValidation.ok) return checkoutValidation;

  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  const id = `order-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
  const subtotal = calculateCart(validation.cart).subtotal;
  const deliveryArea = input.settings.deliveryAreas.find(
    (area) => area.id === input.checkout.deliveryAreaId,
  );
  const deliveryFee =
    input.checkout.fulfillmentMethod === "delivery" ? (deliveryArea?.deliveryFee ?? 0) : 0;
  const order = buildPendingOrder({
    input,
    id,
    orderNumber: isServerSupabaseConfigured() ? "PENDING" : nextOrderNumber(),
    timestamp,
    cart: validation.cart,
    subtotal,
    deliveryFee,
  });

  const reservations = validation.cart.map((item) => ({
    id: `reservation-${item.id}-${Math.random().toString(36).slice(2, 8)}`,
    businessId: input.businessId,
    orderId: id,
    productVariantId: getReservationStockId(item),
    quantity: item.quantity,
    status: "ACTIVE" as const,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: timestamp,
  }));

  if (isServerSupabaseConfigured()) {
    const rows = await supabaseServerRest<CreateOrderRpcRow[]>("/rpc/wa_create_pending_order", {
      method: "POST",
      body: JSON.stringify({
        p_business_id: input.businessId,
        p_idempotency_key: input.idempotencyKey,
        p_order: {
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          alternatePhone: order.alternatePhone ?? "",
          language: order.language,
          fulfillmentMethod: order.fulfillmentMethod,
          deliveryAreaId: order.deliveryAreaId ?? "",
          deliveryAddress: order.deliveryAddress ?? "",
          deliveryLatitude: order.deliveryLatitude ?? "",
          deliveryLongitude: order.deliveryLongitude ?? "",
          pickupLocationId: order.pickupLocationId ?? "",
          paymentMethod: order.paymentMethod,
          notes: order.notes ?? "",
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          total: order.total,
        },
        p_items: order.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? "",
          productCode: item.productCode,
          productName: item.productName,
          selectedOptions: item.selectedOptions,
          customFieldAnswers: item.customFieldAnswers,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        p_reservations: reservations.map((reservation) => ({
          productVariantId: reservation.productVariantId,
          quantity: reservation.quantity,
          expiresAt: reservation.expiresAt,
        })),
      }),
    });
    const row = rows[0];
    if (!row) return { ok: false, error: "Order creation did not return an order." };
    return {
      ok: true,
      duplicate: row.duplicate,
      order: {
        ...order,
        id: row.id,
        orderNumber: row.order_number,
        items: order.items.map((item) => ({ ...item, orderId: row.id })),
      },
    };
  }

  orders.set(id, order);
  ordersByIdempotencyKey.set(input.idempotencyKey, id);
  stockReservations.push(...reservations);

  return { ok: true, order, duplicate: false };
}

function buildPendingOrder({
  input,
  id,
  orderNumber,
  timestamp,
  cart,
  subtotal,
  deliveryFee,
}: {
  input: CreateOrderInput;
  id: string;
  orderNumber: string;
  timestamp: string;
  cart: CartItem[];
  subtotal: number;
  deliveryFee: number;
}): WhatsAppOrder {
  return {
    id,
    businessId: input.businessId,
    orderNumber,
    customerName: input.checkout.customerName ?? "",
    customerPhone: input.customerPhone,
    alternatePhone: input.checkout.alternatePhone,
    language: input.language,
    status: "PENDING_OWNER_CONFIRMATION",
    fulfillmentMethod: input.checkout.fulfillmentMethod ?? "delivery",
    deliveryAreaId: input.checkout.deliveryAreaId,
    deliveryAddress: input.checkout.deliveryAddress,
    deliveryLatitude: input.checkout.deliveryLatitude,
    deliveryLongitude: input.checkout.deliveryLongitude,
    pickupLocationId: input.checkout.pickupLocationId,
    paymentMethod: input.checkout.paymentMethod ?? "cash_on_delivery",
    notes: input.checkout.notes,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    createdAt: timestamp,
    updatedAt: timestamp,
    items: cart.map((item) => ({
      id: `order-item-${item.id}`,
      orderId: id,
      productId: item.productId,
      variantId: item.variantId,
      productCode: item.productCode,
      productName: item.productName,
      selectedOptions: item.selectedOptions,
      customFieldAnswers: item.customFieldAnswers,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  };
}

export async function validateCartForOrder({
  businessId,
  cart,
}: {
  businessId: string;
  cart: CartItem[];
}): Promise<{ ok: true; cart: CartItem[] } | { ok: false; error: string; itemName?: string }> {
  if (!cart.length) return { ok: false, error: "Cart is empty." };

  const recalculatedCart: CartItem[] = [];

  for (const item of cart) {
    const product = await findVisibleProductById(businessId, item.productId);
    const variant = item.variantId
      ? await findProductVariant({ businessId, variantId: item.variantId })
      : undefined;
    const stockLimit = await getStockLimit({
      businessId,
      productId: item.productId,
      variantId: item.variantId,
    });
    const reservationStockId = getReservationStockId(item);
    const activeReserved = isServerSupabaseConfigured()
      ? await getActiveReservedQuantityFromSupabase(reservationStockId)
      : getActiveReservedQuantity(reservationStockId);
    const available = calculateAvailableStock({
      stockQuantity: stockLimit,
      activeReservedQuantity: activeReserved,
    });

    if (
      !product ||
      !product.isAvailable ||
      (item.variantId && !variant) ||
      item.quantity > available
    ) {
      return {
        ok: false,
        error: "An item is no longer available in the requested quantity.",
        itemName: item.productName,
      };
    }

    const unitPrice = variant?.price ?? product.price;
    recalculatedCart.push({
      ...item,
      productCode: variant?.sku ?? product.code,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    });
  }

  return { ok: true, cart: recalculatedCart };
}

function validateCheckout(
  checkout: CheckoutDraft,
  settings: BusinessCheckoutSettings,
): { ok: true } | { ok: false; error: string } {
  if (!checkout.customerName?.trim()) return { ok: false, error: "Customer name is required." };
  if (!checkout.fulfillmentMethod) return { ok: false, error: "Fulfillment method is required." };
  if (checkout.fulfillmentMethod === "delivery") {
    if (!settings.allowDelivery) return { ok: false, error: "Delivery is not available." };
    if (!checkout.deliveryAreaId) return { ok: false, error: "Delivery area is required." };
    if (!checkout.deliveryAddress?.trim()) {
      return { ok: false, error: "Delivery address is required." };
    }
  }
  if (checkout.fulfillmentMethod === "pickup") {
    if (!settings.allowPickup) return { ok: false, error: "Pickup is not available." };
    if (!checkout.pickupLocationId) return { ok: false, error: "Pickup location is required." };
  }
  if (!checkout.paymentMethod) return { ok: false, error: "Payment method is required." };
  const paymentMethod = settings.paymentMethods.find(
    (method) => method.id === checkout.paymentMethod,
  );
  if (!paymentMethod?.fulfillmentMethods.includes(checkout.fulfillmentMethod)) {
    return { ok: false, error: "Payment method is not available for this order." };
  }
  return { ok: true };
}

function getActiveReservedQuantity(productVariantId: string) {
  const now = Date.now();
  return stockReservations
    .filter(
      (reservation) =>
        reservation.productVariantId === productVariantId &&
        reservation.status === "ACTIVE" &&
        new Date(reservation.expiresAt).getTime() > now,
    )
    .reduce((sum, reservation) => sum + reservation.quantity, 0);
}

async function getActiveReservedQuantityFromSupabase(productVariantId: string) {
  const rows = await supabaseServerRest<Array<{ quantity: number }>>(
    `/wa_stock_reservations?select=quantity&product_variant_id=eq.${encodeURIComponent(
      productVariantId,
    )}&status=eq.ACTIVE&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,
  );

  return rows.reduce((sum, row) => sum + Number(row.quantity), 0);
}

function getReservationStockId(item: CartItem) {
  return item.variantId ?? item.productId;
}

function nextOrderNumber() {
  orderCounter += 1;
  return `DA-${String(orderCounter).padStart(6, "0")}`;
}
