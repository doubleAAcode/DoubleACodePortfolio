import type { CurrencyCode } from "./number-words";

export type DocType = "receipt" | "invoice" | "estimate";
export type LangMode = "both" | "en" | "ar";
export type PaperSize = "a4" | "letter";
export type AccentPreset = "brand" | "ocean" | "emerald" | "graphite" | "custom";

export type DocItem = {
  id: string;
  descEn: string;
  descAr: string;
  qty: number;
  price: number;
};

export type Seller = {
  name: string;
  taglineEn: string;
  taglineAr: string;
  email: string;
  phones: string;
  website: string;
};

export type DocShow = {
  logo: boolean;
  banner: boolean;
  stamp: boolean;
  items: boolean;
  words: boolean;
  paymentMethod: boolean;
  balance: boolean;
  note: boolean;
  terms: boolean;
  signature: boolean;
  footer: boolean;
};

export type DocState = {
  type: DocType;
  number: string;
  date: string;
  dueDate: string;
  currency: CurrencyCode;
  lang: LangMode;
  paper: PaperSize;
  clientEn: string;
  clientAr: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  items: DocItem[];
  discountPct: number;
  taxPct: number;
  receivedAmount: number;
  projectTotal: number;
  paymentMethod: string;
  paymentForEn: string;
  paymentForAr: string;
  wordsEn: string;
  wordsAr: string;
  stampEn: string;
  stampAr: string;
  noteEn: string;
  noteAr: string;
  termsEn: string;
  termsAr: string;
  show: DocShow;
  accent: AccentPreset;
  colorA: string;
  colorB: string;
  colorC: string;
  logoDataUrl: string;
};

export const ACCENTS: Record<Exclude<AccentPreset, "custom">, [string, string, string]> = {
  brand: ["#6d28d9", "#ff1493", "#ff8c42"],
  ocean: ["#0f4c81", "#1c7ed6", "#22b8cf"],
  emerald: ["#0b6b4d", "#12a36b", "#8ad35c"],
  graphite: ["#1f2937", "#374151", "#6b7280"],
};

export const DEFAULT_SELLER: Seller = {
  name: "Double A Code",
  taglineEn: "Website & software services",
  taglineAr: "خدمات المواقع والبرمجيات",
  email: "info@doubleacode.com",
  phones: "+961 71 255 749 · +961 76 540 004",
  website: "doubleacode.com",
};

export const TYPE_META: Record<
  DocType,
  { en: string; ar: string; prefix: string; clientEn: string; clientAr: string; sellerEn: string; sellerAr: string }
> = {
  receipt: {
    en: "Receipt of Payment",
    ar: "إيصال استلام دفعة",
    prefix: "R",
    clientEn: "Received from",
    clientAr: "استلمنا من",
    sellerEn: "Received by",
    sellerAr: "المستلم",
  },
  invoice: {
    en: "Invoice",
    ar: "فاتورة",
    prefix: "INV",
    clientEn: "Billed to",
    clientAr: "فاتورة إلى",
    sellerEn: "From",
    sellerAr: "من",
  },
  estimate: {
    en: "Estimate",
    ar: "عرض سعر",
    prefix: "EST",
    clientEn: "Prepared for",
    clientAr: "مقدّم إلى",
    sellerEn: "From",
    sellerAr: "من",
  },
};

const SHOW_BY_TYPE: Record<DocType, DocShow> = {
  receipt: {
    logo: true,
    banner: true,
    stamp: true,
    items: false,
    words: true,
    paymentMethod: false,
    balance: false,
    note: true,
    terms: false,
    signature: true,
    footer: true,
  },
  invoice: {
    logo: true,
    banner: true,
    stamp: false,
    items: true,
    words: false,
    paymentMethod: false,
    balance: false,
    note: false,
    terms: true,
    signature: false,
    footer: true,
  },
  estimate: {
    logo: true,
    banner: true,
    stamp: false,
    items: true,
    words: false,
    paymentMethod: false,
    balance: false,
    note: false,
    terms: true,
    signature: true,
    footer: true,
  },
};

const TEXT_BY_TYPE: Record<
  DocType,
  Pick<DocState, "stampEn" | "stampAr" | "noteEn" | "noteAr" | "termsEn" | "termsAr">
> = {
  receipt: {
    stampEn: "PAID IN FULL",
    stampAr: "مدفوع بالكامل",
    noteEn: "All payments regarding this project have been paid in full. No balance remains due.",
    noteAr: "تم تسديد جميع المبالغ المتعلقة بالمشروع بالكامل، ولا يوجد أي رصيد مستحق.",
    termsEn: "",
    termsAr: "",
  },
  invoice: {
    stampEn: "PAID",
    stampAr: "مدفوعة",
    noteEn: "",
    noteAr: "",
    termsEn: "Payment is due by the date shown above. Please include the invoice number with your payment.",
    termsAr: "المبلغ مستحق السداد في التاريخ المذكور أعلاه. يرجى ذكر رقم الفاتورة عند الدفع.",
  },
  estimate: {
    stampEn: "ESTIMATE",
    stampAr: "عرض سعر",
    noteEn: "",
    noteAr: "",
    termsEn: "This estimate is valid until the date shown above. Prices may change if the scope changes.",
    termsAr: "هذا العرض صالح حتى التاريخ المذكور أعلاه، وقد تتغير الأسعار عند تغيّر نطاق العمل.",
  },
};

export function makeId() {
  return crypto.randomUUID();
}

export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function addDaysIso(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, (day || 1) + days);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function emptyItem(): DocItem {
  return { id: makeId(), descEn: "", descAr: "", qty: 1, price: 0 };
}

export function formatDocNumber(type: DocType, counter: number, iso = todayIso()) {
  return `DAC-${TYPE_META[type].prefix}-${iso.slice(0, 4)}-${String(counter).padStart(3, "0")}`;
}

export function newDocument(type: DocType, counter: number, previous?: DocState): DocState {
  const date = todayIso();
  return {
    type,
    number: formatDocNumber(type, counter, date),
    date,
    dueDate: type === "receipt" ? "" : addDaysIso(date, type === "invoice" ? 14 : 30),
    currency: previous?.currency ?? "USD",
    lang: previous?.lang ?? "both",
    paper: previous?.paper ?? "a4",
    clientEn: "",
    clientAr: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    items: type === "receipt" ? [] : [emptyItem()],
    discountPct: 0,
    taxPct: 0,
    receivedAmount: 0,
    projectTotal: 0,
    paymentMethod: "",
    paymentForEn: "Website services",
    paymentForAr: "خدمات مواقع إلكترونية",
    wordsEn: "",
    wordsAr: "",
    ...TEXT_BY_TYPE[type],
    show: { ...SHOW_BY_TYPE[type] },
    accent: previous?.accent ?? "brand",
    colorA: previous?.colorA ?? ACCENTS.brand[0],
    colorB: previous?.colorB ?? ACCENTS.brand[1],
    colorC: previous?.colorC ?? ACCENTS.brand[2],
    logoDataUrl: previous?.logoDataUrl ?? "",
  };
}

export function applyTypeDefaults(doc: DocState, type: DocType, counter: number): DocState {
  const fresh = newDocument(type, counter, doc);
  return {
    ...doc,
    type,
    number: fresh.number,
    dueDate: fresh.dueDate,
    items: doc.items.length || type === "receipt" ? doc.items : fresh.items,
    show: fresh.show,
    stampEn: fresh.stampEn,
    stampAr: fresh.stampAr,
    noteEn: fresh.noteEn,
    noteAr: fresh.noteAr,
    termsEn: fresh.termsEn,
    termsAr: fresh.termsAr,
  };
}

export function accentColors(doc: DocState): [string, string, string] {
  if (doc.accent === "custom") return [doc.colorA, doc.colorB, doc.colorC];
  return ACCENTS[doc.accent];
}

export type DocTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  due: number;
  balance: number;
};

export function computeTotals(doc: DocState): DocTotals {
  const subtotal = doc.items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  const discount = subtotal * ((Number(doc.discountPct) || 0) / 100);
  const taxable = subtotal - discount;
  const tax = taxable * ((Number(doc.taxPct) || 0) / 100);
  const total = taxable + tax;
  const due = doc.type === "receipt" ? Number(doc.receivedAmount) || 0 : total;
  const balance = doc.type === "receipt" ? Math.max(0, (Number(doc.projectTotal) || 0) - due) : 0;
  return { subtotal, discount, tax, total, due, balance };
}

export function formatMoney(value: number, currency: CurrencyCode) {
  const safe = Number.isFinite(value) ? value : 0;
  if (currency === "LBP") return `L.L. ${Math.round(safe).toLocaleString("en-US")}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_AR = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
];

export function formatDate(iso: string, lang: "en" | "ar") {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  const months = lang === "en" ? MONTHS_EN : MONTHS_AR;
  return `${day} ${months[month - 1]} ${year}`;
}

export type StoredDocuments = {
  version: 1;
  current: DocState;
  seller: Seller;
  counters: Record<DocType, number>;
  saved: { id: string; savedAt: string; doc: DocState }[];
};

export const DEFAULT_COUNTERS: Record<DocType, number> = { receipt: 1, invoice: 1, estimate: 1 };
