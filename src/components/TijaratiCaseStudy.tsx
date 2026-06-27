import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Cloud,
  FileText,
  Globe2,
  LockKeyhole,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";

const playStoreUrl = "https://play.google.com/store/apps/details?id=com.tijarati.pro&pli=1";
const appStoreUrl = "https://apps.apple.com/us/app/tijarati-pro/id6757103664";
const websiteUrl = "https://www.tijaratipro.com";

const images = {
  home: "/images/case-studies/tijarati/home.jpg",
  overview: "/images/case-studies/tijarati/overview.jpg",
  invoices: "/images/case-studies/tijarati/invoices.jpg",
  payments: "/images/case-studies/tijarati/payments.jpg",
  reports: "/images/case-studies/tijarati/reports.jpg",
  charts: "/images/case-studies/tijarati/charts.jpg",
};

const stack = ["Flutter", "Dart", "Firebase", "Firestore", "Cloud Functions", "In-App Purchase"];

const features = [
  {
    label: "Operations Home",
    title: "Business dashboard",
    text: "Quick actions, module navigation, and live financial overview for daily business work.",
    img: images.home,
  },
  {
    label: "Invoices",
    title: "Invoice management",
    text: "Searchable invoices with totals, remaining balances, statuses, client details, and fast creation actions.",
    img: images.invoices,
  },
  {
    label: "Payments",
    title: "Payment tracking",
    text: "Received and sent payment filters, searchable records, summary totals, and net cash visibility.",
    img: images.payments,
  },
  {
    label: "Reports",
    title: "Accounting reports",
    text: "Sales summaries, inventory reports, client ledgers, supplier ledgers, and profit breakdowns.",
    img: images.reports,
  },
  {
    label: "Analytics",
    title: "Monthly charts",
    text: "Visual monthly sales and profit charts give business owners a fast read on performance.",
    img: images.charts,
  },
  {
    label: "Overview",
    title: "Live KPI cards",
    text: "Sales, received payments, paid payments, expenses, running balance, and receivables in one view.",
    img: images.overview,
  },
];

const contribution = [
  {
    icon: Smartphone,
    title: "Mobile App",
    text: "Built the Flutter application experience from sign-in through daily business workflows.",
  },
  {
    icon: Cloud,
    title: "Backend",
    text: "Implemented Firebase Auth, Firestore data models, security rules, storage, analytics, and Cloud Functions.",
  },
  {
    icon: Store,
    title: "Publishing",
    text: "Handled production release paths for Google Play and Apple App Store distribution.",
  },
];

const capabilities = [
  { icon: ReceiptText, text: "Invoices, estimates, purchases, payments, and expenses" },
  { icon: Boxes, text: "Inventory, products, suppliers, clients, and agent stock flows" },
  { icon: BarChart3, text: "Reports, monthly charts, ledgers, profit views, and balances" },
  { icon: FileText, text: "PDF printing, sharing, client statements, and Excel import/export" },
  { icon: QrCode, text: "Barcode scanning and bulk product entry for faster operations" },
  { icon: LockKeyhole, text: "PIN locks, subscriptions, backups, force updates, and localization" },
];

function PhoneFrame({
  src,
  alt,
  className = "",
  delay = 0,
  variant = "iphone",
}: {
  src: string;
  alt: string;
  className?: string;
  delay?: number;
  variant?: "iphone" | "android";
}) {
  const isIphone = variant === "iphone";

  return (
    <motion.div
      initial={{ opacity: 0, y: 42, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      animate={{ y: [0, -8, 0] }}
      transition={{
        opacity: { duration: 0.55, delay },
        y: { duration: 5.5, delay, repeat: Infinity, ease: "easeInOut" },
      }}
      className={`relative mx-auto w-full max-w-[220px] rounded-[2rem] border border-slate-800 bg-slate-950 p-1.5 shadow-[0_28px_80px_-28px_rgba(15,23,42,0.55)] sm:max-w-[280px] sm:rounded-[2.4rem] sm:p-2 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_28%,rgba(255,255,255,0.06)_72%,transparent)] sm:rounded-[2.4rem]" />
      <div className="absolute -left-1 top-24 h-16 w-1 rounded-l-full bg-slate-800" />
      <div className="absolute -right-1 top-28 h-20 w-1 rounded-r-full bg-slate-800" />
      {isIphone ? (
        <div className="absolute left-1/2 top-4 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]" />
      ) : (
        <div className="absolute left-1/2 top-5 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-slate-950 ring-2 ring-slate-800" />
      )}
      <div className={`relative overflow-hidden bg-white ${isIphone ? "rounded-[1.65rem] sm:rounded-[2rem]" : "rounded-[1.55rem] sm:rounded-[1.85rem]"}`}>
        <img src={src} alt={alt} className="block h-auto w-full" loading="lazy" />
      </div>
    </motion.div>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
      <path d="M16.7 12.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-0.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.2-2.6-.1 0-2.6-1-2.6-3.7z" />
      <path d="M14.5 5.9c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z" />
    </svg>
  );
}

function GooglePlayLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <path d="M4.5 3.2c-.3.2-.5.6-.5 1.1v15.4c0 .5.2.9.5 1.1L13 12 4.5 3.2z" fill="#31A8FF" />
      <path d="M15.8 9.1 13 12l2.8 2.9 3.6-2.1c.8-.5.8-1.7 0-2.1l-3.6-1.6z" fill="#FFCA28" />
      <path d="m4.5 3.2 11.3 5.9L13 12 4.5 3.2z" fill="#34A853" />
      <path d="M4.5 20.8 13 12l2.8 2.9-11.3 5.9z" fill="#EA4335" />
    </svg>
  );
}

function StoreLink({
  href,
  label,
  store,
}: {
  href: string;
  label: string;
  store: "google" | "apple";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-2.5 text-left text-white shadow-[0_14px_34px_-18px_rgba(15,23,42,0.8)] ring-1 ring-white/10 transition-transform hover:-translate-y-0.5"
    >
      {store === "google" ? <GooglePlayLogo /> : <AppleLogo />}
      <span className="leading-none">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-white/60">
          {store === "google" ? "Get it on" : "Download on the"}
        </span>
        <span className="mt-1 block text-sm font-semibold">{label}</span>
      </span>
    </a>
  );
}

function WebsiteLink() {
  return (
    <a
      href={websiteUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 text-left text-slate-950 shadow-[0_14px_34px_-18px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 transition-transform hover:-translate-y-0.5"
    >
      <Globe2 className="h-5 w-5 text-sky-600" />
      <span className="leading-none">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Visit
        </span>
        <span className="mt-1 block text-sm font-semibold">Website</span>
      </span>
    </a>
  );
}

export function TijaratiCaseStudy() {
  return (
    <section
      id="tijarati-case-study"
      className="relative isolate overflow-hidden bg-[#f5f8fc] pb-20 pt-36 text-slate-950 sm:py-32"
      style={{ colorScheme: "light" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 12% 10%, rgba(14,165,233,0.18), transparent 50%), radial-gradient(ellipse at 90% 24%, rgba(249,115,22,0.08), transparent 42%), radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.1), transparent 55%)",
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium tracking-wide text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              Case Study - Mobile Business Platform
            </div>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Tijarati Pro
            </h2>
            <p className="mt-3 text-lg text-slate-600 sm:text-xl">
              Inventory, invoicing, and business operations in one production mobile app.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600">
              Tijarati Pro is a full mobile business platform built from the ground up for
              small teams that need inventory, invoices, purchases, payments, reports, and
              operational controls in one place. We handled the complete product delivery:
              app programming, Firebase backend, production configuration, subscriptions,
              and store publishing for iOS and Android.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <WebsiteLink />
              <StoreLink href={playStoreUrl} label="Google Play" store="google" />
              <StoreLink href={appStoreUrl} label="App Store" store="apple" />
            </div>
          </motion.div>

          <div className="relative lg:col-span-6">
            <div className="relative mx-auto flex max-w-[300px] items-center justify-center sm:grid sm:max-w-none sm:grid-cols-3 sm:gap-3">
              <PhoneFrame src={images.reports} alt="Tijarati Pro reports screen" variant="android" className="hidden translate-y-8 rotate-[-8deg] sm:block" delay={0.1} />
              <PhoneFrame src={images.home} alt="Tijarati Pro home dashboard" variant="iphone" className="z-10 sm:scale-110" delay={0.2} />
              <PhoneFrame src={images.invoices} alt="Tijarati Pro invoices screen" variant="android" className="hidden translate-y-10 rotate-[8deg] sm:block" delay={0.3} />
            </div>
          </div>
        </div>

        <div className="mt-24 grid gap-5 md:grid-cols-3">
          {contribution.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-24">
          <div className="mb-10 flex items-end justify-between gap-6">
            <h3 className="font-display text-2xl font-semibold text-slate-950 sm:text-3xl">
              Product workflows
            </h3>
            <div className="hidden h-px flex-1 bg-slate-200 sm:block" />
          </div>

          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: index * 0.06 }}
                className="flex flex-col items-center gap-5 text-center"
              >
                <PhoneFrame
                  src={feature.img}
                  alt={feature.title}
                  variant={index % 2 === 0 ? "iphone" : "android"}
                  delay={index * 0.04}
                />
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    {feature.label}
                  </div>
                  <h4 className="mt-2 text-lg font-semibold text-slate-950">{feature.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="mt-24 grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h3 className="font-display text-2xl font-semibold text-slate-950 sm:text-3xl">
              Built with
            </h3>
            <div className="mt-5 flex flex-wrap gap-2">
              {stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 flex-none text-sky-600" />
                <p className="text-sm leading-relaxed text-slate-600">
                  The production system includes Firebase security rules, authentication,
                  server-side receipt validation, scheduled subscription cleanup, backup
                  workflows, and app version controls for force updates.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="font-display text-2xl font-semibold text-slate-950 sm:text-3xl">
              Capability scope
            </h3>
            <div className="mt-5 grid gap-3">
              {capabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Icon className="mt-0.5 h-4 w-4 flex-none text-sky-600" />
                    <p className="text-sm leading-relaxed text-slate-600">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-20 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
                <BadgeCheck className="h-4 w-4" />
                Published product
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Available on both major mobile stores with a production backend and
                subscription infrastructure behind the app.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <WebsiteLink />
              <StoreLink href={playStoreUrl} label="Google Play" store="google" />
              <StoreLink href={appStoreUrl} label="App Store" store="apple" />
            </div>
          </div>
          <ArrowRight className="mt-6 h-5 w-5 text-slate-300 md:hidden" />
        </div>
      </div>
    </section>
  );
}
