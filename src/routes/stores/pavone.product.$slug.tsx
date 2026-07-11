import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "@/stores/pavone-new/components/ProductCard";
import { StoreLayout } from "@/stores/pavone-new/components/StoreLayout";
import { formatPrice } from "@/stores/pavone-new/lib/brand";
import { CartProvider, useCart } from "@/stores/pavone-new/lib/cart";
import { useWishlist } from "@/stores/pavone-new/lib/wishlist";
import {
  catalogKeys,
  fetchProductBySlug,
  fetchProducts,
  pavoneNewImage,
  productImage,
} from "@/stores/pavone-new/lib/catalog";

export const Route = createFileRoute("/stores/pavone/product/$slug")({
  component: PavoneProductRoute,
  head: ({ params }) => ({
    meta: [
      { title: `${slugToTitle(params.slug)} - PAVONE BY RAY` },
      {
        name: "description",
        content: `Shop ${slugToTitle(params.slug)} at PAVONE BY RAY.`,
      },
      { property: "og:type", content: "product" },
      { property: "og:url", content: `/stores/pavone/product/${params.slug}` },
    ],
    links: [{ rel: "canonical", href: `/stores/pavone/product/${params.slug}` }],
  }),
  errorComponent: () => (
    <div className="pavone-new-store min-h-screen bg-background text-foreground">
      <CartProvider>
        <StoreLayout>
          <div className="py-32 text-center">
            <p className="font-serif text-2xl">Something went wrong loading this piece.</p>
            <Link to="/stores/pavone/shop" className="btn-outline mt-6">
              Back to Shop
            </Link>
          </div>
        </StoreLayout>
      </CartProvider>
    </div>
  ),
});

function slugToTitle(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function PavoneProductRoute() {
  return (
    <div className="pavone-new-store min-h-screen bg-background text-foreground">
      <CartProvider>
        <ProductPage />
      </CartProvider>
    </div>
  );
}

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product, isLoading } = useQuery({
    queryKey: catalogKeys.product(slug),
    queryFn: () => fetchProductBySlug(slug),
  });
  const { data: products = [] } = useQuery({
    queryKey: catalogKeys.products,
    queryFn: () => fetchProducts(),
  });
  const { addItem } = useCart();
  const wishlist = useWishlist();

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div className="aspect-[4/5] animate-pulse bg-secondary" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse bg-secondary" />
            <div className="h-5 w-1/4 animate-pulse bg-secondary" />
            <div className="h-24 animate-pulse bg-secondary" />
          </div>
        </div>
      </StoreLayout>
    );
  }

  if (!product || !product.is_active) {
    return (
      <StoreLayout>
        <div className="py-32 text-center">
          <p className="font-serif text-2xl">This piece is no longer available.</p>
          <Link to="/stores/pavone/shop" className="btn-outline mt-6">
            Back to Shop
          </Link>
        </div>
      </StoreLayout>
    );
  }

  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const gallery =
    images.length > 0 ? images.map((image) => image.image_url) : [pavoneNewImage("hero.jpg")];
  const onSale = product.sale_price != null && Number(product.sale_price) < Number(product.price);
  const price = onSale ? Number(product.sale_price) : Number(product.price);
  const inStock = product.stock_quantity > 0;
  const related = products
    .filter((item) => item.id !== product.id && item.category_id === product.category_id)
    .slice(0, 4);

  const needsSize = product.sizes.length > 0 && !size;
  const needsColor = product.colors.length > 0 && !color;

  const handleAdd = () => {
    if (needsSize) {
      toast("Please select a size");
      return;
    }
    if (needsColor) {
      toast("Please select a color");
      return;
    }
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price,
        image: productImage(product),
        size,
        color,
      },
      quantity,
    );
    toast.success("Added to your bag", { description: product.name });
  };

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 text-xs tracking-[0.15em] uppercase text-muted-foreground">
          <Link to="/stores/pavone" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link to="/stores/pavone/shop" className="hover:text-foreground">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="aspect-[4/5] overflow-hidden bg-secondary">
              <img
                src={gallery[activeImage]}
                alt={product.name}
                width={800}
                height={1000}
                className="h-full w-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-3">
                {gallery.map((src, index) => (
                  <button
                    key={src + index}
                    onClick={() => setActiveImage(index)}
                    className={`h-20 w-16 overflow-hidden border ${
                      index === activeImage ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="eyebrow">
              {product.brand?.name}
              {product.brand && product.category ? " / " : ""}
              {product.category?.name}
            </p>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl">{product.name}</h1>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-xl">{formatPrice(price)}</span>
              {onSale && (
                <span className="text-muted-foreground line-through">
                  {formatPrice(product.price)}
                </span>
              )}
              {onSale && (
                <span className="bg-primary px-2 py-0.5 text-[0.625rem] tracking-[0.15em] text-primary-foreground uppercase">
                  Sale
                </span>
              )}
            </div>

            <p className="mt-2 text-xs tracking-[0.15em] uppercase">
              {inStock ? (
                product.stock_quantity <= 5 ? (
                  <span className="text-destructive">
                    Low stock - only {product.stock_quantity} left
                  </span>
                ) : (
                  <span className="text-muted-foreground">In stock</span>
                )
              ) : (
                <span className="text-destructive">Sold out</span>
              )}
            </p>

            {product.description && (
              <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            {product.sizes.length > 0 && (
              <div className="mt-8">
                <label className="label-elegant">Size</label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((item) => (
                    <button
                      key={item}
                      onClick={() => setSize(item)}
                      className={`min-w-12 border px-3 py-2 text-xs tracking-wider transition-colors ${
                        size === item
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.colors.length > 0 && (
              <div className="mt-6">
                <label className="label-elegant">Color</label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((item) => (
                    <button
                      key={item}
                      onClick={() => setColor(item)}
                      className={`border px-4 py-2 text-xs tracking-wider transition-colors ${
                        color === item
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex items-center border border-border">
                <button
                  aria-label="Decrease quantity"
                  className="px-3 py-3"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-sm">{quantity}</span>
                <button
                  aria-label="Increase quantity"
                  className="px-3 py-3"
                  onClick={() => setQuantity((current) => current + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                className="btn-primary flex-1 sm:flex-none"
                onClick={handleAdd}
                disabled={!inStock}
              >
                {inStock ? "Add to Bag" : "Sold Out"}
              </button>

              <button
                aria-label="Toggle wishlist"
                onClick={() => wishlist.toggle(product.id)}
                className="border border-border p-3.5 transition-colors hover:border-primary"
              >
                <Heart
                  className={`h-4 w-4 ${wishlist.has(product.id) ? "fill-primary text-primary" : ""}`}
                  strokeWidth={1.5}
                />
              </button>
            </div>

            {product.sku && (
              <p className="mt-8 text-xs text-muted-foreground">SKU: {product.sku}</p>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20 border-t border-border pt-14">
            <h2 className="mb-8 text-center font-serif text-2xl sm:text-3xl">You May Also Love</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  wishlisted={wishlist.has(item.id)}
                  onToggleWishlist={wishlist.toggle}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </StoreLayout>
  );
}
