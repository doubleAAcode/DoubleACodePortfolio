import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useWaDashboardData } from "@/lib/whatsapp/use-wa-dashboard-data";
import type { WaCategoryRow } from "@/lib/whatsapp/dashboard-store.server";

export const Route = createFileRoute("/dashboard/categories")({
  component: CategoriesPage,
});

const emptyForm = { id: "", name_english: "", name_arabic: "", sort_order: 10, is_active: true };

export function CategoriesPage() {
  const { data, loading, saving, error, notice, applyAction } = useWaDashboardData();
  const [form, setForm] = useState(emptyForm);

  const categories = useMemo(
    () =>
      [...(data?.categories ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order || a.name_english.localeCompare(b.name_english),
      ),
    [data?.categories],
  );

  async function submit() {
    await applyAction(
      {
        type: "saveCategory",
        payload: {
          id: form.id || undefined,
          name_english: form.name_english,
          name_arabic: form.name_arabic,
          sort_order: form.sort_order,
          is_active: form.is_active,
        },
      },
      "Category saved.",
    );
    setForm(emptyForm);
  }

  async function remove(category: WaCategoryRow) {
    if (
      !window.confirm(`Delete ${category.name_english}? This only works when no products use it.`)
    )
      return;
    await applyAction(
      { type: "deleteCategory", payload: { id: category.id } },
      "Category deleted.",
    );
  }

  function edit(category: WaCategoryRow) {
    setForm({
      id: category.id,
      name_english: category.name_english,
      name_arabic: category.name_arabic,
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Catalog</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Categories</h1>
      </div>

      <Status loading={loading} error={error} notice={notice} />

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px_150px_auto] md:items-end">
          <TextInput
            label="English name"
            value={form.name_english}
            onChange={(value) => setForm({ ...form, name_english: value })}
          />
          <TextInput
            label="Arabic name"
            value={form.name_arabic}
            dir="rtl"
            onChange={(value) => setForm({ ...form, name_arabic: value })}
          />
          <NumberInput
            label="Sort"
            value={form.sort_order}
            onChange={(value) => setForm({ ...form, sort_order: value })}
          />
          <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
            Active
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="studio-button-primary"
          >
            {form.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {form.id ? "Save" : "Add"}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface/60">
        <div className="grid grid-cols-[1fr_1fr_90px_90px_92px] border-b border-border px-4 py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span>English</span>
          <span>Arabic</span>
          <span>Sort</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {categories.length ? (
          categories.map((category) => (
            <div
              key={category.id}
              className="grid grid-cols-[1fr_1fr_90px_90px_92px] items-center border-b border-border px-4 py-3 text-sm last:border-0"
            >
              <button
                type="button"
                onClick={() => edit(category)}
                className="text-left font-medium hover:text-primary"
              >
                {category.name_english || "-"}
              </button>
              <span className="text-muted-foreground" dir="rtl">
                {category.name_arabic || "-"}
              </span>
              <span className="text-muted-foreground">{category.sort_order}</span>
              <span className={category.is_active ? "text-emerald-400" : "text-muted-foreground"}>
                {category.is_active ? "Active" : "Hidden"}
              </span>
              <button
                type="button"
                onClick={() => void remove(category)}
                className="ml-auto rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-destructive"
                aria-label={`Delete ${category.name_english}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No categories yet.
          </div>
        )}
      </section>
    </div>
  );
}

function Status({ loading, error, notice }: { loading: boolean; error: string; notice: string }) {
  if (loading)
    return (
      <p className="rounded-md border border-border bg-surface/60 p-3 text-sm text-muted-foreground">
        Loading categories...
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
