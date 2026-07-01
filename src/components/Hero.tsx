import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { LogoMark, HexFrame } from "./Logo";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const heroTextY = useTransform(scrollYProgress, (progress) => -90 * Math.min(1, Math.max(0, progress / 0.75)));
  const heroTextOpacity = useTransform(scrollYProgress, (progress) => Math.max(0, Math.min(1, 1 - progress / 0.75)));
  const logoScale = useTransform(scrollYProgress, [0, 1], [1, 1.4]);
  const logoRotate = useTransform(scrollYProgress, [0, 1], [0, 25]);
    
  return (
    <section ref={ref} id="top" className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-32">
      {/* Backgrounds — hexagonal field */}
      <div className="absolute inset-0 bg-hex opacity-60" />
      <div className="absolute inset-0" style={{ background: "var(--gradient-radial)" }} />
      <div className="absolute left-1/2 top-1/2 -z-10 hidden h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px] animate-pulse-glow md:block"
        style={{ background: "conic-gradient(from 120deg, oklch(0.55 0.24 305 / 0.4), oklch(0.65 0.27 5 / 0.35), oklch(0.78 0.18 55 / 0.3), oklch(0.55 0.24 305 / 0.4))" }}
      />

      {/* Giant ghost hex behind everything */}
      <motion.div
        style={{ scale: logoScale, rotate: logoRotate }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,720px)] aspect-square opacity-[0.07]"
      >
        <HexFrame strokeWidth={0.5} />
      </motion.div>

      {/* Floating UI cards */}
      <FloatingCard className="left-[6%] top-[22%] hidden lg:flex" delay={0.6}>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          deployment · active
        </div>
        <div className="mt-2 font-mono text-xs text-foreground">build #2840 · 4.2s</div>
      </FloatingCard>

      <FloatingCard className="bottom-[14%] left-[10%] hidden lg:flex" delay={1.2}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Stack</div>
        <div className="mt-1 font-mono text-xs">react · node · flutter</div>
      </FloatingCard>

      <FloatingCard className="right-[7%] top-[24%] hidden lg:flex" delay={0.85}>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          systems · online
        </div>
        <div className="mt-2 font-mono text-xs text-foreground">uptime 99.9% · monitored</div>
      </FloatingCard>

      <FloatingCard className="bottom-[16%] right-[9%] hidden lg:flex" delay={1.35}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Delivery</div>
        <div className="mt-1 font-mono text-xs">design · build · launch</div>
      </FloatingCard>

      {/* Main */}
      <motion.div style={{ y: heroTextY, opacity: heroTextOpacity }} className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: isMobile ? 0.9 : 0.6, rotate: isMobile ? 0 : -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: isMobile ? 0.05 : 0.2, duration: isMobile ? 0.35 : 1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-8 flex justify-center"
        >
          <LogoMark className="h-24 w-24 md:h-28 md:w-28" glow />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isMobile ? 0.12 : 0.5, duration: isMobile ? 0.35 : 0.5 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-1.5 text-xs text-muted-foreground md:bg-surface/60 md:backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--gradient-brand)" }} />
          Now accepting new partnerships · 2026
        </motion.div>

        <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl lg:text-[5.5rem]">
          <Reveal delay={isMobile ? 0.16 : 0.6} fast={isMobile}>We Build Software</Reveal>
          <Reveal delay={isMobile ? 0.22 : 0.75} fast={isMobile}>
            <span className="text-gradient-brand">That Builds Businesses.</span>
          </Reveal>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isMobile ? 0.28 : 1.1, duration: isMobile ? 0.35 : 0.7 }}
          className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          From modern websites to enterprise systems, we transform ideas into
          scalable digital products — engineered with precision, designed without compromise.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isMobile ? 0.36 : 1.3, duration: isMobile ? 0.35 : 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="#work"
            className="group relative overflow-hidden rounded-full px-7 py-3.5 text-sm font-medium text-background brand-glow"
            style={{ background: "var(--gradient-brand)" }}
          >
            <span className="relative z-10">View Our Work →</span>
          </a>
          <a
            href="#contact"
            className="rounded-full border border-border bg-surface/70 px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface md:bg-surface/40 md:backdrop-blur"
          >
            Start Your Project
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: isMobile ? 0.6 : 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
      >
        scroll
      </motion.div>
    </section>
  );
}

function Reveal({ children, delay = 0, fast = false }: { children: React.ReactNode; delay?: number; fast?: boolean }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block"
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ delay, duration: fast ? 0.38 : 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function FloatingCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8 }}
      className={`glass animate-float absolute flex flex-col rounded-2xl px-4 py-3 ${className}`}
    >
      {children}
    </motion.div>
  );
}
