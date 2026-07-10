import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { applyAdminBusinessAction, getAdminBusinessDetails } from "@/lib/whatsapp/admin-client";
import type {
  AdminBusinessDetails,
  AdminCatalogGroupInput,
} from "@/lib/whatsapp/admin-store.server";

export const Route = createFileRoute("/admin/businesses/$businessId/catalog-routes")({
  component: AdminCatalogRoutesPage,
});

type RouteForm = AdminCatalogGroupInput;

const emptyRouteForm: RouteForm = {
  nameEnglish: "",
  nameArabic: "",
  slug: "",
  isActive: true,
  sortOrder: 10,
};

function AdminCatalogRoutesPage() {
  const { businessId } = Route.useParams();
  const [details, setDetails] = useState<AdminBusinessDetails>();
  const [routeForm, setRouteForm] = useState<RouteForm>(emptyRouteForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDetails(await getAdminBusinessDetails(businessId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load catalog routes.");
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

  async function run(label: string, action: () => Promise<AdminBusinessDetails>) {
    setSaving(label);
    setError("");
    try {
      setDetails(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Catalog route action failed.");
    } finally {
      setSaving("");
    }
  }

  function editRoute(routeId: string) {
    const route = routes.find((entry) => entry.id === routeId);
    if (!route) return;
    setRouteForm({
      id: route.id,
      nameEnglish: route.name_english,
      nameArabic: route.name_arabic,
      slug: route.slug,
      isActive: route.is_active,
      sortOrder: route.sort_order,
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
          <h1 className="mt-2 font-display text-2xl font-semibold">Catalog routes</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Manage route definitions only. Examples: Brands, Offers, Occasions, Collections.
            Route values and product membership are managed on their own screens.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/admin/businesses/${businessId}/catalog-route-values`}
            className="studio-button-secondary"
          >
            Manage route values
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
          Loading routes...
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Routes</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  These can be selected in the flow builder as browse routes.
                </p>
              </div>
              <button
                type="button"
                className="studio-button-secondary px-3 py-1.5 text-xs"
                onClick={() => setRouteForm({ ...emptyRouteForm, sortOrder: routes.length + 1 })}
              >
                New route
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {routes.length ? (
                routes.map((route) => {
                  const routeValues =
                    details?.catalogGroupValues.filter((value) => value.group_id === route.id) ?? [];
                  const valueCount = routeValues.length;
                  const routeValueIds = new Set(routeValues.map((value) => value.id));
                  const productCount =
                    details?.productGroupValues.filter((entry) =>
                      routeValueIds.has(entry.group_value_id),
                    ).length ?? 0;
                  return (
                    <div key={route.id} className="rounded-md border border-border bg-background p-3">
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => editRoute(route.id)}
                      >
                        <span className="block text-sm font-medium">{route.name_english}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          slug: {route.slug} | {route.is_active ? "Active" : "Paused"}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {valueCount} value(s)
                        </span>
                      </button>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="studio-button-secondary px-3 py-1.5 text-xs"
                          onClick={() => editRoute(route.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="studio-button-secondary px-3 py-1.5 text-xs text-destructive"
                          disabled={productCount > 0 || saving === `delete-route-${route.id}`}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Delete ${route.name_english}? Unused values under this route will also be deleted.`,
                              )
                            ) {
                              return;
                            }
                            void run(`delete-route-${route.id}`, () =>
                              applyAdminBusinessAction(businessId, {
                                action: "delete_catalog_group",
                                groupId: route.id,
                              }),
                            );
                          }}
                        >
                          {saving === `delete-route-${route.id}` ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                      {productCount > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Remove this route from products before deleting it.
                        </p>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2">
                  No custom routes yet.
                </div>
              )}
            </div>
          </section>

          <RouteEditor
            form={routeForm}
            saving={saving === "route"}
            onChange={setRouteForm}
            onSave={() =>
              void run("route", async () => {
                const nextDetails = await applyAdminBusinessAction(businessId, {
                  action: "save_catalog_group",
                  group: routeForm,
                });
                setRouteForm(emptyRouteForm);
                return nextDetails;
              })
            }
          />
        </div>
      )}
    </div>
  );
}

function RouteEditor({
  form,
  saving,
  onChange,
  onSave,
}: {
  form: RouteForm;
  saving: boolean;
  onChange: (form: RouteForm) => void;
  onSave: () => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/60 p-4">
      <h2 className="font-display text-lg font-semibold">{form.id ? "Edit route" : "Create route"}</h2>
      <div className="mt-4 space-y-3">
        <Field
          label="Route label EN"
          value={form.nameEnglish}
          onChange={(value) => onChange({ ...form, nameEnglish: value })}
        />
        <Field
          label="Route label AR"
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
          disabled={saving || !form.nameEnglish.trim()}
          className="studio-button-primary w-full disabled:cursor-wait disabled:opacity-60"
          onClick={onSave}
        >
          {saving ? "Saving route..." : form.id ? "Save route" : "Create route"}
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
