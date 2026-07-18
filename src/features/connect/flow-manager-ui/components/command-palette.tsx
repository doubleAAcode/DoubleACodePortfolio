import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Blocks,
  Building2,
  Code2,
  ExternalLink,
  Home,
  Inbox,
  Megaphone,
  MessageSquareText,
  Plus,
  Radio,
  Settings,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getInboxConversations } from "@/features/connect/flow-manager-ui/inbox-client";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (route) => route.location.pathname });
  const inClient = pathname.startsWith("/connect/client");
  const conversationQuery = useQuery({
    queryKey: ["connect", "command-palette", inClient ? "client" : "admin"],
    queryFn: () => getInboxConversations(inClient ? "client" : "admin", { limit: 5 }),
    enabled: open,
    staleTime: 30_000,
  });
  const conversations = conversationQuery.data?.items ?? [];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    // TanStack's generated route union cannot represent this shared palette's dynamic links.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: to as any });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={inClient ? "Search your workspace..." : "Search or run a command..."}
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {inClient ? (
          <>
            <CommandGroup heading="Go to">
              <PaletteItem icon={<Home />} label="Home" onSelect={() => go("/connect/client")} />
              <PaletteItem
                icon={<Inbox />}
                label="Inbox"
                onSelect={() => go("/connect/client/inbox")}
              />
              <PaletteItem
                icon={<Users />}
                label="Contacts"
                onSelect={() => go("/connect/client/contacts")}
              />
              <PaletteItem
                icon={<Megaphone />}
                label="Broadcasts"
                onSelect={() => go("/connect/client/broadcasts")}
              />
              <PaletteItem
                icon={<Workflow />}
                label="Automations"
                onSelect={() => go("/connect/client/automations")}
              />
              <PaletteItem
                icon={<Sparkles />}
                label="AI Agent"
                onSelect={() => go("/connect/client/ai-agent")}
              />
              <PaletteItem
                icon={<MessageSquareText />}
                label="Templates"
                onSelect={() => go("/connect/client/templates")}
              />
              <PaletteItem
                icon={<BarChart3 />}
                label="Analytics"
                onSelect={() => go("/connect/client/analytics")}
              />
              <PaletteItem
                icon={<Radio />}
                label="Channels"
                onSelect={() => go("/connect/client/channels")}
              />
              <PaletteItem
                icon={<Blocks />}
                label="Integrations"
                onSelect={() => go("/connect/client/integrations")}
              />
              <PaletteItem
                icon={<Code2 />}
                label="Developers"
                onSelect={() => go("/connect/client/developers")}
              />
              <PaletteItem
                icon={<Settings />}
                label="Settings"
                onSelect={() => go("/connect/client/settings")}
              />
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Switch">
              <PaletteItem
                icon={<ExternalLink />}
                label="Back to Admin console"
                onSelect={() => go("/connect/admin")}
              />
            </CommandGroup>
            <ConversationCommands client conversations={conversations} onGo={go} />
          </>
        ) : (
          <>
            <CommandGroup heading="Go to">
              <PaletteItem
                icon={<BarChart3 />}
                label="Overview"
                onSelect={() => go("/connect/admin")}
              />
              <PaletteItem
                icon={<Radio />}
                label="Live Ops"
                onSelect={() => go("/connect/admin/inbox")}
              />
              <PaletteItem
                icon={<Users />}
                label="Contacts"
                onSelect={() => go("/connect/admin/contacts")}
              />
              <PaletteItem
                icon={<Building2 />}
                label="Businesses"
                onSelect={() => go("/connect/admin/businesses")}
              />
              <PaletteItem
                icon={<Megaphone />}
                label="Broadcasts"
                onSelect={() => go("/connect/admin/broadcasts")}
              />
              <PaletteItem
                icon={<BarChart3 />}
                label="Analytics"
                onSelect={() => go("/connect/admin/analytics")}
              />
              <PaletteItem
                icon={<Workflow />}
                label="Flow templates"
                onSelect={() => go("/connect/admin/flow-templates")}
              />
              <PaletteItem
                icon={<MessageSquareText />}
                label="WhatsApp templates"
                onSelect={() => go("/connect/admin/whatsapp-templates")}
              />
              <PaletteItem
                icon={<Code2 />}
                label="Developers"
                onSelect={() => go("/connect/admin/developers")}
              />
              <PaletteItem
                icon={<Settings />}
                label="Settings"
                onSelect={() => go("/connect/admin/settings")}
              />
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <PaletteItem
                icon={<Plus />}
                label="New broadcast"
                onSelect={() => go("/connect/admin/broadcasts/new")}
              />
              <PaletteItem
                icon={<Plus />}
                label="Invite teammate"
                onSelect={() => go("/connect/admin/settings/team")}
              />
              <PaletteItem
                icon={<ExternalLink />}
                label="Open client dashboard"
                onSelect={() => go("/connect/client")}
              />
            </CommandGroup>
            <ConversationCommands conversations={conversations} onGo={go} />
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function ConversationCommands({
  client = false,
  conversations,
  onGo,
}: {
  client?: boolean;
  conversations: Awaited<ReturnType<typeof getInboxConversations>>["items"];
  onGo: (path: string) => void;
}) {
  if (conversations.length === 0) return null;

  return (
    <CommandGroup heading="Conversations">
      {conversations.map((conversation) => (
        <CommandItem
          key={conversation.id}
          onSelect={() =>
            onGo(client ? "/connect/client/inbox" : `/connect/admin/inbox/${conversation.id}`)
          }
        >
          <Inbox className="mr-2 h-4 w-4" />
          {conversation.contact.displayName} - {client ? "WhatsApp" : conversation.business.name}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

function PaletteItem({
  icon,
  label,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem onSelect={onSelect}>
      <span className="mr-2 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </CommandItem>
  );
}
