import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  PauseCircle,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getAdminBusinesses } from "@/lib/whatsapp/admin-client";
import type { AdminBusinessSummary } from "@/lib/whatsapp/admin-store.server";

export const Route = createFileRoute("/admin/businesses")({
  component: AdminBusinessesPage,
});

function AdminBusinessesPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showingBusinessDetails = pathname.replace(/\/+$/, "") !== "/admin/businesses";
  const [businesses, setBusinesses] = useState<AdminBusinessSummary[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminBusinesses()
      .then(setBusinesses)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load businesses."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return businesses;
    return businesses.filter((business) =>
      [business.name, business.legal_name, business.ownerEmail, business.displayPhoneNumber]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term)),
    );
  }, [businesses, query]);

  if (showingBusinessDetails) {
    return <Outlet />;
  }

  if (error) return <PageState text={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Tenants</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Businesses</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create, pause, suspend, and inspect WhatsApp chatbot tenants.
          </p>
        </div>
        <a href="/admin/businesses/new" className="studio-button-primary w-fit">
          New business
        </a>
      </div>

      <div className="relative max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search businesses, owners, or numbers"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
        />
      </div>

      <section className="rounded-lg border border-border bg-surface/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="border-b border-border px-4 py-3 font-medium">Business</th>
                <th className="border-b border-border px-4 py-3 font-medium">Status</th>
                <th className="border-b border-border px-4 py-3 font-medium">Connection</th>
                <th className="border-b border-border px-4 py-3 font-medium">Owner</th>
                <th className="border-b border-border px-4 py-3 font-medium">Health</th>
                <th className="border-b border-border px-4 py-3 text-right font-medium">
                  Last order
                </th>
                <th className="border-b border-border px-4 py-3 text-right font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-muted-foreground">
                    Loading businesses...
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((business) => (
                  <tr
                    key={business.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => {
                      window.location.href = `/admin/businesses/${business.id}`;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        window.location.href = `/admin/businesses/${business.id}`;
                      }
                    }}
                    className="cursor-pointer border-b border-border/70 transition hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary last:border-0"
                  >
                    <td className="px-4 py-4">
                      <a
                        href={`/admin/businesses/${business.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {business.name}
                      </a>
                      <div className="mt-1 text-xs text-muted-foreground">{business.id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={business.status || "ACTIVE"} />
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      <div>{business.connectionStatus}</div>
                      <div className="mt-1 text-xs">
                        {business.displayPhoneNumber || "No number"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {business.ownerEmail || "Not assigned"}
                    </td>
                    <td className="px-4 py-4">
                      <HealthPill status={business.healthStatus} />
                    </td>
                    <td className="px-4 py-4 text-right text-muted-foreground">
                      {business.lastOrderAt ? formatDate(business.lastOrderAt) : "No orders"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <a
                        href={`/admin/businesses/${business.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="studio-button-secondary whitespace-nowrap"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-muted-foreground">
                    No matching businesses.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const paused = ["PAUSED", "SUSPENDED", "ERROR"].includes(status);
  const Icon = status === "ACTIVE" ? CheckCircle2 : paused ? PauseCircle : Clock3;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      <Icon className="h-3.5 w-3.5" />
      {status.replaceAll("_", " ")}
    </span>
  );
}

function HealthPill({ status }: { status: "OK" | "WARNING" | "ERROR" }) {
  const Icon = status === "OK" ? CheckCircle2 : AlertTriangle;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-8 text-muted-foreground">
      {text}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
