import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  catalogKeys,
  deleteCategory,
  fetchCategories,
  uploadBoutiqueImage,
  upsertCategory,
  type Category,
} from "@/stores/pavone-new/lib/catalog";

export const Route = createFileRoute("/stores/pavone/admin/categories")({
  component: AdminCategories,
  head: () => ({ meta: [{ title: "Categories - Admin" }, { name: "robots", content: "noindex" }] }),
});

interface FormState {
  id?: string;
  name: string;
  description: string;
  image_url: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: string;
}

const EMPTY: FormState = {
  name: "",
  description: "",
  image_url: "",
  is_active: true,
  is_featured: false,
  sort_order: "0",
};

function AdminCategories() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () => fetchCategories(true),
  });
  const [form, setForm] = useState<FormState | null>(null);
  const [uploading, setUploading] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: catalogKeys.categories });

  const save = useMutation({
    mutationFn: (values: FormState) =>
      upsertCategory({
        id: values.id,
        name: values.name,
        description: values.description,
        image_url: values.image_url,
        is_active: values.is_active,
        is_featured: values.is_featured,
        sort_order: Number(values.sort_order) || 0,
      }),
    onSuccess: () => {
      invalidate();
      setForm(null);
      toast.success("Category saved");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      invalidate();
      toast.success("Category deleted");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Delete failed"),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadBoutiqueImage(file, "categories");
      setForm((current) => (current ? { ...current, image_url: url } : current));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <button className="btn-primary !px-5 !py-2.5 text-xs" onClick={() => setForm(EMPTY)}>
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      <div className="overflow-x-auto border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase">
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td className="px-4 py-8 text-muted-foreground" colSpan={4}>
                  Loading...
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt=""
                          className="h-12 w-10 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-12 w-10 bg-secondary" />
                      )}
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-[0.625rem] tracking-[0.12em] uppercase ${
                        category.is_active
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{category.is_featured ? "Yes" : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        aria-label="Edit"
                        className="border border-border p-2 hover:border-primary"
                        onClick={() => setForm(toForm(category))}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        aria-label="Delete"
                        className="border border-border p-2 text-destructive hover:border-destructive"
                        onClick={() => {
                          if (confirm(`Delete category "${category.name}"?`)) {
                            remove.mutate(category.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForm(null)} />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto border border-border bg-background p-6">
            <h2 className="font-serif text-xl">{form.id ? "Edit Category" : "Add Category"}</h2>
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate(form);
              }}
            >
              <Field label="Name *">
                <input
                  required
                  className="input-elegant"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </Field>
              <Field label="Description">
                <textarea
                  rows={3}
                  className="input-elegant"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </Field>
              <Field label="Sort Order">
                <input
                  type="number"
                  className="input-elegant"
                  value={form.sort_order}
                  onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
                />
              </Field>
              <div>
                <label className="label-elegant">Image</label>
                {form.image_url && (
                  <img src={form.image_url} alt="" className="mb-2 h-24 w-20 object-cover" />
                )}
                <label className="btn-outline cursor-pointer !px-4 !py-2 text-xs">
                  <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload Image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      event.target.files?.[0] && handleUpload(event.target.files[0])
                    }
                  />
                </label>
              </div>
              <div className="flex gap-6">
                <Checkbox
                  label="Active"
                  checked={form.is_active}
                  onChange={(is_active) => setForm({ ...form, is_active })}
                />
                <Checkbox
                  label="Featured"
                  checked={form.is_featured}
                  onChange={(is_featured) => setForm({ ...form, is_featured })}
                />
              </div>
              {save.error && (
                <p
                  role="alert"
                  className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {save.error instanceof Error ? save.error.message : "Category save failed."}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="btn-primary flex-1 !py-2.5 text-xs"
                  disabled={save.isPending || uploading}
                >
                  {save.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="btn-outline !py-2.5 text-xs"
                  onClick={() => setForm(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function toForm(category: Category): FormState {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? "",
    image_url: category.image_url ?? "",
    is_active: category.is_active,
    is_featured: category.is_featured,
    sort_order: String(category.sort_order),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-elegant">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({
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
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
