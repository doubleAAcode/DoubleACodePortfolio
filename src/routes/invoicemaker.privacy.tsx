import { createFileRoute, Link } from "@tanstack/react-router";

const SUPPORT_EMAIL = "tijaratipro@gmail.com";

export const Route = createFileRoute("/invoicemaker/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Invoice Maker" },
      {
        name: "description",
        content:
          "Privacy Policy for Invoice Maker, an offline-first invoicing app for iOS and Android.",
      },
    ],
  }),
  component: InvoiceMakerPrivacyPage,
});

function InvoiceMakerPrivacyPage() {
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
            Invoice Maker
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: September 21, 2026</p>
        </header>

        <div className="prose prose-invert mt-8 max-w-none space-y-8 text-muted-foreground prose-headings:text-foreground prose-a:text-primary">
          <section>
            <h2>The short version</h2>
            <p>
              Your invoices, clients and business details never leave your device unless you send
              them somewhere yourself. There is no account, no sign-in and no server holding your
              data. We cannot see your invoices &mdash; not because we promise not to look, but
              because they are never sent to us.
            </p>
          </section>

          <section>
            <h2>What stays on your device</h2>
            <p>Everything you create is stored in a database on the device itself:</p>
            <ul>
              <li>Your business details, logo and signature</li>
              <li>Your clients&rsquo; names, addresses, emails, phone numbers and tax numbers</li>
              <li>Every invoice, quote and receipt, including line items and amounts</li>
              <li>Your settings: currency, tax rates, numbering and document design</li>
            </ul>
            <p>
              None of this is uploaded anywhere. It is not backed up to our servers, because there
              are no servers.
            </p>
          </section>

          <section>
            <h2>When information leaves your device</h2>
            <p>Only when you choose to send it:</p>
            <ul>
              <li>
                <strong>Sharing a PDF.</strong> Tapping Share opens your device&rsquo;s own share
                sheet. Where the file goes &mdash; email, a messaging app, Files, a printer &mdash;
                is entirely your choice, and that destination&rsquo;s privacy policy then applies.
              </li>
              <li>
                <strong>Exporting a backup.</strong> The backup file contains your whole database
                plus your logo and signature. It goes wherever you send it. Treat it as you would a
                folder of paper invoices.
              </li>
            </ul>
            <p>We are not involved in either transfer and receive no copy.</p>
          </section>

          <section>
            <h2>Photo library</h2>
            <p>
              If you add a company logo, the app asks permission to open your photo library and
              copies the single image you pick into its own storage. It does not read, scan or
              upload anything else, and it does not keep access after you have chosen.
            </p>
          </section>

          <section>
            <h2>Advertising</h2>
            <p>
              The free version shows ads supplied by Google AdMob. To do that, Google receives
              information from your device &mdash; typically an advertising identifier, approximate
              location derived from your IP address, and data about the ads you see. This is
              Google&rsquo;s collection, governed by{" "}
              <a href="https://policies.google.com/privacy">Google&rsquo;s Privacy Policy</a> and
              their <a href="https://policies.google.com/technologies/ads">advertising terms</a>.
            </p>
            <p>
              On iOS you are asked whether the app may track you across other companies&rsquo; apps
              and websites. <strong>Declining changes nothing about how the app works</strong>
              &nbsp;&mdash; you still get every feature, and you still get ads; they are simply less
              targeted.
            </p>
            <p>Buying the lifetime unlock removes ads entirely.</p>
          </section>

          <section>
            <h2>Purchases</h2>
            <p>
              The lifetime unlock is processed by Apple or Google. We never see your payment
              details. Purchase status is managed through RevenueCat, which receives an anonymous
              identifier and your purchase receipt so the app can tell whether you have paid &mdash;
              including after you reinstall or move to a new device. RevenueCat&rsquo;s handling is
              covered by their <a href="https://www.revenuecat.com/privacy">privacy policy</a>.
            </p>
          </section>

          <section>
            <h2>What we collect</h2>
            <p>
              Nothing. The app contains no analytics, no crash reporting and no tracking of our own.
              We do not know how many invoices you make, which features you use, or whether you use
              the app at all.
            </p>
          </section>

          <section>
            <h2>Children</h2>
            <p>The app is a business tool and is not directed at children.</p>
          </section>

          <section>
            <h2>Your data, your control</h2>
            <p>Because everything is local, you are in control of it:</p>
            <ul>
              <li>
                <strong>Delete it</strong> by deleting the app. That removes the database and all
                media.
              </li>
              <li>
                <strong>Take it with you</strong> by exporting a backup.
              </li>
            </ul>
            <p>
              We hold no copy, so there is nothing for us to delete on your behalf and no request
              you need to send us.
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>
              If this policy changes, the date at the top changes with it. Material changes will be
              noted in the app&rsquo;s release notes.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about this policy: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
