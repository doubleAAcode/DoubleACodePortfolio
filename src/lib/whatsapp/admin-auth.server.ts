import "@tanstack/react-start/server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "wa_internal_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type AdminSessionPayload = {
  sub: string;
  exp: number;
};

export type InternalAdminSession = {
  username: string;
};

export function isInternalAdminConfigured() {
  return Boolean(getAdminPassword() && getAdminSecret());
}

export function validateInternalAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.WA_INTERNAL_ADMIN_USERNAME || "admin";
  const expectedPassword = getAdminPassword();
  if (!expectedPassword || !getAdminSecret()) return false;

  return (
    timingSafeStringEqual(username.trim(), expectedUsername) &&
    timingSafeStringEqual(password, expectedPassword)
  );
}

export function createInternalAdminSessionCookie(username: string) {
  const secret = getAdminSecret();
  if (!secret) throw new Error("Internal admin session secret is not configured.");

  const payload: AdminSessionPayload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(body, secret);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${COOKIE_NAME}=${body}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function clearInternalAdminSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function getInternalAdminSessionFromRequest(request: Request): InternalAdminSession | null {
  const secret = getAdminSecret();
  if (!secret) return null;

  const token = getCookie(request, COOKIE_NAME);
  if (!token) return null;

  const [body, receivedSignature] = token.split(".");
  if (!body || !receivedSignature) return null;

  const expectedSignature = sign(body, secret);
  if (!timingSafeStringEqual(receivedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as AdminSessionPayload;
    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { username: payload.sub };
  } catch {
    return null;
  }
}

export function requireInternalAdminSession(request: Request) {
  const session = getInternalAdminSessionFromRequest(request);
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}

function getAdminPassword() {
  return process.env.WA_INTERNAL_ADMIN_PASSWORD || "";
}

function getAdminSecret() {
  return (
    process.env.WA_INTERNAL_ADMIN_SESSION_SECRET ||
    process.env.WA_DASHBOARD_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

function getCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie");
  if (!cookie) return undefined;
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function timingSafeStringEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
