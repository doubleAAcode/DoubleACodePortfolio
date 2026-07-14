import { createFileRoute } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useState } from "react";

import { createFlowTemplate } from "@/lib/whatsapp/admin-client";
import { createDefaultFlowDefinition, type FlowCategory } from "@/lib/whatsapp/flow-template-types";

export const Route = createFileRoute("/admin/flow-templates/new")({
  component: NewFlowTemplatePage,
});

const categories: FlowCategory[] = ["ECOMMERCE", "RESTAURANT", "GREETING_STORE_INFO"];

const categoryLabels: Partial<Record<FlowCategory, string>> = {
  ECOMMERCE: "E-commerce",
  RESTAURANT: "Restaurant",
  GREETING_STORE_INFO: "Greeting + Store Info",
};

function NewFlowTemplatePage() {
  const [category, setCategory] = useState<FlowCategory>("ECOMMERCE");
  const [json, setJson] = useState(JSON.stringify(createDefaultFlowDefinition("ECOMMERCE"), null, 2));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function changeCategory(next: FlowCategory) {
    setCategory(next);
    setJson(JSON.stringify(createDefaultFlowDefinition(next), null, 2));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const details = await createFlowTemplate({
        id: readOptional(form, "id"),
        name: read(form, "name"),
        description: readOptional(form, "description"),
        category,
        flowJson: JSON.parse(json),
        publish: form.get("publish") === "on",
      });
      window.location.href = `/admin/flow-templates/${details.template.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Flows</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            New flow template
          </h1>
        </div>
        <button type="submit" disabled={saving} className="studio-button-primary w-fit">
          {saving ? "Creating..." : "Create template"}
        </button>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Name" defaultValue="E-commerce" required />
          <Field name="id" label="ID" defaultValue="ecommerce-custom" />
          <label className="block text-sm">
            Category
            <select
              value={category}
              onChange={(event) => changeCategory(event.target.value as FlowCategory)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
            >
              {categories.map((entry) => (
                <option key={entry} value={entry}>
                  {categoryLabels[entry] ?? entry.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <Field name="description" label="Description" />
          <label className="flex items-center gap-3 pt-8 text-sm">
            <input name="publish" type="checkbox" className="h-4 w-4 accent-primary" />
            Publish first version after validation
          </label>
        </div>
      </section>
      <JsonEditor value={json} onChange={setJson} />
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function JsonEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <section className="rounded-lg border border-border bg-surface/60 p-5">
      <h2 className="font-display text-xl font-semibold">Flow JSON</h2>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="mt-4 min-h-[520px] w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-5"
      />
    </section>
  );
}

function read(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

function readOptional(form: FormData, key: string) {
  return read(form, key) || undefined;
}
