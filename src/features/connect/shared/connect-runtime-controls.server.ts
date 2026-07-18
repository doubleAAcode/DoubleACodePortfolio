import "@tanstack/react-start/server-only";

import { supabaseServerRest } from "../../../lib/supabase/server-rest.server.ts";

type RuntimeFlagRow = {
  enabled: boolean;
};

type WorkerAuthorizationRow = {
  authorized: boolean;
};

export type ConnectRuntimeControlDataSource = {
  getFlag(flagKey: "HUMAN_SEND_ENABLED"): Promise<boolean>;
  verifyWorkerBearer(bearer: string): Promise<boolean>;
};

export function createConnectRuntimeControlDataSource(): ConnectRuntimeControlDataSource {
  return {
    async getFlag(flagKey) {
      const rows = await callRpc<RuntimeFlagRow[]>("wa_get_connect_runtime_flag", {
        p_flag_key: flagKey,
      });
      return rows[0]?.enabled === true;
    },
    async verifyWorkerBearer(bearer) {
      const rows = await callRpc<WorkerAuthorizationRow[]>("wa_verify_connect_worker_bearer", {
        p_bearer: bearer,
      });
      return rows[0]?.authorized === true;
    },
  };
}

export async function isDatabaseHumanSendEnabled(
  dataSource = createConnectRuntimeControlDataSource(),
) {
  try {
    return await dataSource.getFlag("HUMAN_SEND_ENABLED");
  } catch (error) {
    logControlFailure("human-send flag", error);
    return false;
  }
}

export async function isDatabaseWorkerBearerAuthorized(
  bearer: string,
  dataSource = createConnectRuntimeControlDataSource(),
) {
  try {
    return await dataSource.verifyWorkerBearer(bearer);
  } catch (error) {
    logControlFailure("worker bearer", error);
    return false;
  }
}

async function callRpc<T>(name: string, body: Record<string, unknown>) {
  return supabaseServerRest<T>(`/rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function logControlFailure(control: string, error: unknown) {
  console.error("[connect:runtime-control] verification failed", {
    control,
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
}
