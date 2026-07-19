import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Loader2,
  PackageCheck,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBusinessDetails } from "@/features/connect/admin/businesses/business-details-context";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  applyAdminBusinessAction,
  type AdminBusinessDetailsResult,
} from "@/features/connect/shared/admin-client";
import type {
  WaCatalogGroupRow,
  WaCatalogGroupValueRow,
  WaProductRow,
} from "@/features/connect/shared/dashboard-store.server";

export const Route = createFileRoute("/connect/admin/businesses/$id/route-values")({
  component: RouteValuesPage,
});

type ValueFormState = {
  id?: string;
  groupId: string;
  nameEnglish: string;
  nameArabic: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
};

function RouteValuesPage() {
  const { id } = Route.useParams();
  const initialDetails = useBusinessDetails();
  const [details, setDetails] = useState<AdminBusinessDetailsResult | null>(initialDetails);
  const groups = useMemo(() => sortGroups(details?.catalogGroups ?? []), [details?.catalogGroups]);
  const [selectedGroupId, setSelectedGroupId] = useState(() => groups[0]?.id ?? "");
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ValueFormState>(() => emptyValueForm(""));
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [assignmentValueId, setAssignmentValueId] = useState("");
  const [assignmentProductIds, setAssignmentProductIds] = useState<string[]>([]);
  const [savingAction, setSavingAction] = useState("");
  const editorFormRef = useRef<HTMLFormElement | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "destructive"; message: string } | null>(
    null,
  );

  useEffect(() => {
    setDetails(initialDetails);
  }, [initialDetails]);

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupId("");
      return;
    }
    if (!selectedGroupId || !groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(groups[0]?.id ?? "");
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("newValue") !== "1") return;

    const groupId = url.searchParams.get("groupId") || selectedGroupId || groups[0]?.id || "";
    if (groupId) setSelectedGroupId(groupId);
    setForm(emptyValueForm(groupId, nextSortOrder(valuesForGroup(details, groupId))));
    setAssignmentValueId("");
    setDeleteTargetId("");
    setNotice(null);
    setEditorOpen(true);
    url.searchParams.delete("newValue");
    window.history.replaceState(null, "", url);
  }, [details, groups, selectedGroupId]);

  if (!details) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Live route values require a loaded business session.
        </CardContent>
      </Card>
    );
  }

  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const values = sortValues(
    details.catalogGroupValues.filter((value) => value.group_id === selectedGroupId),
  );
  const valueStats = getValueStats(details);
  const deleteTarget = values.find((value) => value.id === deleteTargetId);
  const assignmentValue = values.find((value) => value.id === assignmentValueId);
  const products = sortProducts(details.catalogProducts);
  const inactiveCount = values.filter((value) => !value.is_active).length;
  const unassignedCount = values.filter(
    (value) => (valueStats.get(value.id)?.productCount ?? 0) === 0,
  ).length;

  function openCreateEditor() {
    if (!selectedGroupId) {
      setNotice({ tone: "destructive", message: "Create a browse group before adding values." });
      return;
    }
    setForm(emptyValueForm(selectedGroupId, nextSortOrder(values)));
    setAssignmentValueId("");
    setDeleteTargetId("");
    setNotice(null);
    setEditorOpen(true);
  }

  function openEditEditor(value: WaCatalogGroupValueRow) {
    setForm({
      id: value.id,
      groupId: value.group_id,
      nameEnglish: value.name_english,
      nameArabic: value.name_arabic,
      slug: value.slug,
      isActive: value.is_active,
      sortOrder: value.sort_order,
    });
    setSelectedGroupId(value.group_id);
    setAssignmentValueId("");
    setDeleteTargetId("");
    setNotice(null);
    setEditorOpen(true);
  }

  function openAssignmentPanel(value: WaCatalogGroupValueRow) {
    setAssignmentValueId(value.id);
    setAssignmentProductIds(
      (details?.productGroupValues ?? [])
        .filter((link) => link.group_value_id === value.id)
        .map((link) => link.product_id),
    );
    setEditorOpen(false);
    setDeleteTargetId("");
    setNotice(null);
  }

  async function saveValue(nextForm = form) {
    if (!nextForm.groupId) {
      setNotice({ tone: "destructive", message: "Choose a browse group first." });
      return;
    }
    if (!nextForm.nameEnglish.trim()) {
      setNotice({ tone: "destructive", message: "English value name is required." });
      return;
    }

    setSavingAction(nextForm.id ? `save:${nextForm.id}` : "create");
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_catalog_group_value",
        value: {
          id: nextForm.id,
          groupId: nextForm.groupId,
          nameEnglish: nextForm.nameEnglish,
          nameArabic: nextForm.nameArabic,
          slug: nextForm.slug,
          isActive: nextForm.isActive,
          sortOrder: nextForm.sortOrder,
        },
      });
      setDetails(nextDetails);
      setSelectedGroupId(nextForm.groupId);
      setEditorOpen(false);
      setNotice({
        tone: "success",
        message: nextForm.id ? "Route value saved." : "Route value created.",
      });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not save this route value.",
      });
    } finally {
      setSavingAction("");
    }
  }

  async function saveQuickValue(
    value: WaCatalogGroupValueRow,
    patch: Partial<ValueFormState>,
    successMessage: string,
  ) {
    setSavingAction(`save:${value.id}`);
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_catalog_group_value",
        value: {
          ...toValueInput(value, value.sort_order),
          ...patch,
        },
      });
      setDetails(nextDetails);
      setNotice({ tone: "success", message: successMessage });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not update this route value.",
      });
    } finally {
      setSavingAction("");
    }
  }

  async function moveValue(value: WaCatalogGroupValueRow, direction: "up" | "down") {
    const currentIndex = values.findIndex((entry) => entry.id === value.id);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= values.length) return;
    const displaced = values[nextIndex];
    if (!displaced) return;

    setSavingAction(`move:${value.id}`);
    setNotice(null);
    try {
      await applyAdminBusinessAction(id, {
        action: "save_catalog_group_value",
        value: toValueInput(displaced, value.sort_order),
      });
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_catalog_group_value",
        value: toValueInput(value, displaced.sort_order),
      });
      setDetails(nextDetails);
      setNotice({ tone: "success", message: "Route value order saved." });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not reorder route values.",
      });
    } finally {
      setSavingAction("");
    }
  }

  async function saveAssignments() {
    if (!assignmentValue) return;

    setSavingAction(`assign:${assignmentValue.id}`);
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_catalog_value_products",
        assignment: {
          groupValueId: assignmentValue.id,
          productIds: assignmentProductIds,
        },
      });
      setDetails(nextDetails);
      setAssignmentValueId("");
      setNotice({ tone: "success", message: "Product assignments saved." });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not save product assignments.",
      });
    } finally {
      setSavingAction("");
    }
  }

  async function deleteValue(value: WaCatalogGroupValueRow) {
    setSavingAction(`delete:${value.id}`);
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "delete_catalog_group_value",
        valueId: value.id,
      });
      setDetails(nextDetails);
      setDeleteTargetId("");
      setNotice({ tone: "success", message: "Route value deleted." });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not delete this route value.",
      });
    } finally {
      setSavingAction("");
    }
  }

  return (
    <div className="space-y-4" data-business-route-values-live="true">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Route values</CardTitle>
              <CardDescription>
                Individual choices customers pick inside a browse group.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="route-value-group" className="text-xs">
                  Browse group
                </Label>
                <Select
                  value={selectedGroupId}
                  onValueChange={(nextGroupId) => {
                    setSelectedGroupId(nextGroupId);
                    setEditorOpen(false);
                    setDeleteTargetId("");
                    setAssignmentValueId("");
                  }}
                >
                  <SelectTrigger id="route-value-group" className="w-56">
                    <SelectValue placeholder="Choose group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name_english}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" onClick={openCreateEditor} disabled={!selectedGroupId}>
                <Plus className="h-4 w-4" />
                Add value
              </Button>
              <Button variant="outline" asChild>
                <Link to="/connect/admin/businesses/$id/catalog-routes" params={{ id }}>
                  Browse groups
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {notice ? (
            <div
              className={`rounded-md border p-3 text-sm ${
                notice.tone === "success"
                  ? "border-success/30 bg-success/5 text-success"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              }`}
            >
              {notice.message}
            </div>
          ) : null}

          {selectedGroup ? (
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>Selected: {selectedGroup.name_english}</span>
              <span>{values.length} values</span>
              <span>{inactiveCount} inactive</span>
              <span>{unassignedCount} without products</span>
            </div>
          ) : (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
              Create a browse group in Catalog Routes before adding route values.
            </div>
          )}

          {inactiveCount > 0 || unassignedCount > 0 ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
              {inactiveCount > 0 ? `${inactiveCount} inactive value(s). ` : ""}
              {unassignedCount > 0 ? `${unassignedCount} value(s) have no products assigned.` : ""}
            </div>
          ) : null}

          {values.length ? (
            <ul className="divide-y rounded-md border">
              {values.map((value, index) => {
                const stats = valueStats.get(value.id);
                const busy = savingAction.endsWith(value.id);
                return (
                  <li
                    key={value.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 p-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]"
                  >
                    <GripVertical className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{value.name_english}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          value: {value.slug}
                        </span>
                        {value.is_active ? (
                          <StatusBadge tone="success">Active</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">Inactive</StatusBadge>
                        )}
                        {(stats?.productCount ?? 0) === 0 ? (
                          <StatusBadge tone="warning">No products</StatusBadge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span dir="rtl">{value.name_arabic}</span>
                        <span>{stats?.productCount ?? 0} products linked</span>
                        <span>Sort {value.sort_order}</span>
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 lg:col-span-1">
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : null}
                      <Switch
                        checked={value.is_active}
                        aria-label={`Toggle ${value.name_english}`}
                        disabled={Boolean(savingAction)}
                        onCheckedChange={(checked) =>
                          void saveQuickValue(
                            value,
                            { isActive: checked },
                            checked ? "Route value activated." : "Route value deactivated.",
                          )
                        }
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Move ${value.name_english} up`}
                        disabled={Boolean(savingAction) || index === 0}
                        onClick={() => void moveValue(value, "up")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Move ${value.name_english} down`}
                        disabled={Boolean(savingAction) || index === values.length - 1}
                        onClick={() => void moveValue(value, "down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAssignmentPanel(value)}
                      >
                        <PackageCheck className="h-4 w-4" />
                        Products
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${value.name_english}`}
                        disabled={Boolean(savingAction)}
                        onClick={() => openEditEditor(value)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${value.name_english}`}
                        className="text-destructive"
                        disabled={Boolean(savingAction)}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          setEditorOpen(false);
                          setAssignmentValueId("");
                          setNotice(null);
                          setDeleteTargetId(value.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          setEditorOpen(false);
                          setAssignmentValueId("");
                          setNotice(null);
                          setDeleteTargetId(value.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="grid min-h-40 place-items-center rounded-md border border-dashed p-8 text-center">
              <div>
                <PackageCheck className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No values in this group</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add the choices customers should see for this browse group.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {assignmentValue ? (
        <Card data-testid="business-route-value-products">
          <CardHeader>
            <CardTitle>Product assignment</CardTitle>
            <CardDescription>
              Choose which products appear when customers select {assignmentValue.name_english}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {products.length ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
                  const checked = assignmentProductIds.includes(product.id);
                  return (
                    <label
                      key={product.id}
                      className="flex items-start gap-3 rounded-md border p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={(event) => {
                          setAssignmentProductIds((current) =>
                            event.target.checked
                              ? Array.from(new Set([...current, product.id]))
                              : current.filter((productId) => productId !== product.id),
                          );
                        }}
                      />
                      <span>
                        <span className="block font-medium">{product.name_english}</span>
                        <span className="block text-xs text-muted-foreground">
                          {product.code} / {formatPrice(product.price)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
                Create products before assigning this route value.
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAssignmentValueId("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="icon"
                aria-label={`Save products for ${assignmentValue.name_english}`}
                disabled={Boolean(savingAction)}
                onPointerDown={(event) => {
                  event.preventDefault();
                  void saveAssignments();
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  void saveAssignments();
                }}
              >
                {savingAction === `assign:${assignmentValue.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
              <span className="self-center text-sm font-medium">Save assignments</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {deleteTarget ? (
        <Card
          className="border-destructive/30 bg-destructive/5"
          data-testid="business-route-value-delete-confirm"
        >
          <CardHeader>
            <CardTitle>Delete route value?</CardTitle>
            <CardDescription>
              This will remove {deleteTarget.name_english}. The backend will block deletion while
              products are still assigned.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {(valueStats.get(deleteTarget.id)?.productCount ?? 0).toLocaleString()} products
                linked
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDeleteTargetId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  aria-label={`Confirm delete ${deleteTarget.name_english}`}
                  disabled={Boolean(savingAction)}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    void deleteValue(deleteTarget);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    void deleteValue(deleteTarget);
                  }}
                >
                  {savingAction === `delete:${deleteTarget.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-sm font-medium text-destructive">Delete route value</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {editorOpen ? (
        <Card data-testid="business-route-value-editor">
          <CardHeader>
            <CardTitle>{form.id ? "Edit route value" : "Create route value"}</CardTitle>
            <CardDescription>
              Values are the customer-facing choices under the selected browse group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              ref={editorFormRef}
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void saveValue(readValueForm(event.currentTarget, form));
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="route-value-name-en" className="text-xs">
                    Name (EN)
                  </Label>
                  <Input
                    id="route-value-name-en"
                    name="nameEnglish"
                    value={form.nameEnglish}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nameEnglish: event.target.value,
                        slug: current.slug || slugPreview(event.target.value),
                      }))
                    }
                    placeholder="Apple"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="route-value-name-ar" className="text-xs">
                    Name (AR)
                  </Label>
                  <Input
                    id="route-value-name-ar"
                    name="nameArabic"
                    dir="rtl"
                    value={form.nameArabic}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, nameArabic: event.target.value }))
                    }
                    placeholder="Arabic label"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <div className="space-y-1">
                  <Label htmlFor="route-value-slug" className="text-xs">
                    Technical key
                  </Label>
                  <Input
                    id="route-value-slug"
                    name="slug"
                    value={form.slug}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        slug: slugPreview(event.target.value),
                      }))
                    }
                    placeholder="apple"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="route-value-sort" className="text-xs">
                    Sort
                  </Label>
                  <Input
                    id="route-value-sort"
                    name="sortOrder"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sortOrder: Number.parseInt(event.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <label className="flex items-center justify-between rounded-md border p-3">
                <span>
                  <span className="block text-sm font-medium">Active for customers</span>
                  <span className="block text-xs text-muted-foreground">
                    Inactive values stay saved but are hidden from WhatsApp browse menus.
                  </span>
                </span>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, isActive: checked }))
                  }
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="icon"
                  aria-label="Save route value"
                  disabled={Boolean(savingAction)}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    if (!editorFormRef.current) return;
                    void saveValue(readValueForm(editorFormRef.current, form));
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    if (!editorFormRef.current) return;
                    void saveValue(readValueForm(editorFormRef.current, form));
                  }}
                >
                  {savingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {!savingAction ? <Save className="h-4 w-4" /> : null}
                </Button>
                <span className="self-center text-sm font-medium">Save route value</span>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function valuesForGroup(details: AdminBusinessDetailsResult | null, groupId: string) {
  return sortValues(
    (details?.catalogGroupValues ?? []).filter((value) => value.group_id === groupId),
  );
}

function getValueStats(details: AdminBusinessDetailsResult) {
  const stats = new Map<string, { productCount: number }>();
  for (const value of details.catalogGroupValues) {
    stats.set(value.id, { productCount: 0 });
  }
  for (const link of details.productGroupValues) {
    const entry = stats.get(link.group_value_id);
    if (entry) entry.productCount += 1;
  }
  return stats;
}

function emptyValueForm(groupId: string, sortOrder = 0): ValueFormState {
  return {
    groupId,
    nameEnglish: "",
    nameArabic: "",
    slug: "",
    isActive: true,
    sortOrder,
  };
}

function nextSortOrder(values: WaCatalogGroupValueRow[]) {
  const lastSortOrder = values.reduce((max, value) => Math.max(max, value.sort_order), -10);
  return lastSortOrder + 10;
}

function toValueInput(value: WaCatalogGroupValueRow, sortOrder: number) {
  return {
    id: value.id,
    groupId: value.group_id,
    nameEnglish: value.name_english,
    nameArabic: value.name_arabic,
    slug: value.slug,
    isActive: value.is_active,
    sortOrder,
  };
}

function readValueForm(formElement: HTMLFormElement, current: ValueFormState): ValueFormState {
  const submitted = new FormData(formElement);
  return {
    ...current,
    nameEnglish: String(submitted.get("nameEnglish") ?? ""),
    nameArabic: String(submitted.get("nameArabic") ?? ""),
    slug: slugPreview(String(submitted.get("slug") ?? "")),
    sortOrder: Number.parseInt(String(submitted.get("sortOrder") ?? ""), 10) || 0,
  };
}

function sortGroups(groups: WaCatalogGroupRow[]) {
  return [...groups].sort(
    (left, right) =>
      left.sort_order - right.sort_order || left.name_english.localeCompare(right.name_english),
  );
}

function sortValues(values: WaCatalogGroupValueRow[]) {
  return [...values].sort(
    (left, right) =>
      left.sort_order - right.sort_order || left.name_english.localeCompare(right.name_english),
  );
}

function sortProducts(products: WaProductRow[]) {
  return [...products].sort(
    (left, right) =>
      left.sort_order - right.sort_order || left.name_english.localeCompare(right.name_english),
  );
}

function slugPreview(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPrice(value: number | string) {
  const price = Number(value);
  return Number.isFinite(price) ? price.toFixed(2) : String(value);
}
