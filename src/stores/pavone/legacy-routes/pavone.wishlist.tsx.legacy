import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { ProductCard } from "@/stores/pavone/components/ProductCard";
import { products } from "@/stores/pavone/data/products";
import { useFavorites } from "@/stores/pavone/context/FavoritesContext";
import { PavoneShell } from "@/stores/pavone/PavoneShell";

export const Route = createFileRoute("/stores/pavone/wishlist")({
  head: () => ({
    meta: [
      { title: "Your Wishlist — Pavone.lb" },
      { name: "description", content: "Pieces you've saved at Pavone.lb." },
    ],
  }),
  component: PavoneWishlistRoute,
});

function PavoneWishlistRoute() {
  return (
    <PavoneShell>
      <WishlistPage />
    </PavoneShell>
  );
}

function WishlistPage() {
  const { ids } = useFavorites();
  const items = products.filter((p) => ids.includes(p.id));

  return (
    <div className="container-page py-12 md:py-16">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-pink/15 text-pink mb-4">
          <Heart className="h-5 w-5 fill-current" />
        </div>
        <h1 className="font-display text-5xl md:text-6xl text-cocoa">Your Wishlist</h1>
        <p className="mt-3 text-muted-foreground">The pieces you’ve saved for later — keep them close.</p>
      </div>

      <div className="mt-12">
        {items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display text-2xl text-cocoa">Nothing saved yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Tap the heart on any piece to add it here.</p>
            <Link to="/stores/pavone/shop" className="mt-6 inline-flex items-center gap-2 bg-pink text-primary-foreground px-7 py-3.5 rounded-full text-sm tracking-[0.18em] uppercase hover:opacity-90 transition-opacity shadow-soft">
              Browse the collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
            {items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
