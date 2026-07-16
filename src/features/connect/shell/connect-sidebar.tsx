import { ArrowLeftRight, Bot, ShieldCheck } from "lucide-react";

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
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import {
  getConnectFeatures,
  isConnectFeatureActive,
  type ConnectFeatureGroup,
  type ConnectWorkspace,
} from "./feature-registry";

const groups: ConnectFeatureGroup[] = ["Operate", "Build", "Manage", "Later"];

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
  const isAdmin = workspace === "admin";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <a
          href={isAdmin ? "/connect/admin" : "/connect/client"}
          className="flex items-center gap-3"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            {isAdmin ? <ShieldCheck className="size-5" /> : <Bot className="size-5" />}
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate font-display text-sm font-semibold">
              Double A Connect
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {isAdmin ? "Internal admin" : "Business workspace"}
            </span>
          </span>
        </a>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => {
          const groupFeatures = features.filter((feature) => feature.group === group);
          if (!groupFeatures.length) return null;
          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel>{group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupFeatures.map((feature) => {
                    const Icon = feature.icon;
                    const active = isConnectFeatureActive(pathname, feature);
                    return (
                      <SidebarMenuItem key={feature.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={`${feature.title} - ${feature.status === "future" ? "Future work" : feature.status}`}
                          className={cn(
                            feature.status !== "live" && "pr-14",
                            feature.status === "future" && "text-muted-foreground/65",
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
                                ? "text-amber-300"
                                : "text-muted-foreground/70",
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

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={isAdmin ? "Open client workspace" : "Open admin workspace"}
            >
              <a href={isAdmin ? "/connect/client" : "/connect/admin"}>
                <ArrowLeftRight />
                <span>{isAdmin ? "Client workspace" : "Admin workspace"}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="truncate px-2 pt-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          {username}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
