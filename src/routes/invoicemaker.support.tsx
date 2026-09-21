import { createFileRoute, Link } from "@tanstack/react-router";

const SUPPORT_EMAIL = "tijaratipro@gmail.com";

export const Route = createFileRoute("/invoicemaker/support")({
  head: () => ({
    meta: [
      { title: "Support | Invoice Maker" },
      {
        name: "description",
        content:
          "Support and help for Invoice Maker, an offline-first invoicing app for iOS and Android.",
      },
    ],
  }),
  component: InvoiceMakerSupportPage,
});

function InvoiceMakerSupportPage() {
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
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Support</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Email{" "}
            <a className="text-primary" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            and we will get back to you.
          </p>
        </header>

        <div className="prose prose-invert mt-8 max-w-none space-y-8 text-muted-foreground prose-headings:text-foreground prose-a:text-primary">
          <section>
            <h2>Where is my data?</h2>
            <p>
              On your device, and nowhere else. Invoice Maker has no account and no server. That
              makes it fast and private, but it also means{" "}
              <strong>we cannot recover your data for you</strong> if you lose the device.
            </p>
          </section>

          <section>
            <h2>Backing up</h2>
            <p>
              Go to <strong>Settings &rarr; Backup &rarr; Export backup</strong>. You get a single
              file containing every invoice, client and setting, plus your logo and signature. Save
              it to iCloud, Google Drive, or email it to yourself.
            </p>
            <p>
              Do this <em>before</em> changing phones, and ideally now. Restoring is
              <strong> Settings &rarr; Restore from backup</strong>, which replaces everything
              currently in the app.
            </p>
          </section>

          <section>
            <h2>Moving to a new phone</h2>
            <ol>
              <li>On the old phone, export a backup and save it somewhere you can reach.</li>
              <li>Install Invoice Maker on the new phone.</li>
              <li>Restore from that backup.</li>
              <li>
                If you bought the lifetime unlock, open the unlock screen and tap{" "}
                <strong>Restore purchase</strong>. Use the same Apple ID or Google account.
              </li>
            </ol>
          </section>

          <section>
            <h2>I paid but the app still shows ads</h2>
            <p>
              Open <strong>Settings &rarr; Unlock everything</strong> and tap{" "}
              <strong>Restore purchase</strong>. You must be signed in with the account you bought
              it on. If you have just reinstalled and have no signal, connect to the internet once
              and reopen the app &mdash; the unlock is remembered afterwards, including offline.
            </p>
          </section>

          <section>
            <h2>Will my old invoices change if I change settings?</h2>
            <p>
              No. Every invoice keeps the currency, tax rate, business details, logo and design it
              had when you issued it. Changing your settings only affects documents you create
              afterwards. This is deliberate: a document you have already sent to a client must
              never quietly change.
            </p>
          </section>

          <section>
            <h2>Can I continue my existing invoice numbers?</h2>
            <p>
              Yes. <strong>Settings &rarr; Numbering</strong> lets you set the format and the next
              number, so you can carry on from a paper or spreadsheet series. If a number is already
              used, the app skips to the next free one rather than creating a duplicate.
            </p>
          </section>

          <section>
            <h2>Does it work without internet?</h2>
            <p>
              Entirely. Creating invoices, generating PDFs, sharing and backing up all work offline.
              Only ads need a connection, and their absence changes nothing else.
            </p>
          </section>

          <section>
            <h2>Something else</h2>
            <p>
              Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Telling us your device,
              iOS or Android version, and what you were doing when it went wrong will get you a
              faster answer.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
