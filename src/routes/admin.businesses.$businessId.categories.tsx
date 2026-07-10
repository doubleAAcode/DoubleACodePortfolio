import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { applyAdminBusinessAction, getAdminBusinessDetails } from "@/lib/whatsapp/admin-client";
import type { AdminBusinessDetails, AdminCategoryInput } from "@/lib/whatsapp/admin-store.server";
import type { WaCategoryRow } from "@/lib/whatsapp/dashboard-store.server";

export const Route = createFileRoute("/admin/businesses/$businessId/categories")({
  component: AdminCategoriesPage,
});

const emptyCategory: AdminCategoryInput = {
  name_english: "",
  name_arabic: "",
  sort_order: 10,
  is_active: true,
};

function AdminCategoriesPage() {
  const { businessId } = Route.useParams();
  const [details, setDetails] = useState<AdminBusinessDetails>();
  const [form, setForm] = useState<AdminCategoryInput>(emptyCategory);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDetails(await getAdminBusinessDetails(businessId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load categories.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () =>
      [...(details?.catalogCategories ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order || a.name_english.localeCompare(b.name_english),
      ),
    [details?.catalogCategories],
  );

  async function run(label: string, action: () => Promise<AdminBusinessDetails>, success: string) {
    setSaving(label);
    setError("");
    setNotice("");
    try {
      setDetails(await action());
      setNotice(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Category action failed.");
    } finally {
      setSaving("");
    }
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

  async function submit() {
    if (!form.name_english.trim() || !form.name_arabic.trim()) {
      setError("Add category names in English and Arabic.");
      return;
    }
    await run(
      "category",
      () =>
        applyAdminBusinessAction(businessId, {
          action: "save_admin_category",
          category: form,
        }),
      "Category saved.",
    );
    setForm(emptyCategory);
  }

  async function remove(category: WaCategoryRow) {
    if (!window.confirm(`Delete ${category.name_english}? This only works when no products use it.`)) {
      return;
    }
    await run(
      `delete-${category.id}`,
      () =>
        applyAdminBusinessAction(businessId, {
          action: "delete_admin_category",
          categoryId: category.id,
        }),
      "Category deleted.",
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <a
            href={`/admin/businesses/${businessId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to business
          </a>
          <h1 className="mt-2 font-display text-2xl font-semibold">Product categories</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Admin-owned categories used by products. Routes and route values decide where products
            appear in WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/admin/businesses/${businessId}/products`} className="studio-button-secondary">
            Products
          </a>
          <button
            type="button"
            disabled={loading}
            className="studio-button-secondary disabled:cursor-wait disabled:opacity-60"
            onClick={() => void load()}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {notice}
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-surface/60 p-4">
        <h2 className="font-display text-lg font-semibold">
          {form.id ? "Edit category" : "Create category"}
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_120px_140px_auto] md:items-end">
          <TextField
            label="Name EN"
            value={form.name_english}
            onChange={(value) => setForm({ ...form, name_english: value })}
          />
          <TextField
            label="Name AR"
            value={form.name_arabic}
            dir="rtl"
            onChange={(value) => setForm({ ...form, name_arabic: value })}
          />
          <NumberField
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
            disabled={saving === "category"}
            className="studio-button-primary disabled:cursor-wait disabled:opacity-60"
            onClick={() => void submit()}
          >
            {form.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {saving === "category" ? "Saving..." : form.id ? "Save" : "Add"}
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
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading categories...
          </div>
        ) : categories.length ? (
          categories.map((category) => (
            <div
              key={category.id}
              className="grid grid-cols-[1fr_1fr_90px_90px_92px] items-center border-b border-border px-4 py-3 text-sm last:border-0"
            >
              <button
                type="button"
                className="text-left font-medium hover:text-primary"
                onClick={() => edit(category)}
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
                className="ml-auto rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-destructive"
                aria-label={`Delete ${category.name_english}`}
                onClick={() => void remove(category)}
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

function TextField({
  label,
  value,
  dir,
  onChange,
}: {
  label: string;
  value: string;
  dir?: "rtl";
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );
}
