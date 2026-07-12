import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  adminEmailToUsername,
  getStoredSession,
  updateAdminAccount,
} from "@/stores/pavone/lib/supabase";
import {
  catalogKeys,
  getSettings,
  normalizeLookbookImages,
  updateSettings,
  uploadBoutiqueImage,
  type PavoneNewSettings,
} from "@/stores/pavone-new/lib/catalog";

export const Route = createFileRoute("/stores/pavone/admin/settings")({
  component: AdminSettings,
  head: () => ({ meta: [{ title: "Settings - Admin" }, { name: "robots", content: "noindex" }] }),
});

function AdminSettings() {
  const queryClient = useQueryClient();
  const session = getStoredSession();
  const [displayName, setDisplayName] = useState(
    String(session?.user?.user_metadata?.display_name ?? ""),
  );
  const [username, setUsername] = useState(adminEmailToUsername(session?.user?.email));
  const [password, setPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [storefrontError, setStorefrontError] = useState("");
  const [savingStorefront, setSavingStorefront] = useState(false);
  const [uploading, setUploading] = useState("");
  const [settings, setSettings] = useState<PavoneNewSettings | null>(null);

  const settingsQuery = useQuery({
    queryKey: catalogKeys.settings,
    queryFn: getSettings,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings({
        ...settingsQuery.data,
        lookbook_image_urls: normalizeLookbookImages(settingsQuery.data.lookbook_image_urls),
      });
    }
  }, [settingsQuery.data]);

  async function saveAccount(event: React.FormEvent) {
    event.preventDefault();
    setSavingAccount(true);
    setAccountError("");
    try {
      await updateAdminAccount({
        displayName: displayName.trim(),
        username: username.trim(),
        password: password.trim() || undefined,
      });
      setPassword("");
      toast.success("Admin account updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update account";
      setAccountError(message);
      toast.error(message);
    } finally {
      setSavingAccount(false);
    }
  }

  async function saveStorefront(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setSavingStorefront(true);
    setStorefrontError("");
    try {
      await updateSettings(settings);
      queryClient.invalidateQueries({ queryKey: catalogKeys.settings });
      toast.success("Storefront settings updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update storefront";
      setStorefrontError(message);
      toast.error(message);
    } finally {
      setSavingStorefront(false);
    }
  }

  async function uploadImage(file: File | undefined, field: keyof PavoneNewSettings) {
    if (!file || !settings) return;
    setUploading(String(field));
    try {
      const url = await uploadBoutiqueImage(file, "hero");
      setSettings({ ...settings, [field]: url });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      setUploading("");
    }
  }

  async function uploadLookbookImage(file: File | undefined, index: number) {
    if (!file || !settings) return;
    const uploadKey = `lookbook_${index}`;
    setUploading(uploadKey);
    try {
      const url = await uploadBoutiqueImage(file, "hero");
      const nextImages = normalizeLookbookImages(settings.lookbook_image_urls);
      nextImages[index] = url;
      setSettings({ ...settings, lookbook_image_urls: nextImages });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      setUploading("");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={saveAccount} className="space-y-4 border border-border bg-background p-6">
        <div>
          <h2 className="font-serif text-2xl">Admin Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Change the username, display name, or password used for this dashboard.
          </p>
        </div>
        <Field label="Display name">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="input-elegant"
          />
        </Field>
        <Field label="Username">
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="input-elegant"
            required
            autoComplete="username"
          />
        </Field>
        <Field label="New password">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input-elegant"
            placeholder="Leave empty to keep current password"
          />
        </Field>
        {accountError && (
          <p
            role="alert"
            className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {accountError}
          </p>
        )}
        <button type="submit" disabled={savingAccount} className="btn-primary !py-2.5 text-xs">
          {savingAccount ? "Saving..." : "Save Account"}
        </button>
      </form>

      <form onSubmit={saveStorefront} className="space-y-5 border border-border bg-background p-6">
        <div>
          <h2 className="font-serif text-2xl">Homepage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit hero copy, storefront imagery, and social destination.
          </p>
        </div>

        {!settings ? (
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hero eyebrow">
                <input
                  className="input-elegant"
                  value={settings.hero_eyebrow}
                  onChange={(event) =>
                    setSettings({ ...settings, hero_eyebrow: event.target.value })
                  }
                />
              </Field>
              <Field label="Instagram URL">
                <input
                  className="input-elegant"
                  value={settings.instagram_url ?? ""}
                  onChange={(event) =>
                    setSettings({ ...settings, instagram_url: event.target.value || null })
                  }
                />
              </Field>
            </div>
            <Field label="Hero title">
              <input
                className="input-elegant"
                value={settings.hero_title}
                onChange={(event) => setSettings({ ...settings, hero_title: event.target.value })}
              />
            </Field>
            <Field label="Hero subtitle">
              <textarea
                rows={3}
                className="input-elegant"
                value={settings.hero_subtitle}
                onChange={(event) =>
                  setSettings({ ...settings, hero_subtitle: event.target.value })
                }
              />
            </Field>
            <ImageField
              label="Hero image"
              value={settings.hero_image_url ?? ""}
              uploading={uploading === "hero_image_url"}
              onChange={(value) => setSettings({ ...settings, hero_image_url: value || null })}
              onUpload={(file) => uploadImage(file, "hero_image_url")}
            />
            <ImageField
              label="Editorial image"
              value={settings.editorial_image_url ?? ""}
              uploading={uploading === "editorial_image_url"}
              onChange={(value) => setSettings({ ...settings, editorial_image_url: value || null })}
              onUpload={(file) => uploadImage(file, "editorial_image_url")}
            />
            <ImageField
              label="About image"
              value={settings.about_image_url ?? ""}
              uploading={uploading === "about_image_url"}
              onChange={(value) => setSettings({ ...settings, about_image_url: value || null })}
              onUpload={(file) => uploadImage(file, "about_image_url")}
            />
            <div>
              <div>
                <h3 className="font-serif text-xl">Lookbook Images</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  These four images appear in the Lookbook grid at the bottom of the storefront.
                </p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {normalizeLookbookImages(settings.lookbook_image_urls).map((image, index) => (
                  <ImageField
                    key={index}
                    label={`Lookbook image ${index + 1}`}
                    value={image}
                    uploading={uploading === `lookbook_${index}`}
                    onChange={(value) => {
                      const nextImages = normalizeLookbookImages(settings.lookbook_image_urls);
                      nextImages[index] = value;
                      setSettings({
                        ...settings,
                        lookbook_image_urls: normalizeLookbookImages(nextImages),
                      });
                    }}
                    onUpload={(file) => uploadLookbookImage(file, index)}
                  />
                ))}
              </div>
            </div>
            {storefrontError && (
              <p
                role="alert"
                className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {storefrontError}
              </p>
            )}
            <button
              type="submit"
              disabled={savingStorefront || Boolean(uploading)}
              className="btn-primary !py-2.5 text-xs"
            >
              {savingStorefront ? "Saving..." : "Save Storefront"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-elegant">{label}</span>
      {children}
    </label>
  );
}

function ImageField({
  label,
  value,
  uploading,
  onChange,
  onUpload,
}: {
  label: string;
  value: string;
  uploading: boolean;
  onChange: (value: string) => void;
  onUpload: (file: File | undefined) => void;
}) {
  return (
    <div>
      <span className="label-elegant">{label}</span>
      <label className="btn-outline cursor-pointer !px-4 !py-2 text-xs">
        {uploading ? "Uploading..." : "Upload image"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(event) => onUpload(event.target.files?.[0])}
        />
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-elegant mt-2"
        placeholder="https://..."
      />
      {value && <img src={value} alt="" className="mt-2 h-48 w-full object-cover" />}
    </div>
  );
}
