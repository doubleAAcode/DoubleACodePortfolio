import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connect/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — WA Admin" }] }),
  component: SettingsLayout,
});

const tabs = [
  { to: "/connect/admin/settings", label: "Workspace", exact: true },
  { to: "/connect/admin/settings/team", label: "Team & roles" },
  { to: "/connect/admin/settings/audit", label: "Audit log" },
];

function SettingsLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <>
      <TopBar title="Settings" subtitle="Workspace, team, and audit log for this admin tenant." />
      <div className="px-4 sm:px-6">
        <nav className="flex gap-1 border-b -mt-2 mb-4">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "px-3 py-2 text-sm border-b-2 -mb-px",
                  active ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10"><Outlet /></div>
    </>
  );
}
