import { Bell, LogOut, MessageCircleMore, Search } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  getConnectFeatures,
  isConnectFeatureActive,
  type ConnectWorkspace,
} from "./feature-registry";
import { ConnectSidebar } from "./connect-sidebar";

export function ConnectWorkspaceShell({
  workspace,
  pathname,
  username,
  onSignOut,
  fullBleed = false,
  children,
}: {
  workspace: ConnectWorkspace;
  pathname: string;
  username: string;
  onSignOut: () => void;
  fullBleed?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.add("connect-flow-manager-theme");
    return () => document.documentElement.classList.remove("connect-flow-manager-theme");
  }, []);

  const feature = getConnectFeatures(workspace).find((item) =>
    isConnectFeatureActive(pathname, item),
  );
  const workspaceLabel = workspace === "admin" ? "Internal console" : "Business workspace";

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SidebarProvider defaultOpen>
        <ConnectSidebar workspace={workspace} pathname={pathname} username={username} />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
            <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
              <SidebarTrigger />
              <div className="mx-1 hidden h-6 w-px bg-border md:block" />
              <div className="hidden min-w-0 md:block">
                <div className="truncate text-sm font-medium">{workspaceLabel}</div>
                <div className="truncate text-[11px] text-muted-foreground">WhatsApp workspace</div>
              </div>
              <button
                type="button"
                className="ml-2 hidden h-9 w-64 items-center gap-2 rounded-md border bg-background px-2.5 text-left text-sm text-muted-foreground transition hover:bg-accent/50 lg:flex"
                title="Future work: workspace search and command palette"
              >
                <Search className="size-4" />
                <span className="flex-1 truncate">Search or jump to...</span>
                <Badge variant="secondary" className="h-5 px-1.5 text-[9px]">
                  Future
                </Badge>
              </button>
              <div className="ml-auto flex min-w-0 items-center gap-1.5">
                <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 sm:inline-flex">
                  <MessageCircleMore className="size-3.5" />
                  WhatsApp only
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Notifications">
                      <Bell className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Future work: workspace notifications</TooltipContent>
                </Tooltip>
                <span className="hidden max-w-36 truncate text-xs text-muted-foreground sm:block">
                  {username}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={onSignOut}
                      aria-label="Sign out"
                    >
                      <LogOut className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign out</TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-2 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-semibold tracking-normal sm:text-2xl">
                    {feature?.title ?? "Double A Connect"}
                  </h1>
                  {feature?.status && feature.status !== "live" ? (
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {feature.status === "future" ? "Future work" : "Building"}
                    </Badge>
                  ) : null}
                </div>
                {feature?.summary ? (
                  <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
                    {feature.summary}
                  </p>
                ) : null}
              </div>
            </div>
          </header>
          <main
            className={cn(
              "min-w-0 flex-1",
              fullBleed
                ? "min-h-[calc(100svh-7.75rem)] p-4 sm:p-6"
                : "mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6",
            )}
          >
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
