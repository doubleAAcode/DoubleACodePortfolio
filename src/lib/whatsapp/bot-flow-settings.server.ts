import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import type { ConversationLanguage } from "./conversation-store.server";
import type { FlowBrowseRoute, FlowMainMenuOption } from "./flow-template-types";

export type BusinessBotFlowSettings = {
  businessId: string;
  languageSelectionEnabled: boolean;
  defaultLanguage: ConversationLanguage;
  languagePromptEnglish?: string;
  languagePromptArabic?: string;
  welcomeMessageEnglish: string;
  welcomeMessageArabic: string;
  orderButtonEnglish: string;
  orderButtonArabic: string;
  questionButtonEnglish: string;
  questionButtonArabic: string;
  questionResponseEnglish: string;
  questionResponseArabic: string;
  infoButtonEnglish: string;
  infoButtonArabic: string;
  mainMenuOptions?: FlowMainMenuOption[];
  browseRoutes?: FlowBrowseRoute[];
  infoResponseEnglish: string;
  infoResponseArabic: string;
  customerNamePromptEnglish: string;
  customerNamePromptArabic: string;
  fulfillmentPromptEnglish: string;
  fulfillmentPromptArabic: string;
  deliveryAreaPromptEnglish: string;
  deliveryAreaPromptArabic: string;
  pickupLocationPromptEnglish: string;
  pickupLocationPromptArabic: string;
  deliveryAddressPromptEnglish: string;
  deliveryAddressPromptArabic: string;
  paymentMethodPromptEnglish: string;
  paymentMethodPromptArabic: string;
  orderNotesPromptEnglish: string;
  orderNotesPromptArabic: string;
  noNotesButtonEnglish: string;
  noNotesButtonArabic: string;
  showProductDetailsBeforeOrdering: boolean;
  autoUseSavedCheckoutDetails: boolean;
  skipFulfillmentWhenSingleOption: boolean;
  skipDeliveryAreaWhenSingleOption: boolean;
  skipPickupLocationWhenSingleOption: boolean;
  skipPaymentWhenSingleOption: boolean;
  orderNotesEnabled: boolean;
  updatedAt?: string;
};

export type BotFlowSettingsInput = Omit<BusinessBotFlowSettings, "businessId" | "updatedAt">;

type BotFlowSettingsRow = {
  business_id: string;
  language_selection_enabled: boolean;
  default_language: ConversationLanguage;
  welcome_message_english: string;
  welcome_message_arabic: string;
  order_button_english: string;
  order_button_arabic: string;
  question_button_english: string;
  question_button_arabic: string;
  question_response_english?: string | null;
  question_response_arabic?: string | null;
  info_button_english: string;
  info_button_arabic: string;
  info_response_english?: string | null;
  info_response_arabic?: string | null;
  browse_routes?: FlowBrowseRoute[] | null;
  checkout_prompt_overrides?: Partial<CheckoutPromptSettings> | null;
  show_product_details_before_ordering: boolean;
  auto_use_saved_checkout_details: boolean;
  skip_fulfillment_when_single_option: boolean;
  skip_delivery_area_when_single_option: boolean;
  skip_pickup_location_when_single_option: boolean;
  skip_payment_when_single_option: boolean;
  order_notes_enabled: boolean;
  updated_at: string;
};

const inMemorySettings = new Map<string, BusinessBotFlowSettings>();

type CheckoutPromptSettings = Pick<
  BusinessBotFlowSettings,
  | "customerNamePromptEnglish"
  | "customerNamePromptArabic"
  | "fulfillmentPromptEnglish"
  | "fulfillmentPromptArabic"
  | "deliveryAreaPromptEnglish"
  | "deliveryAreaPromptArabic"
  | "pickupLocationPromptEnglish"
  | "pickupLocationPromptArabic"
  | "deliveryAddressPromptEnglish"
  | "deliveryAddressPromptArabic"
  | "paymentMethodPromptEnglish"
  | "paymentMethodPromptArabic"
  | "orderNotesPromptEnglish"
  | "orderNotesPromptArabic"
  | "noNotesButtonEnglish"
  | "noNotesButtonArabic"
>;

const DEFAULT_SETTINGS: BotFlowSettingsInput = {
  languageSelectionEnabled: true,
  defaultLanguage: "en",
  languagePromptEnglish: "Choose your language:",
  languagePromptArabic: "\u0627\u062e\u062a\u0631 \u0644\u063a\u062a\u0643:",
  welcomeMessageEnglish: "How can we help?",
  welcomeMessageArabic:
    "\u0643\u064a\u0641 \u064a\u0645\u0643\u0646\u0646\u0627 \u0645\u0633\u0627\u0639\u062f\u062a\u0643\u061f",
  orderButtonEnglish: "Place an order",
  orderButtonArabic: "\u062a\u0642\u062f\u064a\u0645 \u0637\u0644\u0628",
  questionButtonEnglish: "Ask a question",
  questionButtonArabic: "\u0637\u0631\u062d \u0633\u0624\u0627\u0644",
  questionResponseEnglish: "Send us your question here and our team will reply shortly.",
  questionResponseArabic:
    "\u0627\u0631\u0633\u0644 \u0633\u0624\u0627\u0644\u0643 \u0647\u0646\u0627 \u0648\u0633\u064a\u0631\u062f \u0641\u0631\u064a\u0642\u0646\u0627 \u0642\u0631\u064a\u0628\u0627.",
  infoButtonEnglish: "Store information",
  infoButtonArabic:
    "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631",
  infoResponseEnglish: "We are open daily. Send a message here if you need help.",
  infoResponseArabic:
    "\u0646\u062d\u0646 \u0645\u062a\u0627\u062d\u0648\u0646 \u064a\u0648\u0645\u064a\u0627. \u0627\u0631\u0633\u0644 \u0631\u0633\u0627\u0644\u0629 \u0647\u0646\u0627 \u0625\u0630\u0627 \u0627\u062d\u062a\u062c\u062a \u0645\u0633\u0627\u0639\u062f\u0629.",
  browseRoutes: [
    {
      key: "categories",
      source: "categories",
      label: { en: "Categories", ar: "\u0627\u0644\u0641\u0626\u0627\u062a" },
      active: true,
      sortOrder: 1,
    },
  ],
  customerNamePromptEnglish: "What name should we put on the order?",
  customerNamePromptArabic:
    "\u0645\u0627 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0630\u064a \u0646\u0636\u0639\u0647 \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628\u061f",
  fulfillmentPromptEnglish: "How would you like to receive your order?",
  fulfillmentPromptArabic:
    "\u0643\u064a\u0641 \u062a\u0631\u064a\u062f \u0627\u0633\u062a\u0644\u0627\u0645 \u0637\u0644\u0628\u0643\u061f",
  deliveryAreaPromptEnglish: "Choose your delivery area:",
  deliveryAreaPromptArabic:
    "\u0627\u062e\u062a\u0631 \u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0644:",
  pickupLocationPromptEnglish: "Choose a pickup location:",
  pickupLocationPromptArabic:
    "\u0627\u062e\u062a\u0631 \u0645\u0643\u0627\u0646 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645:",
  deliveryAddressPromptEnglish:
    "Send the full delivery address. You can also send a WhatsApp location.",
  deliveryAddressPromptArabic:
    "\u0623\u0631\u0633\u0644 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0627\u0644\u0643\u0627\u0645\u0644. \u064a\u0645\u0643\u0646\u0643 \u0623\u064a\u0636\u0627 \u0625\u0631\u0633\u0627\u0644 \u0645\u0648\u0642\u0639 \u0648\u0627\u062a\u0633\u0627\u0628.",
  paymentMethodPromptEnglish: "Choose a payment method:",
  paymentMethodPromptArabic:
    "\u0627\u062e\u062a\u0631 \u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639:",
  orderNotesPromptEnglish: "Would you like to add any notes?",
  orderNotesPromptArabic:
    "\u0647\u0644 \u062a\u0631\u064a\u062f \u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u0627\u062d\u0638\u0627\u062a\u061f",
  noNotesButtonEnglish: "No notes",
  noNotesButtonArabic: "\u0628\u062f\u0648\u0646 \u0645\u0644\u0627\u062d\u0638\u0627\u062a",
  showProductDetailsBeforeOrdering: true,
  autoUseSavedCheckoutDetails: false,
  skipFulfillmentWhenSingleOption: true,
  skipDeliveryAreaWhenSingleOption: true,
  skipPickupLocationWhenSingleOption: true,
  skipPaymentWhenSingleOption: true,
  orderNotesEnabled: true,
};

export function getDefaultBotFlowSettings(businessId: string): BusinessBotFlowSettings {
  return {
    businessId,
    ...DEFAULT_SETTINGS,
  };
}

export async function getBusinessBotFlowSettings(businessId: string) {
  if (isServerSupabaseConfigured()) {
    try {
      const rows = await supabaseServerRest<BotFlowSettingsRow[]>(
        `/wa_bot_flow_settings?select=*&business_id=eq.${encodeURIComponent(businessId)}&limit=1`,
      );
      return rows[0] ? fromRow(rows[0]) : getDefaultBotFlowSettings(businessId);
    } catch (error) {
      if (isMissingBotFlowSettingsTableError(error)) return getDefaultBotFlowSettings(businessId);
      throw error;
    }
  }

  return inMemorySettings.get(businessId) ?? getDefaultBotFlowSettings(businessId);
}

export async function saveBusinessBotFlowSettings(businessId: string, input: BotFlowSettingsInput) {
  const settings = normalizeSettings(businessId, input);

  if (!isServerSupabaseConfigured()) {
    inMemorySettings.set(businessId, settings);
    return settings;
  }

  try {
    await supabaseServerRest("/wa_bot_flow_settings?on_conflict=business_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify(toRow(settings)),
    });
  } catch (error) {
    if (isMissingBotFlowSettingsTableError(error)) {
      throw new Error(
        "Run supabase/wa_bot_flow_settings_schema.sql before saving bot flow settings.",
      );
    }
    throw error;
  }

  return settings;
}

function normalizeSettings(
  businessId: string,
  input: BotFlowSettingsInput,
): BusinessBotFlowSettings {
  return {
    businessId,
    languageSelectionEnabled: Boolean(input.languageSelectionEnabled),
    defaultLanguage: input.defaultLanguage === "ar" ? "ar" : "en",
    languagePromptEnglish:
      input.languagePromptEnglish?.trim() || DEFAULT_SETTINGS.languagePromptEnglish,
    languagePromptArabic:
      input.languagePromptArabic?.trim() || DEFAULT_SETTINGS.languagePromptArabic,
    welcomeMessageEnglish: requiredText(input.welcomeMessageEnglish, "English welcome message"),
    welcomeMessageArabic:
      input.welcomeMessageArabic.trim() || DEFAULT_SETTINGS.welcomeMessageArabic,
    orderButtonEnglish: requiredText(input.orderButtonEnglish, "English order button"),
    orderButtonArabic: input.orderButtonArabic.trim() || DEFAULT_SETTINGS.orderButtonArabic,
    questionButtonEnglish: requiredText(input.questionButtonEnglish, "English question button"),
    questionButtonArabic:
      input.questionButtonArabic.trim() || DEFAULT_SETTINGS.questionButtonArabic,
    questionResponseEnglish: requiredText(
      input.questionResponseEnglish,
      "English question response",
    ),
    questionResponseArabic:
      input.questionResponseArabic.trim() || DEFAULT_SETTINGS.questionResponseArabic,
    infoButtonEnglish: requiredText(input.infoButtonEnglish, "English info button"),
    infoButtonArabic: input.infoButtonArabic.trim() || DEFAULT_SETTINGS.infoButtonArabic,
    infoResponseEnglish: requiredText(input.infoResponseEnglish, "English info response"),
    infoResponseArabic: input.infoResponseArabic.trim() || DEFAULT_SETTINGS.infoResponseArabic,
    browseRoutes: normalizeBrowseRoutes(input.browseRoutes),
    ...normalizeCheckoutPrompts(input),
    showProductDetailsBeforeOrdering: Boolean(input.showProductDetailsBeforeOrdering),
    autoUseSavedCheckoutDetails: Boolean(input.autoUseSavedCheckoutDetails),
    skipFulfillmentWhenSingleOption: Boolean(input.skipFulfillmentWhenSingleOption),
    skipDeliveryAreaWhenSingleOption: Boolean(input.skipDeliveryAreaWhenSingleOption),
    skipPickupLocationWhenSingleOption: Boolean(input.skipPickupLocationWhenSingleOption),
    skipPaymentWhenSingleOption: Boolean(input.skipPaymentWhenSingleOption),
    orderNotesEnabled: Boolean(input.orderNotesEnabled),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCheckoutPrompts(input: BotFlowSettingsInput): CheckoutPromptSettings {
  return {
    customerNamePromptEnglish: requiredText(
      input.customerNamePromptEnglish,
      "English customer name prompt",
    ),
    customerNamePromptArabic:
      input.customerNamePromptArabic.trim() || DEFAULT_SETTINGS.customerNamePromptArabic,
    fulfillmentPromptEnglish: requiredText(
      input.fulfillmentPromptEnglish,
      "English delivery prompt",
    ),
    fulfillmentPromptArabic:
      input.fulfillmentPromptArabic.trim() || DEFAULT_SETTINGS.fulfillmentPromptArabic,
    deliveryAreaPromptEnglish: requiredText(input.deliveryAreaPromptEnglish, "English area prompt"),
    deliveryAreaPromptArabic:
      input.deliveryAreaPromptArabic.trim() || DEFAULT_SETTINGS.deliveryAreaPromptArabic,
    pickupLocationPromptEnglish: requiredText(
      input.pickupLocationPromptEnglish,
      "English pickup prompt",
    ),
    pickupLocationPromptArabic:
      input.pickupLocationPromptArabic.trim() || DEFAULT_SETTINGS.pickupLocationPromptArabic,
    deliveryAddressPromptEnglish: requiredText(
      input.deliveryAddressPromptEnglish,
      "English address prompt",
    ),
    deliveryAddressPromptArabic:
      input.deliveryAddressPromptArabic.trim() || DEFAULT_SETTINGS.deliveryAddressPromptArabic,
    paymentMethodPromptEnglish: requiredText(
      input.paymentMethodPromptEnglish,
      "English payment prompt",
    ),
    paymentMethodPromptArabic:
      input.paymentMethodPromptArabic.trim() || DEFAULT_SETTINGS.paymentMethodPromptArabic,
    orderNotesPromptEnglish: requiredText(input.orderNotesPromptEnglish, "English notes prompt"),
    orderNotesPromptArabic:
      input.orderNotesPromptArabic.trim() || DEFAULT_SETTINGS.orderNotesPromptArabic,
    noNotesButtonEnglish: requiredText(input.noNotesButtonEnglish, "English no-notes button"),
    noNotesButtonArabic: input.noNotesButtonArabic.trim() || DEFAULT_SETTINGS.noNotesButtonArabic,
  };
}

function checkoutPromptsFromRow(
  overrides: Partial<CheckoutPromptSettings> | null | undefined,
): CheckoutPromptSettings {
  return {
    customerNamePromptEnglish: textOrFallback(
      overrides?.customerNamePromptEnglish,
      DEFAULT_SETTINGS.customerNamePromptEnglish,
    ),
    customerNamePromptArabic: textOrFallback(
      overrides?.customerNamePromptArabic,
      DEFAULT_SETTINGS.customerNamePromptArabic,
    ),
    fulfillmentPromptEnglish: textOrFallback(
      overrides?.fulfillmentPromptEnglish,
      DEFAULT_SETTINGS.fulfillmentPromptEnglish,
    ),
    fulfillmentPromptArabic: textOrFallback(
      overrides?.fulfillmentPromptArabic,
      DEFAULT_SETTINGS.fulfillmentPromptArabic,
    ),
    deliveryAreaPromptEnglish: textOrFallback(
      overrides?.deliveryAreaPromptEnglish,
      DEFAULT_SETTINGS.deliveryAreaPromptEnglish,
    ),
    deliveryAreaPromptArabic: textOrFallback(
      overrides?.deliveryAreaPromptArabic,
      DEFAULT_SETTINGS.deliveryAreaPromptArabic,
    ),
    pickupLocationPromptEnglish: textOrFallback(
      overrides?.pickupLocationPromptEnglish,
      DEFAULT_SETTINGS.pickupLocationPromptEnglish,
    ),
    pickupLocationPromptArabic: textOrFallback(
      overrides?.pickupLocationPromptArabic,
      DEFAULT_SETTINGS.pickupLocationPromptArabic,
    ),
    deliveryAddressPromptEnglish: textOrFallback(
      overrides?.deliveryAddressPromptEnglish,
      DEFAULT_SETTINGS.deliveryAddressPromptEnglish,
    ),
    deliveryAddressPromptArabic: textOrFallback(
      overrides?.deliveryAddressPromptArabic,
      DEFAULT_SETTINGS.deliveryAddressPromptArabic,
    ),
    paymentMethodPromptEnglish: textOrFallback(
      overrides?.paymentMethodPromptEnglish,
      DEFAULT_SETTINGS.paymentMethodPromptEnglish,
    ),
    paymentMethodPromptArabic: textOrFallback(
      overrides?.paymentMethodPromptArabic,
      DEFAULT_SETTINGS.paymentMethodPromptArabic,
    ),
    orderNotesPromptEnglish: textOrFallback(
      overrides?.orderNotesPromptEnglish,
      DEFAULT_SETTINGS.orderNotesPromptEnglish,
    ),
    orderNotesPromptArabic: textOrFallback(
      overrides?.orderNotesPromptArabic,
      DEFAULT_SETTINGS.orderNotesPromptArabic,
    ),
    noNotesButtonEnglish: textOrFallback(
      overrides?.noNotesButtonEnglish,
      DEFAULT_SETTINGS.noNotesButtonEnglish,
    ),
    noNotesButtonArabic: textOrFallback(
      overrides?.noNotesButtonArabic,
      DEFAULT_SETTINGS.noNotesButtonArabic,
    ),
  };
}

function pickCheckoutPromptSettings(settings: BusinessBotFlowSettings): CheckoutPromptSettings {
  return {
    customerNamePromptEnglish: settings.customerNamePromptEnglish,
    customerNamePromptArabic: settings.customerNamePromptArabic,
    fulfillmentPromptEnglish: settings.fulfillmentPromptEnglish,
    fulfillmentPromptArabic: settings.fulfillmentPromptArabic,
    deliveryAreaPromptEnglish: settings.deliveryAreaPromptEnglish,
    deliveryAreaPromptArabic: settings.deliveryAreaPromptArabic,
    pickupLocationPromptEnglish: settings.pickupLocationPromptEnglish,
    pickupLocationPromptArabic: settings.pickupLocationPromptArabic,
    deliveryAddressPromptEnglish: settings.deliveryAddressPromptEnglish,
    deliveryAddressPromptArabic: settings.deliveryAddressPromptArabic,
    paymentMethodPromptEnglish: settings.paymentMethodPromptEnglish,
    paymentMethodPromptArabic: settings.paymentMethodPromptArabic,
    orderNotesPromptEnglish: settings.orderNotesPromptEnglish,
    orderNotesPromptArabic: settings.orderNotesPromptArabic,
    noNotesButtonEnglish: settings.noNotesButtonEnglish,
    noNotesButtonArabic: settings.noNotesButtonArabic,
  };
}

function textOrFallback(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeBrowseRoutes(routes: FlowBrowseRoute[] | null | undefined): FlowBrowseRoute[] {
  const source = routes?.length ? routes : DEFAULT_SETTINGS.browseRoutes;
  return (source ?? []).map((route, index) => ({
    key: route.key.trim() || `browse_route_${index + 1}`,
    source: route.source === "catalog_group" ? "catalog_group" : "categories",
    groupSlug:
      route.source === "catalog_group" ? route.groupSlug?.trim() || route.key.trim() : undefined,
    label: {
      en: route.label.en.trim() || (route.source === "catalog_group" ? "Browse" : "Categories"),
      ar: route.label.ar.trim() || route.label.en.trim() || "Categories",
    },
    active: route.active !== false,
    sortOrder: route.sortOrder || index + 1,
  }));
}

function requiredText(value: string, label: string) {
  const next = value.trim();
  if (!next) throw new Error(`${label} is required.`);
  return next;
}

function isMissingBotFlowSettingsTableError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("wa_bot_flow_settings") && message.includes("does not exist");
}

function fromRow(row: BotFlowSettingsRow): BusinessBotFlowSettings {
  return {
    businessId: row.business_id,
    languageSelectionEnabled: row.language_selection_enabled,
    defaultLanguage: row.default_language === "ar" ? "ar" : "en",
    welcomeMessageEnglish: row.welcome_message_english,
    welcomeMessageArabic: row.welcome_message_arabic,
    orderButtonEnglish: row.order_button_english,
    orderButtonArabic: row.order_button_arabic,
    questionButtonEnglish: row.question_button_english,
    questionButtonArabic: row.question_button_arabic,
    questionResponseEnglish:
      row.question_response_english ?? DEFAULT_SETTINGS.questionResponseEnglish,
    questionResponseArabic: row.question_response_arabic ?? DEFAULT_SETTINGS.questionResponseArabic,
    infoButtonEnglish: row.info_button_english,
    infoButtonArabic: row.info_button_arabic,
    infoResponseEnglish: row.info_response_english ?? DEFAULT_SETTINGS.infoResponseEnglish,
    infoResponseArabic: row.info_response_arabic ?? DEFAULT_SETTINGS.infoResponseArabic,
    browseRoutes: normalizeBrowseRoutes(row.browse_routes ?? DEFAULT_SETTINGS.browseRoutes),
    ...checkoutPromptsFromRow(row.checkout_prompt_overrides),
    showProductDetailsBeforeOrdering: row.show_product_details_before_ordering,
    autoUseSavedCheckoutDetails: row.auto_use_saved_checkout_details,
    skipFulfillmentWhenSingleOption: row.skip_fulfillment_when_single_option,
    skipDeliveryAreaWhenSingleOption: row.skip_delivery_area_when_single_option,
    skipPickupLocationWhenSingleOption: row.skip_pickup_location_when_single_option,
    skipPaymentWhenSingleOption: row.skip_payment_when_single_option,
    orderNotesEnabled: row.order_notes_enabled,
    updatedAt: row.updated_at,
  };
}

function toRow(settings: BusinessBotFlowSettings): BotFlowSettingsRow {
  return {
    business_id: settings.businessId,
    language_selection_enabled: settings.languageSelectionEnabled,
    default_language: settings.defaultLanguage,
    welcome_message_english: settings.welcomeMessageEnglish,
    welcome_message_arabic: settings.welcomeMessageArabic,
    order_button_english: settings.orderButtonEnglish,
    order_button_arabic: settings.orderButtonArabic,
    question_button_english: settings.questionButtonEnglish,
    question_button_arabic: settings.questionButtonArabic,
    question_response_english: settings.questionResponseEnglish,
    question_response_arabic: settings.questionResponseArabic,
    info_button_english: settings.infoButtonEnglish,
    info_button_arabic: settings.infoButtonArabic,
    info_response_english: settings.infoResponseEnglish,
    info_response_arabic: settings.infoResponseArabic,
    browse_routes: settings.browseRoutes,
    checkout_prompt_overrides: pickCheckoutPromptSettings(settings),
    show_product_details_before_ordering: settings.showProductDetailsBeforeOrdering,
    auto_use_saved_checkout_details: settings.autoUseSavedCheckoutDetails,
    skip_fulfillment_when_single_option: settings.skipFulfillmentWhenSingleOption,
    skip_delivery_area_when_single_option: settings.skipDeliveryAreaWhenSingleOption,
    skip_pickup_location_when_single_option: settings.skipPickupLocationWhenSingleOption,
    skip_payment_when_single_option: settings.skipPaymentWhenSingleOption,
    order_notes_enabled: settings.orderNotesEnabled,
    updated_at: settings.updatedAt ?? new Date().toISOString(),
  };
}
