import "@tanstack/react-start/server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export const MIN_ADMIN_TOKEN_LENGTH = 32;

export function getLicenseAdminToken(): string {
  return process.env.LICENSE_ADMIN_TOKEN?.trim() ?? "";
}

/** The admin switch stays disabled until a long LICENSE_ADMIN_TOKEN is configured. */
export function isLicenseAdminConfigured(token = getLicenseAdminToken()): boolean {
  return token.length >= MIN_ADMIN_TOKEN_LENGTH;
}

export function isLicenseAdminAuthorized(
  request: Request,
  token = getLicenseAdminToken(),
): boolean {
  if (!isLicenseAdminConfigured(token)) return false;

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;

  // Hash both sides so the comparison is constant-time regardless of length.
  const received = createHash("sha256").update(match[1].trim()).digest();
  const expected = createHash("sha256").update(token).digest();

  return timingSafeEqual(received, expected);
}
