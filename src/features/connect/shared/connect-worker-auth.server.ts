import "@tanstack/react-start/server-only";

import { timingSafeEqual } from "node:crypto";

import { isDatabaseWorkerBearerAuthorized } from "./connect-runtime-controls.server.ts";

export async function isConnectWorkerAuthorized(
  request: Request,
  verifyDatabaseBearer = isDatabaseWorkerBearerAuthorized,
) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return false;

  const bearer = authorization.slice("Bearer ".length);
  const environmentSecrets = [
    process.env.CONNECT_WORKER_SECRET,
    process.env.CONNECT_HUMAN_WORKER_SECRET,
    process.env.CRON_SECRET,
  ].filter((secret): secret is string => Boolean(secret));

  if (environmentSecrets.some((secret) => timingSafeStringEqual(bearer, secret))) return true;
  return verifyDatabaseBearer(bearer);
}

function timingSafeStringEqual(leftValue: string, rightValue: string) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  return left.length === right.length && timingSafeEqual(left, right);
}
