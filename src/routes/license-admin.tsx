import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchLicenseAdminSnapshot,
  sendLicenseAdminAction,
  type LicenseAdminAction,
  type LicenseAdminSnapshot,
} from "@/features/license/admin-client";
import type { LicenseRecord } from "@/features/license/store";

const TOKEN_STORAGE_KEY = "double-a-license-admin-token";

export const Route = createFileRoute("/license-admin")({
  head: () => ({
    meta: [{ title: "License switch" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: LicenseAdminPage,
});

function readStoredToken(): string {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeToken(token: string) {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // The token simply will not persist across reloads.
  }
}

function statusVariant(license: LicenseRecord): "default" | "secondary" | "destructive" {
  if (license.status === "active") return "default";
  return license.status === "revoked" ? "destructive" : "secondary";
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "Never";
}

function LicenseAdminPage() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [snapshot, setSnapshot] = useState<LicenseAdminSnapshot | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | undefined>();
  const [newLabel, setNewLabel] = useState("");
  const [newMachines, setNewMachines] = useState("1");
  const [stopMessage, setStopMessage] = useState("");

  const load = useCallback(async (value: string) => {
    setBusy(true);
    setError(undefined);

    try {
      const next = await fetchLicenseAdminSnapshot(value);
      setSnapshot(next);
      setStopMessage(next.global.message);
      setToken(value);
      storeToken(value);
    } catch (loadError) {
      setSnapshot(null);
      setToken("");
      storeToken("");
      setError(loadError instanceof Error ? loadError.message : "Could not load licenses.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const stored = readStoredToken();
    if (stored) void load(stored);
  }, [load]);

  const run = useCallback(
    async (action: LicenseAdminAction) => {
      setBusy(true);
      setError(undefined);

      try {
        const next = await sendLicenseAdminAction(token, action);
        setSnapshot(next);
        setStopMessage(next.global.message);
        if (next.createdKey) setCreatedKey(next.createdKey);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "The change failed.");
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  if (!snapshot) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">License switch</h1>
        <p className="text-sm text-muted-foreground">
          Enter the admin token (the LICENSE_ADMIN_TOKEN value of this deployment).
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void load(tokenInput.trim());
          }}
        >
          <Input
            type="password"
            autoComplete="off"
            placeholder="Admin token"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
          />
          <Button type="submit" disabled={busy || tokenInput.trim().length === 0}>
            {busy ? "Checking..." : "Unlock"}
          </Button>
        </form>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </main>
    );
  }

  const stopAll = snapshot.global.stopAll;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">License switch</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            storeToken("");
            setToken("");
            setSnapshot(null);
          }}
        >
          Lock
        </Button>
      </header>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section
        className={[
          "rounded-lg border p-4",
          stopAll ? "border-destructive bg-destructive/10" : "border-border",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Stop all clients</h2>
            <p className="text-sm text-muted-foreground">
              {stopAll
                ? "Every app that checks in is locked right now."
                : "Locks every client at their next check-in, whatever their own license says."}
            </p>
          </div>
          <Button
            variant={stopAll ? "outline" : "destructive"}
            disabled={busy}
            onClick={() => {
              if (!stopAll && !window.confirm("Lock ALL clients now?")) return;
              void run({ action: "setGlobal", stopAll: !stopAll, message: stopMessage });
            }}
          >
            {stopAll ? "Resume all clients" : "Stop all clients"}
          </Button>
        </div>
        <Input
          className="mt-3"
          placeholder="Message shown to clients (optional)"
          maxLength={500}
          value={stopMessage}
          onChange={(event) => setStopMessage(event.target.value)}
        />
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-medium">New license</h2>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run({
              action: "createLicense",
              label: newLabel.trim(),
              maxMachines: Math.max(1, Number.parseInt(newMachines, 10) || 1),
            });
            setNewLabel("");
          }}
        >
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
            Client name
            <Input value={newLabel} maxLength={120} onChange={(e) => setNewLabel(e.target.value)} />
          </label>
          <label className="flex w-32 flex-col gap-1 text-sm">
            Computers
            <Input
              inputMode="numeric"
              value={newMachines}
              onChange={(e) => setNewMachines(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={busy || newLabel.trim().length === 0}>
            Create
          </Button>
        </form>
        {createdKey ? (
          <p className="mt-3 break-all rounded-md bg-muted p-3 font-mono text-sm">
            New key (shown once, copy it now): {createdKey}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Licenses ({snapshot.licenses.length})</h2>
        {snapshot.licenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No licenses yet.</p>
        ) : null}
        {snapshot.licenses.map((license) => (
          <article key={license.key} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-medium">{license.label}</h3>
                <p className="font-mono text-xs text-muted-foreground">{license.key}</p>
              </div>
              <Badge variant={statusVariant(license)}>{license.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Computers {license.machines.length}/{license.maxMachines} · Expires{" "}
              {formatDate(license.expiresAt)} · Last seen{" "}
              {formatDate(
                license.machines
                  .map((m) => m.lastSeenAt)
                  .sort()
                  .at(-1) ?? null,
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {license.status === "active" ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() =>
                    void run({
                      action: "updateLicense",
                      key: license.key,
                      patch: { status: "suspended" },
                    })
                  }
                >
                  Suspend
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run({
                      action: "updateLicense",
                      key: license.key,
                      patch: { status: "active" },
                    })
                  }
                >
                  Activate
                </Button>
              )}
              {license.status !== "revoked" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`Revoke ${license.label}?`)) return;
                    void run({
                      action: "updateLicense",
                      key: license.key,
                      patch: { status: "revoked" },
                    });
                  }}
                >
                  Revoke
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                disabled={busy || license.machines.length === 0}
                onClick={() => void run({ action: "resetMachines", key: license.key })}
              >
                Reset computers
              </Button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
