import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/connect/flow-manager-ui/components/app-sidebar";
import { CommandPalette } from "@/features/connect/flow-manager-ui/components/command-palette";
import { FlowManagerPreviewBoundary } from "@/features/connect/flow-manager-ui/preview-boundary";
import {
  getInternalAdminSession,
  loginInternalAdmin,
  type InternalAdminSessionResult,
} from "@/features/connect/shared/admin-client";

export const Route = createFileRoute("/connect/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouter();
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const localPreview = import.meta.env.DEV && new URLSearchParams(search).get("preview") === "1";
  const [sessionResult, setSessionResult] = useState<InternalAdminSessionResult>();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getInternalAdminSession()
      .then((result) => {
        if (mounted) setSessionResult(result);
      })
      .catch((caught) => {
        if (mounted) {
          setError(caught instanceof Error ? caught.message : "Could not load admin session.");
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (localPreview) return <AdminWorkspace />;

  if (!sessionResult && !error) return <AdminState text="Loading admin..." />;

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

  return <AdminWorkspace />;
}

function AdminWorkspace() {
  return (
    <div className="connect-flow-manager-surface min-h-svh bg-background text-foreground">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <FlowManagerPreviewBoundary>
            <Outlet />
          </FlowManagerPreviewBoundary>
        </SidebarInset>
        <CommandPalette />
      </SidebarProvider>
    </div>
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
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="connect-flow-manager-surface flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">WA Business Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Internal console</p>
        {!configured ? (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Configure the existing internal admin credentials and session secret in Vercel.
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
          className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function AdminState({ text }: { text: string }) {
  return (
    <div className="connect-flow-manager-surface flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      {text}
    </div>
  );
}
