import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClientWorkspaceSummary } from "@/features/connect/flow-manager-ui/client-workspace";

export function WorkspaceSwitcher() {
  const workspace = useClientWorkspaceSummary();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-9 min-w-[220px] items-center gap-2 rounded-md border bg-background px-2.5 text-sm transition hover:bg-accent/50">
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded bg-primary text-[10px] font-semibold text-primary-foreground">
          {workspace.initials}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm font-medium">{workspace.name}</div>
          <div className="truncate text-[10px] text-muted-foreground">WhatsApp workspace</div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Current workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-muted text-xs font-semibold">
            {workspace.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{workspace.name}</div>
            <div className="text-[11px] text-muted-foreground">WhatsApp</div>
          </div>
          <Check className="h-4 w-4" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-flow-manager-live-action
          onSelect={() =>
            toast.info("Future work", {
              description:
                "Additional client workspaces will be available after multi-business onboarding.",
            })
          }
        >
          <Building2 className="mr-2 h-4 w-4" />
          Add workspace
          <FutureLabel />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FutureLabel() {
  return (
    <span className="ml-auto rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800">
      Future
    </span>
  );
}
