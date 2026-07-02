import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import type {
  BusinessCheckoutSettings,
  FulfillmentMethod,
  PaymentMethod,
} from "./checkout-settings.server";
import type { ConversationLanguage } from "./conversation-store.server";
import type { CheckoutDraft, WhatsAppOrder } from "./order-store.server";

export type WhatsAppCustomerProfile = {
  businessId: string;
  customerPhone: string;
  customerName: string;
  language: ConversationLanguage;
  fulfillmentMethod: FulfillmentMethod;
  deliveryAreaId?: string;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  pickupLocationId?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  lastOrderId?: string;
  lastOrderNumber?: string;
  lastOrderedAt: string;
  updatedAt: string;
};

type CustomerProfileRow = {
  business_id: string;
  customer_phone: string;
  customer_name: string;
  language: ConversationLanguage;
  fulfillment_method: FulfillmentMethod;
  delivery_area_id: string | null;
  delivery_address: string | null;
  delivery_latitude: number | string | null;
  delivery_longitude: number | string | null;
  pickup_location_id: string | null;
  payment_method: PaymentMethod;
  notes: string | null;
  last_order_id: string | null;
  last_order_number: string | null;
  last_ordered_at: string;
  updated_at: string;
};

const profiles = new Map<string, WhatsAppCustomerProfile>();

export async function getWhatsAppCustomerProfile({
  businessId,
  customerPhone,
}: {
  businessId: string;
  customerPhone: string;
}) {
  if (!isServerSupabaseConfigured()) {
    return profiles.get(getProfileKey(businessId, customerPhone));
  }

  const rows = await supabaseServerRest<CustomerProfileRow[]>(
    `/wa_customer_profiles?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}&customer_phone=eq.${encodeURIComponent(customerPhone)}&limit=1`,
  );

  return rows[0] ? fromRow(rows[0]) : undefined;
}

export async function saveWhatsAppCustomerProfileFromOrder(order: WhatsAppOrder) {
  const timestamp = new Date().toISOString();
  const profile: WhatsAppCustomerProfile = {
    businessId: order.businessId,
    customerPhone: order.customerPhone,
    customerName: order.customerName,
    language: order.language,
    fulfillmentMethod: order.fulfillmentMethod,
    deliveryAreaId: order.deliveryAreaId,
    deliveryAddress: order.deliveryAddress,
    deliveryLatitude: order.deliveryLatitude,
    deliveryLongitude: order.deliveryLongitude,
    pickupLocationId: order.pickupLocationId,
    paymentMethod: order.paymentMethod,
    notes: order.notes,
    lastOrderId: order.id,
    lastOrderNumber: order.orderNumber,
    lastOrderedAt: order.createdAt,
    updatedAt: timestamp,
  };

  if (!isServerSupabaseConfigured()) {
    profiles.set(getProfileKey(order.businessId, order.customerPhone), profile);
    return profile;
  }

  await supabaseServerRest<CustomerProfileRow[]>(
    "/wa_customer_profiles?on_conflict=business_id,customer_phone",
    {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify(toRow(profile)),
    },
  );

  return profile;
}

export function getReusableCheckoutFromProfile(
  profile: WhatsAppCustomerProfile,
  settings: BusinessCheckoutSettings,
): CheckoutDraft | undefined {
  if (!profile.customerName.trim()) return undefined;

  if (profile.fulfillmentMethod === "delivery") {
    const area = settings.deliveryAreas.find((entry) => entry.id === profile.deliveryAreaId);
    if (!settings.allowDelivery || !area || !profile.deliveryAddress?.trim()) return undefined;
  }

  if (profile.fulfillmentMethod === "pickup") {
    const pickupLocation = settings.pickupLocations.find(
      (entry) => entry.id === profile.pickupLocationId,
    );
    if (!settings.allowPickup || !pickupLocation) return undefined;
  }

  const paymentMethod = settings.paymentMethods.find(
    (method) =>
      method.id === profile.paymentMethod &&
      method.fulfillmentMethods.includes(profile.fulfillmentMethod),
  );
  if (!paymentMethod) return undefined;

  return {
    customerName: profile.customerName,
    fulfillmentMethod: profile.fulfillmentMethod,
    deliveryAreaId: profile.deliveryAreaId,
    deliveryAddress: profile.deliveryAddress,
    deliveryLatitude: profile.deliveryLatitude,
    deliveryLongitude: profile.deliveryLongitude,
    pickupLocationId: profile.pickupLocationId,
    paymentMethod: profile.paymentMethod,
    notes: profile.notes,
  };
}

function getProfileKey(businessId: string, customerPhone: string) {
  return `${businessId}:${customerPhone}`;
}

function fromRow(row: CustomerProfileRow): WhatsAppCustomerProfile {
  return {
    businessId: row.business_id,
    customerPhone: row.customer_phone,
    customerName: row.customer_name,
    language: row.language,
    fulfillmentMethod: row.fulfillment_method,
    deliveryAreaId: row.delivery_area_id ?? undefined,
    deliveryAddress: row.delivery_address ?? undefined,
    deliveryLatitude: row.delivery_latitude == null ? undefined : Number(row.delivery_latitude),
    deliveryLongitude: row.delivery_longitude == null ? undefined : Number(row.delivery_longitude),
    pickupLocationId: row.pickup_location_id ?? undefined,
    paymentMethod: row.payment_method,
    notes: row.notes ?? undefined,
    lastOrderId: row.last_order_id ?? undefined,
    lastOrderNumber: row.last_order_number ?? undefined,
    lastOrderedAt: row.last_ordered_at,
    updatedAt: row.updated_at,
  };
}

function toRow(profile: WhatsAppCustomerProfile): CustomerProfileRow {
  return {
    business_id: profile.businessId,
    customer_phone: profile.customerPhone,
    customer_name: profile.customerName,
    language: profile.language,
    fulfillment_method: profile.fulfillmentMethod,
    delivery_area_id: profile.deliveryAreaId ?? null,
    delivery_address: profile.deliveryAddress ?? null,
    delivery_latitude: profile.deliveryLatitude ?? null,
    delivery_longitude: profile.deliveryLongitude ?? null,
    pickup_location_id: profile.pickupLocationId ?? null,
    payment_method: profile.paymentMethod,
    notes: profile.notes ?? null,
    last_order_id: profile.lastOrderId ?? null,
    last_order_number: profile.lastOrderNumber ?? null,
    last_ordered_at: profile.lastOrderedAt,
    updated_at: profile.updatedAt,
  };
}
