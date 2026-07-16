import { LogOut, MessageCircleMore } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { ConnectWorkspace } from "./feature-registry";
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
  const title = workspace === "admin" ? "Internal admin" : "Business workspace";

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <SidebarProvider defaultOpen={!fullBleed}>
        <ConnectSidebar workspace={workspace} pathname={pathname} username={username} />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/92 px-3 backdrop-blur md:px-5">
            <SidebarTrigger />
            <div className="h-5 w-px bg-border" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{title}</div>
            </div>
            <Badge
              variant="outline"
              className="hidden border-emerald-500/35 bg-emerald-500/10 text-emerald-300 sm:inline-flex"
            >
              <MessageCircleMore className="mr-1.5 size-3" />
              WhatsApp only
            </Badge>
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <span className="hidden max-w-52 truncate text-xs text-muted-foreground sm:block">
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
          </header>
          <div
            className={cn(
              "min-w-0 flex-1",
              fullBleed
                ? "h-[calc(100svh-3.5rem)] overflow-hidden p-3"
                : "mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8",
            )}
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
