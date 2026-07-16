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

create table if not exists public.wa_customer_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  customer_phone text not null,
  customer_name text not null,
  language text not null default 'en',
  fulfillment_method text not null,
  delivery_area_id text,
  delivery_address text,
  delivery_latitude numeric,
  delivery_longitude numeric,
  pickup_location_id text,
  payment_method text not null,
  notes text,
  last_order_id uuid,
  last_order_number text,
  last_ordered_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, customer_phone)
);

create index if not exists wa_customer_profiles_lookup_idx
  on public.wa_customer_profiles (business_id, customer_phone);

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
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  out_for_delivery_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  rejection_reason text,
  cancellation_reason text,
  restock_required boolean not null default false,
  decided_by text,
  customer_notification_status text not null default 'NOT_SENT',
  customer_notification_error text,
  customer_notified_at timestamptz,
  template_notification_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wa_orders
  add column if not exists accepted_at timestamptz,
  add column if not exists preparing_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists out_for_delivery_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists cancellation_reason text,
  add column if not exists restock_required boolean not null default false,
  add column if not exists decided_by text,
  add column if not exists customer_notification_status text not null default 'NOT_SENT',
  add column if not exists customer_notification_error text,
  add column if not exists customer_notified_at timestamptz,
  add column if not exists template_notification_required boolean not null default false;

create index if not exists wa_orders_created_at_idx
  on public.wa_orders (created_at desc);

create index if not exists wa_orders_customer_phone_idx
  on public.wa_orders (customer_phone);

create index if not exists wa_orders_business_status_created_idx
  on public.wa_orders (business_id, status, created_at desc);

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

create index if not exists wa_stock_reservations_business_stock_active_idx
  on public.wa_stock_reservations (business_id, product_variant_id, status, expires_at);

create table if not exists public.wa_order_status_history (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  order_id uuid not null references public.wa_orders(id) on delete cascade,
  previous_status text,
  new_status text not null,
  reason text,
  changed_by_user_id text,
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists wa_order_status_history_order_idx
  on public.wa_order_status_history (business_id, order_id, created_at asc);

create table if not exists public.wa_order_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  order_id uuid not null references public.wa_orders(id) on delete cascade,
  customer_phone text not null,
  order_status text not null,
  message_type text not null,
  language text not null,
  status text not null default 'PENDING',
  meta_message_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create unique index if not exists wa_order_notifications_unique_idx
  on public.wa_order_notifications (business_id, order_id, order_status, message_type);

create index if not exists wa_order_notifications_order_idx
  on public.wa_order_notifications (business_id, order_id, created_at desc);

do $$
begin
  alter table public.wa_orders
    add constraint wa_orders_status_check
    check (status in (
      'PENDING_OWNER_CONFIRMATION',
      'ACCEPTED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'COMPLETED',
      'REJECTED',
      'CANCELLED'
    ));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_orders
    add constraint wa_orders_totals_non_negative_check
    check (subtotal >= 0 and delivery_fee >= 0 and total >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_stock_reservations
    add constraint wa_stock_reservations_status_check
    check (status in ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_order_notifications
    add constraint wa_order_notifications_status_check
    check (status in ('PENDING', 'SENT', 'FAILED', 'RETRYABLE', 'TEMPLATE_REQUIRED', 'SKIPPED'));
exception
  when duplicate_object then null;
end $$;

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
  v_stock_id text;
  v_requested_quantity integer;
  v_stock_quantity integer;
  v_active_reserved integer;
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

  update public.wa_stock_reservations as sr
     set status = 'EXPIRED'
   where sr.business_id = p_business_id
     and sr.status = 'ACTIVE'
     and sr.expires_at <= now();

  for v_reservation in select * from jsonb_array_elements(p_reservations)
  loop
    v_stock_id := v_reservation->>'productVariantId';
    v_requested_quantity := (v_reservation->>'quantity')::integer;

    if v_stock_id is null or v_stock_id = '' or v_requested_quantity is null or v_requested_quantity <= 0 then
      raise exception 'Invalid stock reservation request.';
    end if;

    select pv.stock_quantity
      into v_stock_quantity
      from public.wa_product_variants as pv
     where pv.id = v_stock_id
       and pv.business_id = p_business_id
       and pv.is_available = true
     for update;

    if not found then
      select p.stock_quantity
        into v_stock_quantity
        from public.wa_products as p
       where p.id = v_stock_id
         and p.business_id = p_business_id
         and p.is_active = true
         and p.is_available = true
       for update;
    end if;

    if not found then
      raise exception 'Requested item is not available.';
    end if;

    select coalesce(sum(sr.quantity), 0)::integer
      into v_active_reserved
      from public.wa_stock_reservations as sr
     where sr.business_id = p_business_id
       and sr.product_variant_id = v_stock_id
       and sr.status = 'ACTIVE'
       and sr.expires_at > now();

    if v_requested_quantity > greatest(0, v_stock_quantity - v_active_reserved) then
      raise exception 'Insufficient stock for reservation %.%', v_stock_id, v_requested_quantity;
    end if;
  end loop;

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

create or replace function public.wa_accept_order(
  p_business_id text,
  p_order_id uuid,
  p_decided_by text
)
returns table (
  id uuid,
  order_number text,
  customer_phone text,
  language text,
  status text,
  customer_notification_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.wa_orders%rowtype;
  v_reservation public.wa_stock_reservations%rowtype;
  v_updated_count integer;
begin
  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id
   for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if v_order.status <> 'PENDING_OWNER_CONFIRMATION' then
    raise exception 'Only pending orders can be accepted.';
  end if;

  update public.wa_stock_reservations as sr
     set status = 'EXPIRED'
   where sr.order_id = p_order_id
     and sr.business_id = p_business_id
     and sr.status = 'ACTIVE'
     and sr.expires_at <= now();

  if exists (
    select 1
      from public.wa_stock_reservations as sr
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'EXPIRED'
  ) then
    raise exception 'Stock reservation expired.';
  end if;

  if not exists (
    select 1
      from public.wa_stock_reservations as sr
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'ACTIVE'
  ) then
    raise exception 'No active stock reservations were found.';
  end if;

  for v_reservation in
    select *
      from public.wa_stock_reservations as sr
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'ACTIVE'
     for update
  loop
    update public.wa_product_variants as pv
       set stock_quantity = pv.stock_quantity - v_reservation.quantity,
           updated_at = now()
     where pv.id = v_reservation.product_variant_id
       and pv.business_id = p_business_id
       and pv.stock_quantity >= v_reservation.quantity;

    get diagnostics v_updated_count = row_count;

    if v_updated_count = 0 then
      update public.wa_products as p
         set stock_quantity = p.stock_quantity - v_reservation.quantity,
             updated_at = now()
       where p.id = v_reservation.product_variant_id
         and p.business_id = p_business_id
         and p.stock_quantity >= v_reservation.quantity;

      get diagnostics v_updated_count = row_count;
    end if;

    if v_updated_count = 0 then
      raise exception 'Insufficient stock for reservation %.%', v_reservation.product_variant_id, v_reservation.quantity;
    end if;
  end loop;

  update public.wa_stock_reservations as sr
     set status = 'COMMITTED'
   where sr.order_id = p_order_id
     and sr.business_id = p_business_id
     and sr.status = 'ACTIVE';

  update public.wa_orders as o
     set status = 'ACCEPTED',
         accepted_at = coalesce(o.accepted_at, now()),
         decided_by = nullif(p_decided_by, ''),
         customer_notification_status = 'PENDING',
         customer_notification_error = null,
         template_notification_required = false,
         updated_at = now()
   where o.id = p_order_id
     and o.business_id = p_business_id;

  insert into public.wa_order_status_history (
    business_id,
    order_id,
    previous_status,
    new_status,
    reason,
    changed_by_user_id,
    source
  )
  values (
    p_business_id,
    p_order_id,
    v_order.status,
    'ACCEPTED',
    null,
    nullif(p_decided_by, ''),
    'OWNER_DASHBOARD'
  );

  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id;

  id := v_order.id;
  order_number := v_order.order_number;
  customer_phone := v_order.customer_phone;
  language := v_order.language;
  status := v_order.status;
  customer_notification_status := v_order.customer_notification_status;
  return next;
end;
$$;

create or replace function public.wa_reject_order(
  p_business_id text,
  p_order_id uuid,
  p_reason text,
  p_decided_by text
)
returns table (
  id uuid,
  order_number text,
  customer_phone text,
  language text,
  status text,
  customer_notification_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.wa_orders%rowtype;
begin
  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id
   for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if v_order.status <> 'PENDING_OWNER_CONFIRMATION' then
    raise exception 'Only pending orders can be rejected.';
  end if;

  update public.wa_stock_reservations as sr
     set status = 'RELEASED'
   where sr.order_id = p_order_id
     and sr.business_id = p_business_id
     and sr.status = 'ACTIVE';

  update public.wa_orders as o
     set status = 'REJECTED',
         rejected_at = coalesce(o.rejected_at, now()),
         rejection_reason = nullif(p_reason, ''),
         decided_by = nullif(p_decided_by, ''),
         customer_notification_status = 'PENDING',
         customer_notification_error = null,
         template_notification_required = false,
         updated_at = now()
   where o.id = p_order_id
     and o.business_id = p_business_id;

  insert into public.wa_order_status_history (
    business_id,
    order_id,
    previous_status,
    new_status,
    reason,
    changed_by_user_id,
    source
  )
  values (
    p_business_id,
    p_order_id,
    v_order.status,
    'REJECTED',
    nullif(p_reason, ''),
    nullif(p_decided_by, ''),
    'OWNER_DASHBOARD'
  );

  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id;

  id := v_order.id;
  order_number := v_order.order_number;
  customer_phone := v_order.customer_phone;
  language := v_order.language;
  status := v_order.status;
  customer_notification_status := v_order.customer_notification_status;
  return next;
end;
$$;

create or replace function public.wa_transition_order_status(
  p_business_id text,
  p_order_id uuid,
  p_target_status text,
  p_reason text,
  p_changed_by text,
  p_source text default 'OWNER_DASHBOARD'
)
returns table (
  id uuid,
  order_number text,
  customer_phone text,
  language text,
  status text,
  previous_status text,
  fulfillment_method text,
  customer_notification_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.wa_orders%rowtype;
  v_previous_status text;
  v_reason text;
  v_source text;
begin
  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id
   for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  v_previous_status := v_order.status;

  v_reason := nullif(left(trim(coalesce(p_reason, '')), 500), '');
  v_source := coalesce(nullif(trim(p_source), ''), 'OWNER_DASHBOARD');

  if v_order.status in ('COMPLETED', 'REJECTED', 'CANCELLED') then
    raise exception 'Terminal orders cannot be changed.';
  end if;

  if p_target_status not in ('PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED') then
    raise exception 'Unsupported order status transition.';
  end if;

  if p_target_status = 'CANCELLED' and v_reason is null then
    raise exception 'Cancellation reason is required.';
  end if;

  if not (
    (v_order.status = 'PENDING_OWNER_CONFIRMATION' and p_target_status = 'CANCELLED') or
    (v_order.status = 'ACCEPTED' and p_target_status in ('PREPARING', 'CANCELLED')) or
    (v_order.status = 'PREPARING' and p_target_status in ('READY', 'CANCELLED')) or
    (v_order.status = 'READY' and p_target_status in ('OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED')) or
    (v_order.status = 'OUT_FOR_DELIVERY' and p_target_status in ('COMPLETED', 'CANCELLED'))
  ) then
    raise exception 'Invalid order status transition from % to %.', v_order.status, p_target_status;
  end if;

  if v_order.fulfillment_method = 'pickup' and p_target_status = 'OUT_FOR_DELIVERY' then
    raise exception 'Pickup orders cannot be marked out for delivery.';
  end if;

  if v_order.fulfillment_method = 'delivery'
     and v_order.status = 'READY'
     and p_target_status = 'COMPLETED' then
    raise exception 'Delivery orders must be marked out for delivery before completion.';
  end if;

  if p_target_status = 'CANCELLED' and v_order.status = 'PENDING_OWNER_CONFIRMATION' then
    update public.wa_stock_reservations as sr
       set status = 'RELEASED'
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'ACTIVE';
  end if;

  update public.wa_orders as o
     set status = p_target_status,
         preparing_at = case
           when p_target_status = 'PREPARING' then coalesce(o.preparing_at, now())
           else o.preparing_at
         end,
         ready_at = case
           when p_target_status = 'READY' then coalesce(o.ready_at, now())
           else o.ready_at
         end,
         out_for_delivery_at = case
           when p_target_status = 'OUT_FOR_DELIVERY' then coalesce(o.out_for_delivery_at, now())
           else o.out_for_delivery_at
         end,
         completed_at = case
           when p_target_status = 'COMPLETED' then coalesce(o.completed_at, now())
           else o.completed_at
         end,
         cancelled_at = case
           when p_target_status = 'CANCELLED' then coalesce(o.cancelled_at, now())
           else o.cancelled_at
         end,
         cancellation_reason = case
           when p_target_status = 'CANCELLED' then v_reason
           else o.cancellation_reason
         end,
         restock_required = case
           when p_target_status = 'CANCELLED' and v_order.status in ('ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY') then true
           else o.restock_required
         end,
         decided_by = nullif(p_changed_by, ''),
         customer_notification_status = 'PENDING',
         customer_notification_error = null,
         template_notification_required = false,
         updated_at = now()
   where o.id = p_order_id
     and o.business_id = p_business_id;

  insert into public.wa_order_status_history (
    business_id,
    order_id,
    previous_status,
    new_status,
    reason,
    changed_by_user_id,
    source
  )
  values (
    p_business_id,
    p_order_id,
    v_order.status,
    p_target_status,
    v_reason,
    nullif(p_changed_by, ''),
    v_source
  );

  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id;

  id := v_order.id;
  order_number := v_order.order_number;
  customer_phone := v_order.customer_phone;
  language := v_order.language;
  status := v_order.status;
  previous_status := v_previous_status;
  fulfillment_method := v_order.fulfillment_method;
  customer_notification_status := v_order.customer_notification_status;
  return next;
end;
$$;

create or replace function public.wa_expire_stock_reservations(
  p_business_id text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.wa_stock_reservations as sr
     set status = 'EXPIRED'
   where sr.business_id = p_business_id
     and sr.status = 'ACTIVE'
     and sr.expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

alter table public.wa_conversation_sessions enable row level security;
alter table public.wa_processed_messages enable row level security;
alter table public.wa_customer_profiles enable row level security;
alter table public.wa_orders enable row level security;
alter table public.wa_order_items enable row level security;
alter table public.wa_stock_reservations enable row level security;
alter table public.wa_order_status_history enable row level security;
alter table public.wa_order_notifications enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.wa_conversation_sessions to service_role;
grant select, insert, update, delete on public.wa_processed_messages to service_role;
grant select, insert, update, delete on public.wa_customer_profiles to service_role;
grant select, insert, update, delete on public.wa_orders to service_role;
grant select, insert, update, delete on public.wa_order_items to service_role;
grant select, insert, update, delete on public.wa_stock_reservations to service_role;
grant select, insert, update, delete on public.wa_order_status_history to service_role;
grant select, insert, update, delete on public.wa_order_notifications to service_role;
grant usage, select on sequence public.wa_order_number_seq to service_role;
grant execute on function public.wa_create_pending_order(text, text, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.wa_accept_order(text, uuid, text) to service_role;
grant execute on function public.wa_reject_order(text, uuid, text, text) to service_role;
grant execute on function public.wa_transition_order_status(text, uuid, text, text, text, text) to service_role;
grant execute on function public.wa_expire_stock_reservations(text) to service_role;

-- No anon/auth policies are created on purpose.
-- The app reads/writes these tables only from server code using SUPABASE_SERVICE_ROLE_KEY.
