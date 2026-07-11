import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";
import { StoreLayout } from "@/stores/pavone-new/components/StoreLayout";
import { CartProvider, cartKey, useCart } from "@/stores/pavone-new/lib/cart";
import { formatPrice } from "@/stores/pavone-new/lib/brand";

export const Route = createFileRoute("/stores/pavone/cart")({
  component: PavoneCartRoute,
  head: () => ({
    meta: [
      { title: "Shopping Bag - PAVONE BY RAY" },
      { name: "description", content: "Review your selected pieces and proceed to order." },
      { property: "og:url", content: "/stores/pavone/cart" },
    ],
    links: [{ rel: "canonical", href: "/stores/pavone/cart" }],
  }),
});

function PavoneCartRoute() {
  return (
    <div className="pavone-new-store min-h-screen bg-background text-foreground">
      <CartProvider>
        <CartPage />
      </CartProvider>
    </div>
  );
}

function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <StoreLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 text-center">
          <p className="eyebrow">Your Selection</p>
          <h1 className="mt-3 font-serif text-3xl sm:text-4xl">Shopping Bag</h1>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-xl">Your bag is empty.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Discover pieces you will love in the boutique.
            </p>
            <Link to="/stores/pavone/shop" className="btn-primary mt-8">
              Shop Now
            </Link>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border border-y border-border">
              {items.map((item) => {
                const key = cartKey(item);
                return (
                  <li key={key} className="flex gap-4 py-6">
                    <Link
                      to="/stores/pavone/product/$slug"
                      params={{ slug: item.slug }}
                      className="block h-32 w-24 shrink-0 overflow-hidden bg-secondary"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to="/stores/pavone/product/$slug"
                            params={{ slug: item.slug }}
                            className="font-serif text-base hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {[item.size, item.color].filter(Boolean).join(" / ")}
                          </p>
                        </div>
                        <button
                          aria-label="Remove item"
                          onClick={() => removeItem(key)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center border border-border">
                          <button
                            aria-label="Decrease quantity"
                            className="px-2.5 py-2"
                            onClick={() => updateQuantity(key, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            aria-label="Increase quantity"
                            className="px-2.5 py-2"
                            onClick={() => updateQuantity(key, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-sm font-medium">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 flex flex-col items-end gap-4">
              <div className="flex w-full max-w-xs items-center justify-between border-b border-border pb-3">
                <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                  Subtotal
                </span>
                <span className="font-serif text-xl">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Delivery arranged after your order is confirmed.
              </p>
              <Link
                to="/stores/pavone/checkout"
                className="btn-primary w-full max-w-xs text-center"
              >
                Place Order
              </Link>
              <Link
                to="/stores/pavone/shop"
                className="text-xs tracking-[0.15em] uppercase underline underline-offset-4"
              >
                Continue Shopping
              </Link>
            </div>
          </>
        )}
      </div>
    </StoreLayout>
  );
}
