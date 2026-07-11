import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signInAdmin } from "@/stores/pavone/lib/supabase";
import { LOGO_URL, STORE_NAME } from "@/stores/pavone-new/lib/brand";

export const Route = createFileRoute("/stores/pavone/admin/login")({
  component: AdminLogin,
  head: () => ({
    meta: [{ title: "Store Owner Login - PAVONE BY RAY" }, { name: "robots", content: "noindex" }],
  }),
});

function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInAdmin(username, password);
      navigate({ to: "/stores/pavone/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-sm border border-border bg-background p-8 sm:p-10">
        <img src={LOGO_URL} alt={STORE_NAME} className="mx-auto h-10 w-auto" />
        <h1 className="mt-6 text-center font-serif text-2xl">Store Owner Login</h1>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Manage products, categories, brands, homepage content and orders.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label-elegant" htmlFor="username">
              Username or email
            </label>
            <input
              id="username"
              type="text"
              required
              autoFocus
              autoComplete="username"
              className="input-elegant"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div>
            <label className="label-elegant" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="input-elegant"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
