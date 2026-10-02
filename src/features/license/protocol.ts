/**
 * License protocol v1 shared by the Double A desktop apps and this website.
 *
 * The app POSTs a check-in; the server answers { payload, signature }:
 *   payload   = JSON text of LicensePayload, signed byte-for-byte (no canonicalization needed)
 *   signature = Ed25519 signature of the payload's UTF-8 bytes, base64url
 * The app verifies it with the matching PUBLIC key built into the app. The private key lives only
 * in the LICENSE_SIGNING_PRIVATE_KEY environment variable of this deployment.
 */

export type LicenseStatus = "active" | "suspended" | "revoked";

export type LicenseCheckRequest = {
  licenseKey: string;
  machineId: string;
  nonce: string;
  appVersion: string;
};

export type LicensePayload = {
  v: 1;
  licenseKey: string;
  machineId: string;
  nonce: string;
  status: LicenseStatus;
  message?: string;
  issuedAt: string;
  validUntil: string;
  checkAfterSec: number;
};

export type SignedLicenseResponse = {
  payload: string;
  signature: string;
};

export type LicenseOptions = {
  /** How long an "active" answer keeps the app working if the server cannot be reached. */
  graceHours: number;
  /** How often the app should check in while online. */
  checkAfterSec: number;
  /** Validity of a suspended/revoked answer (the app stays locked regardless). */
  lockedValidMinutes: number;
};

export const DEFAULT_LICENSE_OPTIONS: LicenseOptions = {
  graceHours: 72,
  checkAfterSec: 3600,
  lockedValidMinutes: 60,
};

export const LICENSE_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
export const MACHINE_ID_PATTERN = /^[a-f0-9]{16,64}$/;
export const NONCE_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
export const MAX_CHECK_BODY_BYTES = 2048;

export type ParsedCheckRequest =
  { ok: true; request: LicenseCheckRequest } | { ok: false; error: string };

export function parseCheckRequest(body: unknown): ParsedCheckRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const input = body as Record<string, unknown>;

  if (typeof input.licenseKey !== "string" || !LICENSE_KEY_PATTERN.test(input.licenseKey)) {
    return { ok: false, error: "Invalid licenseKey." };
  }

  if (typeof input.machineId !== "string" || !MACHINE_ID_PATTERN.test(input.machineId)) {
    return { ok: false, error: "Invalid machineId." };
  }

  if (typeof input.nonce !== "string" || !NONCE_PATTERN.test(input.nonce)) {
    return { ok: false, error: "Invalid nonce." };
  }

  if (
    input.appVersion !== undefined &&
    (typeof input.appVersion !== "string" || input.appVersion.length > 32)
  ) {
    return { ok: false, error: "Invalid appVersion." };
  }

  return {
    ok: true,
    request: {
      licenseKey: input.licenseKey,
      machineId: input.machineId,
      nonce: input.nonce,
      appVersion: typeof input.appVersion === "string" ? input.appVersion : "",
    },
  };
}
