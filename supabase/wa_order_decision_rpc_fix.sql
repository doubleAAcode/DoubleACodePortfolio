-- Fix ambiguous return-column references in order decision RPCs.
-- Run this in Supabase SQL editor if accepting/rejecting an order shows:
--   column reference "status" is ambiguous
--   column reference "id" is ambiguous

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
         accepted_at = now(),
         decided_by = nullif(p_decided_by, ''),
         customer_notification_status = 'PENDING',
         customer_notification_error = null,
         template_notification_required = false,
         updated_at = now()
   where o.id = p_order_id
     and o.business_id = p_business_id;

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
         rejected_at = now(),
         rejection_reason = nullif(p_reason, ''),
         decided_by = nullif(p_decided_by, ''),
         customer_notification_status = 'PENDING',
         customer_notification_error = null,
         template_notification_required = false,
         updated_at = now()
   where o.id = p_order_id
     and o.business_id = p_business_id;

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

grant execute on function public.wa_accept_order(text, uuid, text) to service_role;
grant execute on function public.wa_reject_order(text, uuid, text, text) to service_role;
grant execute on function public.wa_expire_stock_reservations(text) to service_role;
