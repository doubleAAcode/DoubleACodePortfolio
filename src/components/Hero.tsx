import { motion, useScroll, useTransform } from "framer-motion";
import { createElement, useEffect, useRef, useState } from "react";
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

      <SplineBot heroRef={ref} />

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

      <FloatingCard className="right-[8%] top-[34%] z-[8] hidden max-w-[15rem] min-[1180px]:flex" delay={1.1}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-accent">Spirit</div>
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Don't mind Spirit, he is just looking.
        </div>
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

function SplineBot({ heroRef }: { heroRef: React.RefObject<HTMLDivElement | null> }) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1180px)");
    const syncReady = () => setReady(query.matches);

    syncReady();
    query.addEventListener("change", syncReady);

    return () => query.removeEventListener("change", syncReady);
  }, []);

  useEffect(() => {
    if (!ready || document.getElementById("spline-viewer-script")) return;

    const script = document.createElement("script");
    script.id = "spline-viewer-script";
    script.type = "module";
    script.src = "https://unpkg.com/@splinetool/viewer@1.12.97/build/spline-viewer.js";
    document.head.appendChild(script);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    const hero = heroRef.current;
    if (!hero) return;

    let isPointerInsideHero = false;
    let lastPointerEvent: PointerEvent | null = null;
    const defaultGaze = { xRatio: 0.18, yRatio: 0.12 };

    const getTarget = () => {
      const viewer = viewerRef.current;
      if (!viewer) return null;

      return {
        viewer,
        target: viewer.shadowRoot?.querySelector("canvas") ?? viewer,
      };
    };

    const getMappedPoint = (event: PointerEvent) => {
      const viewer = viewerRef.current;
      if (!viewer) return null;

      const heroBox = hero.getBoundingClientRect();
      const viewerBox = viewer.getBoundingClientRect();
      if (!heroBox.width || !heroBox.height || !viewerBox.width || !viewerBox.height) return null;

      const isInside =
        event.clientX >= heroBox.left &&
        event.clientX <= heroBox.right &&
        event.clientY >= heroBox.top &&
        event.clientY <= heroBox.bottom;

      const xRatio = Math.min(1, Math.max(0, (event.clientX - heroBox.left) / heroBox.width));
      const yRatio = Math.min(1, Math.max(0, (event.clientY - heroBox.top) / heroBox.height));

      return {
        clientX: viewerBox.left + viewerBox.width * xRatio,
        clientY: viewerBox.top + viewerBox.height * yRatio,
        isInside,
      };
    };

    const createPointerAtHeroRatio = (xRatio: number, yRatio: number) => {
      const heroBox = hero.getBoundingClientRect();
      const clientX = heroBox.left + heroBox.width * xRatio;
      const clientY = heroBox.top + heroBox.height * yRatio;

      return new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        clientX,
        clientY,
        screenX: clientX,
        screenY: clientY,
      });
    };

    const resetToDefaultGaze = () => {
      const event = createPointerAtHeroRatio(defaultGaze.xRatio, defaultGaze.yRatio);

      if (!isPointerInsideHero) {
        dispatchPointer(event, "pointerover");
        dispatchPointer(event, "pointerenter");
        isPointerInsideHero = true;
      }

      dispatchPointer(event, "pointermove");
      lastPointerEvent = event;
    };

    const dispatchPointer = (event: PointerEvent, type = event.type) => {
      const mappedPoint = getMappedPoint(event);
      const targetInfo = getTarget();
      if (!mappedPoint || !targetInfo) return;

      const pointerEvent = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
        clientX: mappedPoint.clientX,
        clientY: mappedPoint.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        buttons: event.buttons,
      }) as PointerEvent & { __aaSplineForwarded?: boolean };
      pointerEvent.__aaSplineForwarded = true;
      targetInfo.target.dispatchEvent(pointerEvent);

      if (type === "pointermove") {
        const mouseEvent = new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: mappedPoint.clientX,
          clientY: mappedPoint.clientY,
          screenX: event.screenX,
          screenY: event.screenY,
          buttons: event.buttons,
        }) as MouseEvent & { __aaSplineForwarded?: boolean };
        mouseEvent.__aaSplineForwarded = true;
        targetInfo.target.dispatchEvent(mouseEvent);
      }
    };

    const forwardPointer = (event: PointerEvent) => {
      if ((event as PointerEvent & { __aaSplineForwarded?: boolean }).__aaSplineForwarded) return;

      const mappedPoint = getMappedPoint(event);
      if (!mappedPoint) return;

      if (!mappedPoint.isInside) {
        if (isPointerInsideHero) {
          dispatchPointer(event, "pointerout");
          dispatchPointer(event, "pointerleave");
          isPointerInsideHero = false;
        }
        resetToDefaultGaze();
        return;
      }

      lastPointerEvent = event;

      if (!isPointerInsideHero) {
        dispatchPointer(event, "pointerover");
        dispatchPointer(event, "pointerenter");
        isPointerInsideHero = true;
      }

      dispatchPointer(event, "pointermove");
    };

    const refreshPointerAfterLayoutChange = () => {
      if (lastPointerEvent) forwardPointer(lastPointerEvent);
      else resetToDefaultGaze();
    };

    const initialGazeFrame = window.requestAnimationFrame(resetToDefaultGaze);
    const initialGazeTimeout = window.setTimeout(resetToDefaultGaze, 900);

    window.addEventListener("pointermove", forwardPointer);
    window.addEventListener("pointerleave", resetToDefaultGaze);
    window.addEventListener("blur", resetToDefaultGaze);
    window.addEventListener("scroll", refreshPointerAfterLayoutChange, { passive: true });
    window.addEventListener("resize", refreshPointerAfterLayoutChange);

    return () => {
      window.cancelAnimationFrame(initialGazeFrame);
      window.clearTimeout(initialGazeTimeout);
      window.removeEventListener("pointermove", forwardPointer);
      window.removeEventListener("pointerleave", resetToDefaultGaze);
      window.removeEventListener("blur", resetToDefaultGaze);
      window.removeEventListener("scroll", refreshPointerAfterLayoutChange);
      window.removeEventListener("resize", refreshPointerAfterLayoutChange);
    };
  }, [heroRef, ready]);

  if (!ready) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.92, x: 40 }}
      animate={{ opacity: 0.74, scale: 1, x: 0 }}
      transition={{ delay: 1.1, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none absolute bottom-[-11vh] right-[-13vw] z-[2] hidden h-[50vh] w-[34vw] min-w-[430px] max-w-[540px] overflow-hidden opacity-75 min-[1180px]:block 2xl:bottom-[-7vh] 2xl:right-[-5vw] 2xl:h-[70vh] 2xl:w-[45vw] 2xl:min-w-[504px] 2xl:max-w-[684px]"
      style={{
        WebkitMaskImage:
          "radial-gradient(ellipse at 58% 50%, black 44%, rgba(0,0,0,0.82) 60%, transparent 78%)",
        maskImage:
          "radial-gradient(ellipse at 58% 50%, black 44%, rgba(0,0,0,0.82) 60%, transparent 78%)",
      }}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_56%_48%,oklch(0.65_0.27_5_/_0.16),transparent_58%)]" />
      {createElement("spline-viewer", {
        ref: viewerRef,
        url: "https://prod.spline.design/Y1-bfQf-WfV4Crh2/scene.splinecode",
        className: "h-full w-full",
      })}
    </motion.div>
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
