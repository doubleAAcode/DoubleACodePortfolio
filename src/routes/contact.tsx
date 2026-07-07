import { createFileRoute, Link } from "@tanstack/react-router";

const SUPPORT_EMAIL = "support@doubleacode.com";
const OPERATOR_LINE = "Operated by THE COATING GUYS PTY. LTD. ABN: 40 696 839 899.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | Double A Connect" },
      {
        name: "description",
        content:
          "Contact Double A Connect for support, privacy requests, legal inquiries, or Meta App Review questions.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <article className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground transition hover:text-foreground"
        >
          Double A Connect
        </Link>

        <header className="mt-10 border-b border-border pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Contact</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Contact</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Contact the Double A Connect team for support, privacy requests, legal inquiries, or
            Meta App Review questions.
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <InfoBlock label="Product" value="Double A Connect" />
          <InfoBlock label="Business location" value="Australia" />
          <InfoBlock label="Operator" value="THE COATING GUYS PTY. LTD." />
          <InfoBlock label="ABN" value="40 696 839 899" />
        </div>

        <div className="prose prose-invert mt-10 max-w-none space-y-8 text-muted-foreground prose-headings:text-foreground prose-a:text-primary">
          <section>
            <h2>Support</h2>
            <p>
              For product support or general questions, email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
            <p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground no-underline transition hover:bg-primary/90"
              >
                Email support
              </a>
            </p>
          </section>

          <section>
            <h2>Privacy requests</h2>
            <p>
              For access, correction, deletion, or other privacy requests related to Double A
              Connect, contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2>Legal/operator information</h2>
            <p>Double A Connect is operated by THE COATING GUYS PTY. LTD. ABN: 40 696 839 899.</p>
          </section>

          <section>
            <h2>Meta App Review contact</h2>
            <p>
              For app review or platform compliance questions, contact{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          {OPERATOR_LINE}
        </footer>
      </article>
    </main>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
