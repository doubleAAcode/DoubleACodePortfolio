import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { HexFrame } from "./Logo";
import { SectionLabel } from "./Journey";

type Project = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  metrics: { label: string; value: string }[];
  stack: string[];
  href?: string;
  hue: { from: string; via: string; to: string };
  Mockup: React.ComponentType;
};

const projects: Project[] = [
  {
    id: "01",
    name: "Tijarati Pro",
    category: "Mobile Business Platform",
    tagline: "Inventory, invoicing, and operations in one app.",
    description:
      "A production Flutter app for business owners to manage inventory, invoices, purchases, payments, clients, agents, reports, subscriptions, and backups across iOS and Android.",
    metrics: [
      { label: "Cross-platform app", value: "Flutter" },
      { label: "Cloud backend", value: "Firebase" },
      { label: "Store release", value: "iOS + Android" },
    ],
    stack: ["Flutter", "Dart", "Firebase", "Firestore", "Cloud Functions", "In-App Purchase"],
    href: "/work/tijarati-pro",
    hue: {
      from: "oklch(0.66 0.18 240 / 0.52)",
      via: "oklch(0.72 0.16 210 / 0.34)",
      to: "oklch(0.82 0.16 70 / 0.2)",
    },
    Mockup: TijaratiMockup,
  },
  {
    id: "02",
    name: "The Detailing Lab",
    category: "Automotive Services",
    tagline: "Premium mobile detailing, packaged for conversion.",
    description:
      "A responsive website for a Sydney mobile detailing studio with a full-bleed automotive hero, service package discovery, inquiry form, phone and Instagram CTAs, and live deployment.",
    metrics: [
      { label: "Lead capture", value: "Inquiry" },
      { label: "Service browsing", value: "Packages" },
      { label: "Live site", value: "SEO" },
    ],
    stack: ["React", "TypeScript", "TanStack Start", "Tailwind CSS", "Web3Forms"],
    href: "/work/detailing-lab",
    hue: {
      from: "oklch(0.76 0.2 135 / 0.42)",
      via: "oklch(0.58 0.12 155 / 0.28)",
      to: "oklch(0.92 0.12 135 / 0.14)",
    },
    Mockup: DetailingLabMockup,
  },
  {
    id: "03",
    name: "ARIM",
    category: "Luxury Ecommerce Boutique",
    tagline: "Italian silk, in English and Arabic.",
    description:
      "A bilingual storefront for an Italian silk scarf label, with photo and video product pages, right-to-left Arabic, order requests ready to confirm on WhatsApp, and an owner admin panel backed by Neon Postgres and cloud image storage.",
    metrics: [
      { label: "English + Arabic", value: "Bilingual" },
      { label: "Owner-managed shop", value: "Admin" },
      { label: "Order requests", value: "WhatsApp" },
    ],
    stack: ["React", "TypeScript", "TanStack Start", "Tailwind CSS", "Neon Postgres"],
    href: "/work/arim",
    hue: {
      from: "oklch(0.78 0.1 10 / 0.42)",
      via: "oklch(0.55 0.06 40 / 0.28)",
      to: "oklch(0.88 0.06 20 / 0.16)",
    },
    Mockup: ArimMockup,
  },
  {
    id: "04",
    name: "Koubar Group",
    category: "Interior Portfolio Website",
    tagline: "A luxury digital showroom for home interiors.",
    description:
      "A premium website for an interiors and custom furniture company, with service presentation, immersive project galleries, WhatsApp quote paths, and an admin panel for portfolio content.",
    metrics: [
      { label: "Interior showcase", value: "Website" },
      { label: "Project browsing", value: "Gallery" },
      { label: "Content control", value: "Admin" },
    ],
    stack: ["React", "TypeScript", "TanStack Start", "Tailwind CSS", "Admin Panel"],
    href: "/work/koubar-group",
    hue: {
      from: "oklch(0.72 0.16 72 / 0.42)",
      via: "oklch(0.52 0.1 55 / 0.28)",
      to: "oklch(0.82 0.12 82 / 0.16)",
    },
    Mockup: KoubarGroupMockup,
  },
  {
    id: "05",
    name: "snapGo tech",
    category: "Ecommerce Catalog",
    tagline: "Catalog browsing with WhatsApp checkout.",
    description:
      "An electronics catalog with product browsing, cart management, WhatsApp ordering, and a Supabase admin panel for products, categories, banners, stock, and pricing.",
    metrics: [
      { label: "Responsive catalog", value: "Storefront" },
      { label: "WhatsApp orders", value: "Checkout" },
      { label: "Inventory control", value: "Admin" },
    ],
    stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Redux Toolkit", "Supabase"],
    href: "/work/snapgo",
    hue: {
      from: "oklch(0.58 0.22 265 / 0.55)",
      via: "oklch(0.68 0.18 230 / 0.35)",
      to: "oklch(0.78 0.16 200 / 0.2)",
    },
    Mockup: SnapGoMockup,
  },
  {
    id: "06",
    name: "Data Insights Workspace",
    category: "AI Analytics Interface",
    tagline: "A clear UI for advanced AI analysis.",
    description:
      "A web and desktop interface for a client-provided Python analytics backend, covering dataset upload, context review, guided analysis routes, API-connected workflows, and readable result presentation.",
    metrics: [
      { label: "Dataset onboarding", value: "Upload" },
      { label: "Guided workspaces", value: "Analysis" },
      { label: "Backend bridge", value: "APIs" },
    ],
    stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "REST APIs", "Electron"],
    href: "/work/data-insights",
    hue: {
      from: "oklch(0.58 0.16 185 / 0.5)",
      via: "oklch(0.62 0.15 215 / 0.32)",
      to: "oklch(0.78 0.13 165 / 0.2)",
    },
    Mockup: DataInsightsMockup,
  },
  {
    id: "07",
    name: "Uno400",
    category: "Multiplayer Card Game",
    tagline: "Real-time card play without a custom server.",
    description:
      "A SwiftUI multiplayer card game using Firebase Realtime Database, host-device arbitration, optimistic UI, event-sourced repair, and transparent AI bot players.",
    metrics: [
      { label: "Realtime sync", value: "Firebase" },
      { label: "Architecture", value: "MVVM" },
      { label: "Game arbiter", value: "Host" },
    ],
    stack: ["Swift", "SwiftUI", "Firebase", "MVVM", "Combine", "XCTest"],
    href: "/work/uno400",
    hue: {
      from: "oklch(0.66 0.18 150 / 0.5)",
      via: "oklch(0.64 0.14 205 / 0.32)",
      to: "oklch(0.82 0.16 92 / 0.18)",
    },
    Mockup: Uno400Mockup,
  },
];

function useMinWidth(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/**
 * Work section: one card per project. On desktop each card sticks to the top
 * while the next one slides up over it (the covered card scales back and dims).
 * On small screens or with reduced motion it is a plain vertical list.
 */
export function Projects() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isDesktop = useMinWidth("(min-width: 1024px)");
  const stacked = isDesktop && !prefersReducedMotion;
  const total = projects.length;
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(total - 1, Math.max(0, Math.round(v * (total - 1))));
    setActive((current) => (current === next ? current : next));
  });

  const jumpTo = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + index * window.innerHeight, behavior: "smooth" });
  };

  return (
    <section id="work" className="relative">
      <div className="px-6 pb-12 pt-32 md:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionLabel>03 / Selected Work</SectionLabel>
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Selected <span className="text-gradient-brand">work</span>
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Real products in production. Scroll to move through each one.
          </p>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        {projects.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={index}
            total={total}
            progress={scrollYProgress}
            stacked={stacked}
          />
        ))}

        {stacked && (
          <div className="pointer-events-none absolute inset-y-0 right-2 z-40 xl:right-4">
            <div className="pointer-events-auto sticky top-[calc(50vh-6rem)] flex flex-col items-end gap-3">
              {projects.map((project, index) => (
                <button
                  type="button"
                  key={project.id}
                  onClick={() => jumpTo(index)}
                  aria-label={`Go to ${project.name}`}
                  title={project.name}
                  className="group flex h-4 items-center"
                >
                  <span
                    className={`block h-px transition-all duration-300 ${
                      index === active
                        ? "w-6 bg-foreground"
                        : "w-3 bg-border group-hover:w-5 group-hover:bg-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectCard({
  project,
  index,
  total,
  progress,
  stacked,
}: {
  project: Project;
  index: number;
  total: number;
  progress: MotionValue<number>;
  stacked: boolean;
}) {
  const last = total - 1;
  const step = last > 0 ? 1 / last : 1;
  const isLast = index === last;

  // The next card covers this one while overall progress moves from index*step to (index+1)*step.
  const coverRange = isLast ? [0, 1] : [index * step, (index + 1) * step];
  const scale = useTransform(progress, coverRange, isLast ? [1, 1] : [1, 0.92]);
  const dim = useTransform(progress, coverRange, isLast ? [0, 0] : [0, 0.6]);

  // This card slides up over the previous one; its mockup lags behind for depth.
  const enterRange = index === 0 ? [0, 1] : [(index - 1) * step, index * step];
  const mockupY = useTransform(progress, enterRange, index === 0 ? [0, 0] : [110, 0]);
  const copyY = useTransform(progress, enterRange, index === 0 ? [0, 0] : [40, 0]);

  return (
    <div
      className={
        stacked ? "sticky top-0 flex h-screen items-center px-10 pb-8 pt-24" : "px-4 pb-6 md:px-10"
      }
      style={stacked ? { zIndex: index + 1 } : undefined}
    >
      <motion.article
        initial={stacked ? false : { opacity: 0, y: 32 }}
        animate={stacked ? { opacity: 1, y: 0 } : undefined}
        whileInView={stacked ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={stacked ? { scale, transformOrigin: "50% 0%" } : undefined}
        className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-3xl border border-border bg-background shadow-elevated lg:h-full"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 25% 30%, ${project.hue.from}, transparent 60%), radial-gradient(ellipse at 85% 75%, ${project.hue.via}, transparent 62%), radial-gradient(ellipse at 50% 110%, ${project.hue.to}, transparent 70%)`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-hex opacity-60" />
        <div className="pointer-events-none absolute -right-40 top-1/2 hidden h-[600px] w-[600px] -translate-y-1/2 lg:block">
          <HexFrame strokeWidth={0.4} />
        </div>

        <div className="relative grid grid-cols-1 items-center gap-8 p-6 md:p-10 lg:h-full lg:grid-cols-12 lg:gap-12 lg:p-14">
          <motion.div className="lg:col-span-5" style={stacked ? { y: copyY } : undefined}>
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <span className="text-gradient-brand">{project.id}</span>
              <span className="h-px w-8 bg-border" />
              <span>{project.category}</span>
            </div>
            <h3 className="mt-4 font-display text-4xl font-bold leading-[1.05] md:text-5xl lg:text-6xl">
              {project.name}
            </h3>
            <p className="mt-4 font-display text-lg text-gradient-brand md:text-xl">
              {project.tagline}
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              {project.description}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border/80 [@media(max-height:820px)]:hidden">
              {project.metrics.map((m) => (
                <div key={m.label} className="bg-background/80 p-4 backdrop-blur">
                  <div className="font-display text-xl font-bold text-gradient-brand md:text-2xl">
                    {m.value}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {project.stack.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border bg-surface/60 px-3 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur"
                >
                  {s}
                </span>
              ))}
            </div>

            {project.href && (
              <a
                href={project.href}
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
                style={{ background: "var(--gradient-brand)" }}
              >
                <span>View project</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </motion.div>

          <motion.div
            className="relative lg:col-span-7"
            style={stacked ? { y: mockupY } : undefined}
          >
            <div className="relative mx-auto aspect-[5/4] w-full max-w-2xl">
              <div className="absolute inset-0">
                <project.Mockup />
              </div>
            </div>
          </motion.div>
        </div>

        {stacked && (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-black"
            style={{ opacity: dim }}
          />
        )}
      </motion.article>
    </div>
  );
}

/* ---------- Mockups ---------- */

function Browser({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a10] shadow-2xl ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="ml-3 h-3 flex-1 rounded bg-white/5" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function Phone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[2rem] border border-white/10 bg-[#0a0a10] p-3 shadow-2xl ${className}`}
    >
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/10" />
      {children}
    </div>
  );
}
function FloatPill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass animate-float absolute rounded-xl px-3 py-2 text-[10px] ${className}`}>
      {children}
    </div>
  );
}

function SnapGoMockup() {
  return (
    <div className="relative h-full w-full p-5 md:p-8">
      <div className="absolute left-2 top-8 w-[82%] overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl md:left-4">
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          <span className="ml-auto rounded bg-white px-2 py-0.5 text-[7px] text-slate-400 ring-1 ring-slate-200">
            snapgo.tech
          </span>
        </div>
        <img
          src="/images/case-studies/snapgo/homepage.png"
          alt="snapGo tech storefront homepage"
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="absolute bottom-9 right-3 w-[48%] overflow-hidden rounded-xl border border-white/15 bg-white shadow-2xl md:right-5">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <span className="font-mono text-[7px] uppercase tracking-widest text-slate-500">
            Admin
          </span>
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[7px] font-medium text-emerald-700">
            Live
          </span>
        </div>
        <img
          src="/images/case-studies/snapgo/admin.png"
          alt="snapGo tech admin categories"
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
        />
      </div>

      <FloatPill className="left-1 bottom-8">
        <div className="text-muted-foreground">Checkout</div>
        <div className="font-display text-sm font-semibold">WhatsApp orders</div>
      </FloatPill>
    </div>
  );
}

function DataInsightsMockup() {
  return (
    <div className="relative h-full w-full p-5 md:p-8">
      <div className="absolute left-3 top-8 w-[80%] overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl md:left-4">
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          <span className="ml-auto rounded bg-white px-2 py-0.5 text-[7px] text-slate-400 ring-1 ring-slate-200">
            data workspace
          </span>
        </div>
        <img
          src="/images/case-studies/data-insights/workspace.png"
          alt="AI analytics workspace overview"
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="absolute bottom-9 right-3 w-[47%] overflow-hidden rounded-xl border border-white/15 bg-white shadow-2xl md:right-5">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <span className="font-mono text-[7px] uppercase tracking-widest text-slate-500">
            Results
          </span>
          <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[7px] font-medium text-teal-700">
            Guided
          </span>
        </div>
        <img
          src="/images/case-studies/data-insights/results.png"
          alt="AI analytics results view"
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
        />
      </div>

      <FloatPill className="left-1 bottom-8">
        <div className="text-muted-foreground">Role</div>
        <div className="font-display text-sm font-semibold">UI + API layer</div>
      </FloatPill>
    </div>
  );
}

function TijaratiMockup() {
  return (
    <div className="relative h-full w-full overflow-visible p-5 md:p-8">
      <div className="absolute left-4 top-8 w-[34%] rotate-[-9deg] rounded-[1.7rem] border border-white/15 bg-slate-950 p-1.5 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 rounded-[1.7rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_35%,rgba(255,255,255,0.06)_70%,transparent)]" />
        <div className="absolute left-1/2 top-3 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-slate-950 ring-1 ring-slate-800" />
        <div className="relative overflow-hidden rounded-[1.35rem] bg-white">
          <img
            src="/images/case-studies/tijarati/reports.jpg"
            alt="Tijarati Pro reports"
            className="block h-auto w-full"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>

      <div className="absolute left-1/2 top-4 z-10 w-[38%] -translate-x-1/2 rounded-[1.9rem] border border-white/20 bg-slate-950 p-1.5 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 rounded-[1.9rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_35%,rgba(255,255,255,0.06)_70%,transparent)]" />
        <div className="absolute left-1/2 top-3 z-10 h-3.5 w-14 -translate-x-1/2 rounded-full bg-slate-950" />
        <div className="relative overflow-hidden rounded-[1.45rem] bg-white">
          <img
            src="/images/case-studies/tijarati/home.jpg"
            alt="Tijarati Pro home dashboard"
            className="block h-auto w-full"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>

      <div className="absolute right-4 top-10 w-[34%] rotate-[9deg] rounded-[1.7rem] border border-white/15 bg-slate-950 p-1.5 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 rounded-[1.7rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_35%,rgba(255,255,255,0.06)_70%,transparent)]" />
        <div className="absolute left-1/2 top-3 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-slate-950 ring-1 ring-slate-800" />
        <div className="relative overflow-hidden rounded-[1.35rem] bg-white">
          <img
            src="/images/case-studies/tijarati/invoices.jpg"
            alt="Tijarati Pro invoices"
            className="block h-auto w-full"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>

      <FloatPill className="left-2 bottom-8">
        <div className="text-muted-foreground">Production</div>
        <div className="font-display text-sm font-semibold">iOS + Android</div>
      </FloatPill>
      <FloatPill className="right-2 bottom-16">
        <div className="text-muted-foreground">Backend</div>
        <div className="font-display text-sm font-semibold">Firebase</div>
      </FloatPill>
    </div>
  );
}

function Uno400Mockup() {
  return (
    <div className="relative h-full w-full overflow-visible p-5 md:p-8">
      <div className="absolute left-5 top-8 w-[34%] rotate-[-8deg] rounded-[1.7rem] border border-emerald-200/20 bg-slate-950 p-1.5 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 rounded-[1.7rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_35%,rgba(255,255,255,0.06)_70%,transparent)]" />
        <div className="absolute left-1/2 top-3 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-slate-950 ring-1 ring-emerald-900" />
        <div className="relative overflow-hidden rounded-[1.35rem] bg-emerald-950">
          <img
            src="/images/case-studies/uno400/lobby.jpg"
            alt="Uno400 room lobby"
            className="block h-auto w-full"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      <div className="absolute left-1/2 top-4 z-10 w-[38%] -translate-x-1/2 rounded-[1.9rem] border border-emerald-200/25 bg-slate-950 p-1.5 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 rounded-[1.9rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_35%,rgba(255,255,255,0.06)_70%,transparent)]" />
        <div className="absolute left-1/2 top-3 z-10 h-3.5 w-14 -translate-x-1/2 rounded-full bg-slate-950" />
        <div className="relative overflow-hidden rounded-[1.45rem] bg-emerald-950">
          <img
            src="/images/case-studies/uno400/game-table.jpg"
            alt="Uno400 real-time card table"
            className="block h-auto w-full"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      <div className="absolute right-5 top-10 w-[34%] rotate-[8deg] rounded-[1.7rem] border border-emerald-200/20 bg-slate-950 p-1.5 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 rounded-[1.7rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_35%,rgba(255,255,255,0.06)_70%,transparent)]" />
        <div className="absolute left-1/2 top-3 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-slate-950 ring-1 ring-emerald-900" />
        <div className="relative overflow-hidden rounded-[1.35rem] bg-emerald-950">
          <img
            src="/images/case-studies/uno400/hand-play.jpg"
            alt="Uno400 card play screen"
            className="block h-auto w-full"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      <FloatPill className="left-2 bottom-8">
        <div className="text-muted-foreground">Realtime</div>
        <div className="font-display text-sm font-semibold">Firebase rooms</div>
      </FloatPill>
      <FloatPill className="right-2 bottom-16">
        <div className="text-muted-foreground">Logic</div>
        <div className="font-display text-sm font-semibold">Host arbiter</div>
      </FloatPill>
    </div>
  );
}

function DetailingLabMockup() {
  return (
    <div className="relative h-full w-full p-5 md:p-8">
      <div className="absolute left-4 top-9 w-[82%] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-zinc-900 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          <span className="ml-auto rounded bg-zinc-950 px-2 py-0.5 text-[7px] text-zinc-400 ring-1 ring-white/10">
            thedetailinglabs.com.au
          </span>
        </div>
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src="/images/case-studies/detailing-lab/site-hero.png"
            alt="The Detailing Lab homepage"
            className="h-full w-full object-cover object-top"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/10" />
        </div>
      </div>

      <div className="absolute bottom-12 right-4 w-[45%] overflow-hidden rounded-xl border border-lime-300/30 bg-zinc-950 shadow-2xl shadow-lime-950/40">
        <img
          src="/images/case-studies/detailing-lab/site-ceramic.png"
          alt="The Detailing Lab ceramic packages"
          className="block aspect-[4/3] w-full object-cover object-top"
          loading="lazy"
          decoding="async"
        />
        <div className="border-t border-white/10 bg-zinc-950 p-3">
          <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-lime-300">
            Package
          </div>
          <div className="mt-1 text-xs font-semibold text-white">Ceramic coating</div>
        </div>
      </div>

      <div className="absolute bottom-4 left-16 w-[38%] overflow-hidden rounded-xl border border-white/15 bg-zinc-950 shadow-2xl">
        <img
          src="/images/case-studies/detailing-lab/site-inquiry.png"
          alt="The Detailing Lab inquiry form"
          className="block aspect-[16/9] w-full object-cover object-top"
          loading="lazy"
          decoding="async"
        />
      </div>

      <FloatPill className="left-2 bottom-8">
        <div className="text-muted-foreground">Lead flow</div>
        <div className="font-display text-sm font-semibold">Package inquiry</div>
      </FloatPill>
    </div>
  );
}

function KoubarGroupMockup() {
  return (
    <div className="relative h-full w-full p-5 md:p-8">
      <div className="absolute left-3 top-7 w-[78%] overflow-hidden rounded-2xl border border-amber-200/15 bg-[#0b0806] shadow-2xl md:left-4">
        <div className="flex items-center gap-1.5 border-b border-amber-200/10 bg-[#120d09] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          <span className="ml-auto rounded bg-black/40 px-2 py-0.5 text-[7px] text-amber-100/45 ring-1 ring-amber-200/10">
            koubargroup.com
          </span>
        </div>
        <img
          src="/images/case-studies/koubar-group/hero.png"
          alt="Koubar Group website hero"
          className="block aspect-[16/9] w-full object-cover object-top"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="absolute bottom-12 right-4 w-[45%] overflow-hidden rounded-xl border border-amber-200/15 bg-[#0b0806] shadow-2xl">
        <img
          src="/images/case-studies/koubar-group/admin.png"
          alt="Koubar Group admin panel"
          className="block aspect-[4/3] w-full object-cover object-left-top"
          loading="lazy"
          decoding="async"
        />
        <div className="border-t border-amber-200/10 bg-[#120d09] p-3">
          <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-amber-300">
            Admin
          </div>
          <div className="mt-1 text-xs font-semibold text-amber-50">Portfolio control</div>
        </div>
      </div>

      <div className="absolute bottom-4 left-14 w-[38%] overflow-hidden rounded-xl border border-amber-200/15 bg-[#0b0806] shadow-2xl">
        <img
          src="/images/case-studies/koubar-group/services.png"
          alt="Koubar Group services grid"
          className="block aspect-[16/10] w-full object-cover object-top"
          loading="lazy"
          decoding="async"
        />
      </div>

      <FloatPill className="left-2 bottom-8">
        <div className="text-muted-foreground">Showroom</div>
        <div className="font-display text-sm font-semibold">Interiors + admin</div>
      </FloatPill>
    </div>
  );
}

function ArimMockup() {
  return (
    <div className="relative h-full w-full p-5 md:p-8">
      <div className="absolute left-3 top-7 w-[78%] overflow-hidden rounded-2xl border border-rose-100/15 bg-[#110b0a] shadow-2xl md:left-4">
        <div className="flex items-center gap-1.5 border-b border-rose-100/10 bg-[#171010] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          <span className="ml-auto rounded bg-black/40 px-2 py-0.5 text-[7px] text-rose-100/45 ring-1 ring-rose-100/10">
            arimitaly.com
          </span>
        </div>
        <img
          src="/images/case-studies/arim/hero.webp"
          alt="ARIM website homepage"
          className="block aspect-[16/9] w-full object-cover object-top"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="absolute bottom-5 right-4 w-[26%] rotate-[6deg] rounded-[1.5rem] border border-rose-100/20 bg-[#110b0a] p-1.5 shadow-2xl">
        <div className="relative overflow-hidden rounded-[1.15rem] bg-white">
          <img
            src="/images/case-studies/arim/m-ar-hero.webp"
            alt="ARIM Arabic homepage on a phone"
            className="block aspect-[390/844] w-full object-cover object-top"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      <div className="absolute bottom-4 left-14 w-[38%] overflow-hidden rounded-xl border border-rose-100/15 bg-[#110b0a] shadow-2xl">
        <img
          src="/images/case-studies/arim/product.webp"
          alt="ARIM product page"
          className="block aspect-[16/10] w-full object-cover object-top"
          loading="lazy"
          decoding="async"
        />
      </div>

      <FloatPill className="left-2 bottom-8">
        <div className="text-muted-foreground">Storefront</div>
        <div className="font-display text-sm font-semibold">English + Arabic</div>
      </FloatPill>
    </div>
  );
}

function CommerceMockup() {
  return (
    <div className="relative h-full w-full p-8">
      <Browser className="absolute left-6 top-6 w-[70%]">
        <div className="grid grid-cols-3 gap-2">
          <div
            className="col-span-2 row-span-2 aspect-square rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 0.24 305 / 0.6), oklch(0.78 0.18 55 / 0.4))",
            }}
          />
          <div className="aspect-square rounded-lg bg-white/5" />
          <div className="aspect-square rounded-lg bg-white/5" />
          <div className="col-span-3 mt-1 h-2 w-2/3 rounded bg-white/20" />
          <div className="col-span-3 h-2 w-1/2 rounded bg-white/10" />
          <div
            className="col-span-3 mt-2 h-8 rounded-md"
            style={{ background: "var(--gradient-brand)" }}
          />
        </div>
      </Browser>
      <Phone className="absolute bottom-4 right-6 h-[78%] w-[28%]">
        <div className="space-y-2">
          <div
            className="h-20 rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 0.24 305 / 0.6), oklch(0.78 0.18 55 / 0.4))",
            }}
          />
          <div className="h-2 w-3/4 rounded bg-white/20" />
          <div className="h-2 w-1/2 rounded bg-white/10" />
          <div className="mt-3 h-7 rounded" style={{ background: "var(--gradient-brand)" }} />
        </div>
      </Phone>
      <FloatPill className="left-2 top-1/2 -translate-y-1/2">
        <div className="text-muted-foreground">Cart</div>
        <div className="font-display text-sm font-semibold">+38% conv.</div>
      </FloatPill>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="relative h-full w-full p-8">
      <Browser className="h-full">
        <div className="flex h-full gap-3">
          <div className="w-1/5 space-y-2 border-r border-white/5 pr-3">
            <div className="h-3 rounded bg-white/20" />
            <div className="h-2 rounded bg-white/10" />
            <div className="h-2 rounded bg-white/10" />
            <div className="h-2 rounded" style={{ background: "var(--gradient-brand)" }} />
            <div className="h-2 rounded bg-white/10" />
            <div className="h-2 rounded bg-white/10" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                  <div className="h-2 w-1/2 rounded bg-white/15" />
                  <div className="mt-2 font-display text-lg font-semibold text-gradient-brand">
                    {["24.8k", "98%", "$2.1M"][i]}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex h-32 items-end gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              {[40, 65, 30, 80, 55, 90, 70, 60, 85, 45, 75, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${h}%`,
                    background: "var(--gradient-brand)",
                    opacity: 0.4 + h / 200,
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 rounded-lg border border-white/5 bg-white/[0.02]" />
              <div className="h-16 rounded-lg border border-white/5 bg-white/[0.02]" />
            </div>
          </div>
        </div>
      </Browser>
      <FloatPill className="-right-2 top-12">
        <div className="text-muted-foreground">Sync</div>
        <div className="font-display text-sm font-semibold">12k users</div>
      </FloatPill>
    </div>
  );
}

function PayMockup() {
  return (
    <div className="relative h-full w-full p-8">
      <Phone className="absolute left-6 top-4 h-[88%] w-[38%]">
        <div className="space-y-3">
          <div className="rounded-xl p-4" style={{ background: "var(--gradient-brand)" }}>
            <div className="text-[8px] uppercase tracking-widest text-white/70">Balance</div>
            <div className="mt-4 font-display text-lg font-bold text-white">$28,420.50</div>
            <div className="mt-1 text-[8px] text-white/70">•••• 4209</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Send", "Receive", "Top up"].map((l) => (
              <div
                key={l}
                className="rounded-lg border border-white/10 p-2 text-center text-[8px] text-white/70"
              >
                {l}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] p-2"
              >
                <div
                  className="h-6 w-6 rounded-full"
                  style={{ background: "var(--gradient-brand)", opacity: 0.6 }}
                />
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 w-3/4 rounded bg-white/20" />
                  <div className="h-1 w-1/2 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Phone>
      <Browser className="absolute right-4 top-6 w-[55%]">
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            FX Volume · 24h
          </div>
          <div className="flex h-24 items-end gap-0.5">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${30 + Math.sin(i * 0.7) * 30 + i * 1.5}%`,
                  background: "var(--gradient-brand)",
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="rounded bg-white/[0.03] p-2">
              <div className="text-muted-foreground">TPS</div>
              <div className="font-display font-bold text-gradient-brand">8.4k</div>
            </div>
            <div className="rounded bg-white/[0.03] p-2">
              <div className="text-muted-foreground">Latency</div>
              <div className="font-display font-bold text-gradient-brand">84ms</div>
            </div>
            <div className="rounded bg-white/[0.03] p-2">
              <div className="text-muted-foreground">Markets</div>
              <div className="font-display font-bold text-gradient-brand">11</div>
            </div>
          </div>
        </div>
      </Browser>
    </div>
  );
}

function MediMockup() {
  return (
    <div className="relative h-full w-full p-8">
      <Browser className="h-full">
        <div className="grid h-full grid-cols-3 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2">
              <div
                className="h-8 w-8 rounded-full"
                style={{ background: "var(--gradient-brand)" }}
              />
              <div className="flex-1 space-y-1">
                <div className="h-1.5 w-3/4 rounded bg-white/20" />
                <div className="h-1 w-1/2 rounded bg-white/10" />
              </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-md border border-white/5 bg-white/[0.02] p-2">
                <div className="h-1.5 w-2/3 rounded bg-white/15" />
                <div className="mt-1 h-1 w-1/3 rounded bg-white/10" />
              </div>
            ))}
          </div>
          <div className="col-span-2 space-y-3">
            <div
              className="rounded-lg border border-white/5 p-3"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.24 305 / 0.25), transparent)",
              }}
            >
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Today · Vitals
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[
                  ["HR", "72"],
                  ["BP", "118/76"],
                  ["SpO₂", "98%"],
                  ["Temp", "36.8"],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="text-[8px] text-muted-foreground">{l}</div>
                    <div className="font-display text-sm font-bold text-gradient-brand">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex h-16 items-end gap-0.5">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${40 + Math.sin(i * 0.6) * 40}%`,
                      background: "var(--gradient-brand)",
                      opacity: 0.6,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 rounded-lg border border-white/5 bg-white/[0.02]" />
              <div
                className="h-16 rounded-lg border border-white/5"
                style={{ background: "var(--gradient-brand)", opacity: 0.4 }}
              />
            </div>
          </div>
        </div>
      </Browser>
    </div>
  );
}

function EstateMockup() {
  return (
    <div className="relative h-full w-full p-8">
      <Browser className="h-full">
        <div className="grid h-full grid-cols-2 gap-3">
          <div
            className="relative overflow-hidden rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.78 0.18 55 / 0.5), oklch(0.6 0.25 5 / 0.3))",
            }}
          >
            <div className="absolute inset-0 bg-hex opacity-30" />
            <div className="absolute bottom-3 left-3 right-3">
              <div className="text-[9px] uppercase tracking-widest text-white/70">Featured</div>
              <div className="font-display text-sm font-bold text-white">The Atrium Loft</div>
              <div className="text-[10px] text-white/70">Soho · $4.2M</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-md"
                style={{
                  background: `linear-gradient(${135 + i * 30}deg, oklch(0.7 0.18 ${20 + i * 20} / 0.5), oklch(0.55 0.24 305 / 0.2))`,
                }}
              >
                <div className="absolute bottom-1 left-1 text-[7px] text-white/80">$1.{i + 2}M</div>
              </div>
            ))}
            <div className="col-span-2 rounded-md border border-white/5 bg-white/[0.02] p-2">
              <div className="h-1.5 w-2/3 rounded bg-white/15" />
              <div className="mt-1 flex h-8 items-end gap-0.5">
                {[40, 60, 30, 80, 55, 70, 90, 50].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{ height: `${h}%`, background: "var(--gradient-brand)", opacity: 0.6 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Browser>
      <FloatPill className="-left-2 bottom-8">
        <div className="text-muted-foreground">Tours</div>
        <div className="font-display text-sm font-semibold">73% complete</div>
      </FloatPill>
    </div>
  );
}

function EduMockup() {
  return (
    <div className="relative h-full w-full p-8">
      <Browser className="absolute left-6 top-6 w-[65%]">
        <div className="space-y-3">
          <div
            className="relative h-20 overflow-hidden rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.27 5 / 0.5), oklch(0.55 0.24 305 / 0.3))",
            }}
          >
            <div className="absolute inset-0 bg-hex opacity-30" />
            <div className="absolute bottom-2 left-3 text-white">
              <div className="text-[9px] uppercase tracking-widest opacity-70">Course</div>
              <div className="font-display text-sm font-bold">Systems Design · 03</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Lesson", "Practice", "Review"].map((l, i) => (
              <div
                key={l}
                className="rounded-md border border-white/5 p-2"
                style={
                  i === 1
                    ? { background: "var(--gradient-brand)", opacity: 0.5 }
                    : { background: "rgba(255,255,255,0.02)" }
                }
              >
                <div className="text-[9px] text-white/80">{l}</div>
                <div className="mt-1 font-display text-sm font-bold">{[12, 4, 8][i]}</div>
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3" style={{ background: "var(--gradient-brand)" }} />
          </div>
        </div>
      </Browser>
      <Phone className="absolute bottom-4 right-6 h-[78%] w-[28%]">
        <div className="space-y-2">
          <div className="h-2 w-2/3 rounded bg-white/20" />
          <div
            className="h-16 rounded-lg"
            style={{ background: "var(--gradient-brand)", opacity: 0.6 }}
          />
          <div className="h-1.5 w-full rounded bg-white/10" />
          <div className="h-1.5 w-3/4 rounded bg-white/10" />
          <div className="grid grid-cols-3 gap-1 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-square rounded bg-white/5" />
            ))}
          </div>
        </div>
      </Phone>
      <FloatPill className="left-1/3 bottom-4">
        <div className="text-muted-foreground">Streak</div>
        <div className="font-display text-sm font-semibold text-gradient-brand">42 days</div>
      </FloatPill>
    </div>
  );
}
