import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import { DOUBLE_A_TEST_BUSINESS_ID } from "./catalog-repository.server";
import type { ConversationLanguage } from "./conversation-store.server";

export type FulfillmentMethod = "delivery" | "pickup";
export type PaymentMethod = "cash_on_delivery" | "cash_on_pickup";

export type PickupLocation = {
  id: string;
  nameEnglish: string;
  nameArabic: string;
  addressEnglish: string;
  addressArabic: string;
};

export type DeliveryArea = {
  id: string;
  nameEnglish: string;
  nameArabic: string;
  deliveryFee: number;
};

export type CheckoutPaymentMethod = {
  id: PaymentMethod;
  labelEnglish: string;
  labelArabic: string;
  fulfillmentMethods: FulfillmentMethod[];
};

export type BusinessCheckoutSettings = {
  businessId: string;
  currency: "USD";
  allowDelivery: boolean;
  allowPickup: boolean;
  pickupLocations: PickupLocation[];
  deliveryAreas: DeliveryArea[];
  minimumOrderAmount: number;
  paymentMethods: CheckoutPaymentMethod[];
  orderConfirmationMessageEnglish: string;
  orderConfirmationMessageArabic: string;
  requireOwnerApproval: boolean;
};

type BusinessRow = {
  id: string;
  currency: "USD";
  allow_delivery: boolean;
  allow_pickup: boolean;
  minimum_order_amount: number | string;
  order_confirmation_message_english: string;
  order_confirmation_message_arabic: string;
  require_owner_approval: boolean;
};

type PickupLocationRow = {
  id: string;
  name_english: string;
  name_arabic: string;
  address_english: string;
  address_arabic: string;
};

type DeliveryAreaRow = {
  id: string;
  name_english: string;
  name_arabic: string;
  delivery_fee: number | string;
};

type PaymentMethodRow = {
  id: PaymentMethod;
  label_english: string;
  label_arabic: string;
  fulfillment_methods: FulfillmentMethod[];
};

const checkoutSettings: BusinessCheckoutSettings[] = [
  {
    businessId: DOUBLE_A_TEST_BUSINESS_ID,
    currency: "USD",
    allowDelivery: true,
    allowPickup: true,
    pickupLocations: [
      {
        id: "pickup-main",
        nameEnglish: "Main store",
        nameArabic:
          "\u0627\u0644\u0645\u062a\u062c\u0631 \u0627\u0644\u0631\u0626\u064a\u0633\u064a",
        addressEnglish: "Double A main pickup desk",
        addressArabic:
          "\u0645\u0643\u062a\u0628 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u0631\u0626\u064a\u0633\u064a",
      },
    ],
    deliveryAreas: [
      {
        id: "area-beirut",
        nameEnglish: "Beirut",
        nameArabic: "\u0628\u064a\u0631\u0648\u062a",
        deliveryFee: 3,
      },
      {
        id: "area-metn",
        nameEnglish: "Metn",
        nameArabic: "\u0627\u0644\u0645\u062a\u0646",
        deliveryFee: 4,
      },
      {
        id: "area-other",
        nameEnglish: "Other Lebanon areas",
        nameArabic:
          "\u0645\u0646\u0627\u0637\u0642 \u0644\u0628\u0646\u0627\u0646 \u0627\u0644\u0623\u062e\u0631\u0649",
        deliveryFee: 5,
      },
    ],
    minimumOrderAmount: 0,
    paymentMethods: [
      {
        id: "cash_on_delivery",
        labelEnglish: "Cash on delivery",
        labelArabic:
          "\u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u062a\u0648\u0635\u064a\u0644",
        fulfillmentMethods: ["delivery"],
      },
      {
        id: "cash_on_pickup",
        labelEnglish: "Cash on pickup",
        labelArabic:
          "\u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645",
        fulfillmentMethods: ["pickup"],
      },
    ],
    orderConfirmationMessageEnglish: "The store will review and confirm your order shortly.",
    orderConfirmationMessageArabic:
      "\u0633\u064a\u0631\u0627\u062c\u0639 \u0627\u0644\u0645\u062a\u062c\u0631 \u0637\u0644\u0628\u0643 \u0648\u064a\u0624\u0643\u062f\u0647 \u0642\u0631\u064a\u0628\u0627.",
    requireOwnerApproval: true,
  },
];

const checkoutSettingsOverrides = new Map<string, BusinessCheckoutSettings>();

export function setBusinessCheckoutSettingsForTest(settings: BusinessCheckoutSettings) {
  checkoutSettingsOverrides.set(settings.businessId, settings);
}

export function resetBusinessCheckoutSettingsForTest(businessId?: string) {
  if (businessId) checkoutSettingsOverrides.delete(businessId);
  else checkoutSettingsOverrides.clear();
}

export async function getBusinessCheckoutSettings(businessId: string) {
  const override = checkoutSettingsOverrides.get(businessId);
  if (override) return override;

  if (isServerSupabaseConfigured()) {
    const [businessRows, pickupRows, deliveryRows, paymentRows] = await Promise.all([
      supabaseServerRest<BusinessRow[]>(
        `/wa_businesses?select=*&id=eq.${encodeURIComponent(businessId)}&is_active=eq.true&limit=1`,
      ),
      supabaseServerRest<PickupLocationRow[]>(
        `/wa_pickup_locations?select=*&business_id=eq.${encodeURIComponent(
          businessId,
        )}&is_active=eq.true&order=sort_order.asc`,
      ),
      supabaseServerRest<DeliveryAreaRow[]>(
        `/wa_delivery_areas?select=*&business_id=eq.${encodeURIComponent(
          businessId,
        )}&is_active=eq.true&order=sort_order.asc`,
      ),
      supabaseServerRest<PaymentMethodRow[]>(
        `/wa_payment_methods?select=*&business_id=eq.${encodeURIComponent(
          businessId,
        )}&is_active=eq.true&order=sort_order.asc`,
      ),
    ]);

    const business = businessRows[0];
    if (!business) return undefined;

    return {
      businessId: business.id,
      currency: business.currency,
      allowDelivery: business.allow_delivery,
      allowPickup: business.allow_pickup,
      pickupLocations: pickupRows.map(toPickupLocation),
      deliveryAreas: deliveryRows.map(toDeliveryArea),
      minimumOrderAmount: toNumber(business.minimum_order_amount),
      paymentMethods: paymentRows.map(toPaymentMethod),
      orderConfirmationMessageEnglish: business.order_confirmation_message_english,
      orderConfirmationMessageArabic: business.order_confirmation_message_arabic,
      requireOwnerApproval: business.require_owner_approval,
    };
  }

  return checkoutSettings.find((settings) => settings.businessId === businessId);
}

export function getDeliveryAreaName(area: DeliveryArea, language: ConversationLanguage) {
  return language === "ar" ? area.nameArabic : area.nameEnglish;
}

export function getPickupLocationName(location: PickupLocation, language: ConversationLanguage) {
  return language === "ar" ? location.nameArabic : location.nameEnglish;
}

export function getPickupLocationAddress(location: PickupLocation, language: ConversationLanguage) {
  return language === "ar" ? location.addressArabic : location.addressEnglish;
}

export function getPaymentMethodLabel(
  paymentMethod: CheckoutPaymentMethod,
  language: ConversationLanguage,
) {
  return language === "ar" ? paymentMethod.labelArabic : paymentMethod.labelEnglish;
}

function toPickupLocation(row: PickupLocationRow): PickupLocation {
  return {
    id: row.id,
    nameEnglish: row.name_english,
    nameArabic: row.name_arabic,
    addressEnglish: row.address_english,
    addressArabic: row.address_arabic,
  };
}

function toDeliveryArea(row: DeliveryAreaRow): DeliveryArea {
  return {
    id: row.id,
    nameEnglish: row.name_english,
    nameArabic: row.name_arabic,
    deliveryFee: toNumber(row.delivery_fee),
  };
}

function toPaymentMethod(row: PaymentMethodRow): CheckoutPaymentMethod {
  return {
    id: row.id,
    labelEnglish: row.label_english,
    labelArabic: row.label_arabic,
    fulfillmentMethods: row.fulfillment_methods,
  };
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}
