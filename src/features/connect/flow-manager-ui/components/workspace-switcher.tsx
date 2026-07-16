import { useState } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { clientWorkspaces } from "@/features/connect/flow-manager-ui/preview-data/mock-client";

export function WorkspaceSwitcher() {
  const [current, setCurrent] = useState(clientWorkspaces[0]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border bg-background px-2.5 h-9 text-sm hover:bg-accent/50 transition min-w-[220px]">
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded bg-primary text-primary-foreground text-[10px] font-semibold">
          {current.logo}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm font-medium">{current.name}</div>
          <div className="truncate text-[10px] text-muted-foreground">{current.plan} · {current.waNumber}</div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {clientWorkspaces.map((w) => (
          <DropdownMenuItem key={w.id} onClick={() => setCurrent(w)}>
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-muted text-xs font-semibold">
              {w.logo}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{w.name}</div>
              <div className="text-[11px] text-muted-foreground">{w.plan} · {w.channels.length} channels</div>
            </div>
            {w.id === current.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Building2 className="mr-2 h-4 w-4" /> Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
