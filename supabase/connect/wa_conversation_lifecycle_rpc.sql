-- Atomic, tenant-scoped conversation lifecycle changes.
-- Prerequisite: wa_flow_manager_core_schema.sql.

begin;

alter table public.wa_conversation_events
  add column if not exists command_idempotency_key text;

alter table public.wa_conversation_events
  drop constraint if exists wa_conversation_events_command_key_check;
alter table public.wa_conversation_events
  add constraint wa_conversation_events_command_key_check check (
    command_idempotency_key is null
    or length(trim(command_idempotency_key)) between 8 and 200
  );

create unique index if not exists wa_conversation_events_command_key_uidx
  on public.wa_conversation_events (business_id, command_idempotency_key)
  where command_idempotency_key is not null;

create index if not exists wa_conversations_snooze_due_idx
  on public.wa_conversations (snoozed_until, id)
  where status = 'SNOOZED';

create or replace function public.wa_change_conversation_lifecycle(
  p_business_id text,
  p_conversation_id uuid,
  p_status text,
  p_idempotency_key text,
  p_actor_kind text,
  p_actor_username text,
  p_snoozed_until timestamptz default null
)
returns table (
  changed_conversation_id uuid,
  changed_business_id text,
  previous_status text,
  current_status text,
  current_snoozed_until timestamptz,
  applied boolean,
  duplicate boolean,
  block_code text,
  event_id uuid
)
language plpgsql
set search_path = public
as $$
declare
  v_conversation public.wa_conversations%rowtype;
  v_existing_event public.wa_conversation_events%rowtype;
  v_event_id uuid;
  v_event_type text;
  v_existing_snoozed_until timestamptz;
begin
  if nullif(trim(p_business_id), '') is null then
    raise exception 'business_id is required';
  end if;
  if p_conversation_id is null then
    raise exception 'conversation_id is required';
  end if;
  if p_status not in ('OPEN', 'PENDING', 'SNOOZED', 'CLOSED') then
    raise exception 'status is invalid';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 200
     or trim(p_idempotency_key) !~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$' then
    raise exception 'idempotency_key is invalid';
  end if;
  if p_actor_kind not in ('INTERNAL_ADMIN', 'BUSINESS_USER') then
    raise exception 'actor_kind is invalid';
  end if;
  if length(trim(coalesce(p_actor_username, ''))) not between 1 and 320 then
    raise exception 'actor_username is invalid';
  end if;
  if p_status = 'SNOOZED' then
    if p_snoozed_until is null or p_snoozed_until <= now() then
      raise exception 'snoozed_until must be in the future';
    end if;
    if p_snoozed_until > now() + interval '365 days' then
      raise exception 'snoozed_until must be within 365 days';
    end if;
  elsif p_snoozed_until is not null then
    raise exception 'snoozed_until is only valid for SNOOZED';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id || ':' || trim(p_idempotency_key), 0)
  );

  select event.*
  into v_existing_event
  from public.wa_conversation_events as event
  where event.business_id = p_business_id
    and event.command_idempotency_key = trim(p_idempotency_key);

  if found then
    v_existing_snoozed_until := case
      when nullif(v_existing_event.payload ->> 'snoozedUntil', '') is null then null
      else (v_existing_event.payload ->> 'snoozedUntil')::timestamptz
    end;

    if v_existing_event.conversation_id <> p_conversation_id
       or v_existing_event.payload ->> 'status' <> p_status
       or v_existing_snoozed_until is distinct from p_snoozed_until then
      return query select
        p_conversation_id,
        p_business_id,
        coalesce(v_existing_event.payload ->> 'previousStatus', p_status),
        coalesce(v_existing_event.payload ->> 'status', p_status),
        v_existing_snoozed_until,
        false,
        true,
        'IDEMPOTENCY_CONFLICT'::text,
        v_existing_event.id;
      return;
    end if;

    return query select
      v_existing_event.conversation_id,
      v_existing_event.business_id,
      coalesce(v_existing_event.payload ->> 'previousStatus', p_status),
      coalesce(v_existing_event.payload ->> 'status', p_status),
      v_existing_snoozed_until,
      true,
      true,
      null::text,
      v_existing_event.id;
    return;
  end if;

  select conversation.*
  into v_conversation
  from public.wa_conversations as conversation
  where conversation.business_id = p_business_id
    and conversation.id = p_conversation_id
  for update;

  if not found then
    raise exception 'Conversation was not found for the business';
  end if;

  if v_conversation.status = p_status
     and (
       p_status <> 'SNOOZED'
       or v_conversation.snoozed_until is not distinct from p_snoozed_until
     ) then
    return query select
      v_conversation.id,
      v_conversation.business_id,
      v_conversation.status,
      v_conversation.status,
      v_conversation.snoozed_until,
      false,
      false,
      null::text,
      null::uuid;
    return;
  end if;

  if v_conversation.status = 'CLOSED' and p_status <> 'OPEN' then
    return query select
      v_conversation.id,
      v_conversation.business_id,
      v_conversation.status,
      v_conversation.status,
      v_conversation.snoozed_until,
      false,
      false,
      'CONVERSATION_CLOSED'::text,
      null::uuid;
    return;
  end if;

  if p_status = 'OPEN'
     and v_conversation.status = 'CLOSED'
     and exists (
       select 1
       from public.wa_conversations as active
       where active.business_id = v_conversation.business_id
         and active.contact_id = v_conversation.contact_id
         and active.connection_id is not distinct from v_conversation.connection_id
         and active.id <> v_conversation.id
         and active.status in ('OPEN', 'PENDING', 'SNOOZED')
     ) then
    return query select
      v_conversation.id,
      v_conversation.business_id,
      v_conversation.status,
      v_conversation.status,
      v_conversation.snoozed_until,
      false,
      false,
      'ACTIVE_CONVERSATION_EXISTS'::text,
      null::uuid;
    return;
  end if;

  begin
    update public.wa_conversations as conversation
    set
      status = p_status,
      opened_at = case
        when p_status = 'OPEN' and v_conversation.status = 'CLOSED' then now()
        else conversation.opened_at
      end,
      pending_at = case when p_status = 'PENDING' then now() else null end,
      snoozed_until = case when p_status = 'SNOOZED' then p_snoozed_until else null end,
      closed_at = case when p_status = 'CLOSED' then now() else null end
    where conversation.business_id = p_business_id
      and conversation.id = p_conversation_id;
  exception
    when unique_violation then
      return query select
        v_conversation.id,
        v_conversation.business_id,
        v_conversation.status,
        v_conversation.status,
        v_conversation.snoozed_until,
        false,
        false,
        'ACTIVE_CONVERSATION_EXISTS'::text,
        null::uuid;
      return;
  end;

  v_event_type := case
    when v_conversation.status = 'CLOSED' and p_status = 'OPEN' then 'REOPENED'
    when p_status = 'SNOOZED' then 'SNOOZED'
    else 'STATUS_CHANGED'
  end;

  insert into public.wa_conversation_events (
    business_id,
    conversation_id,
    event_type,
    actor_type,
    payload,
    command_idempotency_key
  )
  values (
    p_business_id,
    p_conversation_id,
    v_event_type,
    'USER',
    jsonb_build_object(
      'previousStatus', v_conversation.status,
      'status', p_status,
      'previousSnoozedUntil', v_conversation.snoozed_until,
      'snoozedUntil', p_snoozed_until,
      'actorKind', p_actor_kind,
      'actorUsername', trim(p_actor_username)
    ),
    trim(p_idempotency_key)
  )
  returning id into v_event_id;

  return query select
    v_conversation.id,
    v_conversation.business_id,
    v_conversation.status,
    p_status,
    case when p_status = 'SNOOZED' then p_snoozed_until else null end,
    true,
    false,
    null::text,
    v_event_id;
end;
$$;

create or replace function public.wa_open_conversation_on_inbound()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_previous_status text;
begin
  if new.direction <> 'INBOUND' or new.sender_type <> 'CUSTOMER' then
    return new;
  end if;

  select conversation.status
  into v_previous_status
  from public.wa_conversations as conversation
  where conversation.business_id = new.business_id
    and conversation.id = new.conversation_id
  for update;

  if v_previous_status not in ('PENDING', 'SNOOZED') then
    return new;
  end if;

  update public.wa_conversations as conversation
  set
    status = 'OPEN',
    pending_at = null,
    snoozed_until = null,
    closed_at = null
  where conversation.business_id = new.business_id
    and conversation.id = new.conversation_id;

  insert into public.wa_conversation_events (
    business_id,
    conversation_id,
    event_type,
    actor_type,
    payload,
    created_at
  )
  values (
    new.business_id,
    new.conversation_id,
    'REOPENED',
    'CUSTOMER',
    jsonb_build_object(
      'previousStatus', v_previous_status,
      'status', 'OPEN',
      'source', 'WHATSAPP_INBOUND',
      'messageId', new.id
    ),
    coalesce(new.received_at, new.created_at, now())
  );

  return new;
end;
$$;

drop trigger if exists wa_conversation_messages_open_on_inbound
  on public.wa_conversation_messages;
create trigger wa_conversation_messages_open_on_inbound
after insert on public.wa_conversation_messages
for each row execute function public.wa_open_conversation_on_inbound();

create or replace function public.wa_wake_due_snoozed_conversations(
  p_limit integer default 50
)
returns table (
  awakened_conversation_id uuid,
  awakened_business_id text,
  awakened_event_id uuid
)
language plpgsql
set search_path = public
as $$
declare
  v_conversation public.wa_conversations%rowtype;
  v_event_id uuid;
begin
  if p_limit not between 1 and 100 then
    raise exception 'limit must be between 1 and 100';
  end if;

  for v_conversation in
    select conversation.*
    from public.wa_conversations as conversation
    where conversation.status = 'SNOOZED'
      and conversation.snoozed_until is not null
      and conversation.snoozed_until <= now()
    order by conversation.snoozed_until, conversation.id
    for update skip locked
    limit p_limit
  loop
    update public.wa_conversations as conversation
    set
      status = 'OPEN',
      pending_at = null,
      snoozed_until = null,
      closed_at = null
    where conversation.business_id = v_conversation.business_id
      and conversation.id = v_conversation.id;

    insert into public.wa_conversation_events (
      business_id,
      conversation_id,
      event_type,
      actor_type,
      payload
    )
    values (
      v_conversation.business_id,
      v_conversation.id,
      'REOPENED',
      'SYSTEM',
      jsonb_build_object(
        'previousStatus', 'SNOOZED',
        'status', 'OPEN',
        'source', 'SNOOZE_EXPIRED',
        'snoozedUntil', v_conversation.snoozed_until
      )
    )
    returning id into v_event_id;

    awakened_conversation_id := v_conversation.id;
    awakened_business_id := v_conversation.business_id;
    awakened_event_id := v_event_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.wa_change_conversation_lifecycle(
  text, uuid, text, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.wa_change_conversation_lifecycle(
  text, uuid, text, text, text, text, timestamptz
) to service_role;

revoke all on function public.wa_open_conversation_on_inbound()
  from public, anon, authenticated;

revoke all on function public.wa_wake_due_snoozed_conversations(integer)
  from public, anon, authenticated;
grant execute on function public.wa_wake_due_snoozed_conversations(integer)
  to service_role;

commit;
