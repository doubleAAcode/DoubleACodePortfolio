import { Link } from "@tanstack/react-router";
import { Instagram, Facebook } from "lucide-react";
import { LOGO_URL, STORE_NAME } from "@/stores/pavone-new/lib/brand";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <img src={LOGO_URL} alt={STORE_NAME} className="h-10 w-auto" loading="lazy" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Timeless women's fashion, curated with intention. Elegant pieces designed to be worn for
            years, not seasons.
          </p>
          <div className="mt-5 flex gap-4">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Instagram className="h-5 w-5" strokeWidth={1.5} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
              <Facebook className="h-5 w-5" strokeWidth={1.5} />
            </a>
          </div>
        </div>

        <div>
          <h3 className="eyebrow font-sans">Quick Links</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link to="/stores/pavone/shop" className="hover:underline">
                Shop All
              </Link>
            </li>
            <li>
              <Link
                to="/stores/pavone/shop"
                search={{ filter: "new" } as never}
                className="hover:underline"
              >
                New Arrivals
              </Link>
            </li>
            <li>
              <Link
                to="/stores/pavone/shop"
                search={{ filter: "best" } as never}
                className="hover:underline"
              >
                Best Sellers
              </Link>
            </li>
            <li>
              <Link to="/stores/pavone/cart" className="hover:underline">
                Shopping Bag
              </Link>
            </li>
            <li>
              <Link to="/stores/pavone/admin/login" className="hover:underline">
                Store Owner Login
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="eyebrow font-sans">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>hello@pavonebyray.com</li>
            <li>+1 (555) 010-2030</li>
            <li>Mon–Sat, 10am–7pm</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs tracking-[0.2em] text-muted-foreground uppercase">
        © {new Date().getFullYear()} {STORE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
