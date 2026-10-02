import "@tanstack/react-start/server-only";

import { createPrivateKey, randomBytes, sign, type KeyObject } from "node:crypto";

import type { LicensePayload, SignedLicenseResponse } from "./protocol.ts";

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Accepts the Ed25519 private key as a PKCS#8 PEM (newlines may be written as \n, which is how
 * hosting dashboards usually store it) or as bare base64 PKCS#8 DER. Returns null when the value
 * is missing, malformed, or not an Ed25519 key.
 */
export function parseSigningKey(value: string | undefined): KeyObject | null {
  if (!value?.trim()) return null;

  try {
    const trimmed = value.trim();
    const key = trimmed.includes("-----BEGIN")
      ? createPrivateKey(trimmed.replace(/\\n/g, "\n"))
      : createPrivateKey({ key: Buffer.from(trimmed, "base64"), format: "der", type: "pkcs8" });

    return key.asymmetricKeyType === "ed25519" ? key : null;
  } catch {
    return null;
  }
}

export function getSigningKey(): KeyObject | null {
  return parseSigningKey(process.env.LICENSE_SIGNING_PRIVATE_KEY);
}

export function signLicensePayload(payload: LicensePayload, key: KeyObject): SignedLicenseResponse {
  const text = JSON.stringify(payload);
  const signature = sign(null, Buffer.from(text, "utf8"), key);

  return { payload: text, signature: signature.toString("base64url") };
}

/** ACD-XXXXX-XXXXX-XXXXX-XXXXX, 100 bits of randomness, no look-alike characters. */
export function generateLicenseKey(): string {
  const bytes = randomBytes(20);
  const characters = Array.from(bytes, (byte) => KEY_ALPHABET[byte % KEY_ALPHABET.length]);
  const groups: string[] = [];

  for (let index = 0; index < 20; index += 5) {
    groups.push(characters.slice(index, index + 5).join(""));
  }

  return `ACD-${groups.join("-")}`;
}
