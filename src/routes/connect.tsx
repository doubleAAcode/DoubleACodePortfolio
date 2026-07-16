import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Building2, LayoutDashboard, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Double A Connect - WhatsApp Commerce Bot" },
      {
        name: "description",
        content:
          "Double A Connect centralizes the WhatsApp bot landing page, admin console, and client dashboards.",
      },
    ],
  }),
  component: ConnectLandingPage,
});

function ConnectLandingPage() {
  return (
    <main className="dark min-h-screen bg-background px-4 py-10 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col justify-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/70 px-3 py-2 text-sm text-muted-foreground">
            <Bot className="h-4 w-4 text-primary" />
            WhatsApp commerce automation
          </div>
          <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
            Double A Connect
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            The home for the chatbot product, including internal operations, business dashboards,
            catalog controls, order handling, and the future public landing page.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <ConnectLink
            to="/connect/dashboard"
            icon={LayoutDashboard}
            title="Business dashboard"
            description="Manage catalog, orders, delivery, settings, and simulator tools."
          />
          <ConnectLink
            to="/connect/admin"
            icon={ShieldCheck}
            title="Internal admin"
            description="Onboard businesses, review logs, templates, flows, and connections."
          />
          <ConnectLink
            to="/connect/dashboard-2"
            icon={Building2}
            title="Partner dashboard"
            description="Access the secondary business dashboard variant while it remains active."
          />
        </div>
      </section>
    </main>
  );
}

function ConnectLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: "/connect/dashboard" | "/connect/admin" | "/connect/dashboard-2";
  icon: typeof LayoutDashboard;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-border bg-surface/70 p-5 transition hover:border-primary/50 hover:bg-surface"
    >
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  );
}
