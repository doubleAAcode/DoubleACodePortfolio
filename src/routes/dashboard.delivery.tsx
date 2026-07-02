import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useWaDashboardData } from "@/lib/whatsapp/use-wa-dashboard-data";
import type { WaDeliveryAreaRow, WaPickupLocationRow } from "@/lib/whatsapp/dashboard-store.server";

export const Route = createFileRoute("/dashboard/delivery")({
  component: DeliveryPage,
});

const emptyArea = {
  id: "",
  name_english: "",
  name_arabic: "",
  delivery_fee: 0,
  is_active: true,
  sort_order: 10,
};
const emptyPickup = {
  id: "",
  name_english: "",
  name_arabic: "",
  address_english: "",
  address_arabic: "",
  is_active: true,
  sort_order: 10,
};

function DeliveryPage() {
  const { data, loading, saving, error, notice, applyAction } = useWaDashboardData();
  const [areaForm, setAreaForm] = useState(emptyArea);
  const [pickupForm, setPickupForm] = useState(emptyPickup);

  async function saveArea() {
    await applyAction(
      { type: "saveDeliveryArea", payload: { ...areaForm, id: areaForm.id || undefined } },
      "Delivery area saved.",
    );
    setAreaForm(emptyArea);
  }

  async function savePickup() {
    await applyAction(
      { type: "savePickupLocation", payload: { ...pickupForm, id: pickupForm.id || undefined } },
      "Pickup location saved.",
    );
    setPickupForm(emptyPickup);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Checkout</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Delivery and Pickup</h1>
      </div>

      <Status loading={loading} error={error} notice={notice} />

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title={areaForm.id ? "Edit delivery area" : "Add delivery area"}>
          <div className="grid gap-3 md:grid-cols-2">
            <TextInput
              label="English name"
              value={areaForm.name_english}
              onChange={(value) => setAreaForm({ ...areaForm, name_english: value })}
            />
            <TextInput
              label="Arabic name"
              dir="rtl"
              value={areaForm.name_arabic}
              onChange={(value) => setAreaForm({ ...areaForm, name_arabic: value })}
            />
            <NumberInput
              label="Delivery fee"
              value={Number(areaForm.delivery_fee)}
              onChange={(value) => setAreaForm({ ...areaForm, delivery_fee: value })}
            />
            <NumberInput
              label="Sort"
              value={areaForm.sort_order}
              onChange={(value) => setAreaForm({ ...areaForm, sort_order: value })}
            />
            <Toggle
              label="Active"
              checked={areaForm.is_active}
              onChange={(value) => setAreaForm({ ...areaForm, is_active: value })}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveArea()}
              className="studio-button-primary"
            >
              {areaForm.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Save area
            </button>
          </div>
          <RecordList
            items={data?.deliveryAreas ?? []}
            primary={(area) => area.name_english}
            secondary={(area) =>
              `$${Number(area.delivery_fee).toFixed(2)} · ${area.is_active ? "Active" : "Hidden"}`
            }
            onEdit={(area) => setAreaForm({ ...area, delivery_fee: Number(area.delivery_fee) })}
            onDelete={(area) => {
              if (window.confirm(`Delete ${area.name_english}?`))
                void applyAction(
                  { type: "deleteDeliveryArea", payload: { id: area.id } },
                  "Delivery area deleted.",
                );
            }}
          />
        </Panel>

        <Panel title={pickupForm.id ? "Edit pickup location" : "Add pickup location"}>
          <div className="grid gap-3 md:grid-cols-2">
            <TextInput
              label="English name"
              value={pickupForm.name_english}
              onChange={(value) => setPickupForm({ ...pickupForm, name_english: value })}
            />
            <TextInput
              label="Arabic name"
              dir="rtl"
              value={pickupForm.name_arabic}
              onChange={(value) => setPickupForm({ ...pickupForm, name_arabic: value })}
            />
            <TextInput
              label="English address"
              value={pickupForm.address_english}
              onChange={(value) => setPickupForm({ ...pickupForm, address_english: value })}
            />
            <TextInput
              label="Arabic address"
              dir="rtl"
              value={pickupForm.address_arabic}
              onChange={(value) => setPickupForm({ ...pickupForm, address_arabic: value })}
            />
            <NumberInput
              label="Sort"
              value={pickupForm.sort_order}
              onChange={(value) => setPickupForm({ ...pickupForm, sort_order: value })}
            />
            <Toggle
              label="Active"
              checked={pickupForm.is_active}
              onChange={(value) => setPickupForm({ ...pickupForm, is_active: value })}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void savePickup()}
              className="studio-button-primary md:col-span-2"
            >
              {pickupForm.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Save pickup location
            </button>
          </div>
          <RecordList
            items={data?.pickupLocations ?? []}
            primary={(location) => location.name_english}
            secondary={(location) =>
              `${location.address_english} · ${location.is_active ? "Active" : "Hidden"}`
            }
            onEdit={(location) => setPickupForm(location)}
            onDelete={(location) => {
              if (window.confirm(`Delete ${location.name_english}?`))
                void applyAction(
                  { type: "deletePickupLocation", payload: { id: location.id } },
                  "Pickup location deleted.",
                );
            }}
          />
        </Panel>
      </section>
    </div>
  );
}

function RecordList<T extends WaDeliveryAreaRow | WaPickupLocationRow>({
  items,
  primary,
  secondary,
  onEdit,
  onDelete,
}: {
  items: T[];
  primary: (item: T) => string;
  secondary: (item: T) => string;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}) {
  if (!items.length) return <p className="mt-4 text-sm text-muted-foreground">No records yet.</p>;
  return (
    <div className="mt-4 space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
        >
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="min-w-0 text-left hover:text-primary"
          >
            <div className="font-medium">{primary(item)}</div>
            <div className="truncate text-xs text-muted-foreground">{secondary(item)}</div>
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="rounded-md p-2 text-muted-foreground hover:text-destructive"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface/60 p-5">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Status({ loading, error, notice }: { loading: boolean; error: string; notice: string }) {
  if (loading)
    return (
      <p className="rounded-md border border-border bg-surface/60 p-3 text-sm text-muted-foreground">
        Loading delivery settings...
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
