import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Search, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/features/connect/flow-manager-ui/components/language-switcher";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
}

export function TopBar({ title, subtitle, actions, breadcrumbs }: TopBarProps) {
  const openPalette = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <SidebarTrigger />
        <div className="hidden md:block h-6 w-px bg-border mx-1" />
        <button
          type="button"
          onClick={openPalette}
          className="hidden md:flex w-72 items-center gap-2 rounded-md border bg-background h-9 px-2.5 text-left text-sm text-muted-foreground hover:bg-accent/50 transition"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 truncate">Search or jump to…</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            <LifeBuoy className="h-4 w-4" />
            <span className="hidden md:inline">Support</span>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className={cn("px-4 sm:px-6 pb-4", breadcrumbs ? "pt-3" : "pt-2")}>
        {breadcrumbs && <div className="mb-2 text-xs text-muted-foreground">{breadcrumbs}</div>}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
