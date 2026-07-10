-- Makes the legacy category field optional. Product placement should be controlled
-- through wa_catalog_groups, wa_catalog_group_values, and wa_product_group_values.

alter table public.wa_products
  alter column category_id drop not null;

alter table public.wa_products
  drop constraint if exists wa_products_category_id_fkey;

alter table public.wa_products
  add constraint wa_products_category_id_fkey
  foreign key (category_id)
  references public.wa_categories(id)
  on delete set null;

update public.wa_products
set category_id = null
where category_id like business_id || '-cat-internal';
