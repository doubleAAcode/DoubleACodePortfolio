import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { businesses } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { contacts, conversations, metaTemplates } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { multiChannelConversations, integrations, automations } from "@/features/connect/flow-manager-ui/preview-data/mock-client";
import {
  Building2, Users, Inbox, MessageSquareText, Megaphone, BarChart3,
  Workflow, Settings, Plus, Code2, Home, Sparkles, Radio, Blocks, ExternalLink,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const inClient = pathname.startsWith("/connect/client");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: to as any });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={inClient ? "Search your workspace…" : "Search or run a command…"} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {inClient ? (
          <>
            <CommandGroup heading="Go to">
              <CommandItem onSelect={() => go("/connect/client")}><Home className="mr-2 h-4 w-4" />Home</CommandItem>
              <CommandItem onSelect={() => go("/connect/client/inbox")}><Inbox className="mr-2 h-4 w-4" />Inbox</CommandItem>
              <CommandItem onSelect={() => go("/connect/client/contacts")}><Users className="mr-2 h-4 w-4" />Contacts</CommandItem>
              <CommandItem onSelect={() => go("/connect/client/broadcasts")}><Megaphone className="mr-2 h-4 w-4" />Broadcasts</CommandItem>
              <CommandItem onSelect={() => go("/connect/client/automations")}><Workflow className="mr-2 h-4 w-4" />Automations</CommandItem>
              <CommandItem onSelect={() => go("/connect/client/ai-agent")}><Sparkles className="mr-2 h-4 w-4" />AI Agent</CommandItem>
              <CommandItem onSelect={() => go("/connect/client/templates")}><MessageSquareText className="mr-2 h-4 w-4" />Templates</CommandItem>
              <CommandItem onSelect={() => go("/connect/client/analytics")}><BarChart3 className="mr-2 h-4 w-4" />Analytics</CommandItem>
              <CommandItem onSelect={() => go("/connect/client/channels")}><Radio className="mr-2 h-4 w-4" />Channels</CommandItem>
              <CommandItem onSelect={() => go("/connect/client/integrations")}><Blocks className="mr-2 h-4 w-4" />Integrations</CommandItem>
              <CommandItem onSelect={() => go("/connect/client/developers")}><Code2 className="mr-2 h-4 w-4" />Developers</CommandItem>
              <CommandItem onSelect={() => go("/connect/client/settings")}><Settings className="mr-2 h-4 w-4" />Settings</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Switch">
              <CommandItem onSelect={() => go("/connect/admin")}><ExternalLink className="mr-2 h-4 w-4" />Back to Admin console</CommandItem>
            </CommandGroup>
            <CommandGroup heading="Conversations">
              {multiChannelConversations.slice(0, 5).map((c) => (
                <CommandItem key={c.id} onSelect={() => go("/connect/client/inbox")}>
                  <Inbox className="mr-2 h-4 w-4" />{c.contactName} · {c.channel}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Automations">
              {automations.slice(0, 5).map((a) => (
                <CommandItem key={a.id} onSelect={() => go("/connect/client/automations")}>
                  <Workflow className="mr-2 h-4 w-4" />{a.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Integrations">
              {integrations.slice(0, 5).map((i) => (
                <CommandItem key={i.id} onSelect={() => go("/connect/client/integrations")}>
                  <Blocks className="mr-2 h-4 w-4" />{i.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : (
          <>
            <CommandGroup heading="Go to">
              <CommandItem onSelect={() => go("/connect/admin")}><BarChart3 className="mr-2 h-4 w-4" />Overview</CommandItem>
              <CommandItem onSelect={() => go("/connect/admin/inbox")}><Radio className="mr-2 h-4 w-4" />Live Ops</CommandItem>
              <CommandItem onSelect={() => go("/connect/admin/contacts")}><Users className="mr-2 h-4 w-4" />Contacts</CommandItem>
              <CommandItem onSelect={() => go("/connect/admin/businesses")}><Building2 className="mr-2 h-4 w-4" />Businesses</CommandItem>
              <CommandItem onSelect={() => go("/connect/admin/broadcasts")}><Megaphone className="mr-2 h-4 w-4" />Broadcasts</CommandItem>
              <CommandItem onSelect={() => go("/connect/admin/analytics")}><BarChart3 className="mr-2 h-4 w-4" />Analytics</CommandItem>
              <CommandItem onSelect={() => go("/connect/admin/flow-templates")}><Workflow className="mr-2 h-4 w-4" />Flow templates</CommandItem>
              <CommandItem onSelect={() => go("/connect/admin/whatsapp-templates")}><MessageSquareText className="mr-2 h-4 w-4" />WhatsApp templates</CommandItem>
              <CommandItem onSelect={() => go("/connect/admin/developers")}><Code2 className="mr-2 h-4 w-4" />Developers</CommandItem>
              <CommandItem onSelect={() => go("/connect/admin/settings")}><Settings className="mr-2 h-4 w-4" />Settings</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => go("/connect/admin/broadcasts/new")}><Plus className="mr-2 h-4 w-4" />New broadcast</CommandItem>
              <CommandItem onSelect={() => go("/connect/admin/settings/team")}><Plus className="mr-2 h-4 w-4" />Invite teammate</CommandItem>
              <CommandItem onSelect={() => go("/connect/client")}><ExternalLink className="mr-2 h-4 w-4" />Open client dashboard preview</CommandItem>
            </CommandGroup>
            <CommandGroup heading="Businesses">
              {businesses.map((b) => (
                <CommandItem key={b.id} onSelect={() => go(`/connect/admin/businesses/${b.id}`)}>
                  <Building2 className="mr-2 h-4 w-4" />{b.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Conversations">
              {conversations.slice(0, 5).map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`/connect/admin/inbox/${c.id}`)}>
                  <Inbox className="mr-2 h-4 w-4" />{c.contactName} · {c.business}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Contacts">
              {contacts.slice(0, 5).map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`/connect/admin/contacts/${c.id}`)}>
                  <Users className="mr-2 h-4 w-4" />{c.name} · {c.phone}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Templates">
              {metaTemplates.slice(0, 5).map((t) => (
                <CommandItem key={t.id} onSelect={() => go("/connect/admin/whatsapp-templates")}>
                  <MessageSquareText className="mr-2 h-4 w-4" />{t.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
