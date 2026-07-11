import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { formatPrice } from "@/stores/pavone-new/lib/brand";
import { productImage, type Product } from "@/stores/pavone-new/lib/catalog";

interface Props {
  product: Product;
  wishlisted?: boolean;
  onToggleWishlist?: (id: string) => void;
}

export function ProductCard({ product, wishlisted, onToggleWishlist }: Props) {
  const onSale = product.sale_price != null && Number(product.sale_price) < Number(product.price);

  return (
    <div className="group relative">
      <Link to="/stores/pavone/product/$slug" params={{ slug: product.slug }} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
          <img
            src={productImage(product)}
            alt={product.name}
            loading="lazy"
            width={800}
            height={1000}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {onSale && (
            <span className="absolute left-3 top-3 bg-primary px-2.5 py-1 text-[0.625rem] tracking-[0.15em] text-primary-foreground uppercase">
              Sale
            </span>
          )}
          {product.is_new_arrival && !onSale && (
            <span className="absolute left-3 top-3 border border-primary bg-background px-2.5 py-1 text-[0.625rem] tracking-[0.15em] uppercase">
              New
            </span>
          )}
          {product.stock_quantity <= 0 && (
            <span className="absolute inset-x-0 bottom-0 bg-primary/80 py-2 text-center text-[0.65rem] tracking-[0.2em] text-primary-foreground uppercase">
              Sold Out
            </span>
          )}
        </div>
      </Link>

      {onToggleWishlist && (
        <button
          aria-label="Toggle wishlist"
          onClick={() => onToggleWishlist(product.id)}
          className="absolute right-3 top-3 rounded-full bg-background/80 p-2 backdrop-blur transition-colors hover:bg-background"
        >
          <Heart
            className={`h-4 w-4 ${wishlisted ? "fill-primary text-primary" : "text-foreground/70"}`}
            strokeWidth={1.5}
          />
        </button>
      )}

      <div className="mt-3 space-y-1">
        <p className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
          {product.brand?.name ?? product.category?.name ?? ""}
        </p>
        <Link
          to="/stores/pavone/product/$slug"
          params={{ slug: product.slug }}
          className="block font-serif text-base leading-snug hover:underline"
        >
          {product.name}
        </Link>
        <p className="text-sm">
          {onSale ? (
            <>
              <span className="font-medium">{formatPrice(product.sale_price!)}</span>{" "}
              <span className="text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            </>
          ) : (
            <span>{formatPrice(product.price)}</span>
          )}
        </p>
      </div>
    </div>
  );
}
