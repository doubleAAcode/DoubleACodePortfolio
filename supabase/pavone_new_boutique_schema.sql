create extension if not exists "pgcrypto";

create sequence if not exists public.pavone_new_order_number_seq start 1001;

create table if not exists public.pavone_new_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pavone_new_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pavone_new_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.pavone_new_categories(id) on delete set null,
  brand_id uuid references public.pavone_new_brands(id) on delete set null,
  price numeric(10,2) not null check (price >= 0),
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  sku text,
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  is_new_arrival boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pavone_new_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.pavone_new_products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pavone_new_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('PVR-' || nextval('public.pavone_new_order_number_seq'::regclass)),
  customer_name text not null,
  phone text not null,
  whatsapp text,
  address text not null,
  notes text,
  total numeric(10,2) not null default 0 check (total >= 0),
  status text not null default 'new' check (status in ('new', 'confirmed', 'preparing', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pavone_new_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.pavone_new_orders(id) on delete cascade,
  product_id uuid references public.pavone_new_products(id) on delete set null,
  product_name text not null,
  product_slug text,
  product_image text,
  price numeric(10,2) not null check (price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  size text,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.pavone_new_settings (
  id text primary key default 'home',
  hero_image_url text,
  editorial_image_url text,
  about_image_url text,
  lookbook_image_urls text[] not null default array[
    '/images/pavone-new/look-1.jpg',
    '/images/pavone-new/look-2.jpg',
    '/images/pavone-new/look-3.jpg',
    '/images/pavone-new/look-4.jpg'
  ],
  hero_eyebrow text not null default 'The New Collection',
  hero_title text not null default 'Elegance, Worn Daily',
  hero_subtitle text not null default 'Considered silhouettes and timeless fabrics, designed for the woman who dresses with intention.',
  instagram_url text default 'https://instagram.com',
  updated_at timestamptz not null default now(),
  constraint pavone_new_settings_singleton check (id = 'home')
);

alter table public.pavone_new_settings
add column if not exists lookbook_image_urls text[] not null default array[
  '/images/pavone-new/look-1.jpg',
  '/images/pavone-new/look-2.jpg',
  '/images/pavone-new/look-3.jpg',
  '/images/pavone-new/look-4.jpg'
];

create or replace function public.pavone_new_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pavone_new_categories_updated_at on public.pavone_new_categories;
create trigger pavone_new_categories_updated_at
before update on public.pavone_new_categories
for each row execute function public.pavone_new_set_updated_at();

drop trigger if exists pavone_new_brands_updated_at on public.pavone_new_brands;
create trigger pavone_new_brands_updated_at
before update on public.pavone_new_brands
for each row execute function public.pavone_new_set_updated_at();

drop trigger if exists pavone_new_products_updated_at on public.pavone_new_products;
create trigger pavone_new_products_updated_at
before update on public.pavone_new_products
for each row execute function public.pavone_new_set_updated_at();

drop trigger if exists pavone_new_orders_updated_at on public.pavone_new_orders;
create trigger pavone_new_orders_updated_at
before update on public.pavone_new_orders
for each row execute function public.pavone_new_set_updated_at();

drop trigger if exists pavone_new_settings_updated_at on public.pavone_new_settings;
create trigger pavone_new_settings_updated_at
before update on public.pavone_new_settings
for each row execute function public.pavone_new_set_updated_at();

alter table public.pavone_new_categories enable row level security;
alter table public.pavone_new_brands enable row level security;
alter table public.pavone_new_products enable row level security;
alter table public.pavone_new_product_images enable row level security;
alter table public.pavone_new_orders enable row level security;
alter table public.pavone_new_order_items enable row level security;
alter table public.pavone_new_settings enable row level security;

drop policy if exists "pavone new public category read" on public.pavone_new_categories;
create policy "pavone new public category read" on public.pavone_new_categories
for select to anon, authenticated using (is_active = true or auth.role() = 'authenticated');

drop policy if exists "pavone new admin category write" on public.pavone_new_categories;
create policy "pavone new admin category write" on public.pavone_new_categories
for all to authenticated using (true) with check (true);

drop policy if exists "pavone new public brand read" on public.pavone_new_brands;
create policy "pavone new public brand read" on public.pavone_new_brands
for select to anon, authenticated using (is_active = true or auth.role() = 'authenticated');

drop policy if exists "pavone new admin brand write" on public.pavone_new_brands;
create policy "pavone new admin brand write" on public.pavone_new_brands
for all to authenticated using (true) with check (true);

drop policy if exists "pavone new public product read" on public.pavone_new_products;
create policy "pavone new public product read" on public.pavone_new_products
for select to anon, authenticated using (is_active = true or auth.role() = 'authenticated');

drop policy if exists "pavone new admin product write" on public.pavone_new_products;
create policy "pavone new admin product write" on public.pavone_new_products
for all to authenticated using (true) with check (true);

drop policy if exists "pavone new public product image read" on public.pavone_new_product_images;
create policy "pavone new public product image read" on public.pavone_new_product_images
for select to anon, authenticated using (true);

drop policy if exists "pavone new admin product image write" on public.pavone_new_product_images;
create policy "pavone new admin product image write" on public.pavone_new_product_images
for all to authenticated using (true) with check (true);

drop policy if exists "pavone new public order insert" on public.pavone_new_orders;
create policy "pavone new public order insert" on public.pavone_new_orders
for insert to anon, authenticated with check (true);

drop policy if exists "pavone new admin order read" on public.pavone_new_orders;
create policy "pavone new admin order read" on public.pavone_new_orders
for select to authenticated using (true);

drop policy if exists "pavone new admin order update" on public.pavone_new_orders;
create policy "pavone new admin order update" on public.pavone_new_orders
for update to authenticated using (true) with check (true);

drop policy if exists "pavone new public order item insert" on public.pavone_new_order_items;
create policy "pavone new public order item insert" on public.pavone_new_order_items
for insert to anon, authenticated with check (true);

drop policy if exists "pavone new admin order item read" on public.pavone_new_order_items;
create policy "pavone new admin order item read" on public.pavone_new_order_items
for select to authenticated using (true);

drop policy if exists "pavone new public settings read" on public.pavone_new_settings;
create policy "pavone new public settings read" on public.pavone_new_settings
for select to anon, authenticated using (true);

drop policy if exists "pavone new admin settings write" on public.pavone_new_settings;
create policy "pavone new admin settings write" on public.pavone_new_settings
for all to authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant usage, select on sequence public.pavone_new_order_number_seq to anon, authenticated;
grant select on public.pavone_new_categories to anon, authenticated;
grant select on public.pavone_new_brands to anon, authenticated;
grant select on public.pavone_new_products to anon, authenticated;
grant select on public.pavone_new_product_images to anon, authenticated;
grant select on public.pavone_new_settings to anon, authenticated;
grant insert on public.pavone_new_orders to anon, authenticated;
grant insert on public.pavone_new_order_items to anon, authenticated;
grant select, insert, update, delete on public.pavone_new_categories to authenticated;
grant select, insert, update, delete on public.pavone_new_brands to authenticated;
grant select, insert, update, delete on public.pavone_new_products to authenticated;
grant select, insert, update, delete on public.pavone_new_product_images to authenticated;
grant select, update on public.pavone_new_orders to authenticated;
grant select on public.pavone_new_order_items to authenticated;
grant select, insert, update, delete on public.pavone_new_settings to authenticated;

insert into public.pavone_new_settings (
  id,
  hero_image_url,
  editorial_image_url,
  about_image_url
) values (
  'home',
  '/images/pavone-new/hero.jpg',
  '/images/pavone-new/editorial.jpg',
  '/images/pavone-new/about.jpg'
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('pavone-images', 'pavone-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public pavone image read" on storage.objects;
create policy "public pavone image read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'pavone-images');

drop policy if exists "admin pavone image upload" on storage.objects;
create policy "admin pavone image upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'pavone-images');

drop policy if exists "admin pavone image update" on storage.objects;
create policy "admin pavone image update" on storage.objects
for update to authenticated
using (bucket_id = 'pavone-images')
with check (bucket_id = 'pavone-images');

drop policy if exists "admin pavone image delete" on storage.objects;
create policy "admin pavone image delete" on storage.objects
for delete to authenticated
using (bucket_id = 'pavone-images');

with seed_categories(name, slug, description, image_url, is_featured, sort_order) as (
  values
    ('Dresses', 'dresses', 'Elegant dresses for every occasion', '/images/pavone-new/cat-dresses.jpg', true, 1),
    ('Tops', 'tops', 'Blouses, shirts and knitwear', '/images/pavone-new/cat-tops.jpg', true, 2),
    ('Outerwear', 'outerwear', 'Coats, blazers and jackets', '/images/pavone-new/cat-outerwear.jpg', true, 3),
    ('Bottoms', 'bottoms', 'Trousers and skirts', '/images/pavone-new/product-4.jpg', false, 4),
    ('Accessories', 'accessories', 'Bags, scarves and jewelry', '/images/pavone-new/cat-accessories.jpg', true, 5)
)
insert into public.pavone_new_categories (name, slug, description, image_url, is_featured, sort_order)
select name, slug, description, image_url, is_featured, sort_order
from seed_categories
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order;

with seed_brands(name, slug, description) as (
  values
    ('PAVONE Collection', 'pavone-collection', 'Our signature in-house line'),
    ('Atelier Noir', 'atelier-noir', 'Contemporary tailoring with a dark edge'),
    ('Maison Blanc', 'maison-blanc', 'Refined essentials in soft neutrals')
)
insert into public.pavone_new_brands (name, slug, description)
select name, slug, description
from seed_brands
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;

with seed_products(name, slug, description, category_slug, brand_slug, price, sale_price, sizes, colors, stock_quantity, sku, is_featured, is_best_seller, is_new_arrival, image_url) as (
  values
    ('Silk Slip Midi Dress', 'silk-slip-midi-dress', 'A fluid silk slip dress that drapes beautifully. Bias cut with adjustable straps and a delicate cowl neckline.', 'dresses', 'pavone-collection', 189.00, 149.00, array['XS','S','M','L'], array['Black','Ivory'], 24, 'PV-DR-001', true, true, false, '/images/pavone-new/product-1.jpg'),
    ('Le Smoking Tailored Blazer', 'le-smoking-tailored-blazer', 'Sharply tailored single-breasted blazer in Italian wool. Structured shoulders with a nipped waist.', 'outerwear', 'atelier-noir', 249.00, null, array['XS','S','M','L','XL'], array['Black'], 15, 'PV-OW-002', true, true, false, '/images/pavone-new/product-2.jpg'),
    ('Ivory Satin Blouse', 'ivory-satin-blouse', 'Lustrous satin blouse with a relaxed fit, covered buttons and French cuffs.', 'tops', 'maison-blanc', 119.00, null, array['XS','S','M','L'], array['Ivory','Champagne'], 32, 'PV-TP-003', false, false, true, '/images/pavone-new/product-3.jpg'),
    ('Wide-Leg Wool Trousers', 'wide-leg-wool-trousers', 'High-waisted wide-leg trousers in flowing wool crepe. Front pleats and side pockets.', 'bottoms', 'atelier-noir', 159.00, null, array['XS','S','M','L'], array['Black','Charcoal'], 20, 'PV-BT-004', false, true, false, '/images/pavone-new/product-4.jpg'),
    ('Pleated Midi Skirt', 'pleated-midi-skirt', 'Knife-pleated midi skirt with an elegant drape and hidden side zip.', 'bottoms', 'pavone-collection', 129.00, 99.00, array['XS','S','M','L'], array['Black','Sand'], 18, 'PV-BT-005', false, false, true, '/images/pavone-new/product-5.jpg'),
    ('Cashmere Crewneck Sweater', 'cashmere-crewneck-sweater', 'Pure cashmere crewneck in a relaxed silhouette. Impossibly soft, endlessly versatile.', 'tops', 'maison-blanc', 179.00, null, array['XS','S','M','L','XL'], array['Cream','Grey','Black'], 28, 'PV-TP-006', true, true, false, '/images/pavone-new/product-6.jpg'),
    ('Belted Wool Coat', 'belted-wool-coat', 'Full-length double-faced wool coat with a self-tie belt and notched lapels.', 'outerwear', 'pavone-collection', 329.00, null, array['S','M','L'], array['Camel','Black'], 10, 'PV-OW-007', true, false, true, '/images/pavone-new/product-7.jpg'),
    ('White Poplin Shirt Dress', 'white-poplin-shirt-dress', 'Crisp cotton poplin shirt dress with a detachable belt and side slits.', 'dresses', 'maison-blanc', 149.00, null, array['XS','S','M','L'], array['White'], 22, 'PV-DR-008', false, false, true, '/images/pavone-new/product-8.jpg'),
    ('Leather Mini Handbag', 'leather-mini-handbag', 'Structured mini handbag in smooth calf leather with gold-tone hardware and detachable strap.', 'accessories', 'pavone-collection', 219.00, null, array['One Size'], array['Cognac','Black'], 12, 'PV-AC-009', true, true, false, '/images/pavone-new/product-9.jpg'),
    ('Black Knit Column Dress', 'black-knit-column-dress', 'Sleek ribbed-knit column dress that skims the body. Square neckline, midi length.', 'dresses', 'atelier-noir', 169.00, null, array['XS','S','M','L'], array['Black'], 16, 'PV-DR-010', false, false, true, '/images/pavone-new/product-10.jpg'),
    ('Silk Twill Scarf', 'silk-twill-scarf', 'Hand-rolled silk twill scarf with an abstract monochrome print.', 'accessories', 'pavone-collection', 59.00, null, array['One Size'], array['Monochrome'], 3, 'PV-AC-011', false, false, true, '/images/pavone-new/product-11.jpg'),
    ('Cropped Trench Jacket', 'cropped-trench-jacket', 'A modern take on the classic trench, cropped and belted in water-resistant cotton gabardine.', 'outerwear', 'maison-blanc', 199.00, 169.00, array['XS','S','M','L'], array['Beige','Black'], 4, 'PV-OW-012', false, true, false, '/images/pavone-new/product-12.jpg')
),
upserted as (
  insert into public.pavone_new_products (
    name,
    slug,
    description,
    category_id,
    brand_id,
    price,
    sale_price,
    sizes,
    colors,
    stock_quantity,
    sku,
    is_featured,
    is_best_seller,
    is_new_arrival
  )
  select
    sp.name,
    sp.slug,
    sp.description,
    c.id,
    b.id,
    sp.price,
    sp.sale_price,
    sp.sizes,
    sp.colors,
    sp.stock_quantity,
    sp.sku,
    sp.is_featured,
    sp.is_best_seller,
    sp.is_new_arrival
  from seed_products sp
  join public.pavone_new_categories c on c.slug = sp.category_slug
  join public.pavone_new_brands b on b.slug = sp.brand_slug
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    category_id = excluded.category_id,
    brand_id = excluded.brand_id,
    price = excluded.price,
    sale_price = excluded.sale_price,
    sizes = excluded.sizes,
    colors = excluded.colors,
    stock_quantity = excluded.stock_quantity,
    sku = excluded.sku,
    is_featured = excluded.is_featured,
    is_best_seller = excluded.is_best_seller,
    is_new_arrival = excluded.is_new_arrival
  returning id, slug
)
insert into public.pavone_new_product_images (product_id, image_url, sort_order)
select p.id, sp.image_url, 0
from seed_products sp
join public.pavone_new_products p on p.slug = sp.slug
where not exists (
  select 1 from public.pavone_new_product_images pi where pi.product_id = p.id
);
