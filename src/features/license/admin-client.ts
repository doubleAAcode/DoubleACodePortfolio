import type { GlobalSwitch, LicensePatch, LicenseRecord } from "./store.ts";

export type LicenseAdminSnapshot = {
  global: GlobalSwitch;
  licenses: LicenseRecord[];
  /** Present only in the reply to createLicense: the new key, shown once. */
  createdKey?: string;
};

export type LicenseAdminAction =
  | { action: "createLicense"; label: string; maxMachines: number; expiresAt?: string | null }
  | { action: "updateLicense"; key: string; patch: LicensePatch }
  | { action: "resetMachines"; key: string }
  | { action: "setGlobal"; stopAll: boolean; message: string };

const ENDPOINT = "/api/license/admin";

async function readSnapshot(response: Response): Promise<LicenseAdminSnapshot> {
  const body = (await response.json().catch(() => null)) as
    | (LicenseAdminSnapshot & { error?: string })
    | null;

  if (!response.ok || !body) {
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }

  return body;
}

export async function fetchLicenseAdminSnapshot(token: string): Promise<LicenseAdminSnapshot> {
  const response = await fetch(ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return readSnapshot(response);
}

export async function sendLicenseAdminAction(
  token: string,
  action: LicenseAdminAction,
): Promise<LicenseAdminSnapshot> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  return readSnapshot(response);
}
