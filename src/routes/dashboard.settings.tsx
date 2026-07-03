import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useWaDashboardData } from "@/lib/whatsapp/use-wa-dashboard-data";
import type { BotFlowSettingsInput } from "@/lib/whatsapp/bot-flow-settings.server";
import type { WaPaymentMethodRow } from "@/lib/whatsapp/dashboard-store.server";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

const emptyPayment = {
  id: "",
  label_english: "",
  label_arabic: "",
  fulfillment_methods: ["delivery"] as Array<"delivery" | "pickup">,
  is_active: true,
  sort_order: 10,
};

const defaultFlowForm: BotFlowSettingsInput = {
  languageSelectionEnabled: true,
  defaultLanguage: "en",
  welcomeMessageEnglish: "How can we help?",
  welcomeMessageArabic: "\u0643\u064a\u0641 \u064a\u0645\u0643\u0646\u0646\u0627 \u0645\u0633\u0627\u0639\u062f\u062a\u0643\u061f",
  orderButtonEnglish: "Place an order",
  orderButtonArabic: "\u062a\u0642\u062f\u064a\u0645 \u0637\u0644\u0628",
  questionButtonEnglish: "Ask a question",
  questionButtonArabic: "\u0637\u0631\u062d \u0633\u0624\u0627\u0644",
  questionResponseEnglish: "Send us your question here and our team will reply shortly.",
  questionResponseArabic:
    "\u0627\u0631\u0633\u0644 \u0633\u0624\u0627\u0644\u0643 \u0647\u0646\u0627 \u0648\u0633\u064a\u0631\u062f \u0641\u0631\u064a\u0642\u0646\u0627 \u0642\u0631\u064a\u0628\u0627.",
  infoButtonEnglish: "Store information",
  infoButtonArabic: "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631",
  infoResponseEnglish: "We are open daily. Send a message here if you need help.",
  infoResponseArabic:
    "\u0646\u062d\u0646 \u0645\u062a\u0627\u062d\u0648\u0646 \u064a\u0648\u0645\u064a\u0627. \u0627\u0631\u0633\u0644 \u0631\u0633\u0627\u0644\u0629 \u0647\u0646\u0627 \u0625\u0630\u0627 \u0627\u062d\u062a\u062c\u062a \u0645\u0633\u0627\u0639\u062f\u0629.",
  showProductDetailsBeforeOrdering: true,
  autoUseSavedCheckoutDetails: false,
  skipFulfillmentWhenSingleOption: true,
  skipDeliveryAreaWhenSingleOption: true,
  skipPickupLocationWhenSingleOption: true,
  skipPaymentWhenSingleOption: true,
  orderNotesEnabled: true,
};

export function SettingsPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showBotFlowSettings = pathname.startsWith("/dashboard-2");
  const { data, loading, saving, error, notice, applyAction } = useWaDashboardData();
  const [businessForm, setBusinessForm] = useState({
    name: "",
    default_language: "en",
    currency: "USD",
    allow_delivery: true,
    allow_pickup: true,
    minimum_order_amount: 0,
    order_confirmation_message_english: "",
    order_confirmation_message_arabic: "",
    require_owner_approval: true,
    is_active: true,
  });
  const [flowForm, setFlowForm] = useState<BotFlowSettingsInput>(defaultFlowForm);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);

  useEffect(() => {
    if (!data) return;
    setBusinessForm({
      name: data.business.name,
      default_language: data.business.default_language,
      currency: data.business.currency,
      allow_delivery: data.business.allow_delivery,
      allow_pickup: data.business.allow_pickup,
      minimum_order_amount: Number(data.business.minimum_order_amount),
      order_confirmation_message_english: data.business.order_confirmation_message_english,
      order_confirmation_message_arabic: data.business.order_confirmation_message_arabic,
      require_owner_approval: data.business.require_owner_approval,
      is_active: data.business.is_active,
    });
    setFlowForm({
      languageSelectionEnabled: data.botFlowSettings.languageSelectionEnabled,
      defaultLanguage: data.botFlowSettings.defaultLanguage,
      welcomeMessageEnglish: data.botFlowSettings.welcomeMessageEnglish,
      welcomeMessageArabic: data.botFlowSettings.welcomeMessageArabic,
      orderButtonEnglish: data.botFlowSettings.orderButtonEnglish,
      orderButtonArabic: data.botFlowSettings.orderButtonArabic,
      questionButtonEnglish: data.botFlowSettings.questionButtonEnglish,
      questionButtonArabic: data.botFlowSettings.questionButtonArabic,
      questionResponseEnglish: data.botFlowSettings.questionResponseEnglish,
      questionResponseArabic: data.botFlowSettings.questionResponseArabic,
      infoButtonEnglish: data.botFlowSettings.infoButtonEnglish,
      infoButtonArabic: data.botFlowSettings.infoButtonArabic,
      infoResponseEnglish: data.botFlowSettings.infoResponseEnglish,
      infoResponseArabic: data.botFlowSettings.infoResponseArabic,
      showProductDetailsBeforeOrdering: data.botFlowSettings.showProductDetailsBeforeOrdering,
      autoUseSavedCheckoutDetails: data.botFlowSettings.autoUseSavedCheckoutDetails,
      skipFulfillmentWhenSingleOption: data.botFlowSettings.skipFulfillmentWhenSingleOption,
      skipDeliveryAreaWhenSingleOption: data.botFlowSettings.skipDeliveryAreaWhenSingleOption,
      skipPickupLocationWhenSingleOption: data.botFlowSettings.skipPickupLocationWhenSingleOption,
      skipPaymentWhenSingleOption: data.botFlowSettings.skipPaymentWhenSingleOption,
      orderNotesEnabled: data.botFlowSettings.orderNotesEnabled,
    });
  }, [data]);

  async function saveBusiness() {
    await applyAction({ type: "saveBusiness", payload: businessForm }, "Store settings saved.");
  }
  async function saveBotFlowSettings() {
    await applyAction({ type: "saveBotFlowSettings", payload: flowForm }, "Bot flow saved.");
  }


  async function savePayment() {
    await applyAction(
      { type: "savePaymentMethod", payload: { ...paymentForm, id: paymentForm.id || undefined } },
      "Payment method saved.",
    );
    setPaymentForm(emptyPayment);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Store</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Settings</h1>
      </div>

      <Status loading={loading} error={error} notice={notice} />

      {showBotFlowSettings ? (
        <section className="rounded-lg border border-border bg-surface/60 p-5">
          <h2 className="font-display text-xl font-semibold">Bot flow</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Toggle
              label="Ask language first"
              checked={flowForm.languageSelectionEnabled}
              onChange={(value) => setFlowForm({ ...flowForm, languageSelectionEnabled: value })}
            />
            <SelectInput
              label="Default language"
              value={flowForm.defaultLanguage}
              onChange={(value) =>
                setFlowForm({ ...flowForm, defaultLanguage: value === "ar" ? "ar" : "en" })
              }
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </SelectInput>
            <Toggle
              label="Show product details"
              checked={flowForm.showProductDetailsBeforeOrdering}
              onChange={(value) =>
                setFlowForm({ ...flowForm, showProductDetailsBeforeOrdering: value })
              }
            />
            <Toggle
              label="Auto-use saved checkout"
              checked={flowForm.autoUseSavedCheckoutDetails}
              onChange={(value) =>
                setFlowForm({ ...flowForm, autoUseSavedCheckoutDetails: value })
              }
            />
            <Toggle
              label="Skip one delivery choice"
              checked={flowForm.skipFulfillmentWhenSingleOption}
              onChange={(value) =>
                setFlowForm({ ...flowForm, skipFulfillmentWhenSingleOption: value })
              }
            />
            <Toggle
              label="Skip one area"
              checked={flowForm.skipDeliveryAreaWhenSingleOption}
              onChange={(value) =>
                setFlowForm({ ...flowForm, skipDeliveryAreaWhenSingleOption: value })
              }
            />
            <Toggle
              label="Skip one pickup place"
              checked={flowForm.skipPickupLocationWhenSingleOption}
              onChange={(value) =>
                setFlowForm({ ...flowForm, skipPickupLocationWhenSingleOption: value })
              }
            />
            <Toggle
              label="Skip one payment"
              checked={flowForm.skipPaymentWhenSingleOption}
              onChange={(value) => setFlowForm({ ...flowForm, skipPaymentWhenSingleOption: value })}
            />
            <Toggle
              label="Ask order notes"
              checked={flowForm.orderNotesEnabled}
              onChange={(value) => setFlowForm({ ...flowForm, orderNotesEnabled: value })}
            />
            <TextArea
              label="English main menu message"
              value={flowForm.welcomeMessageEnglish}
              onChange={(value) => setFlowForm({ ...flowForm, welcomeMessageEnglish: value })}
            />
            <TextArea
              label="Arabic main menu message"
              dir="rtl"
              value={flowForm.welcomeMessageArabic}
              onChange={(value) => setFlowForm({ ...flowForm, welcomeMessageArabic: value })}
            />
            <TextInput
              label="English order button"
              value={flowForm.orderButtonEnglish}
              onChange={(value) => setFlowForm({ ...flowForm, orderButtonEnglish: value })}
            />
            <TextInput
              label="Arabic order button"
              dir="rtl"
              value={flowForm.orderButtonArabic}
              onChange={(value) => setFlowForm({ ...flowForm, orderButtonArabic: value })}
            />
            <TextInput
              label="English question button"
              value={flowForm.questionButtonEnglish}
              onChange={(value) => setFlowForm({ ...flowForm, questionButtonEnglish: value })}
            />
            <TextInput
              label="Arabic question button"
              dir="rtl"
              value={flowForm.questionButtonArabic}
              onChange={(value) => setFlowForm({ ...flowForm, questionButtonArabic: value })}
            />
            <TextArea
              label="English question response"
              value={flowForm.questionResponseEnglish}
              onChange={(value) => setFlowForm({ ...flowForm, questionResponseEnglish: value })}
            />
            <TextArea
              label="Arabic question response"
              dir="rtl"
              value={flowForm.questionResponseArabic}
              onChange={(value) => setFlowForm({ ...flowForm, questionResponseArabic: value })}
            />
            <TextInput
              label="English info button"
              value={flowForm.infoButtonEnglish}
              onChange={(value) => setFlowForm({ ...flowForm, infoButtonEnglish: value })}
            />
            <TextInput
              label="Arabic info button"
              dir="rtl"
              value={flowForm.infoButtonArabic}
              onChange={(value) => setFlowForm({ ...flowForm, infoButtonArabic: value })}
            />
            <TextArea
              label="English store info response"
              value={flowForm.infoResponseEnglish}
              onChange={(value) => setFlowForm({ ...flowForm, infoResponseEnglish: value })}
            />
            <TextArea
              label="Arabic store info response"
              dir="rtl"
              value={flowForm.infoResponseArabic}
              onChange={(value) => setFlowForm({ ...flowForm, infoResponseArabic: value })}
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveBotFlowSettings()}
            className="studio-button-primary mt-4"
          >
            <Check className="h-4 w-4" />
            Save bot flow
          </button>
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-display text-xl font-semibold">General store settings</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <TextInput
            label="Store name"
            value={businessForm.name}
            onChange={(value) => setBusinessForm({ ...businessForm, name: value })}
          />
          <SelectInput
            label="Default language"
            value={businessForm.default_language}
            onChange={(value) => setBusinessForm({ ...businessForm, default_language: value })}
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </SelectInput>
          <TextInput
            label="Currency"
            value={businessForm.currency}
            onChange={(value) => setBusinessForm({ ...businessForm, currency: value })}
          />
          <NumberInput
            label="Minimum order"
            value={businessForm.minimum_order_amount}
            onChange={(value) => setBusinessForm({ ...businessForm, minimum_order_amount: value })}
          />
          <Toggle
            label="Delivery enabled"
            checked={businessForm.allow_delivery}
            onChange={(value) => setBusinessForm({ ...businessForm, allow_delivery: value })}
          />
          <Toggle
            label="Pickup enabled"
            checked={businessForm.allow_pickup}
            onChange={(value) => setBusinessForm({ ...businessForm, allow_pickup: value })}
          />
          <Toggle
            label="Owner approval required"
            checked={businessForm.require_owner_approval}
            onChange={(value) =>
              setBusinessForm({ ...businessForm, require_owner_approval: value })
            }
          />
          <Toggle
            label="Store active"
            checked={businessForm.is_active}
            onChange={(value) => setBusinessForm({ ...businessForm, is_active: value })}
          />
          <TextArea
            label="English confirmation message"
            value={businessForm.order_confirmation_message_english}
            onChange={(value) =>
              setBusinessForm({ ...businessForm, order_confirmation_message_english: value })
            }
          />
          <TextArea
            label="Arabic confirmation message"
            dir="rtl"
            value={businessForm.order_confirmation_message_arabic}
            onChange={(value) =>
              setBusinessForm({ ...businessForm, order_confirmation_message_arabic: value })
            }
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveBusiness()}
          className="studio-button-primary mt-4"
        >
          <Check className="h-4 w-4" />
          Save store settings
        </button>
      </section>

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-display text-xl font-semibold">
          {paymentForm.id ? "Edit payment method" : "Add payment method"}
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <TextInput
            label="English label"
            value={paymentForm.label_english}
            onChange={(value) => setPaymentForm({ ...paymentForm, label_english: value })}
          />
          <TextInput
            label="Arabic label"
            dir="rtl"
            value={paymentForm.label_arabic}
            onChange={(value) => setPaymentForm({ ...paymentForm, label_arabic: value })}
          />
          <NumberInput
            label="Sort"
            value={paymentForm.sort_order}
            onChange={(value) => setPaymentForm({ ...paymentForm, sort_order: value })}
          />
          <Toggle
            label="Delivery eligible"
            checked={paymentForm.fulfillment_methods.includes("delivery")}
            onChange={(value) =>
              setPaymentForm({
                ...paymentForm,
                fulfillment_methods: toggleMethod(
                  paymentForm.fulfillment_methods,
                  "delivery",
                  value,
                ),
              })
            }
          />
          <Toggle
            label="Pickup eligible"
            checked={paymentForm.fulfillment_methods.includes("pickup")}
            onChange={(value) =>
              setPaymentForm({
                ...paymentForm,
                fulfillment_methods: toggleMethod(paymentForm.fulfillment_methods, "pickup", value),
              })
            }
          />
          <Toggle
            label="Active"
            checked={paymentForm.is_active}
            onChange={(value) => setPaymentForm({ ...paymentForm, is_active: value })}
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void savePayment()}
          className="studio-button-primary mt-4"
        >
          {paymentForm.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          Save payment method
        </button>

        <div className="mt-4 space-y-2">
          {data?.paymentMethods.length ? (
            data.paymentMethods.map((method) => (
              <PaymentRow
                key={method.id}
                method={method}
                onEdit={() => setPaymentForm(method)}
                onDelete={() => {
                  if (window.confirm(`Delete ${method.label_english}?`))
                    void applyAction(
                      { type: "deletePaymentMethod", payload: { id: method.id } },
                      "Payment method deleted.",
                    );
                }}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No payment methods yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function PaymentRow({
  method,
  onEdit,
  onDelete,
}: {
  method: WaPaymentMethodRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
      <button type="button" onClick={onEdit} className="text-left hover:text-primary">
        <div className="font-medium">{method.label_english}</div>
        <div className="text-xs text-muted-foreground">
          {method.fulfillment_methods.join(", ")} · {method.is_active ? "Active" : "Hidden"}
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete payment method"
        className="rounded-md p-2 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function toggleMethod(
  methods: Array<"delivery" | "pickup">,
  method: "delivery" | "pickup",
  enabled: boolean,
) {
  if (enabled) return [...new Set([...methods, method])];
  return methods.filter((item) => item !== method);
}

function Status({ loading, error, notice }: { loading: boolean; error: string; notice: string }) {
  if (loading)
    return (
      <p className="rounded-md border border-border bg-surface/60 p-3 text-sm text-muted-foreground">
        Loading settings...
      </p>
    );
  if (error)
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  if (notice)
    return (
      <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
        {notice}
      </p>
    );
  return null;
}

function TextInput({
  label,
  value,
  onChange,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl";
}) {
  return (
    <label className="text-sm">
      <span className="mb-2 block text-muted-foreground">{label}</span>
      <input
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl";
}) {
  return (
    <label className="text-sm md:col-span-3">
      <span className="mb-2 block text-muted-foreground">{label}</span>
      <textarea
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-2 block text-muted-foreground">{label}</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="mb-2 block text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
      >
        {children}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
