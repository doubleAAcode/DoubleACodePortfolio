import { createFileRoute, Link } from "@tanstack/react-router";

const SUPPORT_EMAIL = "support@doubleacode.com";
const OPERATOR_LINE = "Operated by THE COATING GUYS PTY. LTD. ABN: 40 696 839 899.";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions | Double A Connect" },
      {
        name: "description",
        content:
          "Terms and Conditions for Double A Connect, a WhatsApp commerce automation SaaS operated by THE COATING GUYS PTY. LTD.",
      },
    ],
  }),
  component: TermsAndConditionsPage,
});

function TermsAndConditionsPage() {
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
            Terms and Conditions
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Terms and Conditions
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: July 7, 2026</p>
        </header>

        <div className="prose prose-invert mt-8 max-w-none space-y-8 text-muted-foreground prose-headings:text-foreground prose-a:text-primary">
          <section>
            <h2>Introduction</h2>
            <p>
              These Terms and Conditions apply to access and use of Double A Connect. By using the
              service, you agree to use it responsibly and only for lawful business purposes.
            </p>
          </section>

          <section>
            <h2>Operator</h2>
            <p>Double A Connect is operated by THE COATING GUYS PTY. LTD. ABN: 40 696 839 899.</p>
          </section>

          <section>
            <h2>Description of service</h2>
            <p>
              Double A Connect is a SaaS platform for businesses to manage WhatsApp customer
              communication, order-taking workflows, support replies, and WhatsApp Business message
              templates.
            </p>
          </section>

          <section>
            <h2>Eligibility and business use</h2>
            <p>
              Double A Connect is intended for business use. You must have authority to use the
              business account, WhatsApp Business account, phone number, customer data, message
              templates, products, and other content connected to your use of the service.
            </p>
          </section>

          <section>
            <h2>Account/admin access</h2>
            <p>
              You are responsible for controlling admin access, keeping credentials secure, and
              ensuring that people who access the dashboard are authorized to act for your business.
            </p>
          </section>

          <section>
            <h2>WhatsApp Business Platform usage</h2>
            <p>
              We are not WhatsApp, Meta, or Facebook. WhatsApp and Meta are third-party services.
              Access to WhatsApp features may depend on Meta approval, WhatsApp Business Platform
              availability, account quality, message template approval, and third-party service
              availability.
            </p>
          </section>

          <section>
            <h2>Customer responsibilities</h2>
            <p>You are responsible for:</p>
            <ul>
              <li>
                Having rights/authorization to use your WhatsApp Business account and phone number.
              </li>
              <li>
                Getting any required customer consent before sending business-initiated messages.
              </li>
              <li>
                Complying with WhatsApp Business Platform policies, Meta policies, anti-spam rules,
                and applicable laws.
              </li>
              <li>
                Ensuring message content, templates, products, and offers are lawful and accurate.
              </li>
            </ul>
          </section>

          <section>
            <h2>Acceptable use</h2>
            <p>
              You may not use Double A Connect to send unlawful, misleading, abusive, harmful, or
              spam-like messages, interfere with the service, attempt unauthorized access, or
              violate Meta, WhatsApp, or applicable legal requirements.
            </p>
          </section>

          <section>
            <h2>Message consent and compliance</h2>
            <p>
              You are responsible for managing message consent, opt-outs, customer expectations, and
              business-initiated messaging rules. We may suspend access where use appears to create
              legal, platform, security, or deliverability risk.
            </p>
          </section>

          <section>
            <h2>Templates and content</h2>
            <p>
              You are responsible for the accuracy and legality of message templates, product
              details, offers, customer replies, and other content you create or send through the
              service. Meta or WhatsApp may reject, limit, or review templates and messaging
              activity.
            </p>
          </section>

          <section>
            <h2>Fees/payment</h2>
            <p>
              If paid plans, usage fees, or WhatsApp messaging charges apply, they will be described
              in the relevant order, agreement, invoice, or plan information. Until active payment
              terms are provided, use of any demo or review environment does not create a paid
              subscription by itself.
            </p>
          </section>

          <section>
            <h2>Service availability</h2>
            <p>
              We aim to provide a reliable service, but availability may be affected by maintenance,
              updates, infrastructure issues, third-party providers, Meta or WhatsApp availability,
              account status, or factors outside our control.
            </p>
          </section>

          <section>
            <h2>Data and privacy</h2>
            <p>
              Our handling of personal data is described in the{" "}
              <Link to="/privacy-policy">Privacy Policy</Link>. You are responsible for ensuring
              that your use of customer data through Double A Connect is lawful and properly
              authorized.
            </p>
          </section>

          <section>
            <h2>Intellectual property</h2>
            <p>
              Double A Connect, its software, interface, and related materials are owned by or
              licensed to the operator. You retain responsibility for and rights in your business
              content, subject to the permissions needed for us to provide the service.
            </p>
          </section>

          <section>
            <h2>Suspension or termination</h2>
            <p>
              We may suspend or restrict access if we reasonably believe use of the service is
              unlawful, unsafe, unauthorized, harmful to the platform, or in breach of these terms,
              Meta policies, or WhatsApp Business Platform requirements.
            </p>
          </section>

          <section>
            <h2>Disclaimers</h2>
            <p>
              Double A Connect is provided using reasonable care, but we do not promise that it will
              be uninterrupted, error-free, or suitable for every business use case. Third-party
              services may change, fail, or restrict access independently of us.
            </p>
          </section>

          <section>
            <h2>Limitation of liability</h2>
            <p>
              To the extent permitted by law, we are not responsible for indirect losses, lost
              profits, lost business, platform restrictions, template rejections, account quality
              issues, or third-party service failures arising from use of Double A Connect.
            </p>
          </section>

          <section>
            <h2>Changes to terms</h2>
            <p>
              We may update these Terms and Conditions from time to time. The latest version will be
              posted on this page with the updated date above.
            </p>
          </section>

          <section>
            <h2>Contact information</h2>
            <p>
              For questions about these terms, contact us at{" "}
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
