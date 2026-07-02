-- Milestone 11 reliability, concurrency and data-integrity hardening.
-- Run after the catalog, core bot, and order lifecycle SQL files.

create extension if not exists pgcrypto;

do $$
begin
  alter table public.wa_products
    add constraint wa_products_stock_non_negative_check check (stock_quantity >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_products
    add constraint wa_products_price_non_negative_check check (price >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_product_variants
    add constraint wa_product_variants_stock_non_negative_check check (stock_quantity >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_product_variants
    add constraint wa_product_variants_price_non_negative_check check (price >= 0);
exception
  when duplicate_object then null;
end $$;

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

create index if not exists wa_stock_reservations_business_stock_active_idx
  on public.wa_stock_reservations (business_id, product_variant_id, status, expires_at);

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
    from public.wa_orders as o
   where o.idempotency_key = p_idempotency_key
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

grant execute on function public.wa_create_pending_order(text, text, jsonb, jsonb, jsonb) to service_role;
