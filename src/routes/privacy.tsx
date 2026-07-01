import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy - Double A Code" },
      {
        name: "description",
        content:
          "Privacy policy for Double A Code, including WhatsApp messaging and contact data handling.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
            Privacy Policy
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            How we handle your information
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: July 1, 2026</p>
        </header>

        <div className="prose prose-invert mt-8 max-w-none space-y-8 text-muted-foreground prose-headings:text-foreground prose-a:text-primary">
          <section>
            <h2>Who we are</h2>
            <p>
              Double A Code builds websites, software products, dashboards, mobile apps, and
              business systems. This policy explains how we handle information submitted through
              our website, contact channels, and WhatsApp messaging experiences.
            </p>
          </section>

          <section>
            <h2>Information we collect</h2>
            <p>
              We may collect your name, phone number, email address, company details, project
              information, WhatsApp messages sent to our business number, and any other details you
              choose to share with us.
            </p>
          </section>

          <section>
            <h2>How we use information</h2>
            <p>
              We use information to respond to inquiries, provide support, discuss projects,
              process requested communications, improve our services, and operate WhatsApp-based
              messaging or ordering workflows where applicable.
            </p>
          </section>

          <section>
            <h2>Sharing and service providers</h2>
            <p>
              We do not sell personal information. We may share information with service providers
              needed to operate our website, hosting, analytics, communication tools, and WhatsApp
              services, including Meta when you communicate with us through WhatsApp.
            </p>
          </section>

          <section>
            <h2>Data retention</h2>
            <p>
              We keep information only as long as needed for business, support, legal, security, or
              operational purposes. You can request deletion of your information at any time.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              You can ask us to access, correct, or delete information associated with you by
              contacting us. You can also stop sending messages to our WhatsApp number at any time.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              For privacy questions or deletion requests, contact us at{" "}
              <a href="mailto:contact@doubleacode.com">contact@doubleacode.com</a>.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
