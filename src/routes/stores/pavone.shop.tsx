import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/stores/pavone-new/components/ProductCard";
import { StoreLayout } from "@/stores/pavone-new/components/StoreLayout";
import { CartProvider } from "@/stores/pavone-new/lib/cart";
import { useWishlist } from "@/stores/pavone-new/lib/wishlist";
import {
  catalogKeys,
  fetchBrands,
  fetchCategories,
  fetchProducts,
} from "@/stores/pavone-new/lib/catalog";

interface ShopSearch {
  category?: string;
  filter?: string;
}

type SortKey = "newest" | "price-asc" | "price-desc" | "best";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  best: "Best Sellers",
};

export const Route = createFileRoute("/stores/pavone/shop")({
  component: PavoneShopRoute,
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    category: typeof search.category === "string" ? search.category : undefined,
    filter: typeof search.filter === "string" ? search.filter : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop All - PAVONE BY RAY" },
      {
        name: "description",
        content:
          "Browse the full PAVONE BY RAY collection. Filter by category, brand, size, color and price.",
      },
      { property: "og:url", content: "/stores/pavone/shop" },
    ],
    links: [{ rel: "canonical", href: "/stores/pavone/shop" }],
  }),
});

function effectivePrice(product: { price: number; sale_price: number | null }) {
  return product.sale_price != null ? Number(product.sale_price) : Number(product.price);
}

function PavoneShopRoute() {
  return (
    <div className="pavone-new-store min-h-screen bg-background text-foreground">
      <CartProvider>
        <ShopPage />
      </CartProvider>
    </div>
  );
}

function ShopPage() {
  const { category: initialCategory, filter } = Route.useSearch();
  const { data: products = [], isLoading } = useQuery({
    queryKey: catalogKeys.products,
    queryFn: () => fetchProducts(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () => fetchCategories(),
  });
  const { data: brands = [] } = useQuery({
    queryKey: catalogKeys.brands,
    queryFn: () => fetchBrands(),
  });
  const wishlist = useWishlist();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortKey>(filter === "best" ? "best" : "newest");
  const [onlyNew] = useState(filter === "new");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allSizes = useMemo(
    () => Array.from(new Set(products.flatMap((product) => product.sizes))).sort(),
    [products],
  );
  const allColors = useMemo(
    () => Array.from(new Set(products.flatMap((product) => product.colors))).sort(),
    [products],
  );

  const filtered = useMemo(() => {
    let list = [...products];
    if (onlyNew) list = list.filter((product) => product.is_new_arrival);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (product) =>
          product.name.toLowerCase().includes(q) ||
          (product.description ?? "").toLowerCase().includes(q),
      );
    }
    if (category) list = list.filter((product) => product.category?.slug === category);
    if (brand) list = list.filter((product) => product.brand?.slug === brand);
    if (size) list = list.filter((product) => product.sizes.includes(size));
    if (color) list = list.filter((product) => product.colors.includes(color));
    if (maxPrice) list = list.filter((product) => effectivePrice(product) <= Number(maxPrice));

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        break;
      case "price-desc":
        list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        break;
      case "best":
        list.sort((a, b) => Number(b.is_best_seller) - Number(a.is_best_seller));
        break;
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [products, search, category, brand, size, color, maxPrice, sort, onlyNew]);

  const activeFilters = [category, brand, size, color, maxPrice].filter(Boolean).length;

  const filterControls = (
    <div className="space-y-6">
      <div>
        <label className="label-elegant">Category</label>
        <select
          className="input-elegant"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label-elegant">Brand</label>
        <select
          className="input-elegant"
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
        >
          <option value="">All Brands</option>
          {brands.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label-elegant">Size</label>
        <div className="flex flex-wrap gap-2">
          {allSizes.map((item) => (
            <button
              key={item}
              onClick={() => setSize(size === item ? "" : item)}
              className={`border px-3 py-1.5 text-xs tracking-wider transition-colors ${
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
      <div>
        <label className="label-elegant">Color</label>
        <select
          className="input-elegant"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        >
          <option value="">All Colors</option>
          {allColors.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label-elegant">Max Price</label>
        <select
          className="input-elegant"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
        >
          <option value="">Any Price</option>
          <option value="100">Under $100</option>
          <option value="150">Under $150</option>
          <option value="200">Under $200</option>
          <option value="300">Under $300</option>
        </select>
      </div>
      {activeFilters > 0 && (
        <button
          onClick={() => {
            setCategory("");
            setBrand("");
            setSize("");
            setColor("");
            setMaxPrice("");
          }}
          className="text-xs tracking-[0.15em] uppercase underline underline-offset-4"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 text-center">
          <p className="eyebrow">The Collection</p>
          <h1 className="mt-3 font-serif text-3xl sm:text-4xl">
            {onlyNew ? "New Arrivals" : sort === "best" ? "Best Sellers" : "Shop All"}
          </h1>
        </div>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input-elegant sm:max-w-xs"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 border border-border px-4 py-2.5 text-xs tracking-[0.15em] uppercase lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
              Filters {activeFilters > 0 ? `(${activeFilters})` : ""}
            </button>
            <select
              className="input-elegant !w-auto"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Sort products"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">{filterControls}</aside>

          <div>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="aspect-[4/5] animate-pulse bg-secondary" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-24 text-center">
                <p className="font-serif text-2xl">No pieces found</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try adjusting your filters or search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    wishlisted={wishlist.has(product.id)}
                    onToggleWishlist={wishlist.toggle}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-background p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-serif text-xl">Filters</h2>
              <button aria-label="Close filters" onClick={() => setFiltersOpen(false)}>
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            {filterControls}
            <button className="btn-primary mt-8 w-full" onClick={() => setFiltersOpen(false)}>
              Show {filtered.length} Results
            </button>
          </div>
        </div>
      )}
    </StoreLayout>
  );
}
