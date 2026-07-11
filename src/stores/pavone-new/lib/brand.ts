export const LOGO_URL = "/images/pavone-new/pavone-logo-transparent.png";

export const WHITE_LOGO_URL = "/images/pavone-new/pavone-logo-white.png";

export const STORE_NAME = "PAVONE BY RAY";

export function formatPrice(value: number | string) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return `$${n.toFixed(2)}`;
}
