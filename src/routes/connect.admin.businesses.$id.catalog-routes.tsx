import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Route as RouteIcon,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBusinessDetails } from "@/features/connect/admin/businesses/business-details-context";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  applyAdminBusinessAction,
  type AdminBusinessDetailsResult,
} from "@/features/connect/shared/admin-client";
import type { WaCatalogGroupRow } from "@/features/connect/shared/dashboard-store.server";

export const Route = createFileRoute("/connect/admin/businesses/$id/catalog-routes")({
  component: CatalogRoutesPage,
});

type RouteFormState = {
  id?: string;
  nameEnglish: string;
  nameArabic: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
};

function CatalogRoutesPage() {
  const { id } = Route.useParams();
  const initialDetails = useBusinessDetails();
  const [details, setDetails] = useState<AdminBusinessDetailsResult | null>(initialDetails);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RouteFormState>(() => emptyRouteForm(0));
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [savingAction, setSavingAction] = useState("");
  const editorFormRef = useRef<HTMLFormElement | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "destructive"; message: string } | null>(
    null,
  );

  useEffect(() => {
    setDetails(initialDetails);
  }, [initialDetails]);

  const groups = useMemo(
    () =>
      [...(details?.catalogGroups ?? [])].sort(
        (left, right) =>
          left.sort_order - right.sort_order || left.name_english.localeCompare(right.name_english),
      ),
    [details?.catalogGroups],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("newRoute") !== "1") return;

    setForm(emptyRouteForm(nextSortOrder(groups)));
    setNotice(null);
    setDialogOpen(true);
    url.searchParams.delete("newRoute");
    window.history.replaceState(null, "", url);
  }, [groups]);

  if (!details) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Live catalog routes require a loaded business session.
        </CardContent>
      </Card>
    );
  }

  const routeStats = getRouteStats(details);
  const deleteTarget = groups.find((group) => group.id === deleteTargetId);

  function openCreateDialog() {
    setForm(emptyRouteForm(nextSortOrder(groups)));
    setDeleteTargetId("");
    setNotice(null);
    setDialogOpen(true);
  }

  function openEditDialog(group: WaCatalogGroupRow) {
    setDeleteTargetId("");
    setForm({
      id: group.id,
      nameEnglish: group.name_english,
      nameArabic: group.name_arabic,
      slug: group.slug,
      isActive: group.is_active,
      sortOrder: group.sort_order,
    });
    setNotice(null);
    setDialogOpen(true);
  }

  async function saveRoute(nextForm = form) {
    if (!nextForm.nameEnglish.trim()) {
      setNotice({ tone: "destructive", message: "English route name is required." });
      return;
    }

    setSavingAction(nextForm.id ? `save:${nextForm.id}` : "create");
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_catalog_group",
        group: {
          id: nextForm.id,
          nameEnglish: nextForm.nameEnglish,
          nameArabic: nextForm.nameArabic,
          slug: nextForm.slug,
          isActive: nextForm.isActive,
          sortOrder: nextForm.sortOrder,
        },
      });
      setDetails(nextDetails);
      setDialogOpen(false);
      setNotice({
        tone: "success",
        message: nextForm.id ? "Browse group saved." : "Browse group created.",
      });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not save this browse group.",
      });
    } finally {
      setSavingAction("");
    }
  }

  async function toggleRoute(group: WaCatalogGroupRow, checked: boolean) {
    await saveQuickRoute(
      group,
      { isActive: checked },
      checked ? "Browse group activated." : "Browse group deactivated.",
    );
  }

  async function moveRoute(group: WaCatalogGroupRow, direction: "up" | "down") {
    const currentIndex = groups.findIndex((entry) => entry.id === group.id);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= groups.length) return;
    const displaced = groups[nextIndex];
    if (!displaced) return;

    setSavingAction(`move:${group.id}`);
    setNotice(null);
    try {
      await applyAdminBusinessAction(id, {
        action: "save_catalog_group",
        group: toGroupInput(displaced, group.sort_order),
      });
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_catalog_group",
        group: toGroupInput(group, displaced.sort_order),
      });
      setDetails(nextDetails);
      setNotice({ tone: "success", message: "Browse group order saved." });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not reorder browse groups.",
      });
    } finally {
      setSavingAction("");
    }
  }

  async function deleteRoute(group: WaCatalogGroupRow) {
    setSavingAction(`delete:${group.id}`);
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "delete_catalog_group",
        groupId: group.id,
      });
      setDetails(nextDetails);
      setDeleteTargetId("");
      setNotice({ tone: "success", message: "Browse group deleted." });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not delete this browse group.",
      });
    } finally {
      setSavingAction("");
    }
  }

  async function saveQuickRoute(
    group: WaCatalogGroupRow,
    patch: Partial<RouteFormState>,
    successMessage: string,
  ) {
    setSavingAction(`save:${group.id}`);
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_catalog_group",
        group: {
          ...toGroupInput(group, group.sort_order),
          ...patch,
        },
      });
      setDetails(nextDetails);
      setNotice({ tone: "success", message: successMessage });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not update this browse group.",
      });
    } finally {
      setSavingAction("");
    }
  }

  return (
    <div className="space-y-4" data-business-catalog-routes-live="true">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Browse groups</CardTitle>
            <CardDescription>
              Customer browse routes such as categories, brands, offers, or price lists.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end">
            <Button asChild data-testid="business-catalog-route-create">
              <a
                href={`/connect/admin/businesses/${id}/catalog-routes?newRoute=1`}
                aria-disabled={Boolean(savingAction)}
              >
                <Plus className="h-4 w-4" />
                Create browse group
              </a>
            </Button>
          </div>

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

          {groups.length ? (
            <ul className="divide-y rounded-md border">
              {groups.map((group, index) => {
                const stats = routeStats.get(group.id);
                const busy = savingAction.endsWith(group.id);
                return (
                  <li
                    key={group.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 p-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]"
                  >
                    <GripVertical className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{group.name_english}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          route: {group.slug}
                        </span>
                        {group.is_active ? (
                          <StatusBadge tone="success">Active</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">Inactive</StatusBadge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span dir="rtl">{group.name_arabic}</span>
                        <span>{stats?.valueCount ?? 0} values</span>
                        <span>{stats?.productCount ?? 0} product placements</span>
                        <span>Sort {group.sort_order}</span>
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 lg:col-span-1">
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : null}
                      <Switch
                        checked={group.is_active}
                        aria-label={`Toggle ${group.name_english}`}
                        disabled={Boolean(savingAction)}
                        onCheckedChange={(checked) => void toggleRoute(group, checked)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Move ${group.name_english} up`}
                        disabled={Boolean(savingAction) || index === 0}
                        onClick={() => void moveRoute(group, "up")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Move ${group.name_english} down`}
                        disabled={Boolean(savingAction) || index === groups.length - 1}
                        onClick={() => void moveRoute(group, "down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/connect/admin/businesses/$id/route-values" params={{ id }}>
                          <RouteIcon className="h-4 w-4" />
                          Values
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${group.name_english}`}
                        disabled={Boolean(savingAction)}
                        onClick={() => openEditDialog(group)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${group.name_english}`}
                        className="text-destructive"
                        disabled={Boolean(savingAction)}
                        onClick={() => {
                          setDialogOpen(false);
                          setNotice(null);
                          setDeleteTargetId(group.id);
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
                <RouteIcon className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No browse groups yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create the first route customers can use to browse this business.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {deleteTarget ? (
        <Card
          className="border-destructive/30 bg-destructive/5"
          data-testid="business-catalog-route-delete-confirm"
        >
          <CardHeader>
            <CardTitle>Delete browse group?</CardTitle>
            <CardDescription>
              This will remove {deleteTarget.name_english}. The backend will block deletion if
              products or route values still depend on it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {(routeStats.get(deleteTarget.id)?.valueCount ?? 0).toLocaleString()} values,{" "}
                {(routeStats.get(deleteTarget.id)?.productCount ?? 0).toLocaleString()} product
                placements
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
                    void deleteRoute(deleteTarget);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    void deleteRoute(deleteTarget);
                  }}
                >
                  {savingAction === `delete:${deleteTarget.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-sm font-medium text-destructive">Delete browse group</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {dialogOpen ? (
        <Card data-testid="business-catalog-route-editor">
          <CardHeader>
            <CardTitle>{form.id ? "Edit browse group" : "Create browse group"}</CardTitle>
            <CardDescription>
              These labels appear in the WhatsApp browse flow. Values are managed in the Route
              Values tab.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              ref={editorFormRef}
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void saveRoute(readRouteForm(event.currentTarget, form));
              }}
            >
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="route-name-en" className="text-xs">
                      Name (EN)
                    </Label>
                    <Input
                      id="route-name-en"
                      name="nameEnglish"
                      value={form.nameEnglish}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          nameEnglish: event.target.value,
                          slug: current.slug || slugPreview(event.target.value),
                        }))
                      }
                      placeholder="Shop by brand"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="route-name-ar" className="text-xs">
                      Name (AR)
                    </Label>
                    <Input
                      id="route-name-ar"
                      name="nameArabic"
                      dir="rtl"
                      value={form.nameArabic}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, nameArabic: event.target.value }))
                      }
                      placeholder="تسوق حسب العلامة"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                  <div className="space-y-1">
                    <Label htmlFor="route-slug" className="text-xs">
                      Technical key
                    </Label>
                    <Input
                      id="route-slug"
                      name="slug"
                      value={form.slug}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          slug: slugPreview(event.target.value),
                        }))
                      }
                      placeholder="shop-by-brand"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="route-sort" className="text-xs">
                      Sort
                    </Label>
                    <Input
                      id="route-sort"
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
                      Inactive routes stay saved but are hidden from WhatsApp browse menus.
                    </span>
                  </span>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, isActive: checked }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="icon"
                  aria-label="Save browse group"
                  disabled={Boolean(savingAction)}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    if (!editorFormRef.current) return;
                    void saveRoute(readRouteForm(editorFormRef.current, form));
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    if (!editorFormRef.current) return;
                    void saveRoute(readRouteForm(editorFormRef.current, form));
                  }}
                >
                  {savingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {!savingAction ? <Save className="h-4 w-4" /> : null}
                </Button>
                <span className="self-center text-sm font-medium">Save browse group</span>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function getRouteStats(details: AdminBusinessDetailsResult) {
  const stats = new Map<string, { valueCount: number; productCount: number }>();
  for (const group of details.catalogGroups) {
    stats.set(group.id, { valueCount: 0, productCount: 0 });
  }
  const valueToGroup = new Map<string, string>();
  for (const value of details.catalogGroupValues) {
    valueToGroup.set(value.id, value.group_id);
    const entry = stats.get(value.group_id);
    if (entry) entry.valueCount += 1;
  }
  for (const link of details.productGroupValues) {
    const groupId = valueToGroup.get(link.group_value_id);
    const entry = groupId ? stats.get(groupId) : undefined;
    if (entry) entry.productCount += 1;
  }
  return stats;
}

function emptyRouteForm(sortOrder: number): RouteFormState {
  return {
    nameEnglish: "",
    nameArabic: "",
    slug: "",
    isActive: true,
    sortOrder,
  };
}

function nextSortOrder(groups: WaCatalogGroupRow[]) {
  const lastSortOrder = groups.reduce((max, group) => Math.max(max, group.sort_order), -10);
  return lastSortOrder + 10;
}

function toGroupInput(group: WaCatalogGroupRow, sortOrder: number) {
  return {
    id: group.id,
    nameEnglish: group.name_english,
    nameArabic: group.name_arabic,
    slug: group.slug,
    isActive: group.is_active,
    sortOrder,
  };
}

function readRouteForm(formElement: HTMLFormElement, current: RouteFormState): RouteFormState {
  const submitted = new FormData(formElement);
  return {
    ...current,
    nameEnglish: String(submitted.get("nameEnglish") ?? ""),
    nameArabic: String(submitted.get("nameArabic") ?? ""),
    slug: slugPreview(String(submitted.get("slug") ?? "")),
    sortOrder: Number.parseInt(String(submitted.get("sortOrder") ?? ""), 10) || 0,
  };
}

function slugPreview(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
