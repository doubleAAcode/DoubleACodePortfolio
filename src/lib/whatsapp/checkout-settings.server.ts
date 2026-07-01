import "@tanstack/react-start/server-only";

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

export async function getBusinessCheckoutSettings(businessId: string) {
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
