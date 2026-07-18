import "@tanstack/react-start/server-only";

import { timingSafeEqual } from "node:crypto";

export function isConnectWorkerAuthorized(request: Request) {
  const secret =
    process.env.CONNECT_WORKER_SECRET ||
    process.env.CONNECT_HUMAN_WORKER_SECRET ||
    process.env.CRON_SECRET ||
    "";
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !authorization.startsWith("Bearer ")) return false;
  return timingSafeStringEqual(authorization.slice("Bearer ".length), secret);
}

function timingSafeStringEqual(leftValue: string, rightValue: string) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  return left.length === right.length && timingSafeEqual(left, right);
}
