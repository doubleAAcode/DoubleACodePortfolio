import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Boxes,
  FolderTree,
  LayoutDashboard,
  MessageSquareText,
  ShoppingCart,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/categories", label: "Categories", icon: FolderTree },
  { to: "/dashboard/products", label: "Products", icon: Boxes },
  { to: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { to: "/dashboard/simulator", label: "Simulator", icon: MessageSquareText },
] as const;

function DashboardLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

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
                <div className="font-display text-lg font-semibold">Store Bot</div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Local sandbox
                </div>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
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
          <div className="border-t border-border p-4 text-xs leading-relaxed text-muted-foreground">
            Development-only guard: this dashboard uses local browser storage and is not connected
            to WhatsApp or production data.
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border bg-background/88 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-lg font-semibold">Store Bot</div>
              <div className="flex gap-1 overflow-x-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-label={item.label}
                      className={`rounded-md p-2 ${active ? "bg-primary/15 text-foreground" : "text-muted-foreground"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  );
                })}
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
