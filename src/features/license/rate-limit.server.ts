import "@tanstack/react-start/server-only";

export type RateLimiter = {
  check: (id: string) => { allowed: boolean; retryAfterSec: number };
};

const MAX_TRACKED_IDS = 5000;

/**
 * Fixed-window limiter held in memory. On serverless hosting each instance has its own counters,
 * so this only blunts casual abuse; add a Vercel Firewall rate-limit rule on /api/license/* for
 * a real limit (see docs/license/README.md).
 */
export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const now = options.now ?? Date.now;
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    check(id) {
      const current = now();
      const entry = windows.get(id);

      if (windows.size > MAX_TRACKED_IDS) {
        for (const [key, value] of windows) {
          if (value.resetAt <= current) windows.delete(key);
        }
      }

      if (!entry || entry.resetAt <= current) {
        windows.set(id, { count: 1, resetAt: current + options.windowMs });
        return { allowed: true, retryAfterSec: 0 };
      }

      entry.count += 1;

      return entry.count <= options.limit
        ? { allowed: true, retryAfterSec: 0 }
        : {
            allowed: false,
            retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - current) / 1000)),
          };
    },
  };
}
