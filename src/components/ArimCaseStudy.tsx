import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  LayoutGrid,
  MessageCircle,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from "lucide-react";

const liveUrl = "https://www.arimitaly.com";

const dir = "/images/case-studies/arim";

const images = {
  hero: `${dir}/hero.webp`,
  categories: `${dir}/categories.webp`,
  arrivals: `${dir}/arrivals.webp`,
  shop: `${dir}/shop.webp`,
  product: `${dir}/product.webp`,
  checkout: `${dir}/checkout.webp`,
  arHero: `${dir}/ar-hero.webp`,
  arProduct: `${dir}/ar-product.webp`,
  mHero: `${dir}/m-hero.webp`,
  mArHero: `${dir}/m-ar-hero.webp`,
  mProduct: `${dir}/m-product.webp`,
};

const stack = [
  "React 19",
  "TypeScript",
  "TanStack Start",
  "TanStack Query",
  "Tailwind CSS v4",
  "Neon Postgres",
];

const features = [
  {
    label: "Brand Hero",
    title: "An editorial first impression",
    text: "A full-bleed atelier photograph, a calm serif headline, and a scrolling brand strip set the tone of an Italian luxury label before a single product appears.",
    img: images.hero,
  },
  {
    label: "Collections",
    title: "Photography-led categories",
    text: "Pure Silk, Silk Satin, and Solid Pure Silk are presented as tall image tiles so visitors choose by look and feel, not by a list.",
    img: images.categories,
  },
  {
    label: "New Arrivals",
    title: "Quiet product cards",
    text: "Minimal cards with a New badge, price, and a discreet inline Add button keep the catalogue calm and let the scarves do the talking.",
    img: images.arrivals,
  },
  {
    label: "Shop",
    title: "A filterable catalogue",
    text: "Category, brand, size, colour, and price filters with sorting, all driven by the live catalogue the owner edits in the admin panel.",
    img: images.shop,
  },
  {
    label: "Product Page",
    title: "Photos, video, and clear choices",
    text: "A gallery with thumbnails, size and colour selection, stock status, and related pieces. Product videos show a still frame and only download when tapped.",
    img: images.product,
  },
  {
    label: "Checkout",
    title: "An order request, not a payment wall",
    text: "Customers send delivery details and the team confirms personally. Prices are re-checked on the server, and the confirmation opens a ready-written WhatsApp message.",
    img: images.checkout,
  },
];

const flow = ["Discover the Label", "Browse a Collection", "Add to Bag", "Confirm on WhatsApp"];

const scope = [
  {
    icon: Store,
    title: "Boutique Storefront",
    text: "Built a refined ecommerce experience for Italian silk scarves, from homepage storytelling to cart and order request.",
  },
  {
    icon: Globe2,
    title: "English and Arabic",
    text: "A full right-to-left Arabic version of the shop, with names and descriptions that can be written in either language.",
  },
  {
    icon: LayoutDashboard,
    title: "Owner Admin Panel",
    text: "Products, orders, homepage content, and settings that the store owner manages without a developer.",
  },
];

const adminAreas = [
  {
    icon: ShoppingBag,
    title: "Products and videos",
    text: "Add scarves with photos and short videos, bilingual names, sizes, colours, prices, and stock. Photos up to 15 MB and videos up to 25 MB are checked in the browser and again on the server.",
  },
  {
    icon: Sparkles,
    title: "Homepage and brand",
    text: "Edit the hero text and photos, with separate phone and tablet images, a moving top banner, footer text, and optional background music with a mute button.",
  },
  {
    icon: MessageCircle,
    title: "Orders",
    text: "Every order request lands in the admin with its items and delivery details, and the owner moves it through statuses as the team confirms it.",
  },
  {
    icon: Users,
    title: "Mailing list and account",
    text: "Collect subscribers from the footer, and let the owner change the admin username and password without touching code.",
  },
];

const engineering = [
  "Prices come from the database at checkout, so a customer cannot change what they pay from the browser.",
  "Photos and videos upload straight from the browser to cloud storage, so large phone files avoid serverless request limits.",
  "The admin password is hashed with scrypt, and sessions use a signed, httpOnly cookie.",
  "Video still frames are generated in the browser at upload time, keeping product pages light.",
];

function BrowserFrame({ src, alt, label }: { src: string; alt: string; label?: string }) {
  return (
    <figure className="group">
      {label && (
        <figcaption className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-rose-200/70">
          {label}
        </figcaption>
      )}
      <div className="overflow-hidden rounded-2xl border border-rose-100/10 bg-[#0d0908] shadow-[0_32px_90px_-38px_rgba(0,0,0,0.9)] ring-1 ring-rose-100/10 transition-shadow duration-500 group-hover:shadow-[0_42px_110px_-42px_rgba(226,160,170,0.3)]">
        <div className="flex items-center gap-2 border-b border-rose-100/10 bg-[#171010] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <div className="ml-3 flex-1">
            <div className="mx-auto w-fit rounded-md bg-black/50 px-3 py-1 text-[11px] text-rose-100/45 ring-1 ring-rose-100/10">
              arimitaly.com
            </div>
          </div>
        </div>
        <img src={src} alt={alt} className="block h-auto w-full" loading="lazy" decoding="async" />
      </div>
    </figure>
  );
}

function PhoneFrame({ src, alt, label }: { src: string; alt: string; label: string }) {
  return (
    <figure className="mx-auto w-full max-w-[240px]">
      <div className="rounded-[2.2rem] border border-rose-100/15 bg-[#0d0908] p-2 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.9)] ring-1 ring-rose-100/10">
        <div className="relative overflow-hidden rounded-[1.7rem] bg-white">
          <img
            src={src}
            alt={alt}
            className="block aspect-[390/844] w-full object-cover object-top"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs font-medium uppercase tracking-[0.22em] text-rose-200/70">
        {label}
      </figcaption>
    </figure>
  );
}

export function ArimCaseStudy() {
  return (
    <section
      id="arim-case-study"
      className="relative isolate overflow-hidden bg-[#110b0a] py-24 text-rose-50 sm:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: "linear-gradient(180deg, #110b0a 0%, #1a1110 48%, #0d0908 100%)",
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
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-100/15 bg-rose-200/10 px-3 py-1 text-xs font-medium tracking-wide text-rose-200">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
              Case Study - Luxury Ecommerce Boutique
            </div>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-rose-50 sm:text-5xl lg:text-6xl">
              ARIM
            </h2>
            <p className="mt-3 text-lg text-rose-100/75 sm:text-xl">
              A bilingual silk scarf boutique with its own owner admin panel.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-rose-100/55">
              ARIM brings Italian pure silk and silk satin scarves, made by AMIRCO, to customers
              across Lebanon. We designed and built the storefront, the admin panel, and the
              database and image storage behind it: English and Arabic browsing, product videos,
              and order requests ready to confirm on WhatsApp.
            </p>
            <div className="mt-7">
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 rounded-full bg-rose-200 px-5 py-3 text-sm font-semibold text-[#1a1110] transition-transform hover:-translate-y-0.5"
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
            <BrowserFrame src={images.hero} alt="ARIM website homepage" label="Live homepage" />
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
                className="rounded-2xl border border-rose-100/10 bg-rose-100/[0.035] p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-200/10 text-rose-200">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-rose-50">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-rose-100/55">{item.text}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-24">
          <div className="mb-10 flex items-end justify-between gap-6">
            <h3 className="font-display text-2xl font-semibold text-rose-50 sm:text-3xl">
              Inside the experience
            </h3>
            <div className="hidden h-px flex-1 bg-rose-100/10 sm:block" />
          </div>

          <div className="grid gap-10 md:grid-cols-2">
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: (index % 2) * 0.07 }}
                className="flex flex-col gap-5"
              >
                <BrowserFrame src={feature.img} alt={feature.title} label={feature.label} />
                <div>
                  <h4 className="text-lg font-semibold text-rose-50">{feature.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-rose-100/55">{feature.text}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="mt-24 grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-200/10 text-rose-200">
              <Globe2 className="h-5 w-5" />
            </div>
            <h3 className="mt-5 font-display text-2xl font-semibold text-rose-50 sm:text-3xl">
              Arabic is a first-class language
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-rose-100/55">
              One tap switches the whole shop between English and Arabic, and the choice is
              remembered. Phones set to Arabic open in Arabic. The layout flips right-to-left with
              Amiri and Tajawal type, and product and category names can be written in either
              language.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-8">
            <BrowserFrame src={images.arHero} alt="ARIM homepage in Arabic" label="Arabic homepage" />
            <BrowserFrame
              src={images.arProduct}
              alt="ARIM product page in Arabic"
              label="Arabic product page"
            />
          </div>
        </div>

        <div className="mt-24">
          <div className="mb-10 flex items-end justify-between gap-6">
            <h3 className="font-display text-2xl font-semibold text-rose-50 sm:text-3xl">
              Just as polished on a phone
            </h3>
            <div className="hidden h-px flex-1 bg-rose-100/10 sm:block" />
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            <PhoneFrame src={images.mHero} alt="ARIM homepage on a phone" label="English" />
            <PhoneFrame src={images.mArHero} alt="ARIM homepage on a phone in Arabic" label="Arabic" />
            <PhoneFrame src={images.mProduct} alt="ARIM product page on a phone" label="Product" />
          </div>
        </div>

        <div className="mt-24">
          <h3 className="font-display text-2xl font-semibold text-rose-50 sm:text-3xl">
            Customer path
          </h3>
          <p className="mt-2 text-sm text-rose-100/55">
            Visitors move from brand story to product to a confirmed order without an online
            payment step.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((step, index) => {
              const icons = [Sparkles, LayoutGrid, ShoppingBag, MessageCircle];
              const Icon = icons[index];
              return (
                <div
                  key={step}
                  className="relative flex flex-col gap-3 rounded-2xl border border-rose-100/10 bg-rose-100/[0.035] p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-200/10 text-rose-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs text-rose-100/35">0{index + 1}</span>
                  </div>
                  <div className="text-sm font-semibold text-rose-50">{step}</div>
                  {index < flow.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-rose-100/20 lg:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h3 className="font-display text-2xl font-semibold text-rose-50 sm:text-3xl">
                The owner runs the boutique
              </h3>
              <p className="mt-2 max-w-xl text-sm text-rose-100/55">
                The admin area is private to the client, so it is described here rather than shown.
              </p>
            </div>
            <div className="hidden h-px flex-1 bg-rose-100/10 sm:block" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {adminAreas.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.45, delay: (index % 2) * 0.08 }}
                  className="flex gap-4 rounded-2xl border border-rose-100/10 bg-rose-100/[0.035] p-6"
                >
                  <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-rose-200/10 text-rose-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-rose-50">{item.title}</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-rose-100/55">{item.text}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mt-24 grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h3 className="font-display text-2xl font-semibold text-rose-50 sm:text-3xl">
              Built with
            </h3>
            <div className="mt-5 flex flex-wrap gap-2">
              {stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-rose-100/10 bg-rose-100/[0.035] px-3.5 py-1.5 text-sm font-medium text-rose-100/70"
                >
                  {item}
                </span>
              ))}
            </div>

            <h3 className="mt-12 flex items-center gap-2 font-display text-2xl font-semibold text-rose-50 sm:text-3xl">
              <ShieldCheck className="h-6 w-6 text-rose-200" />
              Under the hood
            </h3>
            <div className="mt-5 grid gap-3">
              {engineering.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-rose-100/10 bg-rose-100/[0.035] p-4"
                >
                  <Check className="mt-0.5 h-4 w-4 flex-none text-rose-200" />
                  <p className="text-sm leading-relaxed text-rose-100/55">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="font-display text-2xl font-semibold text-rose-50 sm:text-3xl">
              Delivery scope
            </h3>
            <div className="mt-5 grid gap-3">
              {[
                "Responsive storefront in English and Arabic (RTL)",
                "Catalogue with filters, photos, and product video",
                "Order request checkout with WhatsApp confirmation",
                "Owner admin for products, orders, and homepage",
                "Neon Postgres database and cloud image storage backend",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-rose-100/10 bg-rose-100/[0.035] p-4"
                >
                  <Check className="mt-0.5 h-4 w-4 flex-none text-rose-200" />
                  <p className="text-sm leading-relaxed text-rose-100/55">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20 rounded-3xl border border-rose-100/10 bg-rose-100/[0.035] p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-200">
                <Settings2 className="h-4 w-4" />
                Content stays editable
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-rose-100/55">
                New scarves, prices, hero photos, and banner text go live from the admin panel, so
                ARIM can keep the boutique fresh season after season without a code update.
              </p>
            </div>
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-3 rounded-full bg-rose-200 px-5 py-3 text-sm font-semibold text-[#1a1110] transition-transform hover:-translate-y-0.5"
            >
              Open arimitaly.com
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
