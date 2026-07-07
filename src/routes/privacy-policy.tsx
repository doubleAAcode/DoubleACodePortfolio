import { createFileRoute, Link } from "@tanstack/react-router";

const SUPPORT_EMAIL = "support@doubleacode.com";
const OPERATOR_LINE = "Operated by THE COATING GUYS PTY. LTD. ABN: 40 696 839 899.";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Double A Connect" },
      {
        name: "description",
        content:
          "Privacy Policy for Double A Connect, a WhatsApp commerce automation SaaS operated by THE COATING GUYS PTY. LTD.",
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
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
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            Privacy Policy
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: July 7, 2026</p>
        </header>

        <div className="prose prose-invert mt-8 max-w-none space-y-8 text-muted-foreground prose-headings:text-foreground prose-a:text-primary">
          <section>
            <h2>Introduction</h2>
            <p>
              This Privacy Policy explains how Double A Connect handles information when businesses
              use our web-based SaaS/admin dashboard for WhatsApp commerce automation, customer
              conversations, order-taking flows, support replies, and WhatsApp Business message
              templates.
            </p>
          </section>

          <section>
            <h2>Who operates the service</h2>
            <p>Double A Connect is operated by THE COATING GUYS PTY. LTD. ABN: 40 696 839 899.</p>
          </section>

          <section>
            <h2>What our service does</h2>
            <p>
              Double A Connect helps connected businesses manage WhatsApp customer communication,
              send and receive WhatsApp messages, automate order-taking workflows, support customer
              replies, and manage WhatsApp Business message templates and related business assets.
            </p>
          </section>

          <section>
            <h2>Information we collect</h2>
            <p>Depending on how a business uses the service, we may process:</p>
            <ul>
              <li>Business account information and admin user details.</li>
              <li>WhatsApp Business Account IDs and WhatsApp phone number IDs.</li>
              <li>
                Customer phone numbers and customer WhatsApp messages sent to connected businesses.
              </li>
              <li>Message templates and WhatsApp Business assets managed through the platform.</li>
              <li>Order and customer conversation data created inside Double A Connect.</li>
              <li>Webhook event data, message delivery data, status logs, and technical logs.</li>
              <li>Device, browser, and usage information for admin users.</li>
            </ul>
          </section>

          <section>
            <h2>WhatsApp and Meta Platform Data</h2>
            <p>
              We only process WhatsApp data as needed to provide the service to connected
              businesses, support the platform, comply with law, and maintain security. We do not
              sell personal data. We do not use WhatsApp message content for unrelated advertising.
            </p>
          </section>

          <section>
            <h2>How we use information</h2>
            <p>We may use information to:</p>
            <ul>
              <li>Provide WhatsApp messaging functionality.</li>
              <li>Send and receive WhatsApp messages on behalf of connected businesses.</li>
              <li>Process customer replies and order flows.</li>
              <li>Manage WhatsApp templates and business assets.</li>
              <li>Maintain security, debugging, support, and compliance.</li>
              <li>Improve reliability of the service.</li>
            </ul>
          </section>

          <section>
            <h2>Legal basis / business purpose</h2>
            <p>
              We process information for practical business purposes connected to operating Double A
              Connect, providing requested services to connected businesses, supporting customer
              communications, maintaining security and reliability, responding to requests, and
              meeting legal or platform obligations where applicable.
            </p>
          </section>

          <section>
            <h2>Data processors/service providers</h2>
            <p>
              We may use trusted service providers to operate the service, including Vercel for
              application hosting, Supabase for database and backend services, and Meta / WhatsApp
              Business Platform for WhatsApp messaging services.
            </p>
          </section>

          <section>
            <h2>Data sharing</h2>
            <p>
              We may share information with service providers, connected businesses, Meta / WhatsApp
              Business Platform, or other parties when needed to provide the service, comply with
              law, protect security, or respond to valid requests. We do not sell personal data.
            </p>
          </section>

          <section>
            <h2>Data retention</h2>
            <p>
              We keep information only for as long as reasonably needed for service delivery,
              support, security, debugging, legal, compliance, or operational purposes. Retention
              periods may vary depending on the type of information and the connected business
              account.
            </p>
          </section>

          <section>
            <h2>Security</h2>
            <p>
              We use reasonable safeguards designed to protect information handled by the service.
              No online service can guarantee absolute security, but we aim to limit access, monitor
              reliability, and address security issues responsibly.
            </p>
          </section>

          <section>
            <h2>International processing</h2>
            <p>
              Double A Connect may rely on providers and infrastructure that process information in
              Australia or other countries. Where this happens, we aim to use reasonable safeguards
              appropriate for the services we operate.
            </p>
          </section>

          <section>
            <h2>User/customer rights and requests</h2>
            <p>
              Admin users, connected businesses, and affected customers may contact us to request
              access, correction, deletion, or support regarding information handled by Double A
              Connect. Some requests may need to be handled by the connected business that controls
              the customer relationship.
            </p>
          </section>

          <section>
            <h2>Contact information</h2>
            <p>
              For privacy questions or requests, contact us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The latest version will be posted
              on this page with the updated date above.
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
