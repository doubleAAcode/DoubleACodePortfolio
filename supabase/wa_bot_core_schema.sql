create extension if not exists pgcrypto;

create table if not exists public.wa_conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  customer_phone text not null,
  current_step text not null,
  language text,
  context jsonb not null default '{}'::jsonb,
  last_customer_message_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, customer_phone)
);

create index if not exists wa_conversation_sessions_lookup_idx
  on public.wa_conversation_sessions (business_id, customer_phone);

create index if not exists wa_conversation_sessions_expires_at_idx
  on public.wa_conversation_sessions (expires_at);

create table if not exists public.wa_processed_messages (
  message_id text primary key,
  business_id text not null,
  customer_phone text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists wa_processed_messages_expires_at_idx
  on public.wa_processed_messages (expires_at);

create table if not exists public.wa_orders (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  order_number text not null unique,
  idempotency_key text not null unique,
  customer_name text not null,
  customer_phone text not null,
  alternate_phone text,
  language text not null,
  status text not null default 'PENDING_OWNER_CONFIRMATION',
  fulfillment_method text not null,
  delivery_area_id text,
  delivery_address text,
  delivery_latitude numeric,
  delivery_longitude numeric,
  pickup_location_id text,
  payment_method text not null,
  notes text,
  subtotal numeric(12, 2) not null,
  delivery_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wa_orders_created_at_idx
  on public.wa_orders (created_at desc);

create index if not exists wa_orders_customer_phone_idx
  on public.wa_orders (customer_phone);

create table if not exists public.wa_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.wa_orders(id) on delete cascade,
  product_id text not null,
  variant_id text,
  product_code text not null,
  product_name text not null,
  selected_options jsonb not null default '[]'::jsonb,
  custom_field_answers jsonb not null default '[]'::jsonb,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  line_total numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists wa_order_items_order_id_idx
  on public.wa_order_items (order_id);

create table if not exists public.wa_stock_reservations (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  order_id uuid not null references public.wa_orders(id) on delete cascade,
  product_variant_id text not null,
  quantity integer not null check (quantity > 0),
  status text not null default 'ACTIVE',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists wa_stock_reservations_active_idx
  on public.wa_stock_reservations (product_variant_id, status, expires_at);

create sequence if not exists public.wa_order_number_seq start with 1 increment by 1;

create or replace function public.wa_create_pending_order(
  p_business_id text,
  p_idempotency_key text,
  p_order jsonb,
  p_items jsonb,
  p_reservations jsonb
)
returns table (
  id uuid,
  order_number text,
  duplicate boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.wa_orders%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_reservation jsonb;
begin
  select *
    into v_existing
    from public.wa_orders
   where idempotency_key = p_idempotency_key
   limit 1;

  if found then
    id := v_existing.id;
    order_number := v_existing.order_number;
    duplicate := true;
    return next;
    return;
  end if;

  v_order_id := gen_random_uuid();
  v_order_number := 'DA-' || lpad(nextval('public.wa_order_number_seq')::text, 6, '0');

  insert into public.wa_orders (
    id,
    business_id,
    order_number,
    idempotency_key,
    customer_name,
    customer_phone,
    alternate_phone,
    language,
    status,
    fulfillment_method,
    delivery_area_id,
    delivery_address,
    delivery_latitude,
    delivery_longitude,
    pickup_location_id,
    payment_method,
    notes,
    subtotal,
    delivery_fee,
    total
  )
  values (
    v_order_id,
    p_business_id,
    v_order_number,
    p_idempotency_key,
    p_order->>'customerName',
    p_order->>'customerPhone',
    nullif(p_order->>'alternatePhone', ''),
    p_order->>'language',
    'PENDING_OWNER_CONFIRMATION',
    p_order->>'fulfillmentMethod',
    nullif(p_order->>'deliveryAreaId', ''),
    nullif(p_order->>'deliveryAddress', ''),
    nullif(p_order->>'deliveryLatitude', '')::numeric,
    nullif(p_order->>'deliveryLongitude', '')::numeric,
    nullif(p_order->>'pickupLocationId', ''),
    p_order->>'paymentMethod',
    nullif(p_order->>'notes', ''),
    (p_order->>'subtotal')::numeric,
    (p_order->>'deliveryFee')::numeric,
    (p_order->>'total')::numeric
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.wa_order_items (
      order_id,
      product_id,
      variant_id,
      product_code,
      product_name,
      selected_options,
      custom_field_answers,
      quantity,
      unit_price,
      line_total
    )
    values (
      v_order_id,
      v_item->>'productId',
      nullif(v_item->>'variantId', ''),
      v_item->>'productCode',
      v_item->>'productName',
      coalesce(v_item->'selectedOptions', '[]'::jsonb),
      coalesce(v_item->'customFieldAnswers', '[]'::jsonb),
      (v_item->>'quantity')::integer,
      (v_item->>'unitPrice')::numeric,
      (v_item->>'lineTotal')::numeric
    );
  end loop;

  for v_reservation in select * from jsonb_array_elements(p_reservations)
  loop
    insert into public.wa_stock_reservations (
      business_id,
      order_id,
      product_variant_id,
      quantity,
      status,
      expires_at
    )
    values (
      p_business_id,
      v_order_id,
      v_reservation->>'productVariantId',
      (v_reservation->>'quantity')::integer,
      'ACTIVE',
      (v_reservation->>'expiresAt')::timestamptz
    );
  end loop;

  id := v_order_id;
  order_number := v_order_number;
  duplicate := false;
  return next;
end;
$$;

alter table public.wa_conversation_sessions enable row level security;
alter table public.wa_processed_messages enable row level security;
alter table public.wa_orders enable row level security;
alter table public.wa_order_items enable row level security;
alter table public.wa_stock_reservations enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.wa_conversation_sessions to service_role;
grant select, insert, update, delete on public.wa_processed_messages to service_role;
grant select, insert, update, delete on public.wa_orders to service_role;
grant select, insert, update, delete on public.wa_order_items to service_role;
grant select, insert, update, delete on public.wa_stock_reservations to service_role;
grant usage, select on sequence public.wa_order_number_seq to service_role;
grant execute on function public.wa_create_pending_order(text, text, jsonb, jsonb, jsonb) to service_role;

-- No anon/auth policies are created on purpose.
-- The app reads/writes these tables only from server code using SUPABASE_SERVICE_ROLE_KEY.
