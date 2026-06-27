import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ExternalLink,
  GalleryHorizontalEnd,
  Hammer,
  Home,
  Images,
  LayoutDashboard,
  MessageCircle,
  Settings2,
} from "lucide-react";

const liveUrl = "https://koubargroup.com";

const images = {
  hero: "/images/case-studies/koubar-group/hero.png",
  services: "/images/case-studies/koubar-group/services.png",
  galleryModal: "/images/case-studies/koubar-group/gallery-modal.png",
  portfolio: "/images/case-studies/koubar-group/portfolio.png",
  ctaContact: "/images/case-studies/koubar-group/cta-contact.png",
  admin: "/images/case-studies/koubar-group/admin.png",
};

const stack = ["React", "TypeScript", "TanStack Start", "Tailwind CSS", "Admin Panel", "Vercel"];

const features = [
  {
    label: "Brand Hero",
    title: "Luxury first impression",
    text: "A full-screen interior hero establishes Koubar Group as an engineering, interiors, and custom furniture studio from the first scroll.",
    img: images.hero,
  },
  {
    label: "Services Grid",
    title: "Clear product categories",
    text: "Modern kitchens, interior doors, custom furniture, dining tables, sofas, and interior design are organized into a scannable visual grid.",
    img: images.services,
  },
  {
    label: "Portfolio Gallery",
    title: "Project-led browsing",
    text: "Selected craftsmanship cards spotlight signature projects and guide visitors into focused gallery experiences.",
    img: images.portfolio,
  },
  {
    label: "Gallery Modal",
    title: "Large-format image review",
    text: "A dark immersive lightbox supports project navigation, thumbnails, captions, and full-screen inspection of interior details.",
    img: images.galleryModal,
  },
  {
    label: "Quote CTA",
    title: "WhatsApp conversion path",
    text: "A warm closing section moves visitors from inspiration into a practical request-a-quote action for doors, kitchens, and custom work.",
    img: images.ctaContact,
  },
  {
    label: "Admin System",
    title: "Portfolio item control",
    text: "The admin panel lets the team manage portfolio items, categories, featured status, sort order, descriptions, and image uploads.",
    img: images.admin,
  },
];

const flow = ["Explore Services", "Browse Portfolio", "Open Gallery", "Request Quote"];

const scope = [
  {
    icon: Home,
    title: "Premium Website",
    text: "Built a high-end brand experience for kitchens, doors, furniture, and interior finishing work.",
  },
  {
    icon: GalleryHorizontalEnd,
    title: "Portfolio System",
    text: "Structured categories, featured projects, gallery detail pages, and image-focused browsing.",
  },
  {
    icon: LayoutDashboard,
    title: "Admin Panel",
    text: "Created internal controls for portfolio content, imagery, sorting, and category management.",
  },
];

function BrowserFrame({ src, alt, label }: { src: string; alt: string; label?: string }) {
  return (
    <figure className="group">
      {label && (
        <figcaption className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-amber-300/70">
          {label}
        </figcaption>
      )}
      <div className="overflow-hidden rounded-2xl border border-amber-200/10 bg-[#080604] shadow-[0_32px_90px_-38px_rgba(0,0,0,0.9)] ring-1 ring-amber-200/10 transition-shadow duration-500 group-hover:shadow-[0_42px_110px_-42px_rgba(180,116,35,0.34)]">
        <div className="flex items-center gap-2 border-b border-amber-200/10 bg-[#120d09] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <div className="ml-3 flex-1">
            <div className="mx-auto w-fit rounded-md bg-black/50 px-3 py-1 text-[11px] text-amber-100/45 ring-1 ring-amber-200/10">
              koubargroup.com
            </div>
          </div>
        </div>
        <img src={src} alt={alt} className="block h-auto w-full" loading="lazy" />
      </div>
    </figure>
  );
}

export function KoubarGroupCaseStudy() {
  return (
    <section
      id="koubar-group-case-study"
      className="relative isolate overflow-hidden bg-[#0b0806] py-24 text-amber-50 sm:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, #0b0806 0%, #120d09 48%, #080604 100%)",
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
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/15 bg-amber-300/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Case Study - Interior Portfolio Website
            </div>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-amber-50 sm:text-5xl lg:text-6xl">
              Koubar Group
            </h2>
            <p className="mt-3 text-lg text-amber-100/75 sm:text-xl">
              A premium website and admin system for interiors, doors, kitchens, and custom furniture.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-amber-100/55">
              Koubar Group needed a digital showroom that could feel as refined as the interiors
              they build. The result is a cinematic brand site with service discovery, portfolio
              galleries, WhatsApp quote paths, and an admin panel for keeping project content fresh.
            </p>
            <div className="mt-7">
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-[#120d09] transition-transform hover:-translate-y-0.5"
              >
                Visit live site
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 36, rotate: 1.2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.75 }}
            className="lg:col-span-7"
          >
            <BrowserFrame src={images.hero} alt="Koubar Group website hero" label="Live homepage" />
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
                className="rounded-2xl border border-amber-200/10 bg-amber-100/[0.035] p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-300/10 text-amber-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-amber-50">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-amber-100/55">{item.text}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-24">
          <div className="mb-10 flex items-end justify-between gap-6">
            <h3 className="font-display text-2xl font-semibold text-amber-50 sm:text-3xl">
              Inside the experience
            </h3>
            <div className="hidden h-px flex-1 bg-amber-200/10 sm:block" />
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
                  <h4 className="text-lg font-semibold text-amber-50">{feature.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-amber-100/55">
                    {feature.text}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="mt-24">
          <h3 className="font-display text-2xl font-semibold text-amber-50 sm:text-3xl">
            Customer path
          </h3>
          <p className="mt-2 text-sm text-amber-100/55">
            Visitors move from brand trust to project inspiration to direct contact.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((step, index) => {
              const icons = [Hammer, Images, GalleryHorizontalEnd, MessageCircle];
              const Icon = icons[index];
              return (
                <div
                  key={step}
                  className="relative flex flex-col gap-3 rounded-2xl border border-amber-200/10 bg-amber-100/[0.035] p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/10 text-amber-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs text-amber-100/35">0{index + 1}</span>
                  </div>
                  <div className="text-sm font-semibold text-amber-50">{step}</div>
                  {index < flow.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-amber-200/20 lg:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-24 grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h3 className="font-display text-2xl font-semibold text-amber-50 sm:text-3xl">
              Built with
            </h3>
            <div className="mt-5 flex flex-wrap gap-2">
              {stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-amber-200/10 bg-amber-100/[0.035] px-3.5 py-1.5 text-sm font-medium text-amber-100/70"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="font-display text-2xl font-semibold text-amber-50 sm:text-3xl">
              Delivery scope
            </h3>
            <div className="mt-5 grid gap-3">
              {[
                "Responsive luxury brand website",
                "Service and portfolio presentation",
                "Project gallery with lightbox browsing",
                "Admin-managed portfolio content",
                "WhatsApp quote request path",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-amber-200/10 bg-amber-100/[0.035] p-4"
                >
                  <Check className="mt-0.5 h-4 w-4 flex-none text-amber-300" />
                  <p className="text-sm leading-relaxed text-amber-100/55">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20 rounded-3xl border border-amber-200/10 bg-amber-100/[0.035] p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                <Settings2 className="h-4 w-4" />
                Content stays editable
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-amber-100/55">
                The admin panel keeps the portfolio useful after launch, so Koubar Group can
                continue adding kitchens, doors, bedrooms, and custom furniture work without a
                code update.
              </p>
            </div>
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-3 rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-[#120d09] transition-transform hover:-translate-y-0.5"
            >
              Open koubargroup.com
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
