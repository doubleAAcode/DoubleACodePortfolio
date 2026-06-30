import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  MotionValue,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
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
    id: "02",
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
    id: "03",
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
    id: "04",
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
  {
    id: "05",
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
    stack: ["React", "TypeScript", "TanStack Start", "Tailwind CSS", "Web3Forms", "Vercel"],
    href: "/work/detailing-lab",
    hue: {
      from: "oklch(0.76 0.2 135 / 0.42)",
      via: "oklch(0.58 0.12 155 / 0.28)",
      to: "oklch(0.92 0.12 135 / 0.14)",
    },
    Mockup: DetailingLabMockup,
  },
  {
    id: "06",
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
    stack: ["React", "TypeScript", "TanStack Start", "Tailwind CSS", "Admin Panel", "Vercel"],
    href: "/work/koubar-group",
    hue: {
      from: "oklch(0.72 0.16 72 / 0.42)",
      via: "oklch(0.52 0.1 55 / 0.28)",
      to: "oklch(0.82 0.12 82 / 0.16)",
    },
    Mockup: KoubarGroupMockup,
  },
];

function clampProjectIndex(index: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, index));
}

function getProjectIndexFromProgress(progress: number, total: number) {
  if (total <= 1) return 0;
  const scaled = Math.min(total - 0.001, Math.max(0, progress * total));
  return clampProjectIndex(Math.floor(scaled), total);
}

function getProgressForProjectIndex(index: number, total: number) {
  if (total <= 1) return 0;
  return Math.min(1, (clampProjectIndex(index, total) + 0.5) / total);
}

export function Projects() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const activeRef = useRef(0);
  const shouldAnchorAfterViewChange = useRef(false);
  const isAnchoringAfterViewChange = useRef(false);
  const pendingAnimatedIndexRef = useRef(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const visualProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 32,
    mass: 0.45,
    restDelta: 0.001,
  });

  const total = projects.length;
  const animatedHeightVh = Math.max(360, 100 + total * 56);
  const [mode, setMode] = useState<"animated" | "list">(() => {
    if (typeof window === "undefined") return "list";
    if (window.matchMedia("(max-width: 767px)").matches) return "list";
    const saved = window.sessionStorage.getItem("aa-work-view") as "animated" | "list" | null;
    if (saved) return saved;
    return "animated";
  });
  const modeRef = useRef(mode);

  const activeMV = useTransform(visualProgress, (v) => getProjectIndexFromProgress(v, total));
  const [active, setActive] = useState(0);
  const setActiveProject = useCallback(
    (index: number) => {
      const clamped = clampProjectIndex(index, total);
      activeRef.current = clamped;
      setActive((current) => (current === clamped ? current : clamped));
    },
    [total],
  );

  useEffect(() => {
    if (prefersReducedMotion && modeRef.current === "animated") {
      modeRef.current = "list";
      setMode("list");
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useMotionValueEvent(activeMV, "change", (v) => {
    if (modeRef.current !== "animated" || isAnchoringAfterViewChange.current) return;

    setActiveProject(v as number);
  });
  const setView = (m: "animated" | "list") => {
    if (m === mode) return;
    const pendingIndex = clampProjectIndex(activeRef.current, total);
    pendingAnimatedIndexRef.current = pendingIndex;
    shouldAnchorAfterViewChange.current = true;
    modeRef.current = m;
    if (m === "animated") {
      isAnchoringAfterViewChange.current = true;
      setActiveProject(pendingIndex);
    }
    setMode(m);
    try {
      window.sessionStorage.setItem("aa-work-view", m);
    } catch {
      // Session storage can be unavailable in private or restricted browsing modes.
    }
  };

  useEffect(() => {
    if (!shouldAnchorAfterViewChange.current) return;

    shouldAnchorAfterViewChange.current = false;
    const frame = window.requestAnimationFrame(() => {
      const section = document.getElementById("work");
      if (!section) return;

      const top = section.getBoundingClientRect().top + window.scrollY;
      if (mode === "animated") {
        const maxScroll = Math.max(0, section.offsetHeight - window.innerHeight);
        const progress = getProgressForProjectIndex(pendingAnimatedIndexRef.current, total);
        window.scrollTo({ top: top + maxScroll * progress, behavior: "auto" });
        window.requestAnimationFrame(() => {
          setActiveProject(pendingAnimatedIndexRef.current);
          isAnchoringAfterViewChange.current = false;
        });
        return;
      }

      window.scrollTo({ top, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [mode, setActiveProject, total]);

  if (mode === "list") {
    return (
      <ProjectsCardCarousel
        mode={mode}
        setView={setView}
        initialIndex={active}
        onIndexChange={(index) => {
          setActiveProject(index);
        }}
      />
    );
  }

  return (
    <section id="work" ref={ref} className="relative" style={{ height: `${animatedHeightVh}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Section frame */}
        <div className="pointer-events-none absolute left-6 top-8 z-40 md:left-10">
          <SectionLabel>03 / Selected Work</SectionLabel>
        </div>
        <div className="pointer-events-auto absolute right-6 top-8 z-[120] flex items-center gap-3 font-mono text-xs text-muted-foreground md:right-10">
          <ViewToggle mode={mode} onChange={setView} />
          <ProgressIndicator activeIndex={active} total={total} />
        </div>

        {projects.map((project, index) => (
          <ProjectSlide
            key={project.id}
            project={project}
            index={index}
            total={total}
            progress={visualProgress}
            activeIndex={active}
          />
        ))}
      </div>
    </section>
  );
}

function ViewToggle({
  mode,
  onChange,
}: {
  mode: "animated" | "list";
  onChange: (m: "animated" | "list") => void;
}) {
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const modes = isMobile ? (["list"] as const) : (["animated", "list"] as const);

  return (
    <div
      className="pointer-events-auto relative z-[130] inline-flex items-center rounded-full border border-border bg-surface/80 p-1 text-[11px] font-mono uppercase tracking-widest shadow-elevated backdrop-blur"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      {modes.map((m) => (
        <button
          type="button"
          key={m}
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          className={`pointer-events-auto rounded-full px-3 py-1 transition-colors ${
            mode === m
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {m === "animated" ? "Animated" : "List"}
        </button>
      ))}
    </div>
  );
}

function ProjectsCardCarousel({
  mode,
  setView,
  initialIndex,
  onIndexChange,
}: {
  mode: "animated" | "list";
  setView: (m: "animated" | "list") => void;
  initialIndex: number;
  onIndexChange: (index: number) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [dir, setDir] = useState<1 | -1>(1);
  const total = projects.length;
  const project = projects[index];
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  if (isMobile) {
    return <ProjectsMobileList />;
  }

  const go = (next: number) => {
    const wrapped = (next + total) % total;
    setDir(next > index ? 1 : -1);
    setIndex(wrapped);
    onIndexChange(wrapped);
  };

  return (
    <section id="work" className="relative px-4 py-24 md:px-10 md:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-hex opacity-30" />
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 md:mb-10 md:gap-6">
          <div>
            <SectionLabel>03 / Selected Work</SectionLabel>
            <h2 className="mt-4 font-display text-3xl font-bold md:text-5xl">
              Selected <span className="text-gradient-brand">work</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
              Browse our case studies one by one. Use the controls below to navigate.
            </p>
          </div>
          <ViewToggle mode={mode} onChange={setView} />
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/70 shadow-elevated backdrop-blur-xl md:h-[720px] md:min-h-0 md:rounded-3xl lg:h-[580px]">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background: `radial-gradient(ellipse at 20% 0%, ${project.hue.from}, transparent 55%), radial-gradient(ellipse at 90% 100%, ${project.hue.to}, transparent 60%)`,
            }}
          />
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.article
              key={project.id}
              custom={dir}
              initial={{ opacity: 0, x: dir * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -32 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative grid grid-cols-1 gap-0 md:h-[720px] md:min-h-0 lg:h-[580px] lg:grid-cols-12"
            >
              {/* Visual */}
              <div className="relative lg:col-span-7">
                <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border md:aspect-[5/4] lg:aspect-auto lg:h-full lg:border-b-0 lg:border-r">
                  <div className="absolute inset-0">
                    <project.Mockup />
                  </div>
                </div>
              </div>

              {/* Copy */}
              <div className="relative flex min-h-0 flex-col justify-between gap-6 p-5 md:gap-8 md:p-10 lg:col-span-5">
                <div className="min-h-0">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:gap-3 md:text-[11px]">
                    <span className="text-gradient-brand">{project.id}</span>
                    <span className="h-px w-6 bg-border md:w-8" />
                    <span>{project.category}</span>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-bold leading-tight md:mt-4 md:text-4xl">
                    {project.name}
                  </h3>
                  <p className="mt-2 font-display text-base text-gradient-brand md:text-lg">
                    {project.tagline}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground lg:min-h-[5.25rem]">
                    {project.description}
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border/60 sm:grid-cols-3 md:mt-6">
                    {project.metrics.map((m) => (
                      <div key={m.label} className="bg-background/85 p-3 backdrop-blur">
                        <div className="font-display text-base font-bold text-gradient-brand md:text-lg">
                          {m.value}
                        </div>
                        <div className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                          {m.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-1.5 md:max-h-[4.75rem] md:overflow-hidden">
                    {project.stack.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-border bg-background/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href={project.href || "#contact"}
                  target={project.href ? "_blank" : undefined}
                  rel={project.href ? "noreferrer" : undefined}
                  className="group inline-flex items-center justify-between gap-3 rounded-full px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <span>View project</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
            <span className="text-gradient-brand text-sm font-semibold">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="h-px w-10 bg-border" />
            <span>{String(total).padStart(2, "0")}</span>
          </div>

          {/* Dots */}
          <div className="order-3 flex w-full items-center justify-center gap-2 sm:order-2 sm:w-auto">
            {projects.map((p, i) => (
              <button
                key={p.id}
                onClick={() => {
                  setDir(i > index ? 1 : -1);
                  setIndex(i);
                  onIndexChange(i);
                }}
                aria-label={`Go to ${p.name}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-8 bg-foreground" : "w-3 bg-border hover:bg-muted-foreground"
                }`}
              />
            ))}
          </div>

          <div className="order-2 flex items-center gap-2 sm:order-3">
            <button
              onClick={() => go(index - 1)}
              aria-label="Previous project"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/60 text-foreground transition-colors hover:bg-surface"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => go(index + 1)}
              aria-label="Next project"
              className="flex h-11 w-11 items-center justify-center rounded-full text-background transition-transform hover:scale-105"
              style={{ background: "var(--gradient-brand)" }}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectsMobileList() {
  return (
    <section id="work" className="relative px-4 pb-20 pt-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-hex opacity-25" />
      <div className="mx-auto max-w-xl">
        <div className="mb-7">
          <SectionLabel>03 / Selected Work</SectionLabel>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight">
            Selected <span className="text-gradient-brand">work</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A quick look at the products, stores, apps, and systems we build.
          </p>
        </div>

        <div className="space-y-6">
          {projects.map((project, index) => (
            <article
              key={project.id}
              className="relative overflow-hidden rounded-2xl border border-border bg-surface/80 shadow-elevated"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  background: `radial-gradient(ellipse at 0% 0%, ${project.hue.from}, transparent 48%), radial-gradient(ellipse at 100% 100%, ${project.hue.to}, transparent 58%)`,
                }}
              />

              <div className="relative">
                <div className="relative h-[22rem] overflow-hidden border-b border-border sm:h-[26rem]">
                  <MobileProjectMockup project={project} priority={index < 2} />
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span className="text-gradient-brand">{project.id}</span>
                    <span className="h-px w-6 bg-border" />
                    <span>{project.category}</span>
                  </div>

                  <h3 className="mt-3 font-display text-xl font-bold leading-tight">
                    {project.name}
                  </h3>
                  <p className="mt-1.5 font-display text-sm leading-snug text-gradient-brand">
                    {project.tagline}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border/60">
                    {project.metrics.map((metric) => (
                      <div key={metric.label} className="bg-background/70 px-2.5 py-2">
                        <div className="font-display text-[13px] font-bold leading-tight text-gradient-brand">
                          {metric.value}
                        </div>
                        <div className="mt-1 text-[7px] uppercase tracking-widest text-muted-foreground">
                          {metric.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {project.stack.slice(0, 5).map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-border bg-background/70 px-2.5 py-1 font-mono text-[10px] text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <a
                    href={project.href || "#contact"}
                    className="mt-5 inline-flex w-full items-center justify-between rounded-full px-5 py-3 text-sm font-medium text-background"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    <span>View project</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MobileProjectMockup({ project, priority }: { project: Project; priority?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(Boolean(priority));

  useEffect(() => {
    if (shouldRender) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "640px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldRender]);

  return (
    <div ref={ref} className="absolute inset-0">
      {shouldRender ? <project.Mockup /> : <div className="absolute inset-0 bg-hex opacity-20" />}
    </div>
  );
}

function ProgressIndicator({ activeIndex, total }: { activeIndex: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gradient-brand text-sm font-semibold">
        {String(activeIndex + 1).padStart(2, "0")}
      </span>
      <span className="h-px w-10 bg-border" />
      <span>{String(total).padStart(2, "0")}</span>
    </div>
  );
}

function ProjectSlide({
  project,
  index,
  total,
  progress,
  activeIndex,
}: {
  project: Project;
  index: number;
  total: number;
  progress: MotionValue<number>;
  activeIndex: number;
}) {
  const active = index === activeIndex;
  const nearby = Math.abs(index - activeIndex) <= 1;
  const step = total <= 1 ? 1 : 1 / total;
  const start = step * index;
  const end = index === total - 1 ? 1 : step * (index + 1);
  const transitionDistance = step * 0.105;
  const backgroundLead = step * 0.055;
  const mockupDelay = step * 0.018;
  const headlineDelay = step * 0.04;
  const descriptionDelay = step * 0.058;
  const detailDelay = step * 0.074;
  const ctaDelay = step * 0.09;
  const enterStart = Math.max(0, start - transitionDistance);
  const enterEnd = Math.min(1, start + transitionDistance);
  const exitStart = Math.max(0, end - transitionDistance);
  const exitEnd = Math.min(1, end + transitionDistance);
  const clampProgress = (value: number) => Math.min(1, Math.max(0, value));
  const ordered = (values: number[]) =>
    values.map(clampProgress).reduce<number[]>((acc, value) => {
      const previous = acc[acc.length - 1];
      if (previous === undefined) return [value];
      return [...acc, Math.min(1, Math.max(value, previous + 0.0001))];
    }, []);
  const createInput = (enterOffset = 0, exitOffset = 0) => {
    if (index === 0) {
      return ordered([0, exitStart + exitOffset, exitEnd + exitOffset]);
    }

    if (index === total - 1) {
      return ordered([enterStart + enterOffset, enterEnd + enterOffset, 1]);
    }

    return ordered([
      enterStart + enterOffset,
      enterEnd + enterOffset,
      exitStart + exitOffset,
      exitEnd + exitOffset,
    ]);
  };
  const phaseOutput = <T,>(before: T, visible: T, after: T) =>
    index === 0
      ? [visible, visible, after]
      : index === total - 1
        ? [before, visible, visible]
        : [before, visible, visible, after];

  const presenceInput = createInput(-backgroundLead, backgroundLead);
  const backgroundInput = createInput(-backgroundLead, backgroundLead);
  const mockupInput = createInput(mockupDelay, -mockupDelay);
  const headlineInput = createInput(headlineDelay, -headlineDelay);
  const descriptionInput = createInput(descriptionDelay, -descriptionDelay);
  const detailInput = createInput(detailDelay, -detailDelay);
  const ctaInput = createInput(ctaDelay, -ctaDelay);

  const presenceOpacity = useTransform(progress, presenceInput, phaseOutput(0, 1, 0));
  const slideFilter = useTransform(
    progress,
    presenceInput,
    phaseOutput(
      "blur(8px) brightness(0.74)",
      "blur(0px) brightness(1)",
      "blur(6px) brightness(0.78)",
    ),
  );
  const backgroundOpacity = useTransform(progress, backgroundInput, phaseOutput(0, 1, 0));
  const mockupOpacity = useTransform(progress, mockupInput, phaseOutput(0, 1, 0));
  const mockupY = useTransform(progress, mockupInput, phaseOutput(16, 0, -12));
  const mockupScale = useTransform(progress, mockupInput, phaseOutput(0.982, 1, 0.988));
  const mockupFilter = useTransform(
    progress,
    mockupInput,
    phaseOutput(
      "blur(8px) brightness(0.78)",
      "blur(0px) brightness(1)",
      "blur(5px) brightness(0.82)",
    ),
  );
  const headlineOpacity = useTransform(progress, headlineInput, phaseOutput(0, 1, 0));
  const headlineY = useTransform(progress, headlineInput, phaseOutput(10, 0, -8));
  const descriptionOpacity = useTransform(progress, descriptionInput, phaseOutput(0, 1, 0));
  const descriptionY = useTransform(progress, descriptionInput, phaseOutput(12, 0, -7));
  const detailOpacity = useTransform(progress, detailInput, phaseOutput(0, 1, 0));
  const detailY = useTransform(progress, detailInput, phaseOutput(14, 0, -6));
  const ctaOpacity = useTransform(progress, ctaInput, phaseOutput(0, 1, 0));
  const ctaY = useTransform(progress, ctaInput, phaseOutput(12, 0, -4));
  const ctaScale = useTransform(progress, ctaInput, phaseOutput(0.985, 1, 0.99));

  return (
    <motion.div
      aria-hidden={!active}
      style={{
        opacity: presenceOpacity,
        filter: slideFilter,
        zIndex: active ? 3 : nearby ? 2 : 0,
      }}
      className={`absolute inset-0 isolate flex transform-gpu will-change-[opacity,transform,filter] items-center justify-center px-6 md:px-12 ${
        active ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Per-project background wash */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          opacity: backgroundOpacity,
          background: `radial-gradient(ellipse at 30% 40%, ${project.hue.from}, transparent 55%), radial-gradient(ellipse at 80% 70%, ${project.hue.via}, transparent 60%), radial-gradient(ellipse at 50% 100%, ${project.hue.to}, transparent 70%)`,
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 bg-hex"
        style={{ opacity: backgroundOpacity }}
      />

      {/* Decorative hex */}
      <div
        className="pointer-events-none absolute -right-40 top-1/2 z-0 hidden h-[680px] w-[680px] -translate-y-1/2 md:block"
      >
        <HexFrame strokeWidth={0.4} />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12">
        {/* Left: copy */}
        <div className="lg:col-span-5">
          <motion.div
            className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted-foreground"
            style={{ opacity: headlineOpacity, y: headlineY }}
          >
            <span className="text-gradient-brand">{project.id}</span>
            <span className="h-px w-8 bg-border" />
            <span>{project.category}</span>
          </motion.div>
          <motion.h3
            className="mt-5 font-display text-5xl font-bold leading-[1.02] md:text-7xl"
            style={{ opacity: headlineOpacity, y: headlineY }}
          >
            {project.name}
          </motion.h3>
          <motion.p
            className="mt-4 font-display text-xl text-gradient-brand"
            style={{ opacity: descriptionOpacity, y: descriptionY }}
          >
            {project.tagline}
          </motion.p>
          <motion.p
            className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base"
            style={{ opacity: descriptionOpacity, y: descriptionY }}
          >
            {project.description}
          </motion.p>

          <motion.div
            className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border/80"
            style={{ opacity: detailOpacity, y: detailY }}
          >
            {project.metrics.map((m) => (
              <div key={m.label} className="bg-background/80 p-4 backdrop-blur">
                <div className="font-display text-2xl font-bold text-gradient-brand">{m.value}</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {m.label}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            className="mt-6 flex flex-wrap gap-2"
            style={{ opacity: detailOpacity, y: detailY }}
          >
            {project.stack.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-surface/60 px-3 py-1 text-[11px] font-mono text-muted-foreground backdrop-blur"
              >
                {s}
              </span>
            ))}
          </motion.div>

          {project.href && (
            <motion.a
              href={project.href}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
              style={{
                opacity: ctaOpacity,
                y: ctaY,
                scale: ctaScale,
                background: "var(--gradient-brand)",
              }}
            >
              <span>View project</span>
              <ArrowUpRight className="h-4 w-4" />
            </motion.a>
          )}
        </div>

        {/* Right: mockup */}
        <motion.div
          className="relative transform-gpu will-change-[opacity,transform,filter] lg:col-span-7"
          style={{ opacity: mockupOpacity, y: mockupY, scale: mockupScale, filter: mockupFilter }}
        >
          <div className="relative mx-auto aspect-[5/4] w-full max-w-2xl">
            <div className="absolute inset-0">
              <project.Mockup />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Slide footer */}
      <motion.div
        className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
        style={{ opacity: detailOpacity }}
      >
        {index < total - 1 ? "Scroll · Next case" : "End of selected work"}
      </motion.div>
    </motion.div>
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
            loading="lazy"
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
            loading="lazy"
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
            loading="lazy"
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
