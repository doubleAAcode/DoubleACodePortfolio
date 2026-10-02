import "@tanstack/react-start/server-only";

import { supabaseServerRest } from "../../lib/supabase/server-rest.server.ts";
import { LICENSE_KEY_PATTERN, MACHINE_ID_PATTERN } from "./protocol.ts";
import type {
  GlobalSwitch,
  LicensePatch,
  LicenseRecord,
  LicenseStore,
  MachineRecord,
} from "./store.ts";

type LicenseRow = {
  key: string;
  label: string;
  status: LicenseRecord["status"];
  message: string;
  max_machines: number;
  expires_at: string | null;
  created_at: string;
  license_machines?: Array<{
    machine_id: string;
    first_seen_at: string;
    last_seen_at: string;
    app_version: string;
  }>;
};

type GlobalRow = { stop_all: boolean; message: string };

function toRecord(row: LicenseRow): LicenseRecord {
  const machines: MachineRecord[] = (row.license_machines ?? []).map((machine) => ({
    machineId: machine.machine_id,
    firstSeenAt: machine.first_seen_at,
    lastSeenAt: machine.last_seen_at,
    appVersion: machine.app_version,
  }));

  return {
    key: row.key,
    label: row.label,
    status: row.status,
    message: row.message,
    maxMachines: row.max_machines,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    machines,
  };
}

function assertKey(key: string) {
  // Keys are interpolated into PostgREST filters, so reject anything outside the key alphabet.
  if (!LICENSE_KEY_PATTERN.test(key)) throw new Error("Invalid license key.");
}

const LICENSE_SELECT =
  "select=key,label,status,message,max_machines,expires_at,created_at,license_machines(machine_id,first_seen_at,last_seen_at,app_version)";

export function createSupabaseLicenseStore(): LicenseStore {
  return {
    async getGlobal() {
      const rows = await supabaseServerRest<GlobalRow[]>(
        "/license_global?id=eq.true&select=stop_all,message",
      );
      // A missing row must never read as "all clear" by accident, but an empty table cannot stop anyone.
      return { stopAll: rows[0]?.stop_all ?? false, message: rows[0]?.message ?? "" };
    },

    async setGlobal(value: GlobalSwitch) {
      const rows = await supabaseServerRest<GlobalRow[]>("/license_global?id=eq.true", {
        method: "PATCH",
        prefer: "return=representation",
        body: JSON.stringify({
          stop_all: value.stopAll,
          message: value.message,
          updated_at: new Date().toISOString(),
        }),
      });
      return { stopAll: rows[0]?.stop_all ?? value.stopAll, message: rows[0]?.message ?? "" };
    },

    async getLicense(key) {
      assertKey(key);
      const rows = await supabaseServerRest<LicenseRow[]>(
        `/licenses?key=eq.${encodeURIComponent(key)}&${LICENSE_SELECT}`,
      );
      return rows[0] ? toRecord(rows[0]) : null;
    },

    async registerMachine(key, machineId, appVersion) {
      assertKey(key);
      if (!MACHINE_ID_PATTERN.test(machineId)) throw new Error("Invalid machine id.");

      return supabaseServerRest<boolean>("/rpc/license_register_machine", {
        method: "POST",
        body: JSON.stringify({
          p_key: key,
          p_machine_id: machineId,
          p_app_version: appVersion,
        }),
      });
    },

    async listLicenses() {
      const rows = await supabaseServerRest<LicenseRow[]>(
        `/licenses?${LICENSE_SELECT}&order=created_at.desc`,
      );
      return rows.map(toRecord);
    },

    async createLicense(input) {
      assertKey(input.key);
      const rows = await supabaseServerRest<LicenseRow[]>("/licenses", {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify({
          key: input.key,
          label: input.label,
          max_machines: input.maxMachines,
          expires_at: input.expiresAt,
        }),
      });
      return toRecord(rows[0]);
    },

    async updateLicense(key, patch: LicensePatch) {
      assertKey(key);
      const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.label !== undefined) body.label = patch.label;
      if (patch.status !== undefined) body.status = patch.status;
      if (patch.message !== undefined) body.message = patch.message;
      if (patch.maxMachines !== undefined) body.max_machines = patch.maxMachines;
      if (patch.expiresAt !== undefined) body.expires_at = patch.expiresAt;

      const rows = await supabaseServerRest<LicenseRow[]>(
        `/licenses?key=eq.${encodeURIComponent(key)}`,
        { method: "PATCH", prefer: "return=representation", body: JSON.stringify(body) },
      );
      return rows[0] ? toRecord(rows[0]) : null;
    },

    async resetMachines(key) {
      assertKey(key);
      await supabaseServerRest<null>(
        `/license_machines?license_key=eq.${encodeURIComponent(key)}`,
        { method: "DELETE" },
      );
    },
  };
}
