import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  Globe2,
  LayoutDashboard,
  MapPin,
  Smartphone,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";

const pdfHref = "/files/khadamati-client-proposal-combined.pdf";

export const Route = createFileRoute("/quotations/khadamati")({
  head: () => ({
    meta: [
      { title: "Khadamati Proposal - Double A Code" },
      {
        name: "description",
        content:
          "Client proposal and preliminary quotation for the Khadamati service marketplace platform.",
      },
    ],
  }),
  component: KhadamatiProposalPage,
});

function KhadamatiProposalPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ef] text-[#151515]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-30 rounded-lg border border-[#ddd6cc] bg-white/95 px-4 py-3 shadow-[0_18px_50px_-38px_rgba(20,20,20,0.45)] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d7d0c6] bg-[#faf8f5] text-[#1d1d1f] transition hover:border-[#a7a096] hover:bg-white"
                aria-label="Back home"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <p className="text-sm font-semibold text-[#18181b]">Double A Code</p>
                <p className="text-xs text-[#6f6a63]">Proposal for Khadamati</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={pdfHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-[#d7d0c6] bg-white px-4 py-2 text-sm font-medium text-[#232323] transition hover:border-[#9c9489]"
              >
                <FileText className="h-4 w-4" />
                View PDF
              </a>
              <a
                href={pdfHref}
                download
                className="inline-flex items-center gap-2 rounded-md bg-[#1f2937] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#111827]"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
          </div>
        </header>

        <section className="grid gap-8 py-14 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
          <div>
            <p className="inline-flex border-l-4 border-[#d91b70] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#7a1f46]">
              Client proposal
            </p>
            <h1 className="mt-6 max-w-4xl font-display text-5xl font-semibold leading-[1.02] tracking-tight text-[#111113] sm:text-6xl lg:text-7xl">
              Building a practical Khadamati platform
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#4d4943] sm:text-lg">
              Our proposal is to build Khadamati as a phased service marketplace with a shared
              backend, one mobile application for customers and craftsmen, and a responsive web
              platform for administration and store operations.
            </p>
          </div>

          <aside className="rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-[0_22px_55px_-44px_rgba(30,30,30,0.6)]">
            <h2 className="font-display text-xl font-semibold text-[#151515]">
              What we propose to deliver
            </h2>
            <div className="mt-5 divide-y divide-[#ece6de] border-y border-[#ece6de]">
              {deliverables.map((item, index) => (
                <div key={item.title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#f4f0ea] text-sm font-semibold text-[#7a1f46]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-semibold text-[#18181b]">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[#625d56]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <ProposalSection
          title="Recommended solution structure"
          description="One unified technical core keeps mobile and web interfaces connected to the same business logic and data."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<Smartphone className="h-5 w-5" />}
              title="Mobile App"
              description="Cross-platform mobile application for iOS and Android with role-based experiences for customers and craftsmen."
              tags={["Booking", "Profiles", "GPS", "QR / OTP"]}
            />
            <FeatureCard
              icon={<LayoutDashboard className="h-5 w-5" />}
              title="Web Platform"
              description="Responsive admin and store dashboards for approvals, jobs, categories, subscriptions, ads, and operations."
              tags={["Admin", "Store", "Reporting", "Controls"]}
            />
            <FeatureCard
              icon={<Workflow className="h-5 w-5" />}
              title="Shared Backend"
              description="Unified APIs, database, notifications, payment handling, activity records, and central workflow enforcement."
              tags={["Supabase", "PostgreSQL", "Realtime", "Storage"]}
            />
          </div>
        </ProposalSection>

        <ProposalSection
          title="How we plan to handle the platform"
          description="The project is best delivered through a controlled core launch, with room for later enhancements as needed."
        >
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-lg border border-[#ddd6cc] bg-white p-6">
              <div className="space-y-5">
                {planSteps.map((step, index) => (
                  <div key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-4">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-[#f4f0ea] text-sm font-semibold text-[#7a1f46]">
                      {index + 1}
                    </span>
                    <div className="border-b border-[#ece6de] pb-5 last:border-0 last:pb-0">
                      <h3 className="font-semibold text-[#18181b]">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#625d56]">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#ddd6cc] bg-white p-6">
              <h3 className="font-display text-xl font-semibold text-[#151515]">
                Intended technology stack
              </h3>
              <div className="mt-5 space-y-4">
                {techStack.map((item) => (
                  <div key={item.label} className="flex gap-3">
                    <span className="mt-0.5 text-[#7a1f46]">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-[#18181b]">{item.label}</p>
                      <p className="text-sm leading-6 text-[#625d56]">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 rounded-md border border-[#ece6de] bg-[#faf8f5] p-4 text-sm leading-6 text-[#625d56]">
                Detailed implementation choices can be finalized during project kickoff based on the
                approved scope.
              </p>
            </section>
          </div>
        </ProposalSection>

        <ProposalSection
          title="Preliminary project range"
          description="A general commercial range for the initial core version, subject to final scope alignment."
        >
          <section className="rounded-lg border border-[#d7d0c6] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7a1f46]">
              General range
            </p>
            <div className="mt-3 border-y border-[#ece6de] py-5 font-display text-4xl font-semibold tracking-tight text-[#111113] sm:text-5xl">
              $4,500 - $5,500
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#625d56] sm:text-base">
              This range covers the core MVP direction described in this proposal. Third-party
              services, gateway fees, hosting, and other external operating expenses are not
              included.
            </p>
            <ul className="mt-5 grid gap-3 text-sm text-[#312f2b] md:grid-cols-2">
              {pricingIncludes.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </ProposalSection>

        <section className="my-10 rounded-lg border border-[#ddd6cc] bg-[#fffdf9] p-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[#151515]">
            Our recommendation
          </h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#4d4943]">
            Start with a focused and launchable first version, then expand the platform based on
            validated business priorities. This keeps the project practical, cost-aware, and ready
            for future growth.
          </p>
        </section>

        <footer className="border-t border-[#ddd6cc] py-6 text-center text-xs text-[#777168]">
          Prepared by Double A Code for Khadamati. Concise proposal version.
        </footer>
      </div>
    </main>
  );
}

function ProposalSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#ddd6cc] py-10">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="max-w-xl font-display text-3xl font-semibold tracking-tight text-[#151515] sm:text-4xl">
          {title}
        </h2>
        <p className="max-w-xl text-sm leading-6 text-[#625d56]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  tags,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tags: string[];
}) {
  return (
    <article className="rounded-lg border border-[#ddd6cc] bg-white p-6">
      <div className="grid h-11 w-11 place-items-center rounded-md border border-[#e8ded3] bg-[#faf8f5] text-[#7a1f46]">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-[#151515]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#625d56]">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-[#e8ded3] bg-[#faf8f5] px-2.5 py-1 text-xs text-[#625d56]"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

const deliverables = [
  {
    title: "Mobile application",
    description: "Customer and craftsman experiences in one app",
  },
  {
    title: "Admin and store web platform",
    description: "Operational control and business management",
  },
  {
    title: "Shared backend",
    description: "Bookings, payments, notifications and reporting",
  },
  {
    title: "Phased rollout",
    description: "Core MVP first, then expansion based on priorities",
  },
];

const planSteps = [
  {
    title: "User roles and access",
    description:
      "Separate customer, craftsman, store, and admin experiences with permissions controlled centrally.",
  },
  {
    title: "Booking workflow",
    description:
      "Customers can create bookings, providers can respond, and the system tracks job progress from request to completion.",
  },
  {
    title: "Location and verification",
    description:
      "Use customer location, provider arrival checks, and QR/OTP confirmation for service verification.",
  },
  {
    title: "Payments and records",
    description:
      "Integrate the selected payment provider and maintain clear internal records for transactions and commissions.",
  },
  {
    title: "Admin operations",
    description:
      "Provide tools for approvals, categories, monitoring, dispute handling, and general platform management.",
  },
];

const techStack = [
  {
    label: "Mobile",
    value: "Flutter",
    icon: <Smartphone className="h-4 w-4" />,
  },
  {
    label: "Web",
    value: "Next.js / React",
    icon: <Globe2 className="h-4 w-4" />,
  },
  {
    label: "Backend",
    value: "Supabase and PostgreSQL",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    label: "Notifications",
    value: "Firebase Cloud Messaging, email, and SMS as needed",
    icon: <Bell className="h-4 w-4" />,
  },
  {
    label: "Maps and location",
    value: "Map provider integration",
    icon: <MapPin className="h-4 w-4" />,
  },
];

const pricingIncludes = [
  "Mobile application for customers and craftsmen",
  "Admin and store web platform",
  "Shared backend implementation",
  "Core booking, verification, payment, and management flows",
  "Initial deployment and handover",
];
