import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useWaDashboardData } from "@/lib/whatsapp/use-wa-dashboard-data";
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

export function SettingsPage() {
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
  }, [data]);

  async function saveBusiness() {
    await applyAction({ type: "saveBusiness", payload: businessForm }, "Store settings saved.");
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
