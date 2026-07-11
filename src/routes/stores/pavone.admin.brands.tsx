import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  catalogKeys,
  deleteBrand,
  fetchBrands,
  uploadBoutiqueImage,
  upsertBrand,
  type Brand,
} from "@/stores/pavone-new/lib/catalog";

export const Route = createFileRoute("/stores/pavone/admin/brands")({
  component: AdminBrands,
  head: () => ({ meta: [{ title: "Brands - Admin" }, { name: "robots", content: "noindex" }] }),
});

interface FormState {
  id?: string;
  name: string;
  description: string;
  logo_url: string;
  is_active: boolean;
}

const EMPTY: FormState = { name: "", description: "", logo_url: "", is_active: true };

function AdminBrands() {
  const queryClient = useQueryClient();
  const { data: brands = [], isLoading } = useQuery({
    queryKey: catalogKeys.brands,
    queryFn: () => fetchBrands(true),
  });
  const [form, setForm] = useState<FormState | null>(null);
  const [uploading, setUploading] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: catalogKeys.brands });

  const save = useMutation({
    mutationFn: (values: FormState) =>
      upsertBrand({
        id: values.id,
        name: values.name,
        description: values.description,
        logo_url: values.logo_url,
        is_active: values.is_active,
      }),
    onSuccess: () => {
      invalidate();
      setForm(null);
      toast.success("Brand saved");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      invalidate();
      toast.success("Brand deleted");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Delete failed"),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadBoutiqueImage(file, "categories");
      setForm((current) => (current ? { ...current, logo_url: url } : current));
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
          <Plus className="h-4 w-4" /> Add Brand
        </button>
      </div>

      <div className="overflow-x-auto border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase">
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td className="px-4 py-8 text-muted-foreground" colSpan={3}>
                  Loading...
                </td>
              </tr>
            ) : (
              brands.map((brand) => (
                <tr key={brand.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {brand.logo_url ? (
                        <img
                          src={brand.logo_url}
                          alt=""
                          className="h-10 w-10 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center bg-secondary font-serif">
                          {brand.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{brand.name}</p>
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {brand.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-[0.625rem] tracking-[0.12em] uppercase ${
                        brand.is_active
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {brand.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        aria-label="Edit"
                        className="border border-border p-2 hover:border-primary"
                        onClick={() => setForm(toForm(brand))}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        aria-label="Delete"
                        className="border border-border p-2 text-destructive hover:border-destructive"
                        onClick={() => {
                          if (confirm(`Delete brand "${brand.name}"?`)) remove.mutate(brand.id);
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
            <h2 className="font-serif text-xl">{form.id ? "Edit Brand" : "Add Brand"}</h2>
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
              <div>
                <label className="label-elegant">Logo / Image</label>
                {form.logo_url && (
                  <img src={form.logo_url} alt="" className="mb-2 h-16 w-16 object-contain" />
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                />
                Active
              </label>
              {save.error && (
                <p
                  role="alert"
                  className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {save.error instanceof Error ? save.error.message : "Brand save failed."}
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

function toForm(brand: Brand): FormState {
  return {
    id: brand.id,
    name: brand.name,
    description: brand.description ?? "",
    logo_url: brand.logo_url ?? "",
    is_active: brand.is_active,
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
