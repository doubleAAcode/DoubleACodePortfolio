import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { applyAdminBusinessAction, getAdminBusinessDetails } from "@/lib/whatsapp/admin-client";
import type {
  AdminBusinessDetails,
  AdminCatalogGroupInput,
  AdminCatalogGroupValueInput,
} from "@/lib/whatsapp/admin-store.server";

export const Route = createFileRoute("/admin/businesses/$businessId/catalog-routes")({
  component: AdminCatalogRoutesPage,
});

type RouteForm = AdminCatalogGroupInput;
type ValueForm = AdminCatalogGroupValueInput;

const emptyRouteForm: RouteForm = {
  nameEnglish: "",
  nameArabic: "",
  slug: "",
  isActive: true,
  sortOrder: 10,
};

const emptyValueForm: ValueForm = {
  groupId: "",
  nameEnglish: "",
  nameArabic: "",
  slug: "",
  isActive: true,
  sortOrder: 10,
};

function AdminCatalogRoutesPage() {
  const { businessId } = Route.useParams();
  const [details, setDetails] = useState<AdminBusinessDetails>();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedValueId, setSelectedValueId] = useState("");
  const [routeForm, setRouteForm] = useState<RouteForm>(emptyRouteForm);
  const [valueForm, setValueForm] = useState<ValueForm>(emptyValueForm);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
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
      setError(err instanceof Error ? err.message : "Could not load catalog routes.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(
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
  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const selectedValue = values.find((value) => value.id === selectedValueId) ?? values[0];
  const products = useMemo(
    () =>
      [...(details?.catalogProducts ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order || a.name_english.localeCompare(b.name_english),
      ),
    [details?.catalogProducts],
  );
  const assignedProductIds = useMemo(() => {
    if (!selectedValue) return [];
    return (details?.productGroupValues ?? [])
      .filter((entry) => entry.group_value_id === selectedValue.id)
      .map((entry) => entry.product_id);
  }, [details?.productGroupValues, selectedValue]);

  useEffect(() => {
    if (!selectedGroupId && groups[0]) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    setValueForm({ ...emptyValueForm, groupId: selectedGroupId, sortOrder: values.length + 1 });
    setSelectedValueId((current) =>
      values.some((value) => value.id === current) ? current : values[0]?.id ?? "",
    );
  }, [selectedGroupId, values]);

  useEffect(() => {
    setSelectedProductIds(assignedProductIds);
  }, [assignedProductIds.join("|")]);

  async function run(label: string, action: () => Promise<AdminBusinessDetails>) {
    setSaving(label);
    setError("");
    try {
      const nextDetails = await action();
      setDetails(nextDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Catalog route action failed.");
    } finally {
      setSaving("");
    }
  }

  function editRoute(groupId: string) {
    const group = groups.find((entry) => entry.id === groupId);
    if (!group) return;
    setSelectedGroupId(group.id);
    setRouteForm({
      id: group.id,
      nameEnglish: group.name_english,
      nameArabic: group.name_arabic,
      slug: group.slug,
      isActive: group.is_active,
      sortOrder: group.sort_order,
    });
  }

  function editValue(valueId: string) {
    const value = values.find((entry) => entry.id === valueId);
    if (!value) return;
    setSelectedValueId(value.id);
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
          <h1 className="mt-2 font-display text-2xl font-semibold">Catalog route data</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Create scalable browse routes like Brands, Offers, Occasions, or Collections. The flow
            builder chooses which routes appear in WhatsApp; this page controls the route values and
            which products appear under each value.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/admin/businesses/${businessId}/flow-builder`} className="studio-button-secondary">
            Open Flow builder
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
          Loading catalog route data...
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Routes</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  These become top-level catalog choices after the customer taps order.
                </p>
              </div>
              <button
                type="button"
                className="studio-button-secondary px-3 py-1.5 text-xs"
                onClick={() => setRouteForm({ ...emptyRouteForm, sortOrder: groups.length + 1 })}
              >
                New
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {groups.length ? (
                groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className={`w-full rounded-md border p-3 text-left transition ${
                      group.id === selectedGroupId
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/60"
                    }`}
                    onClick={() => editRoute(group.id)}
                  >
                    <span className="block text-sm font-medium">{group.name_english}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      slug: {group.slug} | {group.is_active ? "Active" : "Paused"}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {details?.catalogGroupValues.filter((value) => value.group_id === group.id).length ?? 0} values
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No custom routes yet. Create Brands, Offers, or any browse route this business
                  needs.
                </div>
              )}
            </div>

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
                  const saved = nextDetails.catalogGroups.find(
                    (group) =>
                      group.id === routeForm.id ||
                      group.slug === normalizeSlug(routeForm.slug || routeForm.nameEnglish),
                  );
                  setSelectedGroupId(saved?.id ?? selectedGroupId);
                  setRouteForm(emptyRouteForm);
                  return nextDetails;
                })
              }
            />
          </section>

          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Values</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Values are the choices inside {selectedGroup?.name_english ?? "the selected route"}.
                </p>
              </div>
              <button
                type="button"
                disabled={!selectedGroupId}
                className="studio-button-secondary px-3 py-1.5 text-xs disabled:opacity-60"
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
            </div>

            {!selectedGroupId ? (
              <div className="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Select or create a route first.
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {values.length ? (
                    values.map((value) => (
                      <button
                        key={value.id}
                        type="button"
                        className={`rounded-md border p-3 text-left transition ${
                          value.id === selectedValue?.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:border-primary/60"
                        }`}
                        onClick={() => editValue(value.id)}
                      >
                        <span className="block text-sm font-medium">{value.name_english}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          slug: {value.slug} | {value.is_active ? "Active" : "Paused"}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {(details?.productGroupValues ?? []).filter(
                            (entry) => entry.group_value_id === value.id,
                          ).length} products
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground md:col-span-2">
                      No values for this route. Add items like Nike, New arrivals, Ramadan offers,
                      or Summer.
                    </div>
                  )}
                </div>

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
                      const saved = nextDetails.catalogGroupValues.find(
                        (value) =>
                          value.id === valueForm.id ||
                          (value.group_id === selectedGroupId &&
                            value.slug === normalizeSlug(valueForm.slug || valueForm.nameEnglish)),
                      );
                      setSelectedValueId(saved?.id ?? selectedValueId);
                      setValueForm({
                        ...emptyValueForm,
                        groupId: selectedGroupId,
                        sortOrder: values.length + 2,
                      });
                      return nextDetails;
                    })
                  }
                />
              </>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <h2 className="font-display text-lg font-semibold">Products in selected value</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A product can belong to multiple route values. Example: one necklace can be in
              Accessories, Double A brand, and New arrivals.
            </p>

            {!selectedValue ? (
              <div className="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Select a route value to assign products.
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-md border border-border bg-background p-3">
                  <div className="text-sm font-medium">{selectedValue.name_english}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {selectedProductIds.length} selected product(s)
                  </div>
                </div>
                <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {products.length ? (
                    products.map((product) => {
                      const checked = selectedProductIds.includes(product.id);
                      return (
                        <label
                          key={product.id}
                          className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 text-sm transition hover:border-primary/60"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setSelectedProductIds((current) =>
                                event.target.checked
                                  ? [...current, product.id]
                                  : current.filter((id) => id !== product.id),
                              )
                            }
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-medium">{product.name_english}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {product.code} | {product.is_active ? "Active" : "Inactive"} |{" "}
                              {product.is_available ? "Available" : "Unavailable"}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No products exist yet. Create products before assigning them to route values.
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={saving === "assignment"}
                  className="studio-button-primary mt-4 w-full disabled:cursor-wait disabled:opacity-60"
                  onClick={() =>
                    void run("assignment", () =>
                      applyAdminBusinessAction(businessId, {
                        action: "save_catalog_value_products",
                        assignment: {
                          groupValueId: selectedValue.id,
                          productIds: selectedProductIds,
                        },
                      }),
                    )
                  }
                >
                  {saving === "assignment" ? "Saving products..." : "Save product assignment"}
                </button>
              </>
            )}
          </section>
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
    <div className="mt-4 space-y-3 rounded-md border border-border bg-background p-3">
      <div className="text-sm font-medium">{form.id ? "Edit route" : "Create route"}</div>
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
    <div className="mt-4 space-y-3 rounded-md border border-border bg-background p-3">
      <div className="text-sm font-medium">{form.id ? "Edit value" : "Create value"}</div>
      <div className="grid gap-3 md:grid-cols-2">
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
      </div>
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
