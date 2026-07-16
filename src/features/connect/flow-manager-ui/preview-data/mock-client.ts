// Mock data for the client-facing dashboard (phase-2 preview).
// Multi-tenant workspaces, multi-channel conversations, automations,
// AI agent config, integrations, channels, billing.

export type Channel = "whatsapp" | "instagram" | "messenger" | "webchat" | "email" | "sms";

export interface ClientWorkspace {
  id: string;
  name: string;
  logo: string; // initials
  plan: "Starter" | "Growth" | "Scale" | "Enterprise";
  waNumber: string;
  channels: Channel[];
}

export const clientWorkspaces: ClientWorkspace[] = [
  { id: "ws_atlas", name: "Atlas Electronics", logo: "AE", plan: "Growth", waNumber: "+971 4 555 0100", channels: ["whatsapp", "instagram", "webchat", "email"] },
  { id: "ws_saffron", name: "Saffron Kitchen", logo: "SK", plan: "Scale", waNumber: "+974 4 411 8800", channels: ["whatsapp", "messenger", "instagram"] },
  { id: "ws_verdant", name: "Verdant Pharmacy", logo: "VP", plan: "Starter", waNumber: "+966 11 300 4400", channels: ["whatsapp", "sms"] },
];

export interface MCConversation {
  id: string;
  channel: Channel;
  contactName: string;
  contactHandle: string;
  initials: string;
  lastMessage: string;
  lastAt: string; // ISO
  unread: number;
  assignee: string | null;
  status: "open" | "pending" | "closed";
  tags: string[];
  messages: { id: string; from: "customer" | "agent" | "ai"; text: string; ts: string }[];
}

const now = Date.now();
const iso = (m: number) => new Date(now - m * 60000).toISOString();

export const multiChannelConversations: MCConversation[] = [
  {
    id: "mc_001", channel: "whatsapp", contactName: "Fatima Al-Sayed", contactHandle: "+971 50 991 0022",
    initials: "FA", lastMessage: "Can I return the wireless earbuds?", lastAt: iso(3), unread: 2,
    assignee: "You", status: "open", tags: ["returns", "VIP"],
    messages: [
      { id: "1", from: "customer", text: "Hi, order #A2381", ts: iso(12) },
      { id: "2", from: "ai", text: "I found your order — delivered Nov 3. What can I help with?", ts: iso(11) },
      { id: "3", from: "customer", text: "Can I return the wireless earbuds?", ts: iso(3) },
    ],
  },
  {
    id: "mc_002", channel: "instagram", contactName: "@yasmin.travels", contactHandle: "Yasmin K.",
    initials: "YK", lastMessage: "Do you ship to Kuwait?", lastAt: iso(18), unread: 1,
    assignee: null, status: "open", tags: ["preorder"],
    messages: [
      { id: "1", from: "customer", text: "Saw your reel — do you ship to Kuwait?", ts: iso(18) },
    ],
  },
  {
    id: "mc_003", channel: "messenger", contactName: "Karim Boutros", contactHandle: "karim.b",
    initials: "KB", lastMessage: "Thanks!", lastAt: iso(42), unread: 0,
    assignee: "Layla M.", status: "closed", tags: [],
    messages: [
      { id: "1", from: "customer", text: "Is the store open today?", ts: iso(65) },
      { id: "2", from: "agent", text: "Yes, until 10pm.", ts: iso(60) },
      { id: "3", from: "customer", text: "Thanks!", ts: iso(42) },
    ],
  },
  {
    id: "mc_004", channel: "webchat", contactName: "Anon visitor", contactHandle: "visitor #4471",
    initials: "AV", lastMessage: "Speak to a human", lastAt: iso(2), unread: 3,
    assignee: null, status: "open", tags: ["escalated"],
    messages: [
      { id: "1", from: "customer", text: "hi", ts: iso(5) },
      { id: "2", from: "ai", text: "Hi! What can I help with?", ts: iso(5) },
      { id: "3", from: "customer", text: "Speak to a human", ts: iso(2) },
    ],
  },
  {
    id: "mc_005", channel: "email", contactName: "procurement@retailco.ae", contactHandle: "RetailCo Ltd",
    initials: "RC", lastMessage: "Quote request — bulk order 200 units", lastAt: iso(95), unread: 1,
    assignee: null, status: "pending", tags: ["b2b", "quote"],
    messages: [
      { id: "1", from: "customer", text: "Hello — we'd like a quote for 200 units of the Pro model.", ts: iso(95) },
    ],
  },
];

export interface Automation {
  id: string;
  name: string;
  status: "active" | "paused" | "draft";
  trigger: string;
  runs30d: number;
  successRate: number;
  updated: string;
}

export const automations: Automation[] = [
  { id: "auto_1", name: "Welcome new contact + tag source", status: "active", trigger: "New contact", runs30d: 1284, successRate: 98, updated: iso(60 * 24 * 2) },
  { id: "auto_2", name: "Abandoned cart recovery (24h)", status: "active", trigger: "Webhook: shopify.cart.abandoned", runs30d: 412, successRate: 94, updated: iso(60 * 24 * 6) },
  { id: "auto_3", name: "Post-purchase CSAT + Slack alert on low score", status: "active", trigger: "Conversation closed", runs30d: 306, successRate: 100, updated: iso(60 * 24 * 1) },
  { id: "auto_4", name: "Re-engagement — 30d inactive", status: "paused", trigger: "Inactivity 30d", runs30d: 0, successRate: 0, updated: iso(60 * 24 * 14) },
  { id: "auto_5", name: "Route VIP keyword to senior agent", status: "draft", trigger: "Keyword: complaint|urgent", runs30d: 0, successRate: 0, updated: iso(60 * 3) },
];

export interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  installed: boolean;
  logoColor: string;
}

export const integrations: Integration[] = [
  { id: "shopify", name: "Shopify", category: "E-commerce", description: "Sync orders, abandoned carts, customer segments.", installed: true, logoColor: "bg-emerald-500" },
  { id: "hubspot", name: "HubSpot", category: "CRM", description: "Two-way contact sync and deal creation.", installed: true, logoColor: "bg-orange-500" },
  { id: "salesforce", name: "Salesforce", category: "CRM", description: "Enterprise CRM sync and case creation.", installed: false, logoColor: "bg-sky-500" },
  { id: "zapier", name: "Zapier", category: "Automation", description: "Connect to 6,000+ apps via Zapier triggers.", installed: true, logoColor: "bg-orange-600" },
  { id: "make", name: "Make", category: "Automation", description: "Visual workflow automation.", installed: false, logoColor: "bg-purple-500" },
  { id: "sheets", name: "Google Sheets", category: "Productivity", description: "Log contacts and conversations to a spreadsheet.", installed: true, logoColor: "bg-green-600" },
  { id: "zendesk", name: "Zendesk", category: "Support", description: "Sync tickets and conversation history.", installed: false, logoColor: "bg-lime-600" },
  { id: "stripe", name: "Stripe", category: "Payments", description: "Send payment links inside conversations.", installed: false, logoColor: "bg-indigo-500" },
  { id: "meta-ads", name: "Meta Ads", category: "Growth", description: "Click-to-WhatsApp ads attribution.", installed: true, logoColor: "bg-blue-600" },
  { id: "slack", name: "Slack", category: "Team", description: "Notify channels on escalations and CSAT alerts.", installed: true, logoColor: "bg-fuchsia-500" },
  { id: "calendly", name: "Calendly", category: "Scheduling", description: "Send booking links and confirm meetings.", installed: false, logoColor: "bg-cyan-500" },
  { id: "gorgias", name: "Gorgias", category: "Support", description: "E-commerce helpdesk sync.", installed: false, logoColor: "bg-rose-500" },
];

export interface ChannelStatus {
  channel: Channel;
  label: string;
  handle: string;
  status: "connected" | "action-required" | "disconnected";
  quality?: "green" | "yellow" | "red";
  tier?: string;
}

export const channelStatuses: ChannelStatus[] = [
  { channel: "whatsapp", label: "WhatsApp Business", handle: "+971 4 555 0100", status: "connected", quality: "green", tier: "Tier 3 (100K/day)" },
  { channel: "instagram", label: "Instagram DM", handle: "@atlas.electronics", status: "connected", quality: "green" },
  { channel: "messenger", label: "Facebook Messenger", handle: "Atlas Electronics", status: "action-required", quality: "yellow" },
  { channel: "webchat", label: "Website chat", handle: "atlaselectronics.ae", status: "connected", quality: "green" },
  { channel: "email", label: "Email", handle: "hello@atlaselectronics.ae", status: "connected", quality: "green" },
  { channel: "sms", label: "SMS", handle: "not configured", status: "disconnected" },
];

export interface BillingLine {
  category: "Marketing" | "Utility" | "Authentication" | "Service";
  conversations: number;
  unitCost: number;
  total: number;
}
export const billingUsage: BillingLine[] = [
  { category: "Marketing", conversations: 4820, unitCost: 0.0483, total: 232.81 },
  { category: "Utility", conversations: 12440, unitCost: 0.0071, total: 88.32 },
  { category: "Authentication", conversations: 2100, unitCost: 0.0294, total: 61.74 },
  { category: "Service", conversations: 8900, unitCost: 0, total: 0 },
];

export const aiAgentConfig = {
  enabled: true,
  name: "Atlas Assistant",
  persona: "Friendly, concise, on-brand for a premium electronics retailer. Never promise what isn't in the catalog.",
  guardrails: [
    "Never discuss competitor prices.",
    "Escalate any refund request over AED 500 to a human agent.",
    "Reply in the customer's language (Arabic or English).",
  ],
  knowledgeSources: [
    { id: "k1", name: "Product catalog", kind: "url", value: "atlaselectronics.ae/products", updated: iso(60 * 12) },
    { id: "k2", name: "Return & warranty policy", kind: "doc", value: "returns-policy.pdf", updated: iso(60 * 48) },
    { id: "k3", name: "Store locations & hours", kind: "faq", value: "24 entries", updated: iso(60 * 24 * 5) },
    { id: "k4", name: "Shipping zones", kind: "sheet", value: "shipping.xlsx", updated: iso(60 * 24 * 9) },
  ],
  channels: { whatsapp: true, instagram: true, messenger: true, webchat: true, email: false, sms: false },
};

export const clientKpis = {
  conversationsToday: 342,
  responseTimeMedianSec: 47,
  csatPct: 94,
  aiDeflectionPct: 68,
  openByChannel: [
    { channel: "WhatsApp", value: 156 },
    { channel: "Instagram", value: 44 },
    { channel: "Messenger", value: 22 },
    { channel: "Webchat", value: 61 },
    { channel: "Email", value: 18 },
  ],
  volumeSeries: Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`,
    conversations: 180 + Math.round(Math.sin(i / 2) * 40 + Math.random() * 30),
    resolved: 160 + Math.round(Math.sin(i / 2) * 35 + Math.random() * 20),
  })),
};

export const clientApiKeys = [
  { id: "k_1", label: "Production", prefix: "sk_live_a29f", created: "2025-03-14", lastUsed: iso(20), scopes: ["read", "write"] },
  { id: "k_2", label: "Zapier integration", prefix: "sk_live_7b12", created: "2025-06-02", lastUsed: iso(120), scopes: ["read"] },
];
export const clientWebhooks = [
  { id: "w_1", url: "https://api.atlaselectronics.ae/wa/events", events: ["message.received", "conversation.closed"], status: "healthy" as const, lastDelivery: iso(4) },
  { id: "w_2", url: "https://hooks.zapier.com/hooks/catch/1234/abcd", events: ["contact.created"], status: "failing" as const, lastDelivery: iso(30) },
];
