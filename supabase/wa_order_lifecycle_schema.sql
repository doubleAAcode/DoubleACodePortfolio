-- Milestone 10 order lifecycle upgrade.
-- Run this once in Supabase SQL editor after the core WhatsApp schema exists.

create extension if not exists pgcrypto;

alter table public.wa_orders
  add column if not exists preparing_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists out_for_delivery_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists restock_required boolean not null default false;

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
         preparing_at = case when p_target_status = 'PREPARING' then coalesce(o.preparing_at, now()) else o.preparing_at end,
         ready_at = case when p_target_status = 'READY' then coalesce(o.ready_at, now()) else o.ready_at end,
         out_for_delivery_at = case when p_target_status = 'OUT_FOR_DELIVERY' then coalesce(o.out_for_delivery_at, now()) else o.out_for_delivery_at end,
         completed_at = case when p_target_status = 'COMPLETED' then coalesce(o.completed_at, now()) else o.completed_at end,
         cancelled_at = case when p_target_status = 'CANCELLED' then coalesce(o.cancelled_at, now()) else o.cancelled_at end,
         cancellation_reason = case when p_target_status = 'CANCELLED' then v_reason else o.cancellation_reason end,
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
    v_previous_status,
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

alter table public.wa_order_status_history enable row level security;
alter table public.wa_order_notifications enable row level security;

grant select, insert, update, delete on public.wa_order_status_history to service_role;
grant select, insert, update, delete on public.wa_order_notifications to service_role;
grant execute on function public.wa_transition_order_status(text, uuid, text, text, text, text) to service_role;
