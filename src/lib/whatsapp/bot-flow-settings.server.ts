import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import type { ConversationLanguage } from "./conversation-store.server";

export type BusinessBotFlowSettings = {
  businessId: string;
  languageSelectionEnabled: boolean;
  defaultLanguage: ConversationLanguage;
  welcomeMessageEnglish: string;
  welcomeMessageArabic: string;
  orderButtonEnglish: string;
  orderButtonArabic: string;
  questionButtonEnglish: string;
  questionButtonArabic: string;
  infoButtonEnglish: string;
  infoButtonArabic: string;
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
  info_button_english: string;
  info_button_arabic: string;
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

const DEFAULT_SETTINGS: BotFlowSettingsInput = {
  languageSelectionEnabled: true,
  defaultLanguage: "en",
  welcomeMessageEnglish: "How can we help?",
  welcomeMessageArabic:
    "\u0643\u064a\u0641 \u064a\u0645\u0643\u0646\u0646\u0627 \u0645\u0633\u0627\u0639\u062f\u062a\u0643\u061f",
  orderButtonEnglish: "Place an order",
  orderButtonArabic: "\u062a\u0642\u062f\u064a\u0645 \u0637\u0644\u0628",
  questionButtonEnglish: "Ask a question",
  questionButtonArabic: "\u0637\u0631\u062d \u0633\u0624\u0627\u0644",
  infoButtonEnglish: "Store information",
  infoButtonArabic:
    "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631",
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

export async function saveBusinessBotFlowSettings(
  businessId: string,
  input: BotFlowSettingsInput,
) {
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
      throw new Error("Run supabase/wa_bot_flow_settings_schema.sql before saving bot flow settings.");
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
    welcomeMessageEnglish: requiredText(input.welcomeMessageEnglish, "English welcome message"),
    welcomeMessageArabic:
      input.welcomeMessageArabic.trim() || DEFAULT_SETTINGS.welcomeMessageArabic,
    orderButtonEnglish: requiredText(input.orderButtonEnglish, "English order button"),
    orderButtonArabic: input.orderButtonArabic.trim() || DEFAULT_SETTINGS.orderButtonArabic,
    questionButtonEnglish: requiredText(input.questionButtonEnglish, "English question button"),
    questionButtonArabic: input.questionButtonArabic.trim() || DEFAULT_SETTINGS.questionButtonArabic,
    infoButtonEnglish: requiredText(input.infoButtonEnglish, "English info button"),
    infoButtonArabic: input.infoButtonArabic.trim() || DEFAULT_SETTINGS.infoButtonArabic,
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
    infoButtonEnglish: row.info_button_english,
    infoButtonArabic: row.info_button_arabic,
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
    info_button_english: settings.infoButtonEnglish,
    info_button_arabic: settings.infoButtonArabic,
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
