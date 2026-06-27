import { motion } from "framer-motion";
import { useState } from "react";
import { SectionLabel } from "./Journey";

const groups = [
  {
    key: "web",
    title: "Web Development",
    desc: "Production-grade interfaces and backends for products that scale.",
    items: ["React", "Angular", "Node.js", "REST & GraphQL APIs", "Backend Systems", "TypeScript"],
  },
  {
    key: "mobile",
    title: "Mobile Development",
    desc: "Native-quality experiences from a single, maintainable codebase.",
    items: ["Flutter", "iOS", "Android", "Offline-first", "Push Systems", "App Store Delivery"],
  },
  {
    key: "systems",
    title: "Software Systems",
    desc: "Enterprise platforms that streamline operations and unlock revenue.",
    items: ["ERP", "Admin Dashboards", "SaaS Platforms", "Automation", "Integrations", "Data Pipelines"],
  },
  {
    key: "design",
    title: "Product Design",
    desc: "Interfaces designed with restraint, intention, and measurable outcomes.",
    items: ["UI/UX Design", "Design Systems", "Prototyping", "User Research", "Accessibility", "Brand"],
  },
];

export function Capabilities() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section id="capabilities" className="relative py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>02 / Capabilities</SectionLabel>
        <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          A studio engineered like a <span className="text-gradient-accent">system</span>.
        </h2>
        <p className="mt-6 max-w-xl text-muted-foreground">
          We are technology-agnostic and pick the right tools for the problem. Hover any discipline to expand its surface area.
        </p>

        <div
          className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2"
          onMouseLeave={() => setActive(null)}
          onBlur={(event) => {
            const nextTarget = event.relatedTarget as Node | null;
            if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
              setActive(null);
            }
          }}
        >
          {groups.map((g) => {
            const isActive = active === g.key;
            return (
              <button
                key={g.key}
                onMouseEnter={() => setActive(g.key)}
                onFocus={() => setActive(g.key)}
                onClick={() => setActive((current) => (current === g.key ? null : g.key))}
                className={`group relative overflow-hidden bg-background p-8 text-left transition-colors ${isActive ? "bg-surface" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl font-semibold md:text-3xl">{g.title}</h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">{g.desc}</p>
                  </div>
                  <motion.div
                    animate={{ rotate: isActive ? 45 : 0 }}
                    className="text-accent"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </motion.div>
                </div>

                <motion.div
                  initial={false}
                  animate={{ height: isActive ? "auto" : 0, opacity: isActive ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 flex flex-wrap gap-2">
                    {g.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </motion.div>

                {isActive && (
                  <motion.div
                    layoutId="cap-glow"
                    className="absolute -inset-px -z-0 rounded-2xl"
                    style={{ background: "linear-gradient(135deg, oklch(0.78 0.14 220 / 0.08), transparent 60%)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
