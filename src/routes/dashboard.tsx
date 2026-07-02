import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Boxes,
  FolderTree,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MessageSquareText,
  Settings,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  getWaDashboardSession,
  loginWaDashboard,
  logoutWaDashboard,
  type WaDashboardSessionResult,
} from "@/lib/whatsapp/dashboard-client";

export const Route = createFileRoute("/dashboard")({
  component: () => <DashboardLayout basePath="/dashboard" title="Store Bot" />,
});

const navItems = [
  { path: "", label: "Overview", icon: LayoutDashboard, exact: true },
  { path: "/categories", label: "Categories", icon: FolderTree },
  { path: "/products", label: "Products", icon: Boxes },
  { path: "/orders", label: "Orders", icon: ShoppingCart },
  { path: "/delivery", label: "Delivery", icon: MapPinned },
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/simulator", label: "Simulator", icon: MessageSquareText },
] as const;

export function DashboardLayout({ basePath, title }: { basePath: string; title: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const router = useRouter();
  const [sessionResult, setSessionResult] = useState<WaDashboardSessionResult>();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getWaDashboardSession()
      .then((result) => {
        if (mounted) setSessionResult(result);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Could not load session.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function signOut() {
    await logoutWaDashboard();
    setSessionResult((current) =>
      current ? { ...current, authenticated: false, session: null } : current,
    );
    router.invalidate();
  }

  if (!sessionResult && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  if (error || !sessionResult?.authenticated) {
    return (
      <DashboardLogin
        configured={sessionResult?.configured ?? true}
        error={error}
        onLogin={(nextSession) => {
          setError("");
          setSessionResult(nextSession);
          router.invalidate();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface/70 md:flex md:flex-col">
          <div className="border-b border-border px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-background">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-lg font-semibold">{title}</div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Owner console
                </div>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const to = `${basePath}${item.path}`;
              const active = item.exact ? pathname === basePath : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-primary/14 text-foreground"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-3">
            <div className="px-3 pb-2 text-xs text-muted-foreground">
              {sessionResult.session?.businessId}
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border bg-background/88 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-lg font-semibold">{title}</div>
              <div className="flex gap-1 overflow-x-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const to = `${basePath}${item.path}`;
                  const active = item.exact ? pathname === basePath : pathname.startsWith(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      aria-label={item.label}
                      className={`rounded-md p-2 ${active ? "bg-primary/15 text-foreground" : "text-muted-foreground"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={() => void signOut()}
                  aria-label="Sign out"
                  className="rounded-md p-2 text-muted-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function DashboardLogin({
  configured,
  error,
  onLogin,
}: {
  configured: boolean;
  error?: string;
  onLogin: (session: WaDashboardSessionResult) => void;
}) {
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(error || "");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    setLoading(true);

    try {
      await loginWaDashboard(username, password);
      onLogin(await getWaDashboardSession());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface/70 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-background">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">Store Bot Dashboard</h1>
            <p className="text-sm text-muted-foreground">Owner access</p>
          </div>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Add `WA_DASHBOARD_PASSWORD` and `WA_DASHBOARD_SESSION_SECRET` in Vercel before using the
            dashboard.
          </div>
        ) : null}

        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-2 block text-muted-foreground">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <button
            type="submit"
            disabled={loading || !configured}
            className="studio-button-primary w-full"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
