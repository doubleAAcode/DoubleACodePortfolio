import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/stores/pavone-new/components/ProductCard";
import { StoreLayout } from "@/stores/pavone-new/components/StoreLayout";
import { IntroScreen } from "@/stores/pavone-new/components/IntroScreen";
import { useWishlist } from "@/stores/pavone-new/lib/wishlist";
import {
  catalogKeys,
  fetchCategories,
  fetchProducts,
  getSettings,
  pavoneNewImage,
} from "@/stores/pavone-new/lib/catalog";
import { CartProvider } from "@/stores/pavone-new/lib/cart";

export const Route = createFileRoute("/stores/pavone/")({
  component: PavoneHomeRoute,
  head: () => ({
    meta: [
      { title: "PAVONE BY RAY - Women's Luxury Fashion Boutique" },
      {
        name: "description",
        content:
          "Discover elegant dresses, tailoring, outerwear and accessories at PAVONE BY RAY. Timeless women's fashion with an editorial soul.",
      },
      { property: "og:url", content: "/stores/pavone" },
    ],
    links: [{ rel: "canonical", href: "/stores/pavone" }],
  }),
});

const LOOKS = ["look-1.jpg", "look-2.jpg", "look-3.jpg", "look-4.jpg"];

function PavoneHomeRoute() {
  return (
    <div className="pavone-new-store min-h-screen bg-background text-foreground">
      <CartProvider>
        <HomePage />
      </CartProvider>
    </div>
  );
}

function HomePage() {
  const { data: categories = [] } = useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () => fetchCategories(),
  });
  const { data: products = [] } = useQuery({
    queryKey: catalogKeys.products,
    queryFn: () => fetchProducts(),
  });
  const { data: settings } = useQuery({
    queryKey: catalogKeys.settings,
    queryFn: getSettings,
  });
  const wishlist = useWishlist();

  const featuredCategories = categories.filter((category) => category.is_featured).slice(0, 4);
  const newArrivals = products.filter((product) => product.is_new_arrival).slice(0, 4);
  const bestSellers = products.filter((product) => product.is_best_seller).slice(0, 4);
  const heroImage = settings?.hero_image_url || pavoneNewImage("hero.jpg");
  const editorialImage = settings?.editorial_image_url || pavoneNewImage("editorial.jpg");
  const aboutImage = settings?.about_image_url || pavoneNewImage("about.jpg");
  const instagramUrl = settings?.instagram_url || "https://instagram.com";

  return (
    <StoreLayout>
      <IntroScreen />

      <section className="relative">
        <div className="relative h-[72vh] min-h-[480px] overflow-hidden bg-secondary">
          <img
            src={heroImage}
            alt="PAVONE BY RAY editorial campaign"
            width={1600}
            height={1000}
            className="h-full w-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-end justify-center pb-16 sm:items-center sm:pb-0">
            <div className="animate-fade-up px-4 text-center text-white">
              <p className="eyebrow !text-white/80">
                {settings?.hero_eyebrow || "The New Collection"}
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-6xl">
                {settings?.hero_title || "Elegance, Worn Daily"}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-sm font-light tracking-wide text-white/85 sm:text-base">
                {settings?.hero_subtitle ||
                  "Considered silhouettes and timeless fabrics, designed for the woman who dresses with intention."}
              </p>
              <Link
                to="/stores/pavone/shop"
                className="btn-primary mt-8 !bg-white !text-black hover:!opacity-90"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 text-center">
          <p className="eyebrow">Curated For You</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Shop by Category</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featuredCategories.map((category) => (
            <Link
              key={category.id}
              to="/stores/pavone/shop"
              search={{ category: category.slug } as never}
              className="group relative block aspect-[4/5] overflow-hidden bg-secondary"
            >
              {category.image_url && (
                <img
                  src={category.image_url}
                  alt={category.name}
                  loading="lazy"
                  width={800}
                  height={1000}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <h3 className="font-serif text-xl">{category.name}</h3>
                <p className="mt-1 text-[0.65rem] tracking-[0.2em] uppercase text-white/75">
                  Explore
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {newArrivals.length > 0 && (
        <section className="border-t border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="eyebrow">Just Landed</p>
                <h2 className="mt-3 font-serif text-3xl sm:text-4xl">New Arrivals</h2>
              </div>
              <Link
                to="/stores/pavone/shop"
                search={{ filter: "new" } as never}
                className="hidden text-xs tracking-[0.2em] uppercase underline underline-offset-4 sm:block"
              >
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
              {newArrivals.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  wishlisted={wishlist.has(product.id)}
                  onToggleWishlist={wishlist.toggle}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <img
          src={editorialImage}
          alt="PAVONE BY RAY editorial"
          loading="lazy"
          width={1600}
          height={800}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="px-4 text-center text-white">
            <p className="eyebrow !text-white/80">Editorial</p>
            <h2 className="mt-3 max-w-xl font-serif text-3xl leading-snug sm:text-5xl">
              Quiet Luxury, Loud Presence
            </h2>
            <Link
              to="/stores/pavone/shop"
              className="btn-outline mt-8 !border-white !text-white hover:!bg-white hover:!text-black"
            >
              Discover the Collection
            </Link>
          </div>
        </div>
      </section>

      {bestSellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="eyebrow">Most Loved</p>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Best Sellers</h2>
            </div>
            <Link
              to="/stores/pavone/shop"
              search={{ filter: "best" } as never}
              className="hidden text-xs tracking-[0.2em] uppercase underline underline-offset-4 sm:block"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {bestSellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                wishlisted={wishlist.has(product.id)}
                onToggleWishlist={wishlist.toggle}
              />
            ))}
          </div>
        </section>
      )}

      <section id="about" className="border-t border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <p className="eyebrow">Our Story</p>
            <h2 className="mt-3 font-serif text-3xl leading-snug sm:text-4xl">
              Fashion with a point of view
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              PAVONE BY RAY was born from a simple belief: a woman's wardrobe should be a collection
              of pieces she truly loves. We curate elegant, wearable fashion with the confidence of
              the peacock we are named after, and none of the noise.
            </p>
            <Link to="/stores/pavone/shop" className="btn-outline mt-8">
              Explore the Boutique
            </Link>
          </div>
          <div className="order-1 aspect-[4/5] overflow-hidden lg:order-2">
            <img
              src={aboutImage}
              alt="Inside the PAVONE BY RAY atelier"
              loading="lazy"
              width={900}
              height={1100}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 text-center">
          <p className="eyebrow">@pavonebyray</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl">The Lookbook</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {LOOKS.map((src, index) => (
            <a
              key={src}
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="group block aspect-square overflow-hidden bg-secondary"
            >
              <img
                src={pavoneNewImage(src)}
                alt={`PAVONE BY RAY look ${index + 1}`}
                loading="lazy"
                width={900}
                height={900}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </a>
          ))}
        </div>
      </section>
    </StoreLayout>
  );
}
