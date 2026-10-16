export type CurrencyCode = "USD" | "EUR" | "LBP";

type CurrencyWords = {
  en: { major: string; minor: string };
  ar: { major: string; minor: string };
  decimals: boolean;
};

const CURRENCY_WORDS: Record<CurrencyCode, CurrencyWords> = {
  USD: {
    en: { major: "US dollars", minor: "cents" },
    ar: { major: "دولاراً أمريكياً", minor: "سنتاً" },
    decimals: true,
  },
  EUR: {
    en: { major: "euros", minor: "cents" },
    ar: { major: "يورو", minor: "سنتاً" },
    decimals: true,
  },
  LBP: {
    en: { major: "Lebanese pounds", minor: "" },
    ar: { major: "ليرة لبنانية", minor: "" },
    decimals: false,
  },
};

const EN_ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function englishBelowThousand(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(`${EN_ONES[hundreds]} hundred`);
  if (rest) {
    if (rest < 20) parts.push(EN_ONES[rest]);
    else parts.push(EN_TENS[Math.floor(rest / 10)] + (rest % 10 ? `-${EN_ONES[rest % 10]}` : ""));
  }
  return parts.join(" ");
}

export function englishNumberWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "zero";
  const groups: [number, string][] = [
    [Math.floor(n / 1_000_000_000) % 1000, "billion"],
    [Math.floor(n / 1_000_000) % 1000, "million"],
    [Math.floor(n / 1000) % 1000, "thousand"],
    [n % 1000, ""],
  ];
  return groups
    .filter(([amount]) => amount > 0)
    .map(([amount, label]) => `${englishBelowThousand(amount)}${label ? ` ${label}` : ""}`)
    .join(" ");
}

const AR_ONES = [
  "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة",
  "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر",
];
const AR_TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const AR_HUNDREDS = [
  "", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة",
];

function arabicBelowThousand(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(AR_HUNDREDS[hundreds]);
  if (rest) {
    if (rest < 20) parts.push(AR_ONES[rest]);
    else {
      const ones = rest % 10;
      const tens = AR_TENS[Math.floor(rest / 10)];
      parts.push(ones ? `${AR_ONES[ones]} و${tens}` : tens);
    }
  }
  return parts.join(" و");
}

function arabicGroup(amount: number, singular: string, dual: string, plural: string, accusative: string) {
  if (amount === 1) return singular;
  if (amount === 2) return dual;
  const words = arabicBelowThousand(amount);
  if (amount >= 3 && amount <= 10) return `${words} ${plural}`;
  return `${words} ${accusative}`;
}

export function arabicNumberWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "صفر";
  const parts: string[] = [];
  const billions = Math.floor(n / 1_000_000_000) % 1000;
  const millions = Math.floor(n / 1_000_000) % 1000;
  const thousands = Math.floor(n / 1000) % 1000;
  const rest = n % 1000;
  if (billions) parts.push(arabicGroup(billions, "مليار", "ملياران", "مليارات", "مليار"));
  if (millions) parts.push(arabicGroup(millions, "مليون", "مليونان", "ملايين", "مليون"));
  if (thousands) parts.push(arabicGroup(thousands, "ألف", "ألفان", "آلاف", "ألف"));
  if (rest) parts.push(arabicBelowThousand(rest));
  return parts.join(" و");
}

export type AmountWords = { en: string; ar: string };

export function amountInWords(amount: number, currency: CurrencyCode): AmountWords {
  const words = CURRENCY_WORDS[currency];
  const safe = Number.isFinite(amount) ? Math.abs(amount) : 0;
  const total = words.decimals ? Math.round(safe * 100) : Math.round(safe);
  const major = words.decimals ? Math.floor(total / 100) : total;
  const minor = words.decimals ? total % 100 : 0;

  let en = `${capitalize(englishNumberWords(major))} ${words.en.major}`;
  let ar = `${arabicNumberWords(major)} ${words.ar.major}`;
  if (minor > 0) {
    en += ` and ${englishNumberWords(minor)} ${words.en.minor}`;
    ar += ` و${arabicNumberWords(minor)} ${words.ar.minor}`;
  }

  return { en: `${en} only`, ar: `${ar} فقط لا غير` };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
