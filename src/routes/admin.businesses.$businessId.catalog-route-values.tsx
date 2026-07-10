import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { applyAdminBusinessAction, getAdminBusinessDetails } from "@/lib/whatsapp/admin-client";
import type {
  AdminBusinessDetails,
  AdminCatalogGroupValueInput,
} from "@/lib/whatsapp/admin-store.server";

export const Route = createFileRoute("/admin/businesses/$businessId/catalog-route-values")({
  component: AdminCatalogRouteValuesPage,
});

type ValueForm = AdminCatalogGroupValueInput;

const emptyValueForm: ValueForm = {
  groupId: "",
  nameEnglish: "",
  nameArabic: "",
  slug: "",
  isActive: true,
  sortOrder: 10,
};

function AdminCatalogRouteValuesPage() {
  const { businessId } = Route.useParams();
  const [details, setDetails] = useState<AdminBusinessDetails>();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [valueForm, setValueForm] = useState<ValueForm>(emptyValueForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextDetails = await getAdminBusinessDetails(businessId);
      setDetails(nextDetails);
      const firstGroupId = nextDetails.catalogGroups[0]?.id ?? "";
      setSelectedGroupId((current) =>
        nextDetails.catalogGroups.some((group) => group.id === current) ? current : firstGroupId,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load route values.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const routes = useMemo(
    () => [...(details?.catalogGroups ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [details?.catalogGroups],
  );
  const values = useMemo(
    () =>
      [...(details?.catalogGroupValues ?? [])]
        .filter((value) => value.group_id === selectedGroupId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [details?.catalogGroupValues, selectedGroupId],
  );
  const selectedRoute = routes.find((route) => route.id === selectedGroupId);
  const selectedRouteValueIds = useMemo(
    () => new Set(values.map((value) => value.id)),
    [values],
  );
  const selectedRouteProductCount = useMemo(
    () =>
      details?.productGroupValues.filter((entry) => selectedRouteValueIds.has(entry.group_value_id))
        .length ?? 0,
    [details?.productGroupValues, selectedRouteValueIds],
  );

  useEffect(() => {
    setValueForm({ ...emptyValueForm, groupId: selectedGroupId, sortOrder: values.length + 1 });
  }, [selectedGroupId, values.length]);

  async function run(label: string, action: () => Promise<AdminBusinessDetails>) {
    setSaving(label);
    setError("");
    try {
      setDetails(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Route value action failed.");
    } finally {
      setSaving("");
    }
  }

  function editValue(valueId: string) {
    const value = values.find((entry) => entry.id === valueId);
    if (!value) return;
    setValueForm({
      id: value.id,
      groupId: value.group_id,
      nameEnglish: value.name_english,
      nameArabic: value.name_arabic,
      slug: value.slug,
      isActive: value.is_active,
      sortOrder: value.sort_order,
    });
  }

  const busy = loading || Boolean(saving);

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
          <h1 className="mt-2 font-display text-2xl font-semibold">Route values</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Manage values under each route. Products choose from these values on the admin products
            screen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/admin/businesses/${businessId}/catalog-routes`} className="studio-button-secondary">
            Manage routes
          </a>
          <a href={`/admin/businesses/${businessId}/products`} className="studio-button-secondary">
            Manage products
          </a>
          <button
            type="button"
            disabled={busy}
            className="studio-button-secondary disabled:cursor-wait disabled:opacity-60"
            onClick={() => void load()}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-md border border-border bg-surface/60 p-5 text-sm text-muted-foreground">
          Loading route values...
        </div>
      ) : !routes.length ? (
        <div className="rounded-md border border-border bg-surface/60 p-5 text-sm text-muted-foreground">
          Create a catalog route before adding route values.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <h2 className="font-display text-lg font-semibold">Routes</h2>
            <div className="mt-4 space-y-2">
              {routes.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className={`w-full rounded-md border p-3 text-left text-sm transition ${
                    route.id === selectedGroupId
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/60"
                  }`}
                  onClick={() => setSelectedGroupId(route.id)}
                >
                  <span className="block font-medium">{route.name_english}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{route.slug}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  {selectedRoute?.name_english ?? "Route"} values
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  These labels are selectable for products.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="studio-button-secondary px-3 py-1.5 text-xs"
                  onClick={() =>
                    setValueForm({
                      ...emptyValueForm,
                      groupId: selectedGroupId,
                      sortOrder: values.length + 1,
                    })
                  }
                >
                  New value
                </button>
                <button
                  type="button"
                  disabled={
                    !selectedRoute ||
                    selectedRouteProductCount > 0 ||
                    saving === `delete-route-${selectedGroupId}`
                  }
                  className="studio-button-secondary px-3 py-1.5 text-xs text-destructive disabled:opacity-50"
                  onClick={() => {
                    if (!selectedRoute) return;
                    if (
                      !window.confirm(
                        `Delete ${selectedRoute.name_english}? Unused values under this route will also be deleted.`,
                      )
                    ) {
                      return;
                    }
                    void run(`delete-route-${selectedRoute.id}`, async () => {
                      const nextDetails = await applyAdminBusinessAction(businessId, {
                        action: "delete_catalog_group",
                        groupId: selectedRoute.id,
                      });
                      const nextGroupId = nextDetails.catalogGroups[0]?.id ?? "";
                      setSelectedGroupId(nextGroupId);
                      return nextDetails;
                    });
                  }}
                >
                  {saving === `delete-route-${selectedGroupId}` ? "Deleting..." : "Delete route"}
                </button>
              </div>
            </div>
            {selectedRouteProductCount > 0 ? (
              <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-100">
                This route is used by {selectedRouteProductCount} product assignment(s). Remove
                those assignments before deleting the route.
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {values.length ? (
                values.map((value) => {
                  const productCount =
                    details?.productGroupValues.filter(
                      (entry) => entry.group_value_id === value.id,
                    ).length ?? 0;
                  return (
                    <div key={value.id} className="rounded-md border border-border bg-background p-3">
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => editValue(value.id)}
                      >
                        <span className="block text-sm font-medium">{value.name_english}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          slug: {value.slug} | {value.is_active ? "Active" : "Paused"}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {productCount} product(s)
                        </span>
                      </button>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="studio-button-secondary px-3 py-1.5 text-xs"
                          onClick={() => editValue(value.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={productCount > 0 || saving === `delete-value-${value.id}`}
                          className="studio-button-secondary px-3 py-1.5 text-xs text-destructive disabled:opacity-50"
                          onClick={() =>
                            void run(`delete-value-${value.id}`, () =>
                              applyAdminBusinessAction(businessId, {
                                action: "delete_catalog_group_value",
                                valueId: value.id,
                              }),
                            )
                          }
                        >
                          {saving === `delete-value-${value.id}` ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                      {productCount > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Remove this value from products before deleting it.
                        </p>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2">
                  No values for this route yet.
                </div>
              )}
            </div>
          </section>

          <ValueEditor
            form={{ ...valueForm, groupId: selectedGroupId }}
            saving={saving === "value"}
            onChange={setValueForm}
            onSave={() =>
              void run("value", async () => {
                const nextDetails = await applyAdminBusinessAction(businessId, {
                  action: "save_catalog_group_value",
                  value: { ...valueForm, groupId: selectedGroupId },
                });
                setValueForm({
                  ...emptyValueForm,
                  groupId: selectedGroupId,
                  sortOrder: values.length + 2,
                });
                return nextDetails;
              })
            }
          />
        </div>
      )}
    </div>
  );
}

function ValueEditor({
  form,
  saving,
  onChange,
  onSave,
}: {
  form: ValueForm;
  saving: boolean;
  onChange: (form: ValueForm) => void;
  onSave: () => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/60 p-4">
      <h2 className="font-display text-lg font-semibold">{form.id ? "Edit value" : "Create value"}</h2>
      <div className="mt-4 space-y-3">
        <Field
          label="Value label EN"
          value={form.nameEnglish}
          onChange={(value) => onChange({ ...form, nameEnglish: value })}
        />
        <Field
          label="Value label AR"
          value={form.nameArabic}
          dir="rtl"
          onChange={(value) => onChange({ ...form, nameArabic: value })}
        />
        <Field
          label="Slug"
          value={form.slug ?? ""}
          onChange={(value) => onChange({ ...form, slug: normalizeSlug(value) })}
        />
        <NumberField
          label="Sort order"
          value={form.sortOrder}
          onChange={(value) => onChange({ ...form, sortOrder: value })}
        />
        <Toggle
          label="Active"
          checked={form.isActive}
          onChange={(checked) => onChange({ ...form, isActive: checked })}
        />
        <button
          type="button"
          disabled={saving || !form.groupId || !form.nameEnglish.trim()}
          className="studio-button-primary w-full disabled:cursor-wait disabled:opacity-60"
          onClick={onSave}
        >
          {saving ? "Saving value..." : form.id ? "Save value" : "Create value"}
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  dir,
  onChange,
}: {
  label: string;
  value: string;
  dir?: "rtl" | "ltr";
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
