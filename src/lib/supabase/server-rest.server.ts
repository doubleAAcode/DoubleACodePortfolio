import "@tanstack/react-start/server-only";

export type ServerSupabaseConfig = {
  url?: string;
  serviceRoleKey?: string;
};

export class ServerSupabaseConfigError extends Error {
  constructor() {
    super("Supabase server logging is not configured.");
  }
}

export function getServerSupabaseConfig(): ServerSupabaseConfig {
  return {
    url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.replace(/\/$/, ""),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function isServerSupabaseConfigured(config = getServerSupabaseConfig()) {
  return Boolean(config.url && config.serviceRoleKey);
}

export async function supabaseServerRest<T>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T> {
  const config = getServerSupabaseConfig();

  if (!config.url || !config.serviceRoleKey) {
    throw new ServerSupabaseConfigError();
  }

  const response = await fetch(`${config.url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.hint || response.statusText;
    throw new Error(message);
  }

  return data as T;
}
