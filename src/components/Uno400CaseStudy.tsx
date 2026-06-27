import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  Cloud,
  Database,
  GitBranch,
  Layers3,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  TimerReset,
  UsersRound,
} from "lucide-react";

const images = {
  gameTable: "/images/case-studies/uno400/game-table.jpg",
  lobby: "/images/case-studies/uno400/lobby.jpg",
  handPlay: "/images/case-studies/uno400/hand-play.jpg",
  invite: "/images/case-studies/uno400/invite.jpg",
};

const stack = [
  "Swift 5.9",
  "SwiftUI",
  "MVVM",
  "Firebase Realtime Database",
  "Firebase Anonymous Auth",
  "Combine",
  "Keychain",
  "XCTest",
];

const features = [
  {
    label: "Real-Time Table",
    title: "Synchronized multiplayer play",
    text: "Firebase Realtime Database keeps the shared room state live while each player writes only to their own node.",
    img: images.gameTable,
  },
  {
    label: "Optimistic Play",
    title: "Instant card feedback",
    text: "Cards leave the hand immediately on tap, then roll back only if Firebase rejects an invalid play or stale turn.",
    img: images.handPlay,
  },
  {
    label: "Room Flow",
    title: "Quick table setup",
    text: "Anonymous sessions, reusable identity storage, and room state make it easy to create, join, rejoin, and continue games.",
    img: images.lobby,
  },
  {
    label: "Deep Linking",
    title: "Shareable invites",
    text: "Custom uno400 invite links let players share room codes through WhatsApp and return directly into the game.",
    img: images.invite,
  },
];

const architecture = [
  {
    icon: Smartphone,
    title: "Clean MVVM",
    text: "SwiftUI views stay stateless while ObservableObject view models own UI state and orchestrate service calls.",
  },
  {
    icon: Cloud,
    title: "Host Arbiter",
    text: "One connected device acts as the source of truth for trick resolution, scoring, turn advancement, and bot play.",
  },
  {
    icon: ShieldCheck,
    title: "Idempotent Writes",
    text: "UUID-keyed pending plays and last-applied guards prevent repeated snapshots from double-applying a card.",
  },
];

const engineering = [
  {
    icon: Database,
    title: "Event-Sourced Recovery",
    text: "The host can reconstruct hands from a baseline deal and append-only trick log when snapshot order or reconnects cause drift.",
  },
  {
    icon: RefreshCcw,
    title: "Self-Healing State",
    text: "Hand counts and full-deck validation catch corrupted state before scoring and repair it without a custom server.",
  },
  {
    icon: TimerReset,
    title: "Debounced Observers",
    text: "Burst Firebase callbacks are collapsed into one UI update, with room fingerprinting to skip redundant renders.",
  },
  {
    icon: Bot,
    title: "Transparent Bots",
    text: "AI players submit through the same Firebase protocol as humans, so the rest of the system does not need bot-specific paths.",
  },
];

const flow = ["Join Room", "Play Card", "Host Resolves", "State Repairs"];

function PhoneFrame({
  src,
  alt,
  className = "",
  delay = 0,
}: {
  src: string;
  alt: string;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 42 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      animate={{ y: [0, -8, 0] }}
      transition={{
        opacity: { duration: 0.55, delay },
        y: { duration: 5.6, delay, repeat: Infinity, ease: "easeInOut" },
      }}
      className={`relative mx-auto w-full max-w-[220px] rounded-[2rem] border border-emerald-950 bg-slate-950 p-1.5 shadow-[0_28px_80px_-28px_rgba(4,47,46,0.65)] sm:max-w-[280px] sm:rounded-[2.35rem] sm:p-2 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_28%,rgba(255,255,255,0.06)_72%,transparent)] sm:rounded-[2.35rem]" />
      <div className="absolute -left-1 top-24 h-16 w-1 rounded-l-full bg-emerald-950" />
      <div className="absolute -right-1 top-28 h-20 w-1 rounded-r-full bg-emerald-950" />
      <div className="absolute left-1/2 top-4 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" />
      <div className="relative overflow-hidden rounded-[1.65rem] bg-emerald-950 sm:rounded-[2rem]">
        <img src={src} alt={alt} className="block h-auto w-full" loading="lazy" />
      </div>
    </motion.div>
  );
}

export function Uno400CaseStudy() {
  return (
    <section
      id="uno400-case-study"
      className="relative isolate overflow-hidden bg-[#f3f8f4] pb-20 pt-36 text-slate-950 sm:py-32"
      style={{ colorScheme: "light" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 10% 8%, rgba(22,163,74,0.15), transparent 48%), radial-gradient(ellipse at 92% 18%, rgba(14,165,233,0.1), transparent 42%), radial-gradient(ellipse at 50% 100%, rgba(250,204,21,0.1), transparent 54%)",
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
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium tracking-wide text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Case Study - Multiplayer Card Game
            </div>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Uno400
            </h2>
            <p className="mt-3 text-lg text-slate-600 sm:text-xl">
              A real-time SwiftUI multiplayer card game built on Firebase without a custom server.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600">
              Uno400 is a distributed multiplayer game where Firebase handles live room
              synchronization while the host device acts as the game arbiter. The project
              combines optimistic card play, idempotent writes, event-sourced repair, bot
              players, and clean MVVM separation to keep gameplay responsive under network
              instability.
            </p>
          </motion.div>

          <div className="relative lg:col-span-6">
            <div className="relative mx-auto flex max-w-[300px] items-center justify-center sm:grid sm:max-w-none sm:grid-cols-3 sm:gap-3">
              <PhoneFrame src={images.lobby} alt="Uno400 room lobby" className="hidden translate-y-8 rotate-[-8deg] sm:block" delay={0.1} />
              <PhoneFrame src={images.gameTable} alt="Uno400 real-time game table" className="z-10 sm:scale-110" delay={0.2} />
              <PhoneFrame src={images.handPlay} alt="Uno400 card play screen" className="hidden translate-y-10 rotate-[8deg] sm:block" delay={0.3} />
            </div>
          </div>
        </div>

        <div className="mt-24 grid gap-5 md:grid-cols-3">
          {architecture.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
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
              Product moments
            </h3>
            <div className="hidden h-px flex-1 bg-emerald-100 sm:block" />
          </div>

          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: index * 0.06 }}
                className="flex flex-col items-center gap-5 text-center"
              >
                <PhoneFrame src={feature.img} alt={feature.title} delay={index * 0.04} />
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

        <div className="mt-24">
          <h3 className="font-display text-2xl font-semibold text-slate-950 sm:text-3xl">
            Multiplayer loop
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            The game stays responsive while Firebase snapshots, host processing, and repair checks happen behind the scenes.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((step, index) => {
              const icons = [UsersRound, GitBranch, Layers3, ShieldCheck];
              const Icon = icons[index];
              return (
                <div
                  key={step}
                  className="relative flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs text-slate-400">0{index + 1}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-950">{step}</div>
                  {index < flow.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-emerald-200 lg:block" />
                  )}
                </div>
              );
            })}
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
                  className="rounded-full border border-emerald-100 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 flex-none text-emerald-700" />
                <p className="text-sm leading-relaxed text-slate-600">
                  The game logic service is pure Swift and Firebase-free, which keeps card
                  validation, trick resolution, scoring, and repair behavior unit-testable
                  with XCTest.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="font-display text-2xl font-semibold text-slate-950 sm:text-3xl">
              Engineering highlights
            </h3>
            <div className="mt-5 grid gap-3">
              {engineering.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 font-display text-lg font-semibold text-emerald-700">
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-20 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Check className="h-4 w-4" />
                No custom server
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Uno400 uses Firebase as the transport layer while the host device owns game
                authority, host reassignment, bot turns, replay protection, and integrity repair.
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_38px_-22px_rgba(4,47,46,0.85)]">
              Host-as-arbiter architecture
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
