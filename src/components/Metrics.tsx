import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { SectionLabel } from "./Journey";

const metrics = [
  { value: 25, suffix: "+", label: "Projects Delivered" },
  { value: 7, suffix: "+", label: "Years Combined Experience" },
  { value: 100, suffix: "%", label: "Custom Solutions" }, 
];

export function Metrics() {
  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>04 / Why Double A</SectionLabel>
        <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          Shipped work. <span className="text-gradient-accent">Compounding output.</span>
        </h2>

        <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
          {metrics.map((m, i) => (
            <Counter key={i} {...m} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Counter({ value, suffix, label }: (typeof metrics)[number]) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.floor(v));

  useEffect(() => {
    if (inView) {
      const controls = animate(count, value, { duration: 1.8, ease: [0.16, 1, 0.3, 1] });
      return controls.stop;
    }
  }, [inView, count, value]);

  return (
    <div
      ref={ref}
      className="group bg-background p-8 last:col-span-2 last:text-center md:p-10 md:last:col-span-1 md:last:text-left"
    >
      <div className="flex items-baseline gap-1 font-display text-5xl font-bold group-last:justify-center md:text-6xl md:group-last:justify-start">
        <motion.span className="text-gradient">{rounded}</motion.span>
        <span className="text-accent">{suffix}</span>
      </div>
      <div className="mt-3 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
