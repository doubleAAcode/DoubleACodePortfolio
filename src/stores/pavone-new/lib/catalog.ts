import { uploadPavoneImage, supabaseRest } from "@/stores/pavone/lib/supabase";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  brand_id: string | null;
  price: number;
  sale_price: number | null;
  sizes: string[];
  colors: string[];
  stock_quantity: number;
  sku: string | null;
  is_featured: boolean;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  is_active: boolean;
  created_at: string;
  product_images: ProductImage[];
  category: Pick<Category, "id" | "name" | "slug"> | null;
  brand: Pick<Brand, "id" | "name" | "slug"> | null;
}

export type OrderStatus = "new" | "confirmed" | "preparing" | "completed" | "cancelled";

export interface PavoneNewOrderItem {
  id?: string;
  product_id: string | null;
  product_name: string;
  product_slug?: string | null;
  product_image?: string | null;
  price: number;
  quantity: number;
  size: string | null;
  color: string | null;
}

export interface PavoneNewOrder {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  whatsapp: string | null;
  address: string;
  notes: string | null;
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  order_items: PavoneNewOrderItem[];
}

export interface PavoneNewSettings {
  id: "home";
  hero_image_url: string | null;
  editorial_image_url: string | null;
  about_image_url: string | null;
  lookbook_image_urls: string[];
  hero_eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  instagram_url: string | null;
  updated_at?: string;
}

type ProductRow = Omit<
  Product,
  "price" | "sale_price" | "product_images" | "category" | "brand"
> & {
  price: string | number;
  sale_price: string | number | null;
};

type ProductImageRow = Omit<ProductImage, "sort_order"> & {
  sort_order: number | string;
};

type OrderRow = Omit<PavoneNewOrder, "total" | "order_items"> & {
  total: string | number;
};

type OrderItemRow = Omit<PavoneNewOrderItem, "price"> & {
  price: string | number;
  order_id: string;
};

const ASSET_BASE = "/images/pavone-new";

export const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "preparing",
  "completed",
  "cancelled",
];

export const catalogKeys = {
  categories: ["pavone-new", "categories"] as const,
  brands: ["pavone-new", "brands"] as const,
  products: ["pavone-new", "products"] as const,
  product: (slug: string) => ["pavone-new", "product", slug] as const,
  orders: ["pavone-new", "orders"] as const,
  settings: ["pavone-new", "settings"] as const,
};

export function pavoneNewImage(name: string) {
  return `${ASSET_BASE}/${name}`;
}

export function productImage(product: Product): string {
  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return images[0]?.image_url ?? pavoneNewImage("hero.jpg");
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function fetchCategories(includeInactive = false): Promise<Category[]> {
  const active = includeInactive ? "" : "&is_active=eq.true";
  return supabaseRest<Category[]>(
    `/pavone_new_categories?select=*&order=sort_order.asc,name.asc${active}`,
  );
}

export async function fetchBrands(includeInactive = false): Promise<Brand[]> {
  const active = includeInactive ? "" : "&is_active=eq.true";
  return supabaseRest<Brand[]>(`/pavone_new_brands?select=*&order=name.asc${active}`);
}

export async function fetchProducts(includeInactive = false): Promise<Product[]> {
  const active = includeInactive ? "" : "&is_active=eq.true";
  const [productRows, images, categories, brands] = await Promise.all([
    supabaseRest<ProductRow[]>(`/pavone_new_products?select=*&order=created_at.desc${active}`),
    supabaseRest<ProductImageRow[]>("/pavone_new_product_images?select=*&order=sort_order.asc"),
    fetchCategories(true),
    fetchBrands(true),
  ]);
  return productRows.map((row) => toProduct(row, images, categories, brands));
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const encoded = encodeURIComponent(slug);
  const [productRows, images, categories, brands] = await Promise.all([
    supabaseRest<ProductRow[]>(`/pavone_new_products?select=*&slug=eq.${encoded}&limit=1`),
    supabaseRest<ProductImageRow[]>("/pavone_new_product_images?select=*&order=sort_order.asc"),
    fetchCategories(true),
    fetchBrands(true),
  ]);
  return productRows[0] ? toProduct(productRows[0], images, categories, brands) : null;
}

export async function fetchOrders(): Promise<PavoneNewOrder[]> {
  const [orders, items] = await Promise.all([
    supabaseRest<OrderRow[]>("/pavone_new_orders?select=*&order=created_at.desc"),
    supabaseRest<OrderItemRow[]>("/pavone_new_order_items?select=*&order=created_at.asc"),
  ]);
  return orders.map((order) => ({
    ...order,
    total: Number(order.total),
    order_items: items
      .filter((item) => item.order_id === order.id)
      .map(({ order_id: _orderId, ...item }) => ({
        ...item,
        price: Number(item.price),
      })),
  }));
}

export async function createOrder(input: {
  customer_name: string;
  phone: string;
  whatsapp?: string | null;
  address: string;
  notes?: string | null;
  total: number;
  items: PavoneNewOrderItem[];
}) {
  const [order] = await supabaseRest<OrderRow[]>("/pavone_new_orders", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      customer_name: input.customer_name,
      phone: input.phone,
      whatsapp: input.whatsapp || null,
      address: input.address,
      notes: input.notes || null,
      total: input.total,
      status: "new",
    }),
  });

  await supabaseRest("/pavone_new_order_items", {
    method: "POST",
    body: JSON.stringify(
      input.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_slug: item.product_slug ?? null,
        product_image: item.product_image ?? null,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
    ),
  });

  return order;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await supabaseRest(`/pavone_new_orders?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ status }),
  });
}

export async function upsertCategory(category: Partial<Category> & Pick<Category, "name">) {
  const body = {
    ...(category.id ? { id: category.id } : {}),
    name: category.name.trim(),
    slug: category.slug || slugify(category.name),
    description: category.description || null,
    image_url: category.image_url || null,
    is_active: category.is_active ?? true,
    is_featured: category.is_featured ?? false,
    sort_order: category.sort_order ?? 0,
  };
  await supabaseRest("/pavone_new_categories?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(body),
  });
}

export async function deleteCategory(id: string) {
  await supabaseRest(`/pavone_new_categories?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function upsertBrand(brand: Partial<Brand> & Pick<Brand, "name">) {
  const body = {
    ...(brand.id ? { id: brand.id } : {}),
    name: brand.name.trim(),
    slug: brand.slug || slugify(brand.name),
    description: brand.description || null,
    logo_url: brand.logo_url || null,
    is_active: brand.is_active ?? true,
  };
  await supabaseRest("/pavone_new_brands?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(body),
  });
}

export async function deleteBrand(id: string) {
  await supabaseRest(`/pavone_new_brands?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function upsertProduct(
  product: Partial<Product> &
    Pick<Product, "name" | "price" | "sizes" | "colors" | "stock_quantity"> & {
      images: string[];
    },
) {
  const id = product.id || crypto.randomUUID();
  const body = {
    id,
    name: product.name.trim(),
    slug: product.slug || slugify(product.name),
    description: product.description || null,
    category_id: product.category_id || null,
    brand_id: product.brand_id || null,
    price: product.price,
    sale_price: product.sale_price || null,
    sizes: product.sizes,
    colors: product.colors,
    stock_quantity: product.stock_quantity,
    sku: product.sku || null,
    is_featured: product.is_featured ?? false,
    is_best_seller: product.is_best_seller ?? false,
    is_new_arrival: product.is_new_arrival ?? false,
    is_active: product.is_active ?? true,
  };

  await supabaseRest("/pavone_new_products?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(body),
  });

  await supabaseRest(`/pavone_new_product_images?product_id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (product.images.length > 0) {
    await supabaseRest("/pavone_new_product_images", {
      method: "POST",
      body: JSON.stringify(
        product.images.map((image_url, sort_order) => ({
          product_id: id,
          image_url,
          sort_order,
        })),
      ),
    });
  }
}

export async function deleteProduct(id: string) {
  await supabaseRest(`/pavone_new_products?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function uploadBoutiqueImage(file: File, folder: "products" | "categories" | "hero") {
  return uploadPavoneImage(file, folder);
}

export async function getSettings(): Promise<PavoneNewSettings> {
  const rows = await supabaseRest<PavoneNewSettings[]>(
    "/pavone_new_settings?select=*&id=eq.home&limit=1",
  );
  return rows[0] ?? defaultSettings;
}

export async function updateSettings(settings: PavoneNewSettings) {
  await supabaseRest("/pavone_new_settings?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify({
      ...settings,
      lookbook_image_urls: normalizeLookbookImages(settings.lookbook_image_urls),
    }),
  });
}

export function defaultLookbookImages() {
  return ["look-1.jpg", "look-2.jpg", "look-3.jpg", "look-4.jpg"].map(pavoneNewImage);
}

export function normalizeLookbookImages(images: string[] | null | undefined) {
  const values = images?.map((image) => image.trim()).filter(Boolean) ?? [];
  return values.length > 0 ? values : defaultLookbookImages();
}

function toProduct(
  row: ProductRow,
  images: ProductImageRow[],
  categories: Category[],
  brands: Brand[],
): Product {
  const category = categories.find((item) => item.id === row.category_id) ?? null;
  const brand = brands.find((item) => item.id === row.brand_id) ?? null;
  return {
    ...row,
    price: Number(row.price),
    sale_price: row.sale_price == null ? null : Number(row.sale_price),
    product_images: images
      .filter((image) => image.product_id === row.id)
      .map((image) => ({ ...image, sort_order: Number(image.sort_order) })),
    category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
    brand: brand ? { id: brand.id, name: brand.name, slug: brand.slug } : null,
  };
}

const defaultSettings: PavoneNewSettings = {
  id: "home",
  hero_image_url: null,
  editorial_image_url: null,
  about_image_url: null,
  lookbook_image_urls: defaultLookbookImages(),
  hero_eyebrow: "The New Collection",
  hero_title: "Elegance, Worn Daily",
  hero_subtitle:
    "Considered silhouettes and timeless fabrics, designed for the woman who dresses with intention.",
  instagram_url: "https://instagram.com",
};
