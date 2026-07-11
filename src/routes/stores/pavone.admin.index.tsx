import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, Layers, Package, Plus, Tags } from "lucide-react";
import { formatPrice } from "@/stores/pavone-new/lib/brand";
import {
  catalogKeys,
  fetchBrands,
  fetchCategories,
  fetchOrders,
  fetchProducts,
  type OrderStatus,
} from "@/stores/pavone-new/lib/catalog";

export const Route = createFileRoute("/stores/pavone/admin/")({
  component: AdminDashboard,
  head: () => ({
    meta: [{ title: "Admin Dashboard - PAVONE BY RAY" }, { name: "robots", content: "noindex" }],
  }),
});

const STATUS_STYLES: Record<OrderStatus, string> = {
  new: "bg-primary text-primary-foreground",
  confirmed: "bg-accent text-accent-foreground",
  preparing: "border border-border bg-secondary text-secondary-foreground",
  completed: "border border-border bg-secondary text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

function AdminDashboard() {
  const { data: products = [] } = useQuery({
    queryKey: catalogKeys.products,
    queryFn: () => fetchProducts(true),
  });
  const { data: categories = [] } = useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () => fetchCategories(true),
  });
  const { data: brands = [] } = useQuery({
    queryKey: catalogKeys.brands,
    queryFn: () => fetchBrands(true),
  });
  const { data: orders = [] } = useQuery({
    queryKey: catalogKeys.orders,
    queryFn: fetchOrders,
  });

  const lowStock = products.filter((product) => product.is_active && product.stock_quantity <= 5);
  const recentOrders = orders.slice(0, 6);
  const stats = [
    {
      label: "Products",
      value: products.length,
      icon: Package,
      to: "/stores/pavone/admin/products",
    },
    {
      label: "Categories",
      value: categories.length,
      icon: Layers,
      to: "/stores/pavone/admin/categories",
    },
    { label: "Brands", value: brands.length, icon: Tags, to: "/stores/pavone/admin/brands" },
    {
      label: "Orders",
      value: orders.length,
      icon: ClipboardList,
      to: "/stores/pavone/admin/orders",
    },
  ] as const;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="border border-border bg-background p-5 transition-shadow hover:shadow-sm"
          >
            <stat.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-3 font-serif text-3xl">{stat.value}</p>
            <p className="mt-1 text-xs tracking-[0.15em] text-muted-foreground uppercase">
              {stat.label}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/stores/pavone/admin/products" className="btn-primary !px-5 !py-2.5 text-xs">
          <Plus className="h-4 w-4" /> Add Product
        </Link>
        <Link to="/stores/pavone/admin/categories" className="btn-outline !px-5 !py-2.5 text-xs">
          <Plus className="h-4 w-4" /> Add Category
        </Link>
        <Link to="/stores/pavone/admin/brands" className="btn-outline !px-5 !py-2.5 text-xs">
          <Plus className="h-4 w-4" /> Add Brand
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border border-border bg-background">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-serif text-lg">Recent Orders</h2>
            <Link
              to="/stores/pavone/admin/orders"
              className="text-xs tracking-[0.15em] uppercase underline underline-offset-4"
            >
              View All
            </Link>
          </header>
          {recentOrders.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()} / {order.order_items.length}{" "}
                      item(s)
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`px-2 py-0.5 text-[0.625rem] tracking-[0.12em] uppercase ${
                        STATUS_STYLES[order.status]
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="text-sm">{formatPrice(order.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-border bg-background">
          <header className="flex items-center gap-2 border-b border-border px-5 py-4">
            <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
            <h2 className="font-serif text-lg">Low Stock (5 or less)</h2>
          </header>
          {lowStock.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              All active products are well stocked.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {lowStock.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <p className="min-w-0 truncate text-sm">{product.name}</p>
                  <span className="shrink-0 text-sm text-destructive">
                    {product.stock_quantity} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
