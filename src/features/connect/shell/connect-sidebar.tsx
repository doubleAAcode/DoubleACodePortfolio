import { ExternalLink, MessageCircle } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import {
  getConnectFeatures,
  isConnectFeatureActive,
  type ConnectFeature,
  type ConnectWorkspace,
} from "./feature-registry";

const adminSections = [
  { label: "Workspace", ids: ["overview", "inbox", "contacts", "businesses", "broadcasts"] },
  { label: "Configure", ids: ["flow-templates", "whatsapp-templates"] },
  { label: "Insights", ids: ["analytics", "logs"] },
  { label: "System", ids: ["developers", "settings"] },
];

const clientSections = [
  { label: "Workspace", ids: ["home", "inbox", "contacts", "broadcasts"] },
  { label: "Automate", ids: ["automations", "ai-agent", "voice", "templates"] },
  { label: "Commerce", ids: ["catalog", "orders", "payments"] },
  { label: "Grow", ids: ["analytics", "whatsapp", "other-channels", "integrations"] },
  { label: "System", ids: ["developers", "enterprise", "settings"] },
];

export function ConnectSidebar({
  workspace,
  pathname,
  username,
}: {
  workspace: ConnectWorkspace;
  pathname: string;
  username: string;
}) {
  const features = getConnectFeatures(workspace);
  const featureById = new Map(features.map((feature) => [feature.id, feature]));
  const sections = workspace === "admin" ? adminSections : clientSections;
  const isAdmin = workspace === "admin";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <a
          href={isAdmin ? "/connect/admin" : "/connect/client"}
          className="flex items-center gap-2 px-2 py-2"
        >
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <MessageCircle className="size-4" />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold">Double A Connect</div>
            <div className="truncate text-xs text-muted-foreground">
              {isAdmin ? "Internal console" : "Client dashboard"}
            </div>
          </div>
        </a>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => {
          const items = section.ids
            .map((id) => featureById.get(id))
            .filter((feature): feature is ConnectFeature => Boolean(feature));
          if (!items.length) return null;
          return (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <SidebarMenuItem key={feature.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isConnectFeatureActive(pathname, feature)}
                          tooltip={`${feature.title} - ${feature.status === "future" ? "Future work" : feature.status}`}
                          className={cn(
                            feature.status !== "live" && "pr-14",
                            feature.status === "future" && "text-muted-foreground",
                          )}
                        >
                          <a href={feature.href}>
                            <Icon />
                            <span>{feature.title}</span>
                          </a>
                        </SidebarMenuButton>
                        {feature.status !== "live" ? (
                          <SidebarMenuBadge
                            className={cn(
                              "text-[9px] uppercase",
                              feature.status === "building"
                                ? "text-amber-700"
                                : "text-muted-foreground",
                            )}
                          >
                            {feature.status === "building" ? "Build" : "Future"}
                          </SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <a
          href={isAdmin ? "/connect/client" : "/connect/admin"}
          className="mx-1 mb-1 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2 py-2 text-xs text-primary transition hover:bg-primary/10 group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <ExternalLink className="size-3.5 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">
            {isAdmin ? "View as client" : "Open admin console"}
          </span>
        </a>
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:hidden">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initials(username)}
          </div>
          <div className="min-w-0 text-xs">
            <div className="truncate font-medium">{username}</div>
            <div className="truncate text-muted-foreground">
              {isAdmin ? "Internal user" : "Workspace owner"}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function initials(value: string) {
  const letters = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return letters || "DA";
}
