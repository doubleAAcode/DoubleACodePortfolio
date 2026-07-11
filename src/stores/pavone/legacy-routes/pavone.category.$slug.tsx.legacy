import { createFileRoute, Link } from "@tanstack/react-router";
import { ProductCard } from "@/stores/pavone/components/ProductCard";
import { PavoneShell } from "@/stores/pavone/PavoneShell";
import { PavoneDataState, usePavoneCatalog } from "@/stores/pavone/lib/use-pavone-data";

export const Route = createFileRoute("/stores/pavone/category/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${params.slug.replace("-", " ")} - Pavone.lb` }],
    links: [{ rel: "canonical", href: `/stores/pavone/category/${params.slug}` }],
  }),
  component: PavoneCategoryRoute,
});

function PavoneCategoryRoute() {
  return (
    <PavoneShell>
      <CategoryPage />
    </PavoneShell>
  );
}

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data, loading, error } = usePavoneCatalog();
  const category = data.categories.find((c) => c.slug === slug);
  const products = data.products.filter((p) => p.category === slug);

  if (!loading && !error && !category) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="font-display text-4xl">Category not found</h1>
        <Link to="/stores/pavone/shop" className="mt-6 inline-block underline">Browse all pieces</Link>
      </div>
    );
  }

  return (
    <PavoneDataState loading={loading} error={error} empty={!category}>
      {category && (
        <div>
          <div className="relative h-[40vh] min-h-[280px] overflow-hidden bg-sand">
            <img src={category.image} alt={category.name} className="h-full w-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-cocoa/60 to-cocoa/10" />
            <div className="absolute inset-0 flex items-end">
              <div className="container-page pb-10 text-ivory">
                <div className="text-xs uppercase tracking-[0.25em] text-blush">Collection</div>
                <h1 className="font-display text-5xl md:text-7xl mt-2">{category.name}</h1>
                <p className="mt-2 max-w-xl text-ivory/85">{category.description}</p>
              </div>
            </div>
          </div>
          <div className="container-page py-12 md:py-16">
            {products.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">No pieces yet in this collection.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-8">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </PavoneDataState>
  );
}
