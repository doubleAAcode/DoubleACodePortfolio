import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ClipboardList,
  ExternalLink,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Tags,
  X,
} from "lucide-react";
import { useState } from "react";
import { LOGO_URL, STORE_NAME } from "@/stores/pavone-new/lib/brand";
import { getStoredSession, signOutAdmin } from "@/stores/pavone/lib/supabase";

export const Route = createFileRoute("/stores/pavone/admin")({
  component: AdminLayout,
});

const LINKS = [
  { to: "/stores/pavone/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/stores/pavone/admin/products", label: "Products", icon: Package },
  { to: "/stores/pavone/admin/categories", label: "Categories", icon: Layers },
  { to: "/stores/pavone/admin/brands", label: "Brands", icon: Tags },
  { to: "/stores/pavone/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/stores/pavone/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const authed = Boolean(getStoredSession()?.access_token);

  if (pathname === "/stores/pavone/admin/login") {
    return (
      <div className="pavone-new-store">
        <Outlet />
      </div>
    );
  }

  if (!authed) {
    navigate({ to: "/stores/pavone/admin/login", replace: true });
    return null;
  }

  const signOut = () => {
    signOutAdmin();
    navigate({ to: "/stores/pavone/admin/login", replace: true });
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {LINKS.map((link) => {
        const active =
          "exact" in link && link.exact ? pathname === link.to : pathname.startsWith(link.to);
        return (
          <Link
            key={link.to}
            to={link.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <link.icon className="h-4 w-4" strokeWidth={1.5} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-1 border-t border-border pt-3">
      <Link
        to="/stores/pavone"
        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:bg-secondary"
      >
        <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
        View Store
      </Link>
      <button
        onClick={signOut}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:bg-secondary"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.5} />
        Sign Out
      </button>
    </div>
  );

  return (
    <div className="pavone-new-store flex min-h-screen bg-secondary/30 text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background p-4 lg:flex">
        <Link to="/stores/pavone/admin" className="mb-8 mt-2 block px-2">
          <img src={LOGO_URL} alt={STORE_NAME} className="h-8 w-auto" />
          <p className="mt-2 text-[0.6rem] tracking-[0.25em] text-muted-foreground uppercase">
            Admin Panel
          </p>
        </Link>
        {nav}
        {footer}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-background p-4">
            <div className="mb-6 flex items-center justify-between px-2">
              <img src={LOGO_URL} alt={STORE_NAME} className="h-7 w-auto" />
              <button aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-4 sm:px-6">
          <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <h1 className="truncate font-serif text-xl sm:text-2xl">PAVONE Admin</h1>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
