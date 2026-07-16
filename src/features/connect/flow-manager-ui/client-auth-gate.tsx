import { useRouter, useRouterState } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getWaDashboardSession,
  loginWaDashboard,
  type WaDashboardSessionResult,
} from "@/features/connect/shared/dashboard-client";

export function ClientWorkspaceGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const localPreview = import.meta.env.DEV && new URLSearchParams(search).get("preview") === "1";
  const [sessionResult, setSessionResult] = useState<WaDashboardSessionResult>();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getWaDashboardSession()
      .then((result) => {
        if (mounted) setSessionResult(result);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Could not load session.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (localPreview) return children;

  if (!sessionResult && !error) {
    return (
      <div className="connect-flow-manager-surface flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading client workspace...
      </div>
    );
  }

  if (error || !sessionResult?.authenticated) {
    return (
      <ClientWorkspaceLogin
        configured={sessionResult?.configured ?? true}
        error={error}
        onLogin={(nextSession) => {
          setError("");
          setSessionResult(nextSession);
          router.invalidate();
        }}
      />
    );
  }

  return children;
}

function ClientWorkspaceLogin({
  configured,
  error,
  onLogin,
}: {
  configured: boolean;
  error?: string;
  onLogin: (session: WaDashboardSessionResult) => void;
}) {
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(error || "");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    setLoading(true);
    try {
      await loginWaDashboard(username, password);
      onLogin(await getWaDashboardSession());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="connect-flow-manager-surface flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">Double A Connect</h1>
            <p className="text-sm text-muted-foreground">Business workspace</p>
          </div>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Configure the dashboard credentials and session secret before signing in.
          </div>
        ) : null}

        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-2 block text-muted-foreground">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <button
            type="submit"
            disabled={loading || !configured}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
