import { createFileRoute } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useState } from "react";

import { createAdminBusiness } from "@/lib/whatsapp/admin-client";
import type {
  AdminBusinessStatus,
  AdminBusinessTemplate,
  CreateAdminBusinessInput,
} from "@/lib/whatsapp/admin-store.server";

export const Route = createFileRoute("/admin/businesses/new")({
  component: NewAdminBusinessPage,
});

const statuses: AdminBusinessStatus[] = [
  "DRAFT",
  "SETUP_INCOMPLETE",
  "ACTIVE",
  "PAUSED",
  "SUSPENDED",
  "ERROR",
];

const templates: AdminBusinessTemplate[] = [
  "standard_online_store",
  "jewelry_store",
  "clothing_store",
  "accessories_store",
  "custom_products",
];

function NewAdminBusinessPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const input: CreateAdminBusinessInput = {
      name: read(form, "name"),
      legalName: readOptional(form, "legalName"),
      ownerEmail: read(form, "ownerEmail"),
      defaultLanguage: read(form, "defaultLanguage") === "ar" ? "ar" : "en",
      currency: read(form, "currency") || "USD",
      timezone: read(form, "timezone") || "Asia/Beirut",
      country: read(form, "country") || "LB",
      status: read(form, "status") as AdminBusinessStatus,
      templateType: read(form, "templateType") as AdminBusinessTemplate,
      seedDefaults: form.get("seedDefaults") === "on",
      connection: {
        provider: "META_CLOUD_API",
        connectionName: readOptional(form, "connectionName"),
        businessAccountId: readOptional(form, "businessAccountId"),
        phoneNumberId: readOptional(form, "phoneNumberId"),
        displayPhoneNumber: readOptional(form, "displayPhoneNumber"),
        appId: readOptional(form, "appId"),
        status: read(form, "connectionStatus") as
          | "DRAFT"
          | "ACTIVE"
          | "PAUSED"
          | "DISCONNECTED"
          | "ERROR",
        webhookPath: read(form, "webhookPath") || "/api/whatsapp/webhook",
        accessTokenRef: readOptional(form, "accessTokenRef"),
        appSecretRef: readOptional(form, "appSecretRef"),
        verifyTokenRef: readOptional(form, "verifyTokenRef"),
        configSuffix: readOptional(form, "configSuffix"),
      },
    };

    try {
      const created = await createAdminBusiness(input);
      window.location.href = `/admin/businesses/${created.business.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create business.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Manual onboarding
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">New business</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create the tenant, invite the owner, and register WhatsApp Cloud API metadata.
          </p>
        </div>
        <button type="submit" disabled={saving} className="studio-button-primary w-fit">
          {saving ? "Creating..." : "Create business"}
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-display text-xl font-semibold">Business</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field name="name" label="Business name" required />
          <Field name="legalName" label="Legal name" />
          <Field name="ownerEmail" label="Owner email" type="email" required />
          <Field name="currency" label="Currency" defaultValue="USD" required />
          <Select name="defaultLanguage" label="Default language" values={["en", "ar"]} />
          <Field name="timezone" label="Timezone" defaultValue="Asia/Beirut" />
          <Field name="country" label="Country" defaultValue="LB" />
          <Select
            name="status"
            label="Initial status"
            values={statuses}
            defaultValue="SETUP_INCOMPLETE"
          />
          <Select
            name="templateType"
            label="Template"
            values={templates}
            defaultValue="standard_online_store"
          />
          <label className="flex items-center gap-3 pt-8 text-sm">
            <input
              name="seedDefaults"
              type="checkbox"
              className="h-4 w-4 accent-primary"
              defaultChecked
            />
            Seed default catalog and checkout records
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-display text-xl font-semibold">WhatsApp connection</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Store environment or vault reference names only for token and secret fields.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            name="connectionName"
            label="Connection name"
            defaultValue="Primary WhatsApp number"
          />
          <Field name="businessAccountId" label="Business account ID" />
          <Field name="phoneNumberId" label="Phone number ID" />
          <Field name="displayPhoneNumber" label="Display phone number" />
          <Field name="appId" label="Meta app ID" />
          <Select
            name="connectionStatus"
            label="Connection status"
            values={["DRAFT", "ACTIVE", "PAUSED", "DISCONNECTED", "ERROR"]}
          />
          <Field name="webhookPath" label="Webhook path" defaultValue="/api/whatsapp/webhook" />
          <Field name="configSuffix" label="Legacy config suffix" />
          <Field name="accessTokenRef" label="Access token reference" />
          <Field name="appSecretRef" label="App secret reference" />
          <Field name="verifyTokenRef" label="Verify token reference" />
        </div>
      </section>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function Select({
  name,
  label,
  values,
  defaultValue,
}: {
  name: string;
  label: string;
  values: readonly string[];
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      <select
        name={name}
        defaultValue={defaultValue || values[0]}
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {value.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function read(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

function readOptional(form: FormData, key: string) {
  return read(form, key) || undefined;
}
