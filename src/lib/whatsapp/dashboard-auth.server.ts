import "@tanstack/react-start/server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { DOUBLE_A_TEST_BUSINESS_ID } from "./catalog-repository.server";

const COOKIE_NAME = "wa_dashboard_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type DashboardSessionPayload = {
  sub: string;
  businessId: string;
  exp: number;
};

export type DashboardAuthSession = {
  username: string;
  businessId: string;
};

export function getDashboardCookieName() {
  return COOKIE_NAME;
}

export function getDashboardAuthSettings() {
  return {
    username: process.env.WA_DASHBOARD_USERNAME || "owner",
    password: process.env.WA_DASHBOARD_PASSWORD,
    secret:
      process.env.WA_DASHBOARD_SESSION_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.WA_BOT_LOGS_KEY,
    businessId: process.env.WA_DASHBOARD_BUSINESS_ID || DOUBLE_A_TEST_BUSINESS_ID,
  };
}

export function isDashboardAuthConfigured() {
  const settings = getDashboardAuthSettings();
  return Boolean(settings.password && settings.secret);
}

export function validateDashboardCredentials(username: string, password: string) {
  const settings = getDashboardAuthSettings();

  if (!settings.password || !settings.secret) {
    return false;
  }

  return (
    timingSafeStringEqual(username.trim(), settings.username) &&
    timingSafeStringEqual(password, settings.password)
  );
}

export function createDashboardSessionCookie(username: string) {
  const settings = getDashboardAuthSettings();
  if (!settings.secret) throw new Error("WA dashboard session secret is not configured.");

  const payload: DashboardSessionPayload = {
    sub: username,
    businessId: settings.businessId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(body, settings.secret);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${COOKIE_NAME}=${body}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function clearDashboardSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function getDashboardSessionFromRequest(request: Request): DashboardAuthSession | null {
  const settings = getDashboardAuthSettings();
  if (!settings.secret) return null;

  const token = getCookie(request, COOKIE_NAME);
  if (!token) return null;

  const [body, receivedSignature] = token.split(".");
  if (!body || !receivedSignature) return null;

  const expectedSignature = sign(body, settings.secret);
  if (!timingSafeStringEqual(receivedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as DashboardSessionPayload;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.sub || !payload.businessId || payload.exp < now) {
      return null;
    }

    return {
      username: payload.sub,
      businessId: payload.businessId,
    };
  } catch {
    return null;
  }
}

export function requireDashboardSession(request: Request) {
  const session = getDashboardSessionFromRequest(request);
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return session;
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
