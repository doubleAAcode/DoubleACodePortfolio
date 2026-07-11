import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sun, Instagram, Heart, Sparkles } from "lucide-react";
import { ProductCard } from "@/stores/pavone/components/ProductCard";
import { PavoneShell } from "@/stores/pavone/PavoneShell";
import { PavoneDataState, usePavoneCatalog, usePavoneOutfits, usePavoneSiteSettings } from "@/stores/pavone/lib/use-pavone-data";
import type { Product } from "@/stores/pavone/data/products";
import type { OutfitInspiration } from "@/stores/pavone/lib/pavone-api";

import beigeCoat from "@/stores/pavone/public/assets/beige-coat.jpg";
import blackDress from "@/stores/pavone/public/assets/black-dress.jpg";
import bluePleatedSet from "@/stores/pavone/public/assets/blue-pleated-set.jpg";
import greyCoat from "@/stores/pavone/public/assets/grey-coat.jpg";
import pinkFloralDress from "@/stores/pavone/public/assets/pink-floral-dress.jpg";
import redCoat from "@/stores/pavone/public/assets/red-coat.jpg";
import whiteDress from "@/stores/pavone/public/assets/white-dress.jpg";

type OutfitWithProducts = OutfitInspiration & {
  items: [Product, Product, Product, ...Product[]];
};

function isProduct(product: Product | undefined): product is Product {
  return Boolean(product);
}

function hasAtLeastThreeProducts(items: Product[]): items is OutfitWithProducts["items"] {
  return items.length >= 3;
}

export const Route = createFileRoute("/stores/pavone/")({
  head: () => ({
    meta: [
      { title: "Pavone.lb — Modern Modest Fashion for Spring & Summer" },
      { name: "description", content: "Pavone.lb — fresh, feminine, modern modest fashion. Discover spring/summer abayas, sets, dresses, and hijab styling." },
      { property: "og:title", content: "Pavone.lb — Modern Modest Fashion" },
      { property: "og:description", content: "Fresh, feminine, modern modest fashion." },
      { property: "og:image", content: pinkFloralDress },
      { property: "og:url", content: "/stores/pavone" },
    ],
    links: [{ rel: "canonical", href: "/stores/pavone" }],
  }),
  component: PavoneHomeRoute,
});

function PavoneHomeRoute() {
  return (
    <PavoneShell>
      <HomePage />
    </PavoneShell>
  );
}

function HomePage() {
  const { data, loading, error } = usePavoneCatalog();
  const outfits = usePavoneOutfits();
  const settingsState = usePavoneSiteSettings();
  const { categories, products } = data;
  const newArrivals = products.filter((p) => p.tags?.includes("new"));
  const siteSettings = settingsState.data;
  const heroMainImage = siteSettings?.heroMainImage || pinkFloralDress;
  const heroMobileImage = siteSettings?.heroMobileImage || heroMainImage;
  const heroGalleryImages = [
    siteSettings?.heroGalleryImages?.[0] || bluePleatedSet,
    siteSettings?.heroGalleryImages?.[1] || redCoat,
    siteSettings?.heroGalleryImages?.[2] || blackDress,
  ];
  const heroBadge = siteSettings?.heroBadge || "Spring / Summer '26 Collection";
  const heroTitle = siteSettings?.heroTitle || "Modern modest fashion, made to bloom.";
  const heroSubtitle = siteSettings?.heroSubtitle || "Flowing abayas, coordinated sets and signature scarves - curated for the woman who dresses with intention and a love of color.";
  const featuredLookLabel = siteSettings?.featuredLookLabel || "Blossom Knit - $89";
  const featuredProductSlug = siteSettings?.featuredProductSlug || "blossom-knit-dress";

  const looks: OutfitWithProducts[] = outfits.data.flatMap((look) => {
    const items = look.productIds
      .map((id) => products.find((p) => p.id === id))
      .filter(isProduct);

    return hasAtLeastThreeProducts(items) ? [{ ...look, items }] : [];
  });

  const featuredCategories = categories.filter(c => c.slug !== "new-collection");
  const tones = ["bg-blush", "bg-sage", "bg-lavender", "bg-peach"];

  return (
    <PavoneDataState loading={loading || settingsState.loading} error={error || outfits.error || settingsState.error} empty={products.length === 0 || categories.length === 0}>
    <div className="overflow-x-hidden">
      <section className="md:hidden relative h-[88vh] min-h-[560px] max-h-[780px] overflow-hidden bg-blush/30">
        <img
          src={heroMobileImage}
          alt="Pavone.lb signature spring look"
          className="absolute inset-0 h-full w-full object-cover object-top scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-cocoa/10 via-cocoa/30 to-cocoa/85" />

        <div className="absolute top-5 left-5 bg-background/90 backdrop-blur rounded-full px-3.5 py-1.5 text-[10px] uppercase tracking-[0.22em] text-cocoa flex items-center gap-1.5 animate-fade-up">
          <Sparkles className="h-3 w-3 text-pink" /> SS '26 · New Drop
        </div>
        <div className="absolute top-5 right-5 bg-pink text-primary-foreground rounded-full h-9 w-9 grid place-items-center shadow-soft animate-fade-up">
          <Heart className="h-4 w-4" />
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-24 animate-fade-up">
          <h1 className="font-display text-[2.5rem] leading-[1.02] text-ivory">{heroTitle}</h1>
          <p className="mt-3 max-w-md text-sm text-ivory/90 leading-relaxed">
            {heroSubtitle}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link to="/stores/pavone/shop" className="inline-flex items-center gap-2 bg-pink text-primary-foreground px-6 py-3.5 rounded-full text-xs tracking-[0.18em] uppercase shadow-soft">
              Shop Now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/stores/pavone/shop" className="inline-flex items-center gap-2 bg-ivory/15 backdrop-blur border border-ivory/30 text-ivory px-6 py-3.5 rounded-full text-xs tracking-[0.18em] uppercase">
              Collections
            </Link>
          </div>
        </div>
      </section>

      <section className="hidden md:block lg:hidden bg-gradient-to-br from-blush/40 via-cream to-lavender/30">
        <div className="container-page py-10">
          <div className="relative rounded-[2rem] overflow-hidden shadow-soft bg-blush/30 aspect-[16/9] max-h-[480px]">
            <img
              src={heroMainImage}
              alt="Pavone.lb signature spring look"
              className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
            />
            <div className="absolute top-5 left-5 bg-background/85 backdrop-blur rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] text-cocoa">
              Featured Look - {featuredLookLabel}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-[1.2fr_1fr] gap-8 items-end animate-fade-up">
            <div>
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-taupe">
                <Sun className="h-3.5 w-3.5" /> {heroBadge}
              </span>
              <h1 className="mt-3 font-display text-5xl leading-[1.04] text-cocoa">
                {heroTitle}
              </h1>
            </div>
            <div>
              <p className="text-base text-muted-foreground leading-relaxed">
                {heroSubtitle}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link to="/stores/pavone/shop" className="inline-flex items-center gap-2 bg-pink text-primary-foreground px-6 py-3 rounded-full text-xs tracking-[0.18em] uppercase shadow-soft hover:opacity-90">
                  Shop Now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/stores/pavone/shop" className="inline-flex items-center gap-2 bg-background/70 backdrop-blur border border-cocoa/15 px-6 py-3 rounded-full text-xs tracking-[0.18em] uppercase text-cocoa hover:bg-background">
                  Collections
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hidden lg:block bg-gradient-to-br from-blush/40 via-cream to-lavender/30">
        <div className="container-page grid grid-cols-[1fr_1.1fr] gap-14 xl:gap-20 py-14 xl:py-20 items-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-taupe">
              <Sun className="h-3.5 w-3.5" /> {heroBadge}
            </span>
            <h1 className="mt-5 font-display text-6xl xl:text-7xl leading-[1.02] text-cocoa">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground leading-relaxed">
              {heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/stores/pavone/shop" className="inline-flex items-center gap-2 bg-pink text-primary-foreground px-7 py-3.5 rounded-full text-sm tracking-[0.18em] uppercase hover:opacity-90 transition-opacity shadow-soft">
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/stores/pavone/shop" className="inline-flex items-center gap-2 bg-background/70 backdrop-blur border border-cocoa/15 px-7 py-3.5 rounded-full text-sm tracking-[0.18em] uppercase hover:bg-background transition-colors text-cocoa">
                Browse Collections
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { src: heroGalleryImages[0], alt: "Pavone hero gallery look 1" },
                { src: heroGalleryImages[1], alt: "Pavone hero gallery look 2" },
                { src: heroGalleryImages[2], alt: "Pavone hero gallery look 3" },
              ].map((img) => (
                <div key={img.alt} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-cream shadow-card">
                  <img src={img.src} alt={img.alt} className="h-full w-full object-cover object-top transition-transform duration-700 hover:scale-105" />
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-[2rem] overflow-hidden shadow-soft bg-blush/30 aspect-[4/5] xl:aspect-[5/6] max-h-[760px]">
            <img
              src={heroMainImage}
              alt="Pavone.lb signature spring look"
              className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
            />
            <div className="absolute top-5 left-5 bg-background/85 backdrop-blur rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] text-cocoa">
              Featured Look
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
              <div className="bg-background/90 backdrop-blur rounded-2xl px-5 py-3">
                <div className="text-[9px] uppercase tracking-[0.22em] text-taupe">New drop</div>
                <div className="font-display text-lg leading-tight text-cocoa">{featuredLookLabel}</div>
              </div>
              <Link to="/stores/pavone/product/$slug" params={{ slug: featuredProductSlug }} className="bg-pink text-primary-foreground rounded-full h-12 w-12 grid place-items-center hover:opacity-90 shadow-soft">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container-page flex items-end justify-between mb-6 md:mb-10 gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.28em] text-taupe">Shop by category</span>
            <h2 className="font-display text-3xl md:text-5xl text-cocoa mt-1">Browse the wardrobe</h2>
          </div>
          <Link to="/stores/pavone/shop" className="hidden md:inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-taupe hover:text-pink">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {featuredCategories.map((c, i) => (
            <Link
              key={c.slug}
              to="/stores/pavone/category/$slug"
              params={{ slug: c.slug }}
              className={`group relative shrink-0 w-[72%] snap-center aspect-[3/4] rounded-3xl overflow-hidden shadow-card ${i === 0 ? "ml-[8vw]" : ""} ${i === featuredCategories.length - 1 ? "mr-[10vw]" : ""}`}
            >
              <div className={`absolute inset-0 ${tones[i % tones.length]}`} />
              <img src={c.image} alt={c.name} className="absolute inset-0 h-full w-full object-cover object-top" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-cocoa/75 via-cocoa/10 to-transparent" />
              <div className="absolute top-4 left-4 bg-ivory/95 backdrop-blur rounded-full px-3 py-1 text-[9px] uppercase tracking-[0.22em] text-cocoa">
                {i === 0 ? "Editor's pick" : "Shop now"}
              </div>
              <div className="absolute bottom-5 left-5 right-5 text-ivory">
                <div className="text-[10px] uppercase tracking-[0.28em] opacity-90">{c.description}</div>
                <div className="font-display text-3xl mt-1 flex items-center justify-between">
                  {c.name}
                  <span className="h-9 w-9 rounded-full bg-ivory/95 text-cocoa grid place-items-center">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="container-page hidden md:grid grid-cols-12 grid-rows-2 gap-5 h-[640px]">
          {featuredCategories.map((c, i) => {
            const spans = [
              "col-span-5 row-span-2",
              "col-span-7 row-span-1",
              "col-span-3 row-span-1",
              "col-span-4 row-span-1",
            ];
            return (
              <Link key={c.slug} to="/stores/pavone/category/$slug" params={{ slug: c.slug }} className={`group relative overflow-hidden rounded-[1.75rem] shadow-card ${spans[i]}`}>
                <div className={`absolute inset-0 ${tones[i % tones.length]}`} />
                <img src={c.image} alt={c.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-[1200ms] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-cocoa/65 via-cocoa/10 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-ivory flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] opacity-90">{c.description}</div>
                    <div className="font-display text-3xl mt-1">{c.name}</div>
                  </div>
                  <span className="h-10 w-10 rounded-full bg-ivory/95 text-cocoa grid place-items-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {newArrivals.length > 0 && (
        <section className="py-12 md:py-20 bg-gradient-to-b from-background to-cream/40">
          <div className="container-page flex items-end justify-between mb-6 md:mb-10 gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-[0.28em] text-pink flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Just landed
              </span>
              <h2 className="font-display text-3xl md:text-5xl text-cocoa mt-1">New Arrivals</h2>
            </div>
            <Link to="/stores/pavone/shop" className="text-xs uppercase tracking-[0.2em] text-taupe hover:text-pink shrink-0">See all</Link>
          </div>

          <div className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {newArrivals.map((p, i) => (
              <div key={p.id} className={`shrink-0 w-[68%] snap-center ${i === 0 ? "ml-[10vw]" : ""} ${i === newArrivals.length - 1 ? "mr-[12vw]" : ""}`}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>

          <div className="container-page hidden md:grid grid-cols-4 gap-8">
            {newArrivals.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
      {looks.length > 0 && (
      <section className="py-12 md:py-20">
        <div className="container-page mb-6 md:mb-10">
          <span className="text-[10px] uppercase tracking-[0.28em] text-taupe">Style inspiration</span>
          <h2 className="font-display text-3xl md:text-5xl text-cocoa mt-1">Outfit Inspirations</h2>
          <p className="mt-1.5 text-xs md:text-base text-muted-foreground">Outfit ideas, ready to wear from head to scarf.</p>
        </div>

        <div className="container-page space-y-5 md:grid md:grid-cols-3 md:gap-8 md:space-y-0">
          {looks.map((look, i) => (
            <article key={look.id} className={`rounded-[1.75rem] p-4 md:p-6 ${i === 0 ? "bg-blush/45" : i === 1 ? "bg-lavender/45" : "bg-sage/45"}`}>
              <div className="grid grid-cols-5 gap-2">
                <Link to="/stores/pavone/product/$slug" params={{ slug: look.items[0].slug }} className="col-span-3 row-span-2 relative aspect-[3/4] overflow-hidden rounded-2xl bg-background">
                  <img src={look.items[0].images[0]} alt={look.items[0].name} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                </Link>
                <Link to="/stores/pavone/product/$slug" params={{ slug: look.items[1].slug }} className="col-span-2 aspect-square overflow-hidden rounded-2xl bg-background">
                  <img src={look.items[1].images[0]} alt={look.items[1].name} className="h-full w-full object-cover" />
                </Link>
                <Link to="/stores/pavone/product/$slug" params={{ slug: look.items[2].slug }} className="col-span-2 aspect-square overflow-hidden rounded-2xl bg-background">
                  <img src={look.items[2].images[0]} alt={look.items[2].name} className="h-full w-full object-cover" />
                </Link>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-xl md:text-2xl text-cocoa truncate">{look.title}</h3>
                  <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 line-clamp-2">{look.note}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {look.items.map((item) => (
                      <span key={item.id} className="rounded-full bg-background/70 px-2 py-1 text-[10px] text-cocoa">
                        {item.name} · ${item.salePrice ?? item.price}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  to="/stores/pavone/product/$slug"
                  params={{ slug: look.items[0].slug }}
                  className="shrink-0 text-[10px] tracking-[0.18em] uppercase bg-pink text-primary-foreground rounded-full px-3.5 py-2.5 hover:opacity-90"
                >
                  Shop look
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      )}

      <section className="py-12 md:py-20">
        <div className="container-page mb-6 md:mb-10 text-center">
          <span className="text-[10px] uppercase tracking-[0.28em] text-taupe flex items-center justify-center gap-1.5">
            <Instagram className="h-3 w-3" /> @pavone.lb
          </span>
          <h2 className="font-display text-3xl md:text-5xl text-cocoa mt-1">Tag us, get featured</h2>
        </div>
        <div className="container-page grid grid-cols-3 md:grid-cols-5 gap-1.5 md:gap-3">
          {[pinkFloralDress, bluePleatedSet, beigeCoat, greyCoat, whiteDress].map((src, i) => (
            <a key={i} href="https://instagram.com" target="_blank" rel="noreferrer"
              className={`group relative aspect-square overflow-hidden rounded-2xl bg-cream ${i >= 3 ? "hidden md:block" : ""} ${i === 3 ? "md:block" : ""}`}>
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 grid place-items-center bg-cocoa/0 group-hover:bg-cocoa/30 transition-colors">
                <Instagram className="h-5 w-5 text-ivory opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
      </section>

      <div className="h-4" />
    </div>
    </PavoneDataState>
  );
}
