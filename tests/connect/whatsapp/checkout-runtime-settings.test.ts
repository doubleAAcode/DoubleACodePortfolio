import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { after, test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        pathToFileURL(`${process.cwd()}/src/${specifier.slice(2)}.ts`).href,
        context,
      );
    }

    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !specifier.endsWith(".ts")) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

const previousSupabaseEnv = unsetSupabaseEnv();

const [{ processIncomingMessage }, conversationStore, checkoutSettingsStore, botFlowSettingsStore] =
  await Promise.all([
    import("../../../src/features/connect/shared/conversation-engine.server.ts"),
    import("../../../src/features/connect/shared/conversation-store.server.ts"),
    import("../../../src/features/connect/shared/checkout-settings.server.ts"),
    import("../../../src/features/connect/shared/bot-flow-settings.server.ts"),
  ]);

after(() => {
  restoreSupabaseEnv(previousSupabaseEnv);
});

test("checkout runtime consumes live business checkout settings and prompt settings", async () => {
  const businessId = "double-a-test-business";
  const customerPhone = "runtime-checkout-settings-customer";
  const now = new Date("2026-07-20T10:00:00.000Z");
  const defaultFlowSettings = botFlowSettingsStore.getDefaultBotFlowSettings(businessId);
  const { businessId: _businessId, updatedAt: _updatedAt, ...flowInput } = defaultFlowSettings;

  await conversationStore.deleteConversationSession({ businessId, customerPhone });
  checkoutSettingsStore.setBusinessCheckoutSettingsForTest({
    businessId,
    currency: "USD",
    allowDelivery: true,
    allowPickup: true,
    minimumOrderAmount: 20,
    deliveryAreas: [
      {
        id: "runtime-area-coast",
        nameEnglish: "Runtime Coast",
        nameArabic: "Runtime Coast AR",
        deliveryFee: 4.5,
      },
      {
        id: "runtime-area-mountain",
        nameEnglish: "Runtime Mountain",
        nameArabic: "Runtime Mountain AR",
        deliveryFee: 7,
      },
    ],
    pickupLocations: [
      {
        id: "runtime-pickup-main",
        nameEnglish: "Runtime Pickup",
        nameArabic: "Runtime Pickup AR",
        addressEnglish: "Runtime pickup desk",
        addressArabic: "Runtime pickup desk AR",
      },
    ],
    paymentMethods: [
      {
        id: "cash_on_delivery",
        labelEnglish: "Runtime COD",
        labelArabic: "Runtime COD AR",
        fulfillmentMethods: ["delivery"],
      },
      {
        id: "cash_on_pickup",
        labelEnglish: "Runtime Pickup Cash",
        labelArabic: "Runtime Pickup Cash AR",
        fulfillmentMethods: ["pickup"],
      },
    ],
    orderConfirmationMessageEnglish: "Runtime confirmation copy",
    orderConfirmationMessageArabic: "Runtime confirmation copy AR",
    requireOwnerApproval: true,
  });
  await botFlowSettingsStore.saveBusinessBotFlowSettings(businessId, {
    ...flowInput,
    languageSelectionEnabled: false,
    defaultLanguage: "en",
    customerNamePromptEnglish: "Runtime name prompt",
    fulfillmentPromptEnglish: "Runtime fulfillment prompt",
    deliveryAreaPromptEnglish: "Runtime delivery area prompt",
    deliveryAddressPromptEnglish: "Runtime delivery address prompt",
    paymentMethodPromptEnglish: "Runtime payment prompt",
    orderNotesPromptEnglish: "Runtime notes prompt",
    noNotesButtonEnglish: "Runtime no notes",
    skipFulfillmentWhenSingleOption: false,
    skipDeliveryAreaWhenSingleOption: false,
    skipPaymentWhenSingleOption: false,
    orderNotesEnabled: true,
  });

  const session = await conversationStore.createConversationSession({
    businessId,
    customerPhone,
    now,
  });
  await conversationStore.saveConversationSession(
    {
      ...session,
      language: "en",
      currentStep: "CART_MENU",
      businessFlowId: "runtime-settings-detached-flow",
      flowVersionId: "runtime-settings-detached-version",
      currentNodeId: undefined,
      context: {
        cart: [
          {
            id: "runtime-cart-item",
            productId: "prod-gold-necklace",
            productCode: "NCK-001",
            productName: "Gold Necklace",
            selectedOptions: [],
            customFieldAnswers: [],
            quantity: 1,
            unitPrice: 25,
            lineTotal: 25,
          },
        ],
      },
    },
    now,
  );

  assert.deepEqual(await send(customerPhone, "cart_checkout"), [
    { type: "text", text: "Runtime name prompt" },
  ]);

  const fulfillmentResponses = await send(customerPhone, "Runtime Customer");
  assert.equal(fulfillmentResponses[0]?.type, "buttons");
  if (fulfillmentResponses[0]?.type !== "buttons") assert.fail("Expected fulfillment buttons.");
  assert.equal(fulfillmentResponses[0].body, "Runtime fulfillment prompt");

  const deliveryAreaResponses = await send(customerPhone, "checkout_delivery");
  assert.equal(deliveryAreaResponses[0]?.type, "list");
  if (deliveryAreaResponses[0]?.type !== "list") assert.fail("Expected delivery area list.");
  assert.equal(deliveryAreaResponses[0].body, "Runtime delivery area prompt");
  assert.deepEqual(
    deliveryAreaResponses[0].sections[0].rows.map((row) => [row.id, row.title, row.description]),
    [
      ["runtime-area-coast", "Runtime Coast", "Delivery fee: $4.50"],
      ["runtime-area-mountain", "Runtime Mountain", "Delivery fee: $7.00"],
    ],
  );

  assert.deepEqual(await send(customerPhone, "runtime-area-coast"), [
    { type: "text", text: "Runtime delivery address prompt" },
  ]);

  const paymentResponses = await send(customerPhone, "Runtime Street 12");
  assert.equal(paymentResponses[0]?.type, "list");
  if (paymentResponses[0]?.type !== "list") assert.fail("Expected payment list.");
  assert.equal(paymentResponses[0].body, "Runtime payment prompt");
  assert.deepEqual(paymentResponses[0].sections[0].rows, [
    { id: "cash_on_delivery", title: "Runtime COD" },
  ]);

  const notesResponses = await send(customerPhone, "cash_on_delivery");
  assert.equal(notesResponses[0]?.type, "buttons");
  if (notesResponses[0]?.type !== "buttons") assert.fail("Expected notes buttons.");
  assert.equal(notesResponses[0].body, "Runtime notes prompt");
  assert.deepEqual(notesResponses[0].buttons, [{ id: "no_notes", title: "Runtime no notes" }]);

  checkoutSettingsStore.resetBusinessCheckoutSettingsForTest(businessId);
  await conversationStore.deleteConversationSession({ businessId, customerPhone });
});

async function send(customerPhone: string, value: string) {
  return processIncomingMessage({
    businessId: "double-a-test-business",
    customerPhone,
    messageId: `runtime-checkout-settings-${Date.now()}-${value}`,
    input: { type: "text", value },
  });
}

function unsetSupabaseEnv() {
  const previous = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  return previous;
}

function restoreSupabaseEnv(previous: ReturnType<typeof unsetSupabaseEnv>) {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
