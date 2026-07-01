import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/data-deletion")({
  head: () => ({
    meta: [
      { title: "Data Deletion - Double A Code" },
      {
        name: "description",
        content: "Instructions for requesting deletion of personal data from Double A Code.",
      },
    ],
  }),
  component: DataDeletionPage,
});

function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <article className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground transition hover:text-foreground"
        >
          Double A Code
        </Link>

        <header className="mt-10 border-b border-border pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            Data Deletion
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Request deletion of your data
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: July 1, 2026</p>
        </header>

        <div className="prose prose-invert mt-8 max-w-none space-y-8 text-muted-foreground prose-headings:text-foreground prose-a:text-primary">
          <section>
            <h2>How to request deletion</h2>
            <p>
              To request deletion of personal information associated with your website inquiry,
              WhatsApp messages, or project communication, email us at{" "}
              <a href="mailto:contact@doubleacode.com">contact@doubleacode.com</a>.
            </p>
          </section>

          <section>
            <h2>What to include</h2>
            <p>
              Include your name, phone number or email address used to contact us, and a short note
              saying that you want your data deleted. If your request relates to WhatsApp, include
              the WhatsApp phone number you used.
            </p>
          </section>

          <section>
            <h2>What happens next</h2>
            <p>
              We will review your request, verify that the information is associated with you, and
              delete or anonymize data where legally and operationally possible. Some records may be
              retained when required for legal, security, accounting, or dispute-resolution reasons.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Send deletion requests to{" "}
              <a href="mailto:contact@doubleacode.com">contact@doubleacode.com</a>.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
