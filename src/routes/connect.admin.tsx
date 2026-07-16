import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { ConnectWorkspaceShell } from "@/features/connect/shell/connect-shell";
import {
  getInternalAdminSession,
  loginInternalAdmin,
  logoutInternalAdmin,
  type InternalAdminSessionResult,
} from "@/features/connect/shared/admin-client";

export const Route = createFileRoute("/connect/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isFlowBuilder = pathname.endsWith("/flow-builder");
  const [sessionResult, setSessionResult] = useState<InternalAdminSessionResult>();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getInternalAdminSession()
      .then((result) => {
        if (mounted) setSessionResult(result);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Could not load admin session.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function signOut() {
    await logoutInternalAdmin();
    setSessionResult((current) =>
      current ? { ...current, authenticated: false, session: null } : current,
    );
    router.invalidate();
  }

  if (!sessionResult && !error) {
    return <AdminState text="Loading admin..." />;
  }

  if (error || !sessionResult?.authenticated) {
    return (
      <AdminLogin
        configured={sessionResult?.configured ?? true}
        error={error}
        onLogin={(session) => {
          setError("");
          setSessionResult(session);
          router.invalidate();
        }}
      />
    );
  }

  return (
    <ConnectWorkspaceShell
      workspace="admin"
      pathname={pathname}
      username={sessionResult.session?.username ?? "admin"}
      onSignOut={() => void signOut()}
      fullBleed={isFlowBuilder}
    >
      <Outlet />
    </ConnectWorkspaceShell>
  );
}

function AdminLogin({
  configured,
  error,
  onLogin,
}: {
  configured: boolean;
  error?: string;
  onLogin: (session: InternalAdminSessionResult) => void;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(error || "");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setLoading(true);
    try {
      await loginInternalAdmin(username, password);
      onLogin(await getInternalAdminSession());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-lg border border-border bg-surface/70 p-6"
      >
        <h1 className="font-display text-2xl font-semibold">Double A Internal Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Restricted manual onboarding console.</p>
        {!configured ? (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Configure WA_INTERNAL_ADMIN_PASSWORD or WA_INTERNAL_REVIEWER_PASSWORD, plus
            WA_INTERNAL_ADMIN_SESSION_SECRET.
          </p>
        ) : null}
        {formError ? (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <label className="mt-5 block text-sm">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="mt-4 block text-sm">
          Password
          <input
            value={password}
            type="password"
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !configured}
          className="studio-button-primary mt-5 w-full"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function AdminState({ text }: { text: string }) {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      {text}
    </div>
  );
}
