import { FlowManagerFutureBadge } from "@/features/connect/flow-manager-ui/future-badge";
import { useClientWorkspaceSummary } from "@/features/connect/flow-manager-ui/client-workspace";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Inbox,
  Users,
  Megaphone,
  Workflow,
  MessageSquareText,
  BarChart3,
  Radio,
  Sparkles,
  Blocks,
  Code2,
  Settings,
  ArrowLeft,
  Mic,
  Package,
  CreditCard,
  ShieldCheck,
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
import { Badge } from "@/components/ui/badge";

const workspace = [
  { title: "Home", url: "/connect/client", icon: Home },
  { title: "Inbox", url: "/connect/client/inbox", icon: Inbox },
  { title: "Contacts", url: "/connect/client/contacts", icon: Users },
  { title: "Broadcasts", url: "/connect/client/broadcasts", icon: Megaphone },
];
const automate = [
  { title: "Automations", url: "/connect/client/automations", icon: Workflow },
  { title: "AI Agent", url: "/connect/client/ai-agent", icon: Sparkles },
  { title: "Voice", url: "/connect/client/voice", icon: Mic },
  { title: "Templates", url: "/connect/client/templates", icon: MessageSquareText },
];
const commerce = [
  { title: "Catalog", url: "/connect/client/catalog", icon: Package },
  { title: "Payments", url: "/connect/client/payments", icon: CreditCard },
];
const grow = [
  { title: "Analytics", url: "/connect/client/analytics", icon: BarChart3 },
  { title: "Channels", url: "/connect/client/channels", icon: Radio },
  { title: "Integrations", url: "/connect/client/integrations", icon: Blocks },
];
const dev = [
  { title: "Developers", url: "/connect/client/developers", icon: Code2 },
  { title: "Enterprise", url: "/connect/client/enterprise", icon: ShieldCheck },
  { title: "Settings", url: "/connect/client/settings", icon: Settings },
];

export function ClientSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const workspaceSummary = useClientWorkspaceSummary();
  const isActive = (url: string) =>
    url === "/connect/client"
      ? pathname === "/connect/client"
      : pathname === url || pathname.startsWith(url + "/");

  const section = (label: string, items: typeof workspace) => (
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
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs font-bold">
            {workspaceSummary.initials}
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden flex-1">
            <div className="truncate text-sm font-semibold">{workspaceSummary.name}</div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                CLIENT
              </Badge>
              <span className="truncate text-[10px] text-muted-foreground">Client dashboard</span>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {section("Workspace", workspace)}
        {section("Automate", automate)}
        {section("Commerce", commerce)}
        {section("Grow", grow)}
        {section("System", dev)}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <Link
          to="/connect/admin"
          className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition group-data-[collapsible=icon]:justify-center"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="group-data-[collapsible=icon]:hidden">Back to Admin</span>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
