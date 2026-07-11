import { Link } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { LOGO_URL, STORE_NAME } from "@/stores/pavone-new/lib/brand";
import { useCart } from "@/stores/pavone-new/lib/cart";

const NAV = [
  { label: "Home", to: "/stores/pavone" },
  { label: "Shop", to: "/stores/pavone/shop" },
  { label: "New In", to: "/stores/pavone/shop", search: { filter: "new" } },
  { label: "Best Sellers", to: "/stores/pavone/shop", search: { filter: "best" } },
];

export function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-6 lg:grid-cols-3">
        <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              search={n.search as never}
              className="text-[0.75rem] tracking-[0.2em] uppercase text-foreground/80 transition-colors hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <Link to="/stores/pavone" className="flex justify-center" aria-label={STORE_NAME}>
          <img src={LOGO_URL} alt={STORE_NAME} className="h-9 w-auto object-contain sm:h-11" />
        </Link>

        <div className="flex items-center justify-end gap-4 sm:gap-5">
          <Link to="/stores/pavone/shop" aria-label="Search products" className="hidden sm:block">
            <Search className="h-5 w-5" strokeWidth={1.5} />
          </Link>
          <Link to="/stores/pavone/shop" aria-label="Wishlist" className="hidden sm:block">
            <Heart className="h-5 w-5" strokeWidth={1.5} />
          </Link>
          <Link to="/stores/pavone/cart" aria-label="Cart" className="relative">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[0.6rem] text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-background lg:hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <img src={LOGO_URL} alt={STORE_NAME} className="h-8 w-auto" />
            <button aria-label="Close menu" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-4 py-6">
            {NAV.map((n) => (
              <Link
                key={n.label}
                to={n.to}
                search={n.search as never}
                onClick={() => setOpen(false)}
                className="border-b border-border/60 py-4 font-serif text-2xl"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/stores/pavone/cart"
              onClick={() => setOpen(false)}
              className="border-b border-border/60 py-4 font-serif text-2xl"
            >
              Cart {count > 0 ? `(${count})` : ""}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
