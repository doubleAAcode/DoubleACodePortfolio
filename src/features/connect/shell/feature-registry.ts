import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Blocks,
  Bot,
  Building2,
  Code2,
  ContactRound,
  CreditCard,
  FileText,
  GitBranch,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  MessageSquareText,
  Mic2,
  ScrollText,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
} from "lucide-react";

export type ConnectWorkspace = "admin" | "client";
export type ConnectFeatureStatus = "live" | "building" | "future";
export type ConnectFeatureGroup = "Operate" | "Build" | "Manage" | "Later";

export type ConnectFeature = {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  status: ConnectFeatureStatus;
  group: ConnectFeatureGroup;
  summary: string;
  capabilities: string[];
  legacyHref?: string;
  legacyLabel?: string;
};

export const adminFeatures: ConnectFeature[] = [
  {
    id: "overview",
    title: "Overview",
    href: "/connect/admin",
    icon: LayoutDashboard,
    status: "live",
    group: "Operate",
    summary: "Monitor the operational health of Double A Connect.",
    capabilities: ["Business totals", "Connection health", "Recent operational activity"],
  },
  {
    id: "businesses",
    title: "Businesses",
    href: "/connect/admin/businesses",
    icon: Building2,
    status: "live",
    group: "Operate",
    summary: "Onboard businesses and manage their WhatsApp commerce configuration.",
    capabilities: ["Business onboarding", "Catalog management", "Published flow assignment"],
  },
  {
    id: "inbox",
    title: "Live Ops",
    href: "/connect/admin/inbox",
    icon: Inbox,
    status: "future",
    group: "Operate",
    summary: "A cross-business operations inbox for intervention and escalation.",
    capabilities: ["Conversation monitoring", "Human takeover", "Assignment and escalation"],
  },
  {
    id: "flow-templates",
    title: "Flow Templates",
    href: "/connect/admin/flow-templates",
    icon: GitBranch,
    status: "live",
    group: "Build",
    summary: "Create, version, publish, and assign canonical conversation flows.",
    capabilities: ["Visual flow authoring", "Version history", "Business assignment"],
  },
  {
    id: "whatsapp-templates",
    title: "WA Templates",
    href: "/connect/admin/whatsapp-templates",
    icon: FileText,
    status: "live",
    group: "Build",
    summary: "Review and manage approved WhatsApp message templates.",
    capabilities: ["Template inventory", "Language variants", "Approval status"],
  },
  {
    id: "contacts",
    title: "Contacts",
    href: "/connect/admin/contacts",
    icon: ContactRound,
    status: "future",
    group: "Manage",
    summary: "Search and govern customer records across connected businesses.",
    capabilities: ["Customer profiles", "Conversation history", "Consent and tags"],
  },
  {
    id: "broadcasts",
    title: "Broadcasts",
    href: "/connect/admin/broadcasts",
    icon: Megaphone,
    status: "future",
    group: "Manage",
    summary: "Govern approved outbound WhatsApp campaigns and audience rules.",
    capabilities: ["Campaign review", "Audience safeguards", "Delivery reporting"],
  },
  {
    id: "logs",
    title: "Logs",
    href: "/connect/admin/logs",
    icon: ScrollText,
    status: "live",
    group: "Manage",
    summary: "Inspect webhook, message, and execution records.",
    capabilities: ["Webhook events", "Message events", "Failure diagnostics"],
  },
  {
    id: "analytics",
    title: "Analytics",
    href: "/connect/admin/analytics",
    icon: BarChart3,
    status: "future",
    group: "Later",
    summary: "Measure flow outcomes, response times, and commerce conversion.",
    capabilities: ["Flow completion", "Operator performance", "Order conversion"],
  },
  {
    id: "developers",
    title: "Developers",
    href: "/connect/admin/developers",
    icon: Code2,
    status: "future",
    group: "Later",
    summary: "Manage platform integrations, credentials, and delivery diagnostics.",
    capabilities: ["API credentials", "Webhook subscriptions", "Integration logs"],
  },
  {
    id: "settings",
    title: "Settings",
    href: "/connect/admin/settings",
    icon: Settings2,
    status: "future",
    group: "Later",
    summary: "Configure platform-wide policies and internal access.",
    capabilities: ["Access policy", "Operational defaults", "Audit controls"],
  },
];

export const clientFeatures: ConnectFeature[] = [
  {
    id: "home",
    title: "Home",
    href: "/connect/client",
    icon: LayoutDashboard,
    status: "live",
    group: "Operate",
    summary: "A live view of the business catalog, orders, and owner alerts.",
    capabilities: ["Business health", "Order snapshot", "Catalog snapshot"],
  },
  {
    id: "inbox",
    title: "Inbox",
    href: "/connect/client/inbox",
    icon: Inbox,
    status: "future",
    group: "Operate",
    summary: "Handle WhatsApp conversations that need a person.",
    capabilities: ["Shared inbox", "Human takeover", "Conversation assignment"],
  },
  {
    id: "automations",
    title: "Automations",
    href: "/connect/client/automations",
    icon: GitBranch,
    status: "building",
    group: "Build",
    summary: "Build deterministic WhatsApp conversation flows with guarded commerce actions.",
    capabilities: ["Message and question steps", "Branches and validation", "Order action nodes"],
  },
  {
    id: "templates",
    title: "Templates",
    href: "/connect/client/templates",
    icon: LayoutTemplate,
    status: "building",
    group: "Build",
    summary: "Start from reusable flows without weakening published version controls.",
    capabilities: ["Reusable starters", "Admin-approved templates", "Version-safe publishing"],
  },
  {
    id: "catalog",
    title: "Catalog",
    href: "/connect/client/catalog",
    icon: ShoppingBag,
    status: "live",
    group: "Manage",
    summary:
      "Manage the products, categories, variants, stock, and fulfillment catalog used by flows.",
    capabilities: ["Products and categories", "Variants and stock", "Delivery and pickup"],
    legacyHref: "/connect/dashboard/products",
    legacyLabel: "Open current catalog",
  },
  {
    id: "orders",
    title: "Orders",
    href: "/connect/client/orders",
    icon: ShoppingCart,
    status: "live",
    group: "Manage",
    summary: "Review and progress WhatsApp orders through the protected order lifecycle.",
    capabilities: ["Owner approval", "Fulfillment lifecycle", "Inventory reservations"],
    legacyHref: "/connect/dashboard/orders",
    legacyLabel: "Open current orders",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    href: "/connect/client/whatsapp",
    icon: Smartphone,
    status: "building",
    group: "Manage",
    summary: "View the business WhatsApp connection and messaging readiness.",
    capabilities: ["Connection status", "Phone number health", "Template readiness"],
  },
  {
    id: "settings",
    title: "Settings",
    href: "/connect/client/settings",
    icon: Settings2,
    status: "live",
    group: "Manage",
    summary: "Configure business language, checkout, fulfillment, and order behavior.",
    capabilities: ["Business defaults", "Checkout policy", "Order messages"],
    legacyHref: "/connect/dashboard/settings",
    legacyLabel: "Open current settings",
  },
  {
    id: "contacts",
    title: "Contacts",
    href: "/connect/client/contacts",
    icon: ContactRound,
    status: "future",
    group: "Later",
    summary: "Keep customer context, consent, tags, and conversation history together.",
    capabilities: ["Customer profiles", "Tags and attributes", "Consent history"],
  },
  {
    id: "broadcasts",
    title: "Broadcasts",
    href: "/connect/client/broadcasts",
    icon: Megaphone,
    status: "future",
    group: "Later",
    summary: "Send governed WhatsApp campaigns using approved templates.",
    capabilities: ["Audience selection", "Template campaigns", "Delivery results"],
  },
  {
    id: "ai-agent",
    title: "AI Agent",
    href: "/connect/client/ai-agent",
    icon: Sparkles,
    status: "future",
    group: "Later",
    summary:
      "A later intelligence layer that can assist deterministic flows without replacing them.",
    capabilities: ["Suggested replies", "Knowledge retrieval", "Guarded AI steps"],
  },
  {
    id: "voice",
    title: "Voice",
    href: "/connect/client/voice",
    icon: Mic2,
    status: "future",
    group: "Later",
    summary:
      "Future voice tooling beyond the scoped voice-note transcription and prerecorded replies.",
    capabilities: ["Voice library governance", "Transcription review", "Future voice experiences"],
  },
  {
    id: "payments",
    title: "Payments",
    href: "/connect/client/payments",
    icon: CreditCard,
    status: "future",
    group: "Later",
    summary: "Connect payment providers and reconcile payment outcomes with orders.",
    capabilities: ["Provider setup", "Payment links", "Reconciliation"],
  },
  {
    id: "analytics",
    title: "Analytics",
    href: "/connect/client/analytics",
    icon: BarChart3,
    status: "future",
    group: "Later",
    summary: "Understand customer journeys, automation outcomes, and commerce conversion.",
    capabilities: ["Conversation funnels", "Automation outcomes", "Order conversion"],
  },
  {
    id: "other-channels",
    title: "Other Channels",
    href: "/connect/client/other-channels",
    icon: MessageSquareText,
    status: "future",
    group: "Later",
    summary: "Extend the platform beyond WhatsApp only after the WhatsApp product is dependable.",
    capabilities: ["Channel adapters", "Unified identity", "Cross-channel routing"],
  },
  {
    id: "integrations",
    title: "Integrations",
    href: "/connect/client/integrations",
    icon: Blocks,
    status: "future",
    group: "Later",
    summary: "Connect external business systems to messaging and order workflows.",
    capabilities: ["Commerce connectors", "CRM synchronization", "Event delivery"],
  },
  {
    id: "developers",
    title: "Developers",
    href: "/connect/client/developers",
    icon: Code2,
    status: "future",
    group: "Later",
    summary: "Developer controls for business-owned integrations and event subscriptions.",
    capabilities: ["API credentials", "Webhooks", "Request logs"],
  },
];

export function getConnectFeatures(workspace: ConnectWorkspace) {
  return workspace === "admin" ? adminFeatures : clientFeatures;
}

export function getConnectFeature(workspace: ConnectWorkspace, id: string) {
  return getConnectFeatures(workspace).find((feature) => feature.id === id);
}

export function isConnectFeatureActive(pathname: string, feature: ConnectFeature) {
  if (feature.href === "/connect/admin" || feature.href === "/connect/client") {
    return pathname === feature.href;
  }
  return pathname === feature.href || pathname.startsWith(`${feature.href}/`);
}
