const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const SESSION_KEY = "pavone_supabase_session";
const ADMIN_USERNAME_DOMAIN = "pavone.local";

export type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
};

export class SupabaseConfigError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.",
    );
  }
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getStoredSession(): SupabaseSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SupabaseSession) : null;
  } catch {
    return null;
  }
}

export function usernameToAdminEmail(usernameOrEmail: string) {
  const value = usernameOrEmail.trim().toLowerCase();
  if (value.includes("@")) return value;

  const username = value.replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

  if (!username) throw new Error("Enter a username.");
  return `${username}@${ADMIN_USERNAME_DOMAIN}`;
}

export function adminEmailToUsername(email?: string) {
  if (!email) return "";
  const suffix = `@${ADMIN_USERNAME_DOMAIN}`;
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email;
}

function storeSession(session: SupabaseSession | null) {
  if (typeof window === "undefined") return;
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

function ensureConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new SupabaseConfigError();
  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const setupMessage = getSupabaseSetupMessage(data);
    if (setupMessage) throw new Error(setupMessage);

    const parts = [
      data?.message || data?.error_description || response.statusText,
      data?.details,
      data?.hint,
      data?.code ? `Code: ${data.code}` : "",
    ].filter(Boolean);
    const message = parts.join(" ");
    throw new Error(message);
  }
  return data as T;
}

function getSupabaseSetupMessage(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const error = data as {
    code?: unknown;
    message?: unknown;
  };
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";

  if (
    code === "PGRST205" &&
    /pavone_new_(categories|brands|products|product_images|orders|order_items|settings)/.test(
      message,
    )
  ) {
    return "The new Pavone database tables are missing in Supabase. Run supabase/pavone_new_boutique_schema.sql in the existing Pavone Supabase SQL editor, then refresh this admin page.";
  }

  return "";
}

export async function supabaseAuth<T>(
  path: string,
  init: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { url, key } = ensureConfig();
  const response = await fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(init.accessToken ? { Authorization: `Bearer ${init.accessToken}` } : {}),
      ...init.headers,
    },
  });
  return parseResponse<T>(response);
}

export async function supabaseRest<T>(
  path: string,
  init: RequestInit & { accessToken?: string; prefer?: string } = {},
): Promise<T> {
  const { url, key } = ensureConfig();
  const token = init.accessToken ?? getStoredSession()?.access_token ?? key;
  const response = await fetch(`${url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...init.headers,
    },
  });
  return parseResponse<T>(response);
}

export async function uploadPavoneImage(file: File, folder: "products" | "categories" | "hero") {
  const { url, key } = ensureConfig();
  const session = getStoredSession();
  if (!session?.access_token) throw new Error("You must be signed in to upload images.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName =
    file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "image";
  const path = `${folder}/${Date.now()}-${safeName}.${extension}`;

  const response = await fetch(`${url}/storage/v1/object/pavone-images/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });

  await parseResponse(response);
  return `${url}/storage/v1/object/public/pavone-images/${path}`;
}

export async function signInAdmin(usernameOrEmail: string, password: string) {
  const email = usernameToAdminEmail(usernameOrEmail);
  const session = await supabaseAuth<SupabaseSession>("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  storeSession(session);
  return session;
}

export function signOutAdmin() {
  storeSession(null);
}

export async function updateAdminAccount(values: {
  username?: string;
  password?: string;
  displayName?: string;
}) {
  const session = getStoredSession();
  if (!session?.access_token) throw new Error("You must be signed in.");
  const user = await supabaseAuth<SupabaseSession["user"]>("/user", {
    method: "PUT",
    accessToken: session.access_token,
    body: JSON.stringify({
      ...(values.username ? { email: usernameToAdminEmail(values.username) } : {}),
      ...(values.password ? { password: values.password } : {}),
      ...(values.displayName ? { data: { display_name: values.displayName } } : {}),
    }),
  });
  const next = { ...session, user };
  storeSession(next);
  return next;
}
