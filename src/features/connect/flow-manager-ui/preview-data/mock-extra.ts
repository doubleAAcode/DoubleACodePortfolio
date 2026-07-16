// Extended mock datasets for Inbox, Contacts, Broadcasts, Templates,
// Analytics, Developers, Team, Audit.

export type ConvStatus = "open" | "pending" | "snoozed" | "closed";
export interface Message {
  id: string;
  from: "customer" | "agent" | "bot";
  text: string;
  ts: string;
  kind?: "text" | "image" | "template";
}
export interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  contactInitials: string;
  business: string;
  businessId: string;
  status: ConvStatus;
  assignee: string | null;
  tags: string[];
  lastMessage: string;
  lastAt: string;
  unread: number;
  slaMinsLeft: number | null;
  messages: Message[];
}

const now = Date.now();
const iso = (mins: number) => new Date(now - mins * 60000).toISOString();

export const conversations: Conversation[] = [
  {
    id: "cnv_001",
    contactName: "Aisha Rahman",
    contactPhone: "+971 50 998 1120",
    contactInitials: "AR",
    business: "Atlas Electronics",
    businessId: "biz_atlas",
    status: "open",
    assignee: "Rania Haddad",
    tags: ["VIP", "iPhone"],
    lastMessage: "Do you have the iPhone 15 Pro in Titanium Blue?",
    lastAt: iso(4),
    unread: 2,
    slaMinsLeft: 6,
    messages: [
      { id: "m1", from: "customer", text: "Hi 👋", ts: iso(14) },
      { id: "m2", from: "bot", text: "Welcome to Atlas Electronics. How can we help?", ts: iso(13), kind: "template" },
      { id: "m3", from: "customer", text: "Shop products", ts: iso(12) },
      { id: "m4", from: "bot", text: "Which brand? Apple · Samsung · Sony", ts: iso(12) },
      { id: "m5", from: "customer", text: "Apple", ts: iso(10) },
      { id: "m6", from: "customer", text: "Do you have the iPhone 15 Pro in Titanium Blue?", ts: iso(4) },
    ],
  },
  {
    id: "cnv_002",
    contactName: "Omar Nasser",
    contactPhone: "+974 33 210 4402",
    contactInitials: "ON",
    business: "Saffron Kitchen",
    businessId: "biz_saffron",
    status: "pending",
    assignee: null,
    tags: ["delivery"],
    lastMessage: "How long is delivery to West Bay?",
    lastAt: iso(22),
    unread: 1,
    slaMinsLeft: -3,
    messages: [
      { id: "m1", from: "customer", text: "Menu please", ts: iso(35) },
      { id: "m2", from: "bot", text: "[Menu image]", ts: iso(34), kind: "image" },
      { id: "m3", from: "customer", text: "How long is delivery to West Bay?", ts: iso(22) },
    ],
  },
  {
    id: "cnv_003",
    contactName: "Layla Haddad",
    contactPhone: "+966 55 771 0982",
    contactInitials: "LH",
    business: "Northwind Pharmacy",
    businessId: "biz_northwind",
    status: "open",
    assignee: "Yousef Amin",
    tags: ["prescription"],
    lastMessage: "Can I upload my prescription here?",
    lastAt: iso(48),
    unread: 0,
    slaMinsLeft: 41,
    messages: [
      { id: "m1", from: "customer", text: "Are you open today?", ts: iso(55) },
      { id: "m2", from: "agent", text: "Yes, we're open until 11pm.", ts: iso(54) },
      { id: "m3", from: "customer", text: "Can I upload my prescription here?", ts: iso(48) },
    ],
  },
  {
    id: "cnv_004",
    contactName: "Yasmin Al-Sabah",
    contactPhone: "+965 66 118 3320",
    contactInitials: "YA",
    business: "Lumen Cafe",
    businessId: "biz_lumen",
    status: "snoozed",
    assignee: "Omar Al-Farsi",
    tags: [],
    lastMessage: "Snoozed until tomorrow 9am",
    lastAt: iso(180),
    unread: 0,
    slaMinsLeft: null,
    messages: [
      { id: "m1", from: "customer", text: "Do you have oat milk?", ts: iso(200) },
      { id: "m2", from: "agent", text: "Yes, oat and almond available.", ts: iso(195) },
    ],
  },
  {
    id: "cnv_005",
    contactName: "Karim El-Hadad",
    contactPhone: "+971 52 993 8871",
    contactInitials: "KE",
    business: "Atlas Electronics",
    businessId: "biz_atlas",
    status: "closed",
    assignee: "Rania Haddad",
    tags: ["resolved"],
    lastMessage: "Thanks!",
    lastAt: iso(720),
    unread: 0,
    slaMinsLeft: null,
    messages: [
      { id: "m1", from: "customer", text: "Order status?", ts: iso(760) },
      { id: "m2", from: "agent", text: "Delivered at 6:12pm to your address.", ts: iso(725) },
      { id: "m3", from: "customer", text: "Thanks!", ts: iso(720) },
    ],
  },
];

export const cannedReplies = [
  { id: "c1", title: "Greeting", body: "Hi! Thanks for reaching out to us. How can we help?" },
  { id: "c2", title: "Delivery ETA", body: "Delivery in your area is typically 30–45 minutes." },
  { id: "c3", title: "Store hours", body: "We're open Sat–Thu, 10am – 10pm. Closed Fridays until 2pm." },
  { id: "c4", title: "Handoff", body: "A human agent will be with you shortly." },
];

// Contacts
export type Lifecycle = "lead" | "customer" | "vip" | "churned";
export interface Contact {
  id: string;
  name: string;
  phone: string;
  business: string;
  businessId: string;
  tags: string[];
  lifecycle: Lifecycle;
  lastSeen: string;
  optIn: boolean;
  conversationsCount: number;
  spend: number;
  attributes: { key: string; value: string }[];
}

export const contacts: Contact[] = [
  { id: "ct_1", name: "Aisha Rahman", phone: "+971 50 998 1120", business: "Atlas Electronics", businessId: "biz_atlas", tags: ["VIP", "iPhone"], lifecycle: "vip", lastSeen: iso(4), optIn: true, conversationsCount: 12, spend: 18400, attributes: [{ key: "city", value: "Dubai" }, { key: "language", value: "en" }] },
  { id: "ct_2", name: "Omar Nasser", phone: "+974 33 210 4402", business: "Saffron Kitchen", businessId: "biz_saffron", tags: ["delivery"], lifecycle: "customer", lastSeen: iso(22), optIn: true, conversationsCount: 4, spend: 620, attributes: [{ key: "area", value: "West Bay" }] },
  { id: "ct_3", name: "Layla Haddad", phone: "+966 55 771 0982", business: "Northwind Pharmacy", businessId: "biz_northwind", tags: ["prescription"], lifecycle: "customer", lastSeen: iso(48), optIn: true, conversationsCount: 3, spend: 210, attributes: [] },
  { id: "ct_4", name: "Yasmin Al-Sabah", phone: "+965 66 118 3320", business: "Lumen Cafe", businessId: "biz_lumen", tags: [], lifecycle: "lead", lastSeen: iso(180), optIn: false, conversationsCount: 1, spend: 0, attributes: [] },
  { id: "ct_5", name: "Karim El-Hadad", phone: "+971 52 993 8871", business: "Atlas Electronics", businessId: "biz_atlas", tags: ["resolved"], lifecycle: "customer", lastSeen: iso(720), optIn: true, conversationsCount: 6, spend: 4210, attributes: [] },
  { id: "ct_6", name: "Nora Al-Amin", phone: "+973 39 002 7712", business: "Northwind Pharmacy", businessId: "biz_northwind", tags: ["vip"], lifecycle: "vip", lastSeen: iso(2000), optIn: true, conversationsCount: 21, spend: 3200, attributes: [] },
  { id: "ct_7", name: "Faisal Bin Rashid", phone: "+971 55 442 8890", business: "Atlas Electronics", businessId: "biz_atlas", tags: [], lifecycle: "churned", lastSeen: iso(50000), optIn: false, conversationsCount: 2, spend: 780, attributes: [] },
];

// Broadcasts
export type BroadcastStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export interface Broadcast {
  id: string;
  name: string;
  templateName: string;
  audience: number;
  status: BroadcastStatus;
  scheduledFor: string | null;
  sentAt: string | null;
  delivered: number;
  read: number;
  replied: number;
  optOut: number;
  costUsd: number;
}
export const broadcasts: Broadcast[] = [
  { id: "bc_1", name: "Ramadan promo — Atlas", templateName: "seasonal_offer_v2", audience: 2412, status: "sent", scheduledFor: null, sentAt: iso(60 * 24 * 2), delivered: 2380, read: 1902, replied: 341, optOut: 12, costUsd: 148.2 },
  { id: "bc_2", name: "Menu launch — Saffron", templateName: "menu_launch_ar", audience: 812, status: "sending", scheduledFor: null, sentAt: iso(4), delivered: 610, read: 320, replied: 44, optOut: 2, costUsd: 32.8 },
  { id: "bc_3", name: "Weekend hours — Northwind", templateName: "utility_hours", audience: 3200, status: "scheduled", scheduledFor: new Date(now + 3600_000 * 20).toISOString(), sentAt: null, delivered: 0, read: 0, replied: 0, optOut: 0, costUsd: 0 },
  { id: "bc_4", name: "Cart recovery — Verdant", templateName: "cart_recovery_v1", audience: 128, status: "draft", scheduledFor: null, sentAt: null, delivered: 0, read: 0, replied: 0, optOut: 0, costUsd: 0 },
  { id: "bc_5", name: "Failed test — Lumen", templateName: "loyalty_reward", audience: 220, status: "failed", scheduledFor: null, sentAt: iso(60 * 12), delivered: 0, read: 0, replied: 0, optOut: 0, costUsd: 0 },
];

// Meta templates
export type MetaCategory = "marketing" | "utility" | "authentication";
export type MetaStatus = "draft" | "in_review" | "approved" | "rejected" | "paused";
export interface MetaTemplate {
  id: string;
  name: string;
  category: MetaCategory;
  languages: string[];
  status: MetaStatus;
  quality: "high" | "medium" | "low" | "unrated";
  lastUsed: string | null;
  usedByBusinesses: string[];
  body: string;
  rejectionReason?: string;
  version: number;
}
export const metaTemplates: MetaTemplate[] = [
  { id: "mt_1", name: "seasonal_offer_v2", category: "marketing", languages: ["en", "ar"], status: "approved", quality: "high", lastUsed: iso(60 * 24 * 2), usedByBusinesses: ["Atlas Electronics", "Verdant Boutique"], body: "🌙 {{1}}, our Ramadan offers are here! Tap below to explore.", version: 2 },
  { id: "mt_2", name: "menu_launch_ar", category: "marketing", languages: ["ar"], status: "approved", quality: "medium", lastUsed: iso(4), usedByBusinesses: ["Saffron Kitchen"], body: "قائمة جديدة! جرب أطباقنا الموسمية اليوم.", version: 1 },
  { id: "mt_3", name: "utility_hours", category: "utility", languages: ["en", "ar"], status: "approved", quality: "high", lastUsed: iso(60 * 24 * 5), usedByBusinesses: ["Northwind Pharmacy"], body: "Our weekend hours are {{1}} to {{2}}. See you soon!", version: 3 },
  { id: "mt_4", name: "otp_login", category: "authentication", languages: ["en"], status: "approved", quality: "high", lastUsed: iso(30), usedByBusinesses: ["Atlas Electronics", "Verdant Boutique"], body: "Your code is {{1}}. Do not share it.", version: 1 },
  { id: "mt_5", name: "cart_recovery_v1", category: "marketing", languages: ["en"], status: "in_review", quality: "unrated", lastUsed: null, usedByBusinesses: [], body: "You left {{1}} in your cart. Complete checkout: {{2}}", version: 1 },
  { id: "mt_6", name: "loyalty_reward", category: "marketing", languages: ["en"], status: "rejected", quality: "unrated", lastUsed: null, usedByBusinesses: [], body: "🎉 Free coffee just for you!", rejectionReason: "Marketing template missing opt-out language.", version: 1 },
  { id: "mt_7", name: "appointment_reminder", category: "utility", languages: ["en", "ar"], status: "paused", quality: "medium", lastUsed: iso(60 * 24 * 20), usedByBusinesses: ["Northwind Pharmacy"], body: "Reminder: your appointment is on {{1}} at {{2}}.", version: 1 },
];

// Analytics
export const analytics = {
  kpis: {
    conversations: { value: 1287, delta: 12.4 },
    responseSecs: { value: 42, delta: -8.1 },
    resolution: { value: 91.3, delta: 2.2 },
    cost: { value: 214.5, delta: 5.7 },
  },
  conversationsSeries: Array.from({ length: 14 }, (_, i) => ({
    day: `Jul ${3 + i}`,
    inbound: 40 + Math.round(Math.sin(i / 2) * 15) + i * 3,
    outbound: 30 + Math.round(Math.cos(i / 2) * 12) + i * 2,
  })),
  funnel: [
    { step: "Welcome", users: 1287 },
    { step: "Menu", users: 1104 },
    { step: "Product view", users: 812 },
    { step: "Add to cart", users: 410 },
    { step: "Checkout", users: 264 },
    { step: "Confirmed", users: 231 },
  ],
  templatePerf: [
    { name: "seasonal_offer_v2", sent: 2380, read: 1902, replied: 341 },
    { name: "menu_launch_ar", sent: 610, read: 320, replied: 44 },
    { name: "utility_hours", sent: 3040, read: 2851, replied: 12 },
    { name: "otp_login", sent: 1220, read: 1180, replied: 3 },
  ],
  agents: [
    { name: "Rania Haddad", handled: 214, avgFirstReplySecs: 38, csat: 4.8 },
    { name: "Omar Al-Farsi", handled: 187, avgFirstReplySecs: 52, csat: 4.6 },
    { name: "Yousef Amin", handled: 122, avgFirstReplySecs: 44, csat: 4.7 },
    { name: "Layla Nassar", handled: 89, avgFirstReplySecs: 61, csat: 4.4 },
  ],
  costBreakdown: [
    { category: "Marketing", value: 148.2 },
    { category: "Utility", value: 44.1 },
    { category: "Authentication", value: 18.7 },
    { category: "Service", value: 3.5 },
  ],
};

// Developers
export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsed: string;
  createdBy: string;
}
export const apiKeys: ApiKey[] = [
  { id: "k1", name: "Production server", prefix: "wa_live_9F2a…", scopes: ["contacts:rw", "broadcasts:rw", "conversations:r"], lastUsed: iso(12), createdBy: "Rania Haddad" },
  { id: "k2", name: "Shopify sync", prefix: "wa_live_a83k…", scopes: ["contacts:rw", "webhooks:r"], lastUsed: iso(60 * 3), createdBy: "Omar Al-Farsi" },
  { id: "k3", name: "Staging (rotated)", prefix: "wa_test_ee01…", scopes: ["*"], lastUsed: iso(60 * 24 * 8), createdBy: "Yousef Amin" },
];

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: "active" | "paused" | "failing";
  lastDelivery: string;
}
export const webhooks: Webhook[] = [
  { id: "w1", url: "https://ops.internal/hooks/wa-inbound", events: ["message.received", "message.status"], status: "active", lastDelivery: iso(1) },
  { id: "w2", url: "https://crm.internal/hooks/contact", events: ["contact.created", "contact.updated"], status: "active", lastDelivery: iso(9) },
  { id: "w3", url: "https://legacy.example/hook", events: ["broadcast.sent"], status: "failing", lastDelivery: iso(120) },
];

// Team & audit
export type Role = "Owner" | "Admin" | "Agent" | "Viewer";
export interface TeamMember { id: string; name: string; email: string; role: Role; businesses: string[]; lastActive: string; }
export const teamMembers: TeamMember[] = [
  { id: "u1", name: "Rania Haddad", email: "rania@doublea.io", role: "Owner", businesses: ["All"], lastActive: iso(3) },
  { id: "u2", name: "Omar Al-Farsi", email: "omar@doublea.io", role: "Admin", businesses: ["Saffron Kitchen", "Lumen Cafe"], lastActive: iso(41) },
  { id: "u3", name: "Layla Nassar", email: "layla@doublea.io", role: "Agent", businesses: ["Verdant Boutique", "Pearl Optics"], lastActive: iso(14) },
  { id: "u4", name: "Yousef Amin", email: "yousef@doublea.io", role: "Agent", businesses: ["Northwind Pharmacy"], lastActive: iso(88) },
  { id: "u5", name: "Sara Khoury", email: "sara@doublea.io", role: "Viewer", businesses: ["All"], lastActive: iso(60 * 24 * 4) },
];

export interface AuditEntry { id: string; ts: string; actor: string; action: string; entity: string; diff: string; }
export const auditEntries: AuditEntry[] = [
  { id: "a1", ts: iso(3), actor: "rania@doublea.io", action: "flow.published", entity: "Atlas Electronics · v14", diff: "+1 step, -2 options" },
  { id: "a2", ts: iso(15), actor: "omar@doublea.io", action: "template.submitted", entity: "menu_launch_ar", diff: "Category: marketing" },
  { id: "a3", ts: iso(120), actor: "layla@doublea.io", action: "business.created", entity: "Pearl Optics", diff: "—" },
  { id: "a4", ts: iso(240), actor: "system", action: "webhook.failed", entity: "https://legacy.example/hook", diff: "5xx x 3" },
  { id: "a5", ts: iso(60 * 24), actor: "yousef@doublea.io", action: "role.changed", entity: "sara@doublea.io", diff: "Agent → Viewer" },
];
