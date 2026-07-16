import { FlowManagerFutureBadge } from "@/features/connect/flow-manager-ui/future-badge";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Radio,
  Users,
  Building2,
  Megaphone,
  Workflow,
  MessageSquareText,
  BarChart3,
  ScrollText,
  Code2,
  Settings,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const primary = [
  { title: "Overview", url: "/connect/admin", icon: LayoutDashboard },
  { title: "Live Ops", url: "/connect/admin/inbox", icon: Radio },
  { title: "Contacts", url: "/connect/admin/contacts", icon: Users },
  { title: "Businesses", url: "/connect/admin/businesses", icon: Building2 },
  { title: "Broadcasts", url: "/connect/admin/broadcasts", icon: Megaphone },
];
const configure = [
  { title: "Flow templates", url: "/connect/admin/flow-templates", icon: Workflow },
  {
    title: "WhatsApp templates",
    url: "/connect/admin/whatsapp-templates",
    icon: MessageSquareText,
  },
];
const insights = [
  { title: "Analytics", url: "/connect/admin/analytics", icon: BarChart3 },
  { title: "Logs", url: "/connect/admin/logs", icon: ScrollText },
];
const system = [
  { title: "Developers", url: "/connect/admin/developers", icon: Code2 },
  { title: "Settings", url: "/connect/admin/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/connect/admin"
      ? pathname === "/connect/admin"
      : pathname === url || pathname.startsWith(url + "/");

  const section = (label: string, items: typeof primary) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                  <FlowManagerFutureBadge route={item.url} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold">WA Business Admin</div>
            <div className="truncate text-xs text-muted-foreground">Internal console</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {section("Workspace", primary)}
        {section("Configure", configure)}
        {section("Insights", insights)}
        {section("System", system)}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <Link
          to="/connect/client"
          className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-2 py-2 mx-1 mb-1 text-xs text-primary hover:bg-primary/10 transition group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-0"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">View as client</span>
        </Link>
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:hidden">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
            RH
          </div>
          <div className="min-w-0 text-xs">
            <div className="truncate font-medium">Rania Haddad</div>
            <div className="truncate text-muted-foreground">Support lead</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
