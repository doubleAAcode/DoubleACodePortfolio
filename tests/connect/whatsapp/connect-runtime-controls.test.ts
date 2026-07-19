import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  isDatabaseHumanSendEnabled,
  isDatabaseWorkerBearerAuthorized,
  type ConnectRuntimeControlDataSource,
} from "../../../src/features/connect/shared/connect-runtime-controls.server.ts";
import { isConnectWorkerAuthorized } from "../../../src/features/connect/shared/connect-worker-auth.server.ts";

test("database rollout controls fail closed and never require a Vercel token", async () => {
  const enabledDataSource = dataSource({
    getFlag: async () => true,
    verifyWorkerBearer: async (bearer) => bearer === "a".repeat(64),
  });
  assert.equal(await isDatabaseHumanSendEnabled(enabledDataSource), true);
  assert.equal(await isDatabaseWorkerBearerAuthorized("a".repeat(64), enabledDataSource), true);

  const failingDataSource = dataSource({
    getFlag: async () => {
      throw new Error("unavailable");
    },
    verifyWorkerBearer: async () => {
      throw new Error("unavailable");
    },
  });
  assert.equal(await isDatabaseHumanSendEnabled(failingDataSource), false);
  assert.equal(await isDatabaseWorkerBearerAuthorized("b".repeat(64), failingDataSource), false);
});

test("worker authorization accepts the database bearer fallback", async () => {
  const previous = process.env.CONNECT_WORKER_SECRET;
  delete process.env.CONNECT_WORKER_SECRET;
  try {
    const request = new Request("https://doubleacode.com/api/connect/admin/human-outbox/process", {
      headers: { authorization: `Bearer ${"c".repeat(64)}` },
    });
    let received = "";
    const authorized = await isConnectWorkerAuthorized(request, async (bearer) => {
      received = bearer;
      return true;
    });
    assert.equal(authorized, true);
    assert.equal(received, "c".repeat(64));
  } finally {
    restoreEnv("CONNECT_WORKER_SECRET", previous);
  }
});

test("runtime control migration is service-role-only and digest-backed", async () => {
  const sql = await readFile("supabase/connect/wa_connect_runtime_controls.sql", "utf8");
  assert.match(sql, /wa_connect_runtime_flags/);
  assert.match(sql, /'HUMAN_SEND_ENABLED', false/);
  assert.match(sql, /wa_connect_worker_credentials/);
  assert.match(sql, /extensions\.digest/);
  assert.match(sql, /wa_verify_connect_worker_bearer/);
  assert.match(sql, /grant execute[\s\S]*service_role/);
  assert.match(sql, /enable row level security/);
  assert.doesNotMatch(sql, /connect_worker_secret/);
});

test("public release endpoint exposes a stable response header marker", async () => {
  const route = await readFile("src/routes/api.connect.release.ts", "utf8");
  assert.match(route, /m2b-guided-problems-v1/);
  assert.match(route, /"guided-flow-read"/);
  assert.match(route, /"guided-draft-edit"/);
  assert.match(route, /"guided-draft-conflict-control"/);
  assert.match(route, /"guided-step-mutations"/);
  assert.match(route, /"guided-choice-mutations"/);
  assert.match(route, /"guided-problem-navigation"/);
  assert.match(route, /"X-Connect-Release": CONNECT_RELEASE/);
  assert.match(route, /"Cache-Control": "no-store"/);
});

function dataSource(
  overrides: Partial<ConnectRuntimeControlDataSource> = {},
): ConnectRuntimeControlDataSource {
  return {
    getFlag: async () => false,
    verifyWorkerBearer: async () => false,
    ...overrides,
  };
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
