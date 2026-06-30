import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { TEST_BUSINESS_ID } from "@/stores/store-bot/seed";
import { makeId } from "@/stores/store-bot/storage";
import type { Category } from "@/stores/store-bot/types";
import { useStoreBotState } from "@/stores/store-bot/use-store-bot-state";

export const Route = createFileRoute("/dashboard/categories")({
  component: CategoriesPage,
});

const emptyForm = { name: "", sortOrder: 10, isActive: true };

function CategoriesPage() {
  const { state, save } = useStoreBotState();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const categories = useMemo(
    () =>
      state.categories
        .filter((category) => category.businessId === TEST_BUSINESS_ID)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [state.categories],
  );

  function submit() {
    if (!form.name.trim()) return;

    const nextCategory: Category = {
      id: editingId || makeId("cat"),
      businessId: TEST_BUSINESS_ID,
      name: form.name.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };

    save({
      ...state,
      categories: editingId
        ? state.categories.map((category) => (category.id === editingId ? nextCategory : category))
        : [...state.categories, nextCategory],
    });
    setForm(emptyForm);
    setEditingId("");
  }

  function edit(category: Category) {
    setEditingId(category.id);
    setForm({ name: category.name, sortOrder: category.sortOrder, isActive: category.isActive });
  }

  function remove(categoryId: string) {
    save({
      ...state,
      categories: state.categories.filter((category) => category.id !== categoryId),
      products: state.products.map((product) =>
        product.categoryId === categoryId ? { ...product, isActive: false } : product,
      ),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Catalog</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Categories</h1>
      </div>

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_120px_150px_auto] md:items-end">
          <label className="text-sm">
            <span className="mb-2 block text-muted-foreground">Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
              placeholder="Category name"
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-muted-foreground">Sort</span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            Active
          </label>
          <button type="button" onClick={submit} className="studio-button-primary">
            {editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Save" : "Add"}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface/60">
        <div className="grid grid-cols-[1fr_90px_90px_92px] border-b border-border px-4 py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span>Name</span>
          <span>Sort</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {categories.map((category) => (
          <div
            key={category.id}
            className="grid grid-cols-[1fr_90px_90px_92px] items-center border-b border-border px-4 py-3 text-sm last:border-0"
          >
            <button
              type="button"
              onClick={() => edit(category)}
              className="text-left font-medium hover:text-primary"
            >
              {category.name}
            </button>
            <span className="text-muted-foreground">{category.sortOrder}</span>
            <span className={category.isActive ? "text-emerald-400" : "text-muted-foreground"}>
              {category.isActive ? "Active" : "Hidden"}
            </span>
            <button
              type="button"
              onClick={() => remove(category.id)}
              className="ml-auto rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-destructive"
              aria-label={`Delete ${category.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
