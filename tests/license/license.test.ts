import assert from "node:assert/strict";
import { generateKeyPairSync, verify, type KeyObject } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { decideLicense } from "../../src/features/license/decision.ts";
import {
  createLicenseAdminHandlers,
  createLicenseCheckHandlers,
  type LicenseHandlerDeps,
} from "../../src/features/license/handlers.server.ts";
import {
  DEFAULT_LICENSE_OPTIONS,
  LICENSE_KEY_PATTERN,
  parseCheckRequest,
  type LicensePayload,
  type SignedLicenseResponse,
} from "../../src/features/license/protocol.ts";
import { createRateLimiter } from "../../src/features/license/rate-limit.server.ts";
import { generateLicenseKey, parseSigningKey } from "../../src/features/license/signing.server.ts";
import { createMemoryLicenseStore } from "../../src/features/license/store.ts";

const ADMIN_TOKEN = "t".repeat(40);
const MACHINE_A = "a".repeat(32);
const MACHINE_B = "b".repeat(32);
const NOW = new Date("2026-10-02T10:00:00.000Z");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");

function createDeps(overrides: Partial<LicenseHandlerDeps> = {}): LicenseHandlerDeps {
  return {
    store: createMemoryLicenseStore(() => NOW),
    getSigningKey: () => privateKey,
    getAdminToken: () => ADMIN_TOKEN,
    now: () => NOW,
    options: DEFAULT_LICENSE_OPTIONS,
    checkLimiter: createRateLimiter({ limit: 1000, windowMs: 60_000 }),
    adminLimiter: createRateLimiter({ limit: 1000, windowMs: 60_000 }),
    ...overrides,
  };
}

function checkRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/license/check", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function adminRequest(method: "GET" | "POST", body?: unknown, token: string | null = ADMIN_TOKEN) {
  return new Request("https://example.test/api/license/admin", {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Verifies a reply the same way the desktop app does: Ed25519 over the payload text's bytes. */
function verifyReply(
  reply: SignedLicenseResponse,
  key: KeyObject = publicKey,
): LicensePayload | null {
  const valid = verify(
    null,
    Buffer.from(reply.payload, "utf8"),
    key,
    Buffer.from(reply.signature, "base64url"),
  );
  return valid ? (JSON.parse(reply.payload) as LicensePayload) : null;
}

async function seedLicense(deps: LicenseHandlerDeps, maxMachines = 1) {
  const key = generateLicenseKey();
  await deps.store.createLicense({ key, label: "Test client", maxMachines, expiresAt: null });
  return key;
}

function check(
  deps: LicenseHandlerDeps,
  licenseKey: string,
  machineId = MACHINE_A,
  nonce = "nonce-12345",
) {
  return createLicenseCheckHandlers(deps).POST({
    request: checkRequest({ licenseKey, machineId, nonce, appVersion: "1.0.0" }),
  });
}

test("generated license keys match the shared key pattern and do not repeat", () => {
  const keys = new Set(Array.from({ length: 200 }, () => generateLicenseKey()));

  assert.equal(keys.size, 200);
  for (const key of keys) {
    assert.match(key, /^ACD(-[A-Z2-9]{5}){4}$/);
    assert.match(key, LICENSE_KEY_PATTERN);
  }
});

test("check request parsing accepts valid input and rejects malformed fields", () => {
  const valid = { licenseKey: "ACD-AAAAA-BBBBB", machineId: MACHINE_A, nonce: "abcdefgh1234" };

  assert.equal(parseCheckRequest(valid).ok, true);
  assert.equal(parseCheckRequest({ ...valid, appVersion: "1.2.3" }).ok, true);
  for (const bad of [
    null,
    [],
    "text",
    { ...valid, licenseKey: "short" },
    { ...valid, licenseKey: "has space in it" },
    { ...valid, machineId: "XYZ" },
    { ...valid, nonce: "!!" },
    { ...valid, appVersion: "x".repeat(40) },
  ]) {
    assert.equal(parseCheckRequest(bad).ok, false, JSON.stringify(bad));
  }
});

test("decision: unknown key is revoked, active key registers its computer", async () => {
  const store = createMemoryLicenseStore(() => NOW);
  const options = DEFAULT_LICENSE_OPTIONS;
  const request = {
    licenseKey: "ACD-UNKNOWN-KEY1",
    machineId: MACHINE_A,
    nonce: "nonce-12345",
    appVersion: "1",
  };

  const unknown = await decideLicense({ store, request, now: NOW, options });
  assert.equal(unknown.status, "revoked");
  assert.match(unknown.message ?? "", /not recognized/);

  const key = generateLicenseKey();
  await store.createLicense({ key, label: "Client", maxMachines: 1, expiresAt: null });
  const active = await decideLicense({
    store,
    request: { ...request, licenseKey: key },
    now: NOW,
    options,
  });

  assert.equal(active.status, "active");
  assert.equal(active.message, undefined);
  assert.equal(active.nonce, "nonce-12345");
  assert.equal(active.validUntil, new Date(NOW.getTime() + 72 * 3_600_000).toISOString());
  assert.equal((await store.getLicense(key))?.machines.length, 1);
});

test("decision: a second computer is refused until the seats are reset", async () => {
  const store = createMemoryLicenseStore(() => NOW);
  const key = generateLicenseKey();
  await store.createLicense({ key, label: "Client", maxMachines: 1, expiresAt: null });
  const ask = (machineId: string) =>
    decideLicense({
      store,
      request: { licenseKey: key, machineId, nonce: "nonce-12345", appVersion: "1" },
      now: NOW,
      options: DEFAULT_LICENSE_OPTIONS,
    });

  assert.equal((await ask(MACHINE_A)).status, "active");
  assert.equal((await ask(MACHINE_A)).status, "active");
  const second = await ask(MACHINE_B);
  assert.equal(second.status, "suspended");
  assert.match(second.message ?? "", /another computer/);

  await store.resetMachines(key);
  assert.equal((await ask(MACHINE_B)).status, "active");
});

test("decision: suspended, revoked, expired and the global stop all lock the client", async () => {
  const store = createMemoryLicenseStore(() => NOW);
  const key = generateLicenseKey();
  await store.createLicense({ key, label: "Client", maxMachines: 2, expiresAt: null });
  const ask = () =>
    decideLicense({
      store,
      request: { licenseKey: key, machineId: MACHINE_A, nonce: "nonce-12345", appVersion: "1" },
      now: NOW,
      options: DEFAULT_LICENSE_OPTIONS,
    });

  await store.updateLicense(key, { status: "suspended", message: "Payment overdue" });
  const suspended = await ask();
  assert.equal(suspended.status, "suspended");
  assert.equal(suspended.message, "Payment overdue");
  assert.equal(suspended.validUntil, new Date(NOW.getTime() + 60 * 60_000).toISOString());

  await store.updateLicense(key, { status: "revoked", message: "" });
  assert.equal((await ask()).status, "revoked");

  await store.updateLicense(key, { status: "active", expiresAt: "2026-10-01T00:00:00.000Z" });
  const expired = await ask();
  assert.equal(expired.status, "suspended");
  assert.match(expired.message ?? "", /expired/);

  await store.updateLicense(key, { expiresAt: null });
  assert.equal((await ask()).status, "active");

  await store.setGlobal({ stopAll: true, message: "Maintenance" });
  const stopped = await ask();
  assert.equal(stopped.status, "suspended");
  assert.equal(stopped.message, "Maintenance");

  await store.setGlobal({ stopAll: false, message: "" });
  assert.equal((await ask()).status, "active");
});

test("signing keys parse from PEM, escaped PEM and base64 DER; other keys are refused", () => {
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const der = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({
    type: "pkcs8",
    format: "pem",
  });

  assert.ok(parseSigningKey(pem));
  assert.ok(parseSigningKey(pem.replace(/\n/g, "\\n")));
  assert.ok(parseSigningKey(der));
  assert.equal(parseSigningKey(rsa.toString()), null);
  assert.equal(parseSigningKey("not a key"), null);
  assert.equal(parseSigningKey(undefined), null);
  assert.equal(parseSigningKey("   "), null);
});

test("check endpoint returns a signature the desktop app can verify, bound to the request", async () => {
  const deps = createDeps();
  const key = await seedLicense(deps);
  const response = await check(deps, key);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const reply = (await response.json()) as SignedLicenseResponse;
  const payload = verifyReply(reply);

  assert.ok(payload, "signature must verify with the public key");
  assert.equal(payload.status, "active");
  assert.equal(payload.licenseKey, key);
  assert.equal(payload.machineId, MACHINE_A);
  assert.equal(payload.nonce, "nonce-12345");

  const tampered = { ...reply, payload: reply.payload.replace('"active"', '"suspend"') };
  assert.equal(verifyReply(tampered), null);

  const otherKey = generateKeyPairSync("ed25519").publicKey;
  assert.equal(verifyReply(reply, otherKey), null);
});

test("check endpoint rejects bad input, oversize bodies and unconfigured signing", async () => {
  const deps = createDeps();
  const handlers = createLicenseCheckHandlers(deps);
  const key = await seedLicense(deps);

  assert.equal((await handlers.POST({ request: checkRequest("{not json") })).status, 400);
  assert.equal((await handlers.POST({ request: checkRequest({ licenseKey: "x" }) })).status, 400);
  assert.equal(
    (await handlers.POST({ request: checkRequest({ licenseKey: key, padding: "x".repeat(4000) }) }))
      .status,
    413,
  );

  const unsigned = createLicenseCheckHandlers(createDeps({ getSigningKey: () => null }));
  const response = await unsigned.POST({
    request: checkRequest({ licenseKey: key, machineId: MACHINE_A, nonce: "nonce-12345" }),
  });
  assert.equal(response.status, 503);
});

test("check endpoint answers 503 when the store fails, and 429 when rate limited", async () => {
  const failing = createDeps();
  failing.store.getGlobal = async () => {
    throw new Error("database down");
  };
  const original = console.error;
  console.error = () => undefined;

  try {
    const response = await check(failing, "ACD-AAAAA-BBBBB-CCCCC");
    assert.equal(response.status, 503);
  } finally {
    console.error = original;
  }

  const limited = createDeps({ checkLimiter: createRateLimiter({ limit: 2, windowMs: 60_000 }) });
  const key = await seedLicense(limited);
  assert.equal((await check(limited, key)).status, 200);
  assert.equal((await check(limited, key)).status, 200);
  const blocked = await check(limited, key);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) >= 1);
});

test("admin endpoint refuses unconfigured, missing and wrong tokens", async () => {
  const handlers = createLicenseAdminHandlers(createDeps());

  assert.equal((await handlers.GET({ request: adminRequest("GET", undefined, null) })).status, 401);
  assert.equal(
    (await handlers.GET({ request: adminRequest("GET", undefined, "wrong") })).status,
    401,
  );
  assert.equal(
    (await handlers.GET({ request: adminRequest("GET", undefined, `${ADMIN_TOKEN}x`) })).status,
    401,
  );
  assert.equal((await handlers.GET({ request: adminRequest("GET") })).status, 200);

  const disabled = createLicenseAdminHandlers(createDeps({ getAdminToken: () => "short" }));
  assert.equal(
    (await disabled.GET({ request: adminRequest("GET", undefined, "short") })).status,
    503,
  );
  const empty = createLicenseAdminHandlers(createDeps({ getAdminToken: () => "" }));
  assert.equal((await empty.GET({ request: adminRequest("GET", undefined, "") })).status, 503);
});

test("admin endpoint throttles repeated guessing", async () => {
  const handlers = createLicenseAdminHandlers(
    createDeps({ adminLimiter: createRateLimiter({ limit: 3, windowMs: 60_000 }) }),
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.equal(
      (await handlers.GET({ request: adminRequest("GET", undefined, "guess") })).status,
      401,
    );
  }
  assert.equal(
    (await handlers.GET({ request: adminRequest("GET", undefined, "guess") })).status,
    429,
  );
});

test("admin switch: create, suspend, reset computers and stop everyone, end to end", async () => {
  const deps = createDeps();
  const admin = createLicenseAdminHandlers(deps);
  const post = (body: unknown) => admin.POST({ request: adminRequest("POST", body) });

  const created = (await (
    await post({ action: "createLicense", label: "Acme", maxMachines: 2 })
  ).json()) as {
    createdKey: string;
    licenses: Array<{ key: string; label: string; maxMachines: number; status: string }>;
  };
  assert.match(created.createdKey, LICENSE_KEY_PATTERN);
  assert.equal(created.licenses[0].label, "Acme");
  assert.equal(created.licenses[0].maxMachines, 2);

  const key = created.createdKey;
  const status = async (machineId = MACHINE_A) =>
    verifyReply((await (await check(deps, key, machineId)).json()) as SignedLicenseResponse)
      ?.status;

  assert.equal(await status(), "active");
  assert.equal(await status(MACHINE_B), "active");

  await post({ action: "updateLicense", key, patch: { status: "suspended", message: "Overdue" } });
  assert.equal(await status(), "suspended");

  await post({ action: "updateLicense", key, patch: { status: "active" } });
  assert.equal(await status(), "active");

  await post({ action: "setGlobal", stopAll: true, message: "Back soon" });
  assert.equal(await status(), "suspended");
  await post({ action: "setGlobal", stopAll: false, message: "" });
  assert.equal(await status(), "active");

  const afterReset = (await (await post({ action: "resetMachines", key })).json()) as {
    licenses: Array<{ machines: unknown[] }>;
  };
  assert.equal(afterReset.licenses[0].machines.length, 0);
});

test("admin switch validates input and reports missing licenses", async () => {
  const admin = createLicenseAdminHandlers(createDeps());
  const post = (body: unknown) => admin.POST({ request: adminRequest("POST", body) });

  assert.equal((await post({ action: "nope" })).status, 400);
  assert.equal((await post({ action: "createLicense", label: "   " })).status, 400);
  assert.equal((await post({ action: "createLicense", label: "A", maxMachines: 0 })).status, 400);
  assert.equal(
    (await post({ action: "updateLicense", key: "ACD-AAAAA-BBBBB", patch: { status: "banned" } }))
      .status,
    400,
  );
  assert.equal(
    (await post({ action: "updateLicense", key: "ACD-AAAAA-BBBBB", patch: { extra: 1 } })).status,
    400,
  );
  assert.equal(
    (
      await post({
        action: "updateLicense",
        key: "ACD-AAAAA-BBBBB",
        patch: { status: "suspended" },
      })
    ).status,
    404,
  );
});

test("license migration is service-role-only and registers machines atomically", async () => {
  const sql = await readFile("supabase/license/license_schema.sql", "utf8");

  for (const table of ["license_global", "licenses", "license_machines"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`));
  }

  assert.doesNotMatch(sql, /create policy/i);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = pg_catalog, public/);
  assert.match(sql, /for update/);
  assert.match(
    sql,
    /grant execute on function public\.license_register_machine\(text, text, text\) to service_role/,
  );
  assert.match(
    sql,
    /revoke all on function public\.license_register_machine\(text, text, text\) from public, anon, authenticated/,
  );
});

test("license routes are wired to the handlers and the admin page is not indexed", async () => {
  const checkRoute = await readFile("src/routes/api.license.check.ts", "utf8");
  const adminRoute = await readFile("src/routes/api.license.admin.ts", "utf8");
  const page = await readFile("src/routes/license-admin.tsx", "utf8");

  assert.match(checkRoute, /createFileRoute\("\/api\/license\/check"\)/);
  assert.match(checkRoute, /createLicenseCheckHandlers\(\)/);
  assert.match(adminRoute, /createFileRoute\("\/api\/license\/admin"\)/);
  assert.match(adminRoute, /createLicenseAdminHandlers\(\)/);
  assert.match(page, /noindex, nofollow/);
});
