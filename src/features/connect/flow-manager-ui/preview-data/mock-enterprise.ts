// Mock data for enterprise-tier features (phase-2 preview).
// Tool-calling agent, voice, product catalog, payments, enterprise settings.

const now = Date.now();
const iso = (m: number) => new Date(now - m * 60000).toISOString();

// ---------- AI Agent tools (function calling) ----------
export interface AgentTool {
  id: string;
  name: string;
  description: string;
  params: { name: string; type: string; required?: boolean }[];
  enabled: boolean;
  category: "catalog" | "orders" | "scheduling" | "handoff" | "custom";
  calls30d: number;
  successPct: number;
}

export const agentTools: AgentTool[] = [
  {
    id: "search_products", name: "search_products", category: "catalog",
    description: "Search the product catalog by keyword, category, or attributes.",
    params: [{ name: "query", type: "string", required: true }, { name: "limit", type: "number" }],
    enabled: true, calls30d: 1842, successPct: 98,
  },
  {
    id: "check_stock", name: "check_stock", category: "catalog",
    description: "Return live stock level for a SKU across warehouses.",
    params: [{ name: "sku", type: "string", required: true }],
    enabled: true, calls30d: 921, successPct: 99,
  },
  {
    id: "create_order", name: "create_order", category: "orders",
    description: "Create a draft order and return a payment link.",
    params: [{ name: "items", type: "array", required: true }, { name: "contact_id", type: "string", required: true }],
    enabled: true, calls30d: 214, successPct: 96,
  },
  {
    id: "track_order", name: "track_order", category: "orders",
    description: "Fetch shipment status by order number.",
    params: [{ name: "order_id", type: "string", required: true }],
    enabled: true, calls30d: 486, successPct: 99,
  },
  {
    id: "book_appointment", name: "book_appointment", category: "scheduling",
    description: "Reserve a slot with the nearest store (Calendly).",
    params: [{ name: "store_id", type: "string" }, { name: "iso_datetime", type: "string" }],
    enabled: false, calls30d: 0, successPct: 0,
  },
  {
    id: "escalate_to_human", name: "escalate_to_human", category: "handoff",
    description: "Hand the conversation to a live agent and post to Slack.",
    params: [{ name: "reason", type: "string", required: true }, { name: "priority", type: "string" }],
    enabled: true, calls30d: 312, successPct: 100,
  },
];

export const handoffRules = [
  { id: "h1", when: "Refund amount > AED 500", to: "Senior support", enabled: true },
  { id: "h2", when: "Customer mentions 'lawyer' or 'complaint'", to: "Manager on duty", enabled: true },
  { id: "h3", when: "AI confidence < 60% for 2 turns", to: "Round-robin queue", enabled: true },
  { id: "h4", when: "VIP tag + open > 5 min", to: "Amira K.", enabled: false },
];

// ---------- Voice ----------
export interface VoiceProfile {
  id: string;
  name: string;
  provider: "ElevenLabs" | "OpenAI" | "Azure";
  gender: "female" | "male";
  language: string;
  accent: string;
  preview: string; // fake waveform seed
  selected?: boolean;
}

export const voiceProfiles: VoiceProfile[] = [
  { id: "v1", name: "Layla", provider: "ElevenLabs", gender: "female", language: "Arabic + English", accent: "Levantine", preview: "wave-1", selected: true },
  { id: "v2", name: "Omar", provider: "ElevenLabs", gender: "male", language: "Arabic + English", accent: "Gulf", preview: "wave-2" },
  { id: "v3", name: "Nova", provider: "OpenAI", gender: "female", language: "English", accent: "Neutral", preview: "wave-3" },
  { id: "v4", name: "Fenrir", provider: "OpenAI", gender: "male", language: "English", accent: "US", preview: "wave-4" },
  { id: "v5", name: "Sarah", provider: "Azure", gender: "female", language: "English", accent: "UK", preview: "wave-5" },
];

export const voiceCallLog = [
  { id: "c1", contact: "Fatima Al-Sayed", number: "+971 50 991 0022", direction: "inbound", durationSec: 184, outcome: "Order placed", transcript: "Hi, I'd like to check on my earbud order.", ts: iso(12) },
  { id: "c2", contact: "Yasmin K.", number: "+965 65 220 8100", direction: "outbound", durationSec: 96, outcome: "Voicemail", transcript: "Hi Yasmin, calling about your Kuwait shipping question.", ts: iso(58) },
  { id: "c3", contact: "Karim Boutros", number: "+20 100 776 2211", direction: "inbound", durationSec: 312, outcome: "Escalated → human", transcript: "I want to speak to a manager about my refund.", ts: iso(140) },
  { id: "c4", contact: "RetailCo Ltd", number: "+971 4 220 9910", direction: "inbound", durationSec: 421, outcome: "Quote sent", transcript: "We'd like a bulk quote for 200 Pro units.", ts: iso(320) },
];

// ---------- Product catalog ----------
export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number; // AED
  stock: number;
  category: string;
  image: string; // emoji stand-in for mock
  status: "active" | "draft" | "out";
  rating: number;
}
export const products: Product[] = [
  { id: "p1", sku: "ATL-EAR-01", name: "Atlas Pro Wireless Earbuds", price: 449, stock: 128, category: "Audio", image: "🎧", status: "active", rating: 4.6 },
  { id: "p2", sku: "ATL-SPK-02", name: "Atlas Boom Bluetooth Speaker", price: 299, stock: 42, category: "Audio", image: "🔊", status: "active", rating: 4.4 },
  { id: "p3", sku: "ATL-WCH-03", name: "Atlas Fit Smartwatch S3", price: 899, stock: 17, category: "Wearables", image: "⌚", status: "active", rating: 4.7 },
  { id: "p4", sku: "ATL-CAM-04", name: "Atlas Cam 4K Action", price: 1249, stock: 0, category: "Photo", image: "📷", status: "out", rating: 4.5 },
  { id: "p5", sku: "ATL-LAP-05", name: "Atlas Book Ultra 14", price: 5499, stock: 6, category: "Laptops", image: "💻", status: "active", rating: 4.8 },
  { id: "p6", sku: "ATL-CHG-06", name: "Atlas Fast Charger 65W", price: 149, stock: 340, category: "Accessories", image: "🔌", status: "active", rating: 4.3 },
  { id: "p7", sku: "ATL-KBD-07", name: "Atlas Mech Keyboard", price: 599, stock: 22, category: "Accessories", image: "⌨️", status: "draft", rating: 4.5 },
  { id: "p8", sku: "ATL-MON-08", name: "Atlas View 27\" QHD", price: 1899, stock: 11, category: "Displays", image: "🖥️", status: "active", rating: 4.6 },
];

// ---------- Payments in chat ----------
export interface PaymentRequest {
  id: string;
  contact: string;
  amount: number;
  currency: "AED" | "USD" | "SAR";
  channel: "whatsapp" | "instagram" | "messenger";
  status: "paid" | "pending" | "expired" | "refunded";
  method?: "apple_pay" | "card" | "stcpay" | "tabby";
  createdAt: string;
  paidAt?: string;
  memo: string;
}
export const paymentRequests: PaymentRequest[] = [
  { id: "pay_1", contact: "Fatima Al-Sayed", amount: 449, currency: "AED", channel: "whatsapp", status: "paid", method: "apple_pay", createdAt: iso(180), paidAt: iso(174), memo: "Atlas Pro Earbuds" },
  { id: "pay_2", contact: "@yasmin.travels", amount: 299, currency: "AED", channel: "instagram", status: "pending", createdAt: iso(22), memo: "Boom Speaker + shipping to Kuwait" },
  { id: "pay_3", contact: "Karim Boutros", amount: 899, currency: "AED", channel: "messenger", status: "paid", method: "card", createdAt: iso(720), paidAt: iso(712), memo: "Fit Smartwatch S3" },
  { id: "pay_4", contact: "RetailCo Ltd", amount: 12450, currency: "AED", channel: "whatsapp", status: "pending", createdAt: iso(60), memo: "Bulk order — Pro line ×200 (deposit)" },
  { id: "pay_5", contact: "Nour Habib", amount: 149, currency: "AED", channel: "whatsapp", status: "expired", createdAt: iso(2880), memo: "Fast charger 65W" },
  { id: "pay_6", contact: "Sami R.", amount: 599, currency: "AED", channel: "whatsapp", status: "refunded", method: "card", createdAt: iso(4320), paidAt: iso(4318), memo: "Mech keyboard — returned" },
];

// ---------- Enterprise settings ----------
export const enterpriseSecurity = {
  sso: { provider: "Okta", protocol: "SAML 2.0", domain: "atlaselectronics.ae", enabled: true, enforced: true },
  scim: { enabled: true, endpoint: "https://api.lovable-wa.example/scim/v2", lastSync: iso(15) },
  ipAllowlist: ["203.0.113.0/24", "198.51.100.44"],
  dataResidency: "UAE (Dubai)",
  residencyOptions: ["UAE (Dubai)", "EU (Frankfurt)", "US (Virginia)", "Singapore"],
  encryption: { customerManagedKey: true, kmsAlias: "arn:aws:kms:me-central-1:...:key/atlas-cmk" },
  retention: { conversations: "365 days", audit: "7 years", pii: "Redact after 30 days" },
};

export const complianceCerts = [
  { name: "SOC 2 Type II", status: "Certified", updated: "2025-08-10", href: "#" },
  { name: "ISO 27001", status: "Certified", updated: "2025-05-22", href: "#" },
  { name: "GDPR", status: "Compliant", updated: "2025-01-14", href: "#" },
  { name: "HIPAA", status: "Available add-on", updated: "—", href: "#" },
  { name: "PCI DSS", status: "Level 1", updated: "2025-07-01", href: "#" },
];

export const auditExports = [
  { id: "e1", range: "Oct 1 – Oct 31, 2025", events: 48211, size: "12.4 MB", by: "Amira K.", ts: iso(60 * 24 * 3) },
  { id: "e2", range: "Sep 1 – Sep 30, 2025", events: 44902, size: "11.1 MB", by: "System (scheduled)", ts: iso(60 * 24 * 33) },
];
