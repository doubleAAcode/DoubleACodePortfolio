import type { LicenseStatus } from "./protocol.ts";

export type MachineRecord = {
  machineId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  appVersion: string;
};

export type LicenseRecord = {
  key: string;
  label: string;
  status: LicenseStatus;
  /** Shown to the client when this license is not active. */
  message: string;
  maxMachines: number;
  expiresAt: string | null;
  createdAt: string;
  machines: MachineRecord[];
};

export type GlobalSwitch = {
  stopAll: boolean;
  message: string;
};

export type LicensePatch = Partial<{
  label: string;
  status: LicenseStatus;
  message: string;
  maxMachines: number;
  expiresAt: string | null;
}>;

export interface LicenseStore {
  getGlobal(): Promise<GlobalSwitch>;
  setGlobal(value: GlobalSwitch): Promise<GlobalSwitch>;
  getLicense(key: string): Promise<LicenseRecord | null>;
  /**
   * Atomically registers the machine for the license. Returns false when the machine is new and
   * the license already has maxMachines machines. A known machine only gets its last-seen updated.
   */
  registerMachine(key: string, machineId: string, appVersion: string, now: Date): Promise<boolean>;
  listLicenses(): Promise<LicenseRecord[]>;
  createLicense(input: {
    key: string;
    label: string;
    maxMachines: number;
    expiresAt: string | null;
  }): Promise<LicenseRecord>;
  updateLicense(key: string, patch: LicensePatch): Promise<LicenseRecord | null>;
  resetMachines(key: string): Promise<void>;
}

/** In-memory store for tests and for local development (LICENSE_STORE=memory, never in production). */
export function createMemoryLicenseStore(now: () => Date = () => new Date()): LicenseStore {
  let globalSwitch: GlobalSwitch = { stopAll: false, message: "" };
  const licenses = new Map<string, LicenseRecord>();
  const copy = (record: LicenseRecord): LicenseRecord => ({
    ...record,
    machines: record.machines.map((machine) => ({ ...machine })),
  });

  return {
    async getGlobal() {
      return { ...globalSwitch };
    },
    async setGlobal(value) {
      globalSwitch = { stopAll: value.stopAll, message: value.message };
      return { ...globalSwitch };
    },
    async getLicense(key) {
      const record = licenses.get(key);
      return record ? copy(record) : null;
    },
    async registerMachine(key, machineId, appVersion, at) {
      const record = licenses.get(key);
      if (!record) return false;

      const existing = record.machines.find((machine) => machine.machineId === machineId);
      if (existing) {
        existing.lastSeenAt = at.toISOString();
        existing.appVersion = appVersion;
        return true;
      }

      if (record.machines.length >= record.maxMachines) return false;

      record.machines.push({
        machineId,
        firstSeenAt: at.toISOString(),
        lastSeenAt: at.toISOString(),
        appVersion,
      });
      return true;
    },
    async listLicenses() {
      return [...licenses.values()]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((record) => copy(record));
    },
    async createLicense(input) {
      const record: LicenseRecord = {
        key: input.key,
        label: input.label,
        status: "active",
        message: "",
        maxMachines: input.maxMachines,
        expiresAt: input.expiresAt,
        createdAt: now().toISOString(),
        machines: [],
      };
      licenses.set(record.key, record);
      return copy(record);
    },
    async updateLicense(key, patch) {
      const record = licenses.get(key);
      if (!record) return null;

      Object.assign(record, patch);
      return copy(record);
    },
    async resetMachines(key) {
      const record = licenses.get(key);
      if (record) record.machines = [];
    },
  };
}
