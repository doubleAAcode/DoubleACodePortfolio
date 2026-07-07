import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateAvailableStock,
  canBusinessProcessMessages,
  isRetryableHttpStatus,
  maskCustomerIdentifier,
  sanitizeExternalErrorMessage,
  selectWhatsAppConnectionForPhoneNumber,
  validateStoredConversationSession,
} from "../../src/lib/whatsapp/reliability.ts";

const validSteps = new Set(["SELECT_LANGUAGE", "MAIN_MENU", "CONFIRM_ORDER"] as const);
const validLanguages = new Set(["en", "ar"] as const);

test("masks customer identifiers without exposing full phone numbers", () => {
  assert.equal(maskCustomerIdentifier("96170123456"), "*******3456");
  assert.equal(maskCustomerIdentifier("1234"), "****");
  assert.equal(maskCustomerIdentifier(""), "");
});

test("calculates available stock without allowing negative availability", () => {
  assert.equal(calculateAvailableStock({ stockQuantity: 5, activeReservedQuantity: 2 }), 3);
  assert.equal(calculateAvailableStock({ stockQuantity: 1, activeReservedQuantity: 2 }), 0);
  assert.equal(calculateAvailableStock({ stockQuantity: 1.9, activeReservedQuantity: 0 }), 1);
  assert.equal(calculateAvailableStock({ stockQuantity: 5, activeReservedQuantity: -3 }), 5);
});

test("classifies temporary WhatsApp send failures as retryable", () => {
  assert.equal(isRetryableHttpStatus(0), true);
  assert.equal(isRetryableHttpStatus(408), true);
  assert.equal(isRetryableHttpStatus(429), true);
  assert.equal(isRetryableHttpStatus(500), true);
  assert.equal(isRetryableHttpStatus(400), false);
  assert.equal(isRetryableHttpStatus(401), false);
});

test("sanitizes external provider errors before recording them", () => {
  assert.equal(
    sanitizeExternalErrorMessage("  bad   request\nwith spacing ", "WhatsApp failed"),
    "WhatsApp failed: bad request with spacing",
  );
  assert.equal(sanitizeExternalErrorMessage(undefined, "WhatsApp failed"), "WhatsApp failed");
});

test("recovers malformed session data to language selection", () => {
  const recovered = validateStoredConversationSession({
    row: {
      business_id: "business-a",
      customer_phone: "96170123456",
      current_step: "CONFIRM_ORDER",
      language: "fr",
      context: [],
    },
    validSteps,
    validLanguages,
    defaultStep: "SELECT_LANGUAGE",
    defaultStepWithLanguage: "MAIN_MENU",
  });

  assert.equal(recovered.currentStep, "SELECT_LANGUAGE");
  assert.equal(recovered.language, undefined);
  assert.deepEqual(recovered.context, {});
  assert.equal(recovered.recovered, true);
  assert.deepEqual(recovered.issues, [
    "invalid_language",
    "invalid_context",
    "missing_language_for_step",
  ]);
});

test("keeps valid simultaneous customer session snapshots isolated", () => {
  const customerA = validateStoredConversationSession({
    row: {
      business_id: "business-a",
      customer_phone: "96170111111",
      current_step: "CONFIRM_ORDER",
      language: "en",
      context: { cart: [{ id: "a" }] },
    },
    validSteps,
    validLanguages,
    defaultStep: "SELECT_LANGUAGE",
    defaultStepWithLanguage: "MAIN_MENU",
  });
  const customerB = validateStoredConversationSession({
    row: {
      business_id: "business-a",
      customer_phone: "96170222222",
      current_step: "MAIN_MENU",
      language: "ar",
      context: { cart: [{ id: "b" }] },
    },
    validSteps,
    validLanguages,
    defaultStep: "SELECT_LANGUAGE",
    defaultStepWithLanguage: "MAIN_MENU",
  });

  assert.equal(customerA.language, "en");
  assert.equal(customerB.language, "ar");
  assert.notDeepEqual(customerA.context, customerB.context);
  assert.equal(customerA.recovered, false);
  assert.equal(customerB.recovered, false);
});

test("resolves only active WhatsApp connections for a phone number", () => {
  const connection = selectWhatsAppConnectionForPhoneNumber({
    phoneNumberId: "phone-a",
    candidates: [
      {
        connectionId: "inactive-a",
        businessId: "business-a",
        phoneNumberId: "phone-a",
        configSuffix: "",
        isActive: false,
      },
      {
        connectionId: "active-b",
        businessId: "business-b",
        phoneNumberId: "phone-b",
        configSuffix: "2",
        isActive: true,
      },
      {
        connectionId: "active-a",
        businessId: "business-a",
        phoneNumberId: "phone-a",
        configSuffix: "",
        isActive: true,
      },
    ],
  });

  assert.equal(connection?.connectionId, "active-a");
  assert.equal(connection?.businessId, "business-a");
});

test("ignores unknown WhatsApp phone numbers safely", () => {
  const connection = selectWhatsAppConnectionForPhoneNumber({
    phoneNumberId: "unknown-phone",
    candidates: [
      {
        connectionId: "active-a",
        businessId: "business-a",
        phoneNumberId: "phone-a",
        configSuffix: "",
        isActive: true,
      },
    ],
  });

  assert.equal(connection, undefined);
});

test("blocks WhatsApp processing unless business is active", () => {
  assert.equal(canBusinessProcessMessages({ isActive: true, status: "ACTIVE" }), true);
  assert.equal(canBusinessProcessMessages({ isActive: true, status: "SUSPENDED" }), false);
  assert.equal(canBusinessProcessMessages({ isActive: false, status: "ACTIVE" }), false);
});
