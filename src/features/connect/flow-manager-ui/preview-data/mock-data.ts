// Mock data for the WhatsApp Business Admin system.
export type BusinessStatus = "live" | "draft" | "onboarding" | "paused";

export interface Business {
  id: string;
  name: string;
  handle: string;
  category: "E-commerce" | "Restaurant" | "Greeting + Store Info";
  status: BusinessStatus;
  waNumber: string;
  updatedAt: string;
  liveVersion: number;
  draftVersion: number;
  owner: string;
  progress: number; // 0-100
}

export const businesses: Business[] = [
  {
    id: "biz_atlas",
    name: "Atlas Electronics",
    handle: "atlas-electronics",
    category: "E-commerce",
    status: "live",
    waNumber: "+971 50 128 4402",
    updatedAt: "2026-07-14T09:12:00Z",
    liveVersion: 14,
    draftVersion: 15,
    owner: "Rania Haddad",
    progress: 92,
  },
  {
    id: "biz_saffron",
    name: "Saffron Kitchen",
    handle: "saffron-kitchen",
    category: "Restaurant",
    status: "draft",
    waNumber: "+974 33 902 118",
    updatedAt: "2026-07-15T15:41:00Z",
    liveVersion: 3,
    draftVersion: 4,
    owner: "Omar Al-Farsi",
    progress: 68,
  },
  {
    id: "biz_verdant",
    name: "Verdant Boutique",
    handle: "verdant-boutique",
    category: "E-commerce",
    status: "onboarding",
    waNumber: "+966 55 019 8842",
    updatedAt: "2026-07-16T08:03:00Z",
    liveVersion: 0,
    draftVersion: 1,
    owner: "Layla Nassar",
    progress: 34,
  },
  {
    id: "biz_northwind",
    name: "Northwind Pharmacy",
    handle: "northwind-pharmacy",
    category: "Greeting + Store Info",
    status: "live",
    waNumber: "+973 39 448 771",
    updatedAt: "2026-07-11T18:22:00Z",
    liveVersion: 7,
    draftVersion: 7,
    owner: "Rania Haddad",
    progress: 100,
  },
  {
    id: "biz_lumen",
    name: "Lumen Cafe",
    handle: "lumen-cafe",
    category: "Restaurant",
    status: "paused",
    waNumber: "+971 52 774 1120",
    updatedAt: "2026-07-02T11:05:00Z",
    liveVersion: 9,
    draftVersion: 10,
    owner: "Yousef Amin",
    progress: 88,
  },
  {
    id: "biz_pearl",
    name: "Pearl Optics",
    handle: "pearl-optics",
    category: "E-commerce",
    status: "onboarding",
    waNumber: "Not connected",
    updatedAt: "2026-07-16T07:44:00Z",
    liveVersion: 0,
    draftVersion: 1,
    owner: "Layla Nassar",
    progress: 12,
  },
];

export const getBusiness = (id: string) => businesses.find((b) => b.id === id);

// Templates
export interface FlowTemplate {
  id: string;
  name: string;
  bestFor: string;
  journey: string[];
  actions: string[];
  description: string;
}

export const flowTemplates: FlowTemplate[] = [
  {
    id: "tpl_ecom",
    name: "E-commerce",
    bestFor: "Product catalogs, browsing by category or brand, checkout on WhatsApp.",
    journey: ["Welcome", "Browse groups", "Product details", "Checkout", "Confirmation"],
    actions: ["Browse catalog route", "Product purchase path", "Send image", "Talk to human", "End"],
    description: "Full commerce journey with catalog routes, variants, questions, and checkout.",
  },
  {
    id: "tpl_restaurant",
    name: "Restaurant",
    bestFor: "Menus, delivery vs pickup, order confirmation.",
    journey: ["Welcome", "Menu", "Item options", "Fulfillment", "Confirmation"],
    actions: ["Send menu image", "Product purchase path", "Delivery/pickup", "Talk to human"],
    description: "Menu-first ordering with delivery and pickup handling.",
  },
  {
    id: "tpl_greeting",
    name: "Greeting + Store Info / Price Lists",
    bestFor: "Businesses that share info, hours, and price list images.",
    journey: ["Welcome", "Info menu", "Return to menu"],
    actions: ["Send text", "Send image", "Talk to human", "Show menu again"],
    description: "Lightweight assistant for store info, directions, and price lists.",
  },
];

// Checklist items for a business setup hub
export type ChecklistState = "complete" | "attention" | "blocking" | "pending";
export interface ChecklistItem {
  id: string;
  title: string;
  state: ChecklistState;
  detail: string;
  action: string;
  to: string;
}

export const setupChecklist = (bizId: string): ChecklistItem[] => [
  {
    id: "wa",
    title: "WhatsApp connection",
    state: "complete",
    detail: "Business number verified and messaging enabled.",
    action: "Manage connection",
    to: `/businesses/${bizId}/whatsapp`,
  },
  {
    id: "tpl",
    title: "Template selected",
    state: "complete",
    detail: "Using E-commerce template v3.",
    action: "Change template",
    to: `/businesses/${bizId}/whatsapp`,
  },
  {
    id: "routes",
    title: "Catalog routes",
    state: "complete",
    detail: "3 browse groups configured: Categories, Brands, Offers.",
    action: "Edit browse groups",
    to: `/businesses/${bizId}/catalog-routes`,
  },
  {
    id: "values",
    title: "Route values",
    state: "attention",
    detail: "Brands group has 2 inactive values that will not appear to customers.",
    action: "Review values",
    to: `/businesses/${bizId}/route-values`,
  },
  {
    id: "products",
    title: "Products",
    state: "complete",
    detail: "24 active products across 3 browse groups.",
    action: "Manage products",
    to: `/businesses/${bizId}/products`,
  },
  {
    id: "variants",
    title: "Product variants / questions",
    state: "attention",
    detail: "2 products are missing size options that customers might expect.",
    action: "Review variants",
    to: `/businesses/${bizId}/products`,
  },
  {
    id: "checkout",
    title: "Checkout and fulfillment",
    state: "blocking",
    detail: "Both delivery and pickup are disabled. The flow cannot be published.",
    action: "Fix checkout",
    to: `/businesses/${bizId}/checkout`,
  },
  {
    id: "flow",
    title: "Flow builder",
    state: "attention",
    detail: "Draft v15 has 2 validation warnings.",
    action: "Open flow builder",
    to: `/businesses/${bizId}/flow-builder`,
  },
  {
    id: "test",
    title: "Live WhatsApp test",
    state: "pending",
    detail: "Run a real conversation test before publishing.",
    action: "Open live test",
    to: `/businesses/${bizId}/live-test`,
  },
  {
    id: "diag",
    title: "Diagnostics",
    state: "complete",
    detail: "No customer issues in the last 24 hours.",
    action: "Open diagnostics",
    to: `/businesses/${bizId}/diagnostics`,
  },
];

// Flow builder journey mock
export interface FlowOption {
  id: string;
  labelEn: string;
  labelAr: string;
  action:
    | "Send text message"
    | "Send image / price list"
    | "Browse catalog route"
    | "Product purchase path"
    | "Talk to human"
    | "End conversation"
    | "Show this same menu again"
    | "Go to another step";
  actionDetail: string;
  active: boolean;
  nextStepId?: string;
}

export interface FlowStep {
  id: string;
  type: "Welcome" | "Message" | "Menu" | "Image" | "Catalog" | "End" | "Handoff";
  title: string;
  preview: string;
  status: "ok" | "warning" | "error";
  options?: FlowOption[];
}

export const flowSteps: FlowStep[] = [
  {
    id: "step_welcome",
    type: "Welcome",
    title: "Welcome Message",
    preview: "Hi 👋 Welcome to Atlas Electronics. How can we help you today?",
    status: "warning",
    options: [
      {
        id: "opt_store_info",
        labelEn: "Store info",
        labelAr: "معلومات المتجر",
        action: "Send text message",
        actionDetail: "Sends store hours + address, then shows this menu again",
        active: true,
        nextStepId: "step_store_info",
      },
      {
        id: "opt_iphone",
        labelEn: "iPhone price list",
        labelAr: "أسعار الآيفون",
        action: "Send image / price list",
        actionDetail: "Sends price list image, then shows menu again",
        active: true,
        nextStepId: "step_iphone",
      },
      {
        id: "opt_shop",
        labelEn: "Shop products",
        labelAr: "تسوق المنتجات",
        action: "Browse catalog route",
        actionDetail: "Opens Brands browse group",
        active: true,
        nextStepId: "step_shop",
      },
      {
        id: "opt_human",
        labelEn: "Talk to human",
        labelAr: "تحدث مع موظف",
        action: "Talk to human",
        actionDetail: "Pauses automation for 30 minutes",
        active: true,
        nextStepId: "step_end",
      },
    ],
  },
  {
    id: "step_store_info",
    type: "Message",
    title: "Store Info",
    preview: "We're open Sat–Thu, 10am – 10pm. Located at Marina Mall, Level 2…",
    status: "ok",
  },
  {
    id: "step_iphone",
    type: "Image",
    title: "iPhone Price List",
    preview: "[Image] iPhone lineup with current prices. Caption in EN/AR.",
    status: "error",
  },
  {
    id: "step_shop",
    type: "Catalog",
    title: "Shop by Brand",
    preview: "Which brand would you like? Apple · Samsung · Adidas · Nike",
    status: "ok",
  },
  {
    id: "step_end",
    type: "End",
    title: "Handoff to team",
    preview: "A team member will reply shortly. Automation paused.",
    status: "ok",
  },
];

// Browse groups (catalog routes)
export interface BrowseGroup {
  id: string;
  name: string;
  technicalKey: string;
  active: boolean;
  valueCount: number;
  sort: number;
}

export const browseGroups: BrowseGroup[] = [
  { id: "grp_cat", name: "Categories", technicalKey: "categories", active: true, valueCount: 6, sort: 1 },
  { id: "grp_brand", name: "Brands", technicalKey: "brands", active: true, valueCount: 8, sort: 2 },
  { id: "grp_offers", name: "Offers", technicalKey: "offers", active: true, valueCount: 3, sort: 3 },
  { id: "grp_coll", name: "Collections", technicalKey: "collections", active: false, valueCount: 4, sort: 4 },
];

export interface RouteValue {
  id: string;
  groupId: string;
  name: string;
  active: boolean;
  sort: number;
  productCount: number;
}

export const routeValues: RouteValue[] = [
  { id: "v_apple", groupId: "grp_brand", name: "Apple", active: true, sort: 1, productCount: 12 },
  { id: "v_samsung", groupId: "grp_brand", name: "Samsung", active: true, sort: 2, productCount: 9 },
  { id: "v_adidas", groupId: "grp_brand", name: "Adidas", active: false, sort: 3, productCount: 0 },
  { id: "v_nike", groupId: "grp_brand", name: "Nike", active: false, sort: 4, productCount: 2 },
  { id: "v_sony", groupId: "grp_brand", name: "Sony", active: true, sort: 5, productCount: 4 },
];

// Products
export interface Product {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string;
  price: number;
  stock: number;
  active: boolean;
  available: boolean;
  placements: string[];
  image: string;
}

export const products: Product[] = [
  {
    id: "p_iphone15",
    nameEn: "iPhone 15 Pro",
    nameAr: "آيفون 15 برو",
    code: "APL-IP15P",
    price: 4299,
    stock: 12,
    active: true,
    available: true,
    placements: ["Apple", "New arrivals"],
    image: "phone",
  },
  {
    id: "p_gs24",
    nameEn: "Galaxy S24 Ultra",
    nameAr: "جالكسي إس 24 ألترا",
    code: "SMS-GS24U",
    price: 3899,
    stock: 4,
    active: true,
    available: true,
    placements: ["Samsung", "New arrivals"],
    image: "phone",
  },
  {
    id: "p_airpods",
    nameEn: "AirPods Pro (2nd gen)",
    nameAr: "إيربودز برو",
    code: "APL-APP2",
    price: 899,
    stock: 0,
    active: true,
    available: false,
    placements: ["Apple", "Accessories"],
    image: "earbud",
  },
  {
    id: "p_watch9",
    nameEn: "Apple Watch Series 9",
    nameAr: "آبل ووتش 9",
    code: "APL-AW9",
    price: 1599,
    stock: 6,
    active: true,
    available: true,
    placements: ["Apple"],
    image: "watch",
  },
  {
    id: "p_sonyxm5",
    nameEn: "Sony WH-1000XM5",
    nameAr: "سوني WH-1000XM5",
    code: "SNY-XM5",
    price: 1349,
    stock: 3,
    active: false,
    available: true,
    placements: ["Sony", "Accessories"],
    image: "headphones",
  },
];

// Logs
export type LogLevel = "info" | "warning" | "error" | "success";
export interface LogEntry {
  id: string;
  ts: string;
  level: LogLevel;
  business: string;
  message: string;
  actor: string;
}

export const logs: LogEntry[] = [
  { id: "l1", ts: "2026-07-16T09:44:12Z", level: "success", business: "Atlas Electronics", message: "Draft v15 saved by Rania Haddad", actor: "rania@doublea.io" },
  { id: "l2", ts: "2026-07-16T09:32:01Z", level: "warning", business: "Atlas Electronics", message: "Validation: iPhone Price List missing image", actor: "system" },
  { id: "l3", ts: "2026-07-16T08:12:44Z", level: "error", business: "Saffron Kitchen", message: "Meta API returned 400: template rejected", actor: "system" },
  { id: "l4", ts: "2026-07-16T07:59:10Z", level: "info", business: "Verdant Boutique", message: "New business created by Layla Nassar", actor: "layla@doublea.io" },
  { id: "l5", ts: "2026-07-15T22:04:33Z", level: "success", business: "Northwind Pharmacy", message: "Live test passed for +973 33 900 002", actor: "yousef@doublea.io" },
  { id: "l6", ts: "2026-07-15T18:11:20Z", level: "info", business: "Lumen Cafe", message: "Automation paused by operator", actor: "omar@doublea.io" },
];

// Overview stats
export const overviewStats = {
  activeBusinesses: 4,
  onboarding: 2,
  liveConversations24h: 1287,
  failedSends24h: 3,
};
