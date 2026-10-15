import type { ClientsVaultContent, EncryptedVault } from "@/lib/spreadsheet.types";

// The spreadsheet JSON is saved to a GitHub repo, so client logins are only ever stored as
// AES-GCM ciphertext. The key comes from a passphrase (PBKDF2) and never leaves this browser tab.

const ITERATIONS = 600_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type VaultKey = {
  key: CryptoKey;
  salt: string;
  iterations: number;
};

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createVaultKey(passphrase: string): Promise<VaultKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    key: await deriveKey(passphrase, salt, ITERATIONS),
    salt: toBase64(salt),
    iterations: ITERATIONS,
  };
}

export async function sealVault(
  content: ClientsVaultContent,
  vaultKey: VaultKey,
): Promise<EncryptedVault> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    vaultKey.key,
    encoder.encode(JSON.stringify(content)),
  );
  return {
    v: 1,
    salt: vaultKey.salt,
    iterations: vaultKey.iterations,
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  };
}

export async function reopenVault(
  vault: EncryptedVault,
  vaultKey: VaultKey,
): Promise<ClientsVaultContent> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(vault.iv) as BufferSource },
    vaultKey.key,
    fromBase64(vault.data) as BufferSource,
  );
  return JSON.parse(decoder.decode(decrypted)) as ClientsVaultContent;
}

export async function openVault(
  vault: EncryptedVault,
  passphrase: string,
): Promise<{ content: ClientsVaultContent; vaultKey: VaultKey }> {
  const vaultKey: VaultKey = {
    key: await deriveKey(passphrase, fromBase64(vault.salt), vault.iterations),
    salt: vault.salt,
    iterations: vault.iterations,
  };

  try {
    return { content: await reopenVault(vault, vaultKey), vaultKey };
  } catch {
    throw new Error("Wrong passphrase.");
  }
}
