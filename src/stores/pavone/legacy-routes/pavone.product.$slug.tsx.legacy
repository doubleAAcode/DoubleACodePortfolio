import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/stores/pavone/context/CartContext";
import { ProductCard } from "@/stores/pavone/components/ProductCard";
import { ShoppingBag, Check, Truck, Sparkles } from "lucide-react";
import { PavoneShell } from "@/stores/pavone/PavoneShell";
import { PavoneDataState, usePavoneCatalog } from "@/stores/pavone/lib/use-pavone-data";

export const Route = createFileRoute("/stores/pavone/product/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${params.slug.replaceAll("-", " ")} - Pavone.lb` }],
    links: [{ rel: "canonical", href: `/stores/pavone/product/${params.slug}` }],
  }),
  component: PavoneProductRoute,
});

function PavoneProductRoute() {
  return (
    <PavoneShell>
      <ProductPage />
    </PavoneShell>
  );
}

function ProductPage() {
  const { slug } = Route.useParams();
  const { data, loading, error } = usePavoneCatalog();
  const product = data.products.find((p) => p.slug === slug);

  if (!loading && !error && !product) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="font-display text-4xl">Piece not found</h1>
        <Link to="/stores/pavone/shop" className="mt-6 inline-block underline">Back to shop</Link>
      </div>
    );
  }

  return (
    <PavoneDataState loading={loading} error={error} empty={!product}>
      {product && <ProductContent product={product} products={data.products} />}
    </PavoneDataState>
  );
}

function ProductContent({
  product,
  products,
}: {
  product: NonNullable<ReturnType<typeof usePavoneCatalog>["data"]["products"][number]>;
  products: ReturnType<typeof usePavoneCatalog>["data"]["products"];
}) {
  const { add, open } = useCart();
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  const price = product.salePrice ?? product.price;
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <div className="container-page py-8 md:py-12">
      <nav className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-6">
        <Link to="/stores/pavone" className="hover:text-cocoa">Home</Link> /{" "}
        <Link to="/stores/pavone/category/$slug" params={{ slug: product.category }} className="hover:text-cocoa">
          {product.category.replace("-", " ")}
        </Link>{" "}
        / <span className="text-cocoa">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
        <div className="grid grid-cols-[80px_1fr] gap-3 md:gap-4">
          <div className="flex flex-col gap-2 md:gap-3">
            {product.images.map((src, i) => (
              <button
                key={src}
                onClick={() => setActiveImg(i)}
                className={`aspect-[3/4] rounded-lg overflow-hidden bg-cream border-2 transition ${activeImg === i ? "border-cocoa" : "border-transparent"}`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-cream shadow-card group">
            <img src={product.images[activeImg] ?? product.images[0]} alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
            {product.badge && (
              <span className="absolute top-4 left-4 bg-background/90 backdrop-blur px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em]">
                {product.badge}
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe">{product.category.replace("-", " ")}</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl text-cocoa">{product.name}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl">${price}</span>
            {product.salePrice && <span className="text-base line-through text-muted-foreground">${product.price}</span>}
            <span className="ml-auto text-xs inline-flex items-center gap-1.5 text-emerald-700">
              <Check className="h-3.5 w-3.5" /> {product.inStock ? "In stock" : "Sold out"}
            </span>
          </div>
          <p className="mt-5 text-muted-foreground leading-relaxed">{product.description}</p>

          {product.pieces && (
            <div className="mt-6 rounded-2xl bg-cream p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The Set Includes</div>
              <ul className="mt-3 space-y-2">
                {product.pieces.map((piece) => (
                  <li key={piece.name} className="flex justify-between text-sm">
                    <span>{piece.name}</span>
                    <span className="text-muted-foreground">${piece.price}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm font-medium">
                <span>Complete Set Price</span>
                <span>${price}</span>
              </div>
            </div>
          )}

          <div className="mt-7">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Color: {color}</div>
            <div className="flex gap-2">
              {product.colors.map((c) => (
                <button key={c.name} onClick={() => setColor(c.name)} aria-label={c.name}
                  className={`h-9 w-9 rounded-full border-2 transition ${color === c.name ? "border-cocoa scale-110" : "border-border"}`}
                  style={{ backgroundColor: c.hex }} />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Size</div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button key={s} onClick={() => setSize(s)}
                  className={`min-w-12 px-4 py-2 rounded-full text-sm border transition ${size === s ? "bg-cocoa text-ivory border-cocoa" : "border-border hover:border-taupe"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="inline-flex items-center border border-border rounded-full">
              <button className="px-3 py-2" onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
              <span className="px-4 text-sm w-10 text-center">{qty}</span>
              <button className="px-3 py-2" onClick={() => setQty(qty + 1)}>+</button>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => {
                add({ productId: product.id, quantity: qty, size, color });
                open();
              }}
              disabled={!product.inStock}
              className="inline-flex w-full items-center justify-center gap-2 bg-cocoa text-ivory px-6 py-4 rounded-full text-sm tracking-[0.15em] uppercase hover:bg-cocoa/90 disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" /> Add to Bag
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground"><Truck className="h-4 w-4 text-taupe" /> Free shipping over $150</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4 text-taupe" /> Crafted with love in Lebanon</div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20 md:mt-28">
          <h2 className="font-display text-3xl md:text-4xl mb-8">You may also love</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
