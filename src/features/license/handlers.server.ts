import "@tanstack/react-start/server-only";

import type { KeyObject } from "node:crypto";
import { z } from "zod";

import {
  getLicenseAdminToken,
  isLicenseAdminAuthorized,
  isLicenseAdminConfigured,
} from "./admin-auth.server.ts";
import { decideLicense } from "./decision.ts";
import {
  DEFAULT_LICENSE_OPTIONS,
  LICENSE_KEY_PATTERN,
  MAX_CHECK_BODY_BYTES,
  parseCheckRequest,
  type LicenseOptions,
} from "./protocol.ts";
import { createRateLimiter, type RateLimiter } from "./rate-limit.server.ts";
import { generateLicenseKey, getSigningKey, signLicensePayload } from "./signing.server.ts";
import { createMemoryLicenseStore, type LicenseStore } from "./store.ts";
import { createSupabaseLicenseStore } from "./supabase-store.server.ts";

export type LicenseHandlerDeps = {
  store: LicenseStore;
  getSigningKey: () => KeyObject | null;
  getAdminToken: () => string;
  now: () => Date;
  options: LicenseOptions;
  checkLimiter: RateLimiter;
  adminLimiter: RateLimiter;
};

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

function clientId(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function limited(retryAfterSec: number) {
  return json({ error: "Too many requests." }, 429, { "Retry-After": String(retryAfterSec) });
}

function readIntEnv(name: string, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

let developmentStore: LicenseStore | undefined;

function defaultStore(): LicenseStore {
  // The memory store exists for local end-to-end testing only and is refused in production.
  if (process.env.LICENSE_STORE === "memory" && process.env.NODE_ENV !== "production") {
    developmentStore ??= createMemoryLicenseStore();
    return developmentStore;
  }

  return createSupabaseLicenseStore();
}

export function createDefaultLicenseDeps(): LicenseHandlerDeps {
  return {
    store: defaultStore(),
    getSigningKey,
    getAdminToken: getLicenseAdminToken,
    now: () => new Date(),
    options: {
      graceHours: readIntEnv("LICENSE_GRACE_HOURS", DEFAULT_LICENSE_OPTIONS.graceHours, 1, 24 * 30),
      checkAfterSec: readIntEnv(
        "LICENSE_CHECK_INTERVAL_SEC",
        DEFAULT_LICENSE_OPTIONS.checkAfterSec,
        60,
        86_400,
      ),
      lockedValidMinutes: DEFAULT_LICENSE_OPTIONS.lockedValidMinutes,
    },
    checkLimiter: createRateLimiter({ limit: 60, windowMs: 60_000 }),
    adminLimiter: createRateLimiter({ limit: 10, windowMs: 60_000 }),
  };
}

let sharedDeps: LicenseHandlerDeps | undefined;

function resolveDeps(overrides?: Partial<LicenseHandlerDeps>): LicenseHandlerDeps {
  sharedDeps ??= createDefaultLicenseDeps();
  return { ...sharedDeps, ...overrides };
}

/** POST /api/license/check: the desktop app's check-in. */
export function createLicenseCheckHandlers(overrides?: Partial<LicenseHandlerDeps>) {
  return {
    POST: async ({ request }: { request: Request }) => {
      const deps = resolveDeps(overrides);
      const limit = deps.checkLimiter.check(clientId(request));
      if (!limit.allowed) return limited(limit.retryAfterSec);

      const text = await request.text();
      if (text.length > MAX_CHECK_BODY_BYTES) return json({ error: "Request too large." }, 413);

      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: "Request body must be JSON." }, 400);
      }

      const parsed = parseCheckRequest(body);
      if (!parsed.ok) return json({ error: parsed.error }, 400);

      const signingKey = deps.getSigningKey();
      if (!signingKey) {
        console.error("[license] LICENSE_SIGNING_PRIVATE_KEY is missing or not an Ed25519 key.");
        return json({ error: "License service is not configured." }, 503);
      }

      try {
        const payload = await decideLicense({
          store: deps.store,
          request: parsed.request,
          now: deps.now(),
          options: deps.options,
        });
        return json(signLicensePayload(payload, signingKey));
      } catch (error) {
        console.error("[license] check failed", error instanceof Error ? error.message : error);
        return json({ error: "License service unavailable." }, 503);
      }
    },
  };
}

const keySchema = z.string().regex(LICENSE_KEY_PATTERN);
const expiresSchema = z.string().datetime({ offset: true }).nullable();

const adminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createLicense"),
    label: z.string().trim().min(1).max(120),
    maxMachines: z.number().int().min(1).max(100).default(1),
    expiresAt: expiresSchema.optional(),
  }),
  z.object({
    action: z.literal("updateLicense"),
    key: keySchema,
    patch: z
      .object({
        label: z.string().trim().min(1).max(120).optional(),
        status: z.enum(["active", "suspended", "revoked"]).optional(),
        message: z.string().max(500).optional(),
        maxMachines: z.number().int().min(1).max(100).optional(),
        expiresAt: expiresSchema.optional(),
      })
      .strict(),
  }),
  z.object({ action: z.literal("resetMachines"), key: keySchema }),
  z.object({
    action: z.literal("setGlobal"),
    stopAll: z.boolean(),
    message: z.string().max(500).default(""),
  }),
]);

/** GET/POST /api/license/admin: the switch panel's backend. Bearer-token protected. */
export function createLicenseAdminHandlers(overrides?: Partial<LicenseHandlerDeps>) {
  async function authorize(request: Request, deps: LicenseHandlerDeps): Promise<Response | null> {
    const token = deps.getAdminToken();
    if (!isLicenseAdminConfigured(token)) {
      return json({ error: "License admin is not configured." }, 503);
    }

    const limit = deps.adminLimiter.check(clientId(request));
    if (!limit.allowed) return limited(limit.retryAfterSec);

    if (!isLicenseAdminAuthorized(request, token)) {
      return json({ error: "Unauthorized" }, 401);
    }

    return null;
  }

  async function snapshot(deps: LicenseHandlerDeps) {
    const [global, licenses] = await Promise.all([
      deps.store.getGlobal(),
      deps.store.listLicenses(),
    ]);
    return { global, licenses };
  }

  return {
    GET: async ({ request }: { request: Request }) => {
      const deps = resolveDeps(overrides);
      const denied = await authorize(request, deps);
      if (denied) return denied;

      try {
        return json(await snapshot(deps));
      } catch (error) {
        console.error(
          "[license] admin read failed",
          error instanceof Error ? error.message : error,
        );
        return json({ error: "Could not read licenses." }, 503);
      }
    },

    POST: async ({ request }: { request: Request }) => {
      const deps = resolveDeps(overrides);
      const denied = await authorize(request, deps);
      if (denied) return denied;

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Request body must be JSON." }, 400);
      }

      const parsed = adminActionSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Invalid request." }, 400);

      try {
        const action = parsed.data;
        let createdKey: string | undefined;

        if (action.action === "createLicense") {
          createdKey = generateLicenseKey();
          await deps.store.createLicense({
            key: createdKey,
            label: action.label,
            maxMachines: action.maxMachines,
            expiresAt: action.expiresAt ?? null,
          });
        } else if (action.action === "updateLicense") {
          const updated = await deps.store.updateLicense(action.key, action.patch);
          if (!updated) return json({ error: "License not found." }, 404);
        } else if (action.action === "resetMachines") {
          await deps.store.resetMachines(action.key);
        } else {
          await deps.store.setGlobal({ stopAll: action.stopAll, message: action.message });
        }

        return json({ ...(await snapshot(deps)), createdKey });
      } catch (error) {
        console.error(
          "[license] admin action failed",
          error instanceof Error ? error.message : error,
        );
        return json({ error: "The change could not be saved." }, 503);
      }
    },
  };
}
