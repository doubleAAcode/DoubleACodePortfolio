import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Boxes,
  Bell,
  FolderTree,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MessageSquareText,
  Settings,
  ShoppingCart,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  applyWaOwnerNotificationAction,
  getWaDashboardSession,
  getWaOwnerNotifications,
  loginWaDashboard,
  logoutWaDashboard,
  type OwnerNotificationDashboardSnapshot,
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

export function DashboardLayout({
  basePath,
  title,
  appearance = "default",
}: {
  basePath: string;
  title: string;
  appearance?: "default" | "light";
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const router = useRouter();
  const [sessionResult, setSessionResult] = useState<WaDashboardSessionResult>();
  const [error, setError] = useState("");
  const lightMode = appearance === "light";
  const themeClass = lightMode ? "wa-dashboard-light" : "";

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
      <div className="dark flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  if (error || !sessionResult?.authenticated) {
    return (
      <div className={themeClass}>
        <DashboardLogin
        configured={sessionResult?.configured ?? true}
        error={error}
        onLogin={(nextSession) => {
          setError("");
          setSessionResult(nextSession);
          router.invalidate();
        }}
        />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
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
              const active =
                "exact" in item && item.exact ? pathname === basePath : pathname.startsWith(to);
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
                  const active =
                    "exact" in item && item.exact ? pathname === basePath : pathname.startsWith(to);
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
            <OwnerNotificationCenter basePath={basePath} />
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function OwnerNotificationCenter({ basePath }: { basePath: string }) {
  const [snapshot, setSnapshot] = useState<OwnerNotificationDashboardSnapshot>();
  const [muted, setMuted] = useState(false);
  const [browserStatus, setBrowserStatus] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const seenNotificationIds = useRef(new Set<string>());
  const interacted = useRef(false);

  const loadNotifications = useCallback(async () => {
    const nextSnapshot = await getWaOwnerNotifications();
    const newestUnread = nextSnapshot.notifications.find((notification) => !notification.read_at);
    const isNew = newestUnread ? !seenNotificationIds.current.has(newestUnread.id) : false;

    for (const notification of nextSnapshot.notifications) {
      seenNotificationIds.current.add(notification.id);
    }

    if (isNew && newestUnread) {
      if (nextSnapshot.settings.enableSound && !muted && interacted.current) {
        playNotificationSound();
      }
      if (
        nextSnapshot.settings.enableBrowserPush &&
        browserStatus === "granted" &&
        newestUnread.type === "NEW_ORDER"
      ) {
        showBrowserNotification(newestUnread.title, newestUnread.message, {
          orderId: newestUnread.order_id,
          basePath,
        });
      }
    }

    setSnapshot(nextSnapshot);
  }, [basePath, browserStatus, muted]);

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 15000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  async function enableBrowserNotifications() {
    interacted.current = true;
    if (!("Notification" in window)) {
      setBrowserStatus("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserStatus(permission);
  }

  async function markAllRead() {
    interacted.current = true;
    setSnapshot(await applyWaOwnerNotificationAction({ action: "mark_all_read" }));
  }

  async function markRead(notificationId: string) {
    interacted.current = true;
    setSnapshot(await applyWaOwnerNotificationAction({ action: "mark_read", notificationId }));
  }

  const unreadCount = snapshot?.unreadCount ?? 0;
  const recent = snapshot?.notifications.slice(0, 3) ?? [];

  if (!snapshot) return null;

  return (
    <section className="mb-5 rounded-lg border border-border bg-surface/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Bell className="h-5 w-5" />
            {unreadCount ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            ) : null}
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Owner alerts</h2>
            <p className="text-sm text-muted-foreground">
              {unreadCount ? `${unreadCount} unread notification(s)` : "No unread notifications"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              interacted.current = true;
              setMuted((value) => !value);
            }}
            className="studio-button"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? "Muted" : "Sound on"}
          </button>
          {browserStatus !== "granted" ? (
            <button
              type="button"
              onClick={() => void enableBrowserNotifications()}
              className="studio-button"
            >
              <Bell className="h-4 w-4" />
              Enable browser notifications
            </button>
          ) : null}
          {unreadCount ? (
            <button type="button" onClick={() => void markAllRead()} className="studio-button">
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      {browserStatus === "denied" ? (
        <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Browser notifications are blocked. Enable them from your browser site settings.
        </p>
      ) : null}

      {recent.length ? (
        <div className="mt-4 grid gap-2 lg:grid-cols-3">
          {recent.map((notification) => (
            <a
              key={notification.id}
              href={`${basePath}/orders/${notification.order_id}`}
              onClick={() => void markRead(notification.id)}
              className={`rounded-md border p-3 text-sm transition hover:border-primary ${
                notification.read_at
                  ? "border-border bg-background/40 text-muted-foreground"
                  : "border-primary/35 bg-primary/10 text-foreground"
              }`}
            >
              <div className="font-medium">{notification.title}</div>
              <p className="mt-1 line-clamp-2 text-muted-foreground">{notification.message}</p>
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function playNotificationSound() {
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.24);
}

function showBrowserNotification(
  title: string,
  body: string,
  { orderId, basePath }: { orderId: string; basePath: string },
) {
  const notification = new Notification(title, { body, tag: orderId });
  notification.onclick = () => {
    window.focus();
    window.location.assign(`${basePath}/orders/${orderId}`);
  };
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
    <main className="dark flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
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
