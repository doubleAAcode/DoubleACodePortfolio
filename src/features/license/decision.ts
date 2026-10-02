import type {
  LicenseCheckRequest,
  LicenseOptions,
  LicensePayload,
  LicenseStatus,
} from "./protocol.ts";
import type { LicenseStore } from "./store.ts";

/**
 * Decides what to tell one app instance. Order matters: the global stop switch beats everything,
 * then unknown key, then the per-license status, then expiry, and only a license that passed all
 * of those registers (or refreshes) the computer.
 */
export async function decideLicense(input: {
  store: LicenseStore;
  request: LicenseCheckRequest;
  now: Date;
  options: LicenseOptions;
}): Promise<LicensePayload> {
  const { store, request, now, options } = input;
  let status: LicenseStatus = "active";
  let message = "";

  const globalSwitch = await store.getGlobal();

  if (globalSwitch.stopAll) {
    status = "suspended";
    message = globalSwitch.message || "This service is temporarily suspended.";
  } else {
    const license = await store.getLicense(request.licenseKey);

    if (!license) {
      status = "revoked";
      message = "This license key is not recognized.";
    } else if (license.status !== "active") {
      status = license.status === "revoked" ? "revoked" : "suspended";
      message =
        license.message ||
        (status === "revoked" ? "This license has been revoked." : "This license is suspended.");
    } else if (license.expiresAt && now.getTime() > Date.parse(license.expiresAt)) {
      status = "suspended";
      message = "This license has expired.";
    } else {
      const registered = await store.registerMachine(
        request.licenseKey,
        request.machineId,
        request.appVersion,
        now,
      );

      if (!registered) {
        status = "suspended";
        message = "This license is already in use on another computer.";
      }
    }
  }

  const validMs =
    status === "active" ? options.graceHours * 3_600_000 : options.lockedValidMinutes * 60_000;

  return {
    v: 1,
    licenseKey: request.licenseKey,
    machineId: request.machineId,
    nonce: request.nonce,
    status,
    ...(message ? { message } : {}),
    issuedAt: now.toISOString(),
    validUntil: new Date(now.getTime() + validMs).toISOString(),
    checkAfterSec: options.checkAfterSec,
  };
}
