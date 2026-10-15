import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, CalendarCheck, Car, Check, ExternalLink, FormInput, Image, MessagesSquare, Sparkles } from "lucide-react";

const liveUrl = "https://thedetailinglabs.com.au";

const images = {
  hero: "/images/case-studies/detailing-lab/hero-car.jpg",
  logo: "/images/case-studies/detailing-lab/logo.png",
  ceramic: "/images/case-studies/detailing-lab/ceramic.jpg",
  blackout: "/images/case-studies/detailing-lab/blackout.webp",
  fullDetail: "/images/case-studies/detailing-lab/full-detail.webp",
  maintenance: "/images/case-studies/detailing-lab/maintenance.webp",
  nanoShield: "/images/case-studies/detailing-lab/nano-shield.webp",
  paintCorrection: "/images/case-studies/detailing-lab/paint-correction.webp",
  siteHero: "/images/case-studies/detailing-lab/site-hero.png",
  siteCeramic: "/images/case-studies/detailing-lab/site-ceramic.png",
  siteDetailing: "/images/case-studies/detailing-lab/site-detailing.png",
  siteInquiry: "/images/case-studies/detailing-lab/site-inquiry.png",
  siteContact: "/images/case-studies/detailing-lab/site-contact.png",
};

const stack = ["React", "TypeScript", "TanStack Start", "Tailwind CSS", "Web3Forms"];

const features = [
  {
    label: "Hero Experience",
    title: "Automotive first impression",
    text: "A bold, full-bleed vehicle hero sets the brand tone immediately and leads users into packages or direct phone contact.",
    img: images.siteHero,
  },
  {
    label: "Ceramic Packages",
    title: "Premium service comparison",
    text: "Service packages are organized into ceramic coating and detailing tabs with pricing, badges, features, and inquiry handoff.",
    img: images.siteCeramic,
  },
  {
    label: "Detailing Packages",
    title: "Fast package switching",
    text: "The detailing tab keeps lower-commitment services easy to compare while preserving the same strong booking path.",
    img: images.siteDetailing,
  },
  {
    label: "Inquiry Flow",
    title: "Package-aware lead capture",
    text: "Package inquiry buttons prefill the form context, reducing friction for customers who already know what they want.",
    img: images.siteInquiry,
  },
  {
    label: "Contact Section",
    title: "Clear final conversion point",
    text: "The closing section repeats the core contact options and keeps the booking call to action visible after users review the service.",
    img: images.siteContact,
  },
];

const flow = ["Land on Brand", "Compare Packages", "Choose Service", "Send Inquiry"];

const scope = [
  {
    icon: Sparkles,
    title: "Visual Website",
    text: "Built a polished automotive landing experience with package-driven content and responsive sections.",
  },
  {
    icon: FormInput,
    title: "Lead Capture",
    text: "Integrated a structured inquiry form that submits customer details and selected service context.",
  },
  {
    icon: CalendarCheck,
    title: "Booking Intent",
    text: "Designed clear paths from package browsing to booking, calling, Instagram, and inquiry submission.",
  },
];

function BrowserFrame({ src, alt, label }: { src: string; alt: string; label?: string }) {
  return (
    <figure className="group">
      {label && (
        <figcaption className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </figcaption>
      )}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_30px_90px_-34px_rgba(0,0,0,0.85)] ring-1 ring-lime-300/10 transition-shadow duration-500 group-hover:shadow-[0_42px_110px_-36px_rgba(132,204,22,0.28)]">
        <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-900 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <div className="ml-3 flex-1">
            <div className="mx-auto w-fit rounded-md bg-zinc-950 px-3 py-1 text-[11px] text-zinc-400 ring-1 ring-white/10">
              thedetailinglabs.com.au
            </div>
          </div>
        </div>
        <img src={src} alt={alt} className="block h-auto w-full" loading="lazy" />
      </div>
    </figure>
  );
}

export function DetailingLabCaseStudy() {
  return (
    <section
      id="detailing-lab-case-study"
      className="relative isolate overflow-hidden bg-[#070907] py-24 text-white sm:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 12% 8%, rgba(132,204,22,0.18), transparent 44%), radial-gradient(ellipse at 90% 18%, rgba(255,255,255,0.08), transparent 38%), linear-gradient(180deg, #070907 0%, #0b0e0b 100%)",
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-medium tracking-wide text-lime-200">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
              Case Study - Automotive Services
            </div>
            <img src={images.logo} alt="The Detailing Lab logo" className="mb-6 h-20 w-20 object-contain" />
            <h2 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              The Detailing Lab
            </h2>
            <p className="mt-3 text-lg text-zinc-300 sm:text-xl">
              A premium mobile detailing website built to turn package browsing into booking inquiries.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400">
              The site presents a Sydney mobile detailing studio with a high-impact automotive
              hero, package-based service discovery, direct call and Instagram contact paths,
              and a structured inquiry form that carries selected service context into the lead.
            </p>
            <div className="mt-7">
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition-transform hover:-translate-y-0.5"
              >
                Visit live site
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 36, rotate: 1.5 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.75 }}
            className="lg:col-span-7"
          >
            <BrowserFrame src={images.siteHero} alt="The Detailing Lab website hero" label="Live homepage" />
          </motion.div>
        </div>

        <div className="mt-24 grid gap-5 md:grid-cols-3">
          {scope.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.text}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-24">
          <div className="mb-10 flex items-end justify-between gap-6">
            <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Inside the site
            </h3>
            <div className="hidden h-px flex-1 bg-white/10 sm:block" />
          </div>

          <div className="grid gap-10 md:grid-cols-2">
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: index * 0.07 }}
                className="flex flex-col gap-5"
              >
                <BrowserFrame src={feature.img} alt={feature.title} label={feature.label} />
                <div>
                  <h4 className="text-lg font-semibold text-white">{feature.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.text}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="mt-24">
          <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Conversion path
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            The page moves customers from brand trust to a concrete service inquiry.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((step, index) => {
              const icons = [Car, Image, MessagesSquare, BadgeCheck];
              const Icon = icons[index];
              return (
                <div
                  key={step}
                  className="relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs text-zinc-500">0{index + 1}</span>
                  </div>
                  <div className="text-sm font-semibold text-white">{step}</div>
                  {index < flow.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-zinc-700 lg:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-24 grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Built with
            </h3>
            <div className="mt-5 flex flex-wrap gap-2">
              {stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm font-medium text-zinc-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Website scope
            </h3>
            <div className="mt-5 grid gap-3">
              {[
                "Responsive one-page marketing site",
                "Ceramic and detailing package tabs",
                "Prefilled package inquiry workflow",
                "Phone, Instagram, and live inquiry CTAs",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-lime-300" />
                  <p className="text-sm leading-relaxed text-zinc-400">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
