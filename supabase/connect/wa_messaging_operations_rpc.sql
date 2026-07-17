-- Atomic message ingestion and monotonic provider-status updates for the
-- Flow Manager conversation timeline.
--
-- Prerequisite: wa_flow_manager_core_schema.sql

begin;

create table if not exists public.wa_inbound_message_processing (
  business_id text not null references public.wa_businesses(id) on delete cascade,
  message_id uuid not null,
  status text not null default 'PENDING',
  attempts integer not null default 0,
  lease_expires_at timestamptz,
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, message_id),
  foreign key (business_id, message_id)
    references public.wa_conversation_messages(business_id, id) on delete cascade,
  check (status in ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
  check (attempts >= 0)
);

create index if not exists wa_inbound_message_processing_retry_idx
  on public.wa_inbound_message_processing (status, lease_expires_at, updated_at)
  where status in ('PENDING', 'PROCESSING', 'FAILED');

alter table public.wa_inbound_message_processing enable row level security;

create or replace function public.wa_ingest_inbound_message(
  p_business_id text,
  p_connection_id text,
  p_customer_phone text,
  p_meta_message_id text,
  p_message_type text,
  p_body text,
  p_received_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  contact_id uuid,
  conversation_id uuid,
  message_id uuid,
  inserted boolean,
  should_process boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
  v_conversation_id uuid;
  v_message_id uuid;
  v_conversation_created boolean := false;
  v_inserted boolean := false;
  v_should_process boolean := false;
  v_received_at timestamptz := coalesce(p_received_at, now());
  v_body text := left(coalesce(nullif(trim(p_body), ''), 'Unsupported WhatsApp message'), 4000);
begin
  if nullif(trim(p_business_id), '') is null then
    raise exception 'business_id is required';
  end if;
  if nullif(trim(p_customer_phone), '') is null then
    raise exception 'customer_phone is required';
  end if;
  if nullif(trim(p_meta_message_id), '') is null then
    raise exception 'meta_message_id is required';
  end if;
  if p_message_type not in ('TEXT', 'INTERACTIVE', 'IMAGE', 'AUDIO', 'DOCUMENT') then
    raise exception 'Unsupported inbound message_type: %', p_message_type;
  end if;
  if jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'metadata must be a JSON object';
  end if;

  insert into public.wa_contacts (
    business_id,
    phone_e164,
    first_seen_at,
    last_seen_at,
    created_at,
    updated_at
  )
  values (
    p_business_id,
    trim(p_customer_phone),
    v_received_at,
    v_received_at,
    v_received_at,
    v_received_at
  )
  on conflict (business_id, phone_e164) do update
  set
    last_seen_at = greatest(public.wa_contacts.last_seen_at, excluded.last_seen_at),
    updated_at = greatest(public.wa_contacts.updated_at, excluded.updated_at)
  returning id into v_contact_id;

  select conversation.id
  into v_conversation_id
  from public.wa_conversations as conversation
  where conversation.business_id = p_business_id
    and conversation.contact_id = v_contact_id
    and conversation.connection_id is not distinct from p_connection_id
    and conversation.status in ('OPEN', 'PENDING', 'SNOOZED')
  order by conversation.created_at desc
  limit 1
  for update;

  if v_conversation_id is null then
    begin
      insert into public.wa_conversations (
        business_id,
        contact_id,
        connection_id,
        status,
        unread_count,
        opened_at,
        created_at,
        updated_at
      )
      values (
        p_business_id,
        v_contact_id,
        p_connection_id,
        'OPEN',
        0,
        v_received_at,
        v_received_at,
        v_received_at
      )
      returning id into v_conversation_id;
      v_conversation_created := true;
    exception
      when unique_violation then
        select conversation.id
        into v_conversation_id
        from public.wa_conversations as conversation
        where conversation.business_id = p_business_id
          and conversation.contact_id = v_contact_id
          and conversation.connection_id is not distinct from p_connection_id
          and conversation.status in ('OPEN', 'PENDING', 'SNOOZED')
        order by conversation.created_at desc
        limit 1
        for update;
    end;
  end if;

  insert into public.wa_conversation_messages (
    business_id,
    conversation_id,
    contact_id,
    connection_id,
    direction,
    sender_type,
    message_type,
    body,
    meta_message_id,
    status,
    metadata,
    received_at,
    created_at
  )
  values (
    p_business_id,
    v_conversation_id,
    v_contact_id,
    p_connection_id,
    'INBOUND',
    'CUSTOMER',
    p_message_type,
    v_body,
    trim(p_meta_message_id),
    'RECEIVED',
    coalesce(p_metadata, '{}'::jsonb),
    v_received_at,
    v_received_at
  )
  on conflict (business_id, meta_message_id)
    where meta_message_id is not null
  do nothing
  returning id into v_message_id;

  if v_message_id is null then
    select message.id, message.conversation_id, message.contact_id
    into v_message_id, v_conversation_id, v_contact_id
    from public.wa_conversation_messages as message
    where message.business_id = p_business_id
      and message.meta_message_id = trim(p_meta_message_id)
    limit 1;

  else
    v_inserted := true;
  end if;

  if v_inserted then
    update public.wa_conversations
    set
      unread_count = unread_count + 1,
      last_message_preview = left(v_body, 500),
      last_message_at = greatest(coalesce(last_message_at, v_received_at), v_received_at),
      last_customer_message_at = greatest(
        coalesce(last_customer_message_at, v_received_at),
        v_received_at
      ),
      updated_at = greatest(updated_at, v_received_at)
    where business_id = p_business_id
      and id = v_conversation_id;

    if v_conversation_created then
      insert into public.wa_conversation_events (
        business_id,
        conversation_id,
        event_type,
        actor_type,
        payload,
        created_at
      )
      values (
        p_business_id,
        v_conversation_id,
        'CREATED',
        'CUSTOMER',
        jsonb_build_object('source', 'WHATSAPP_INBOUND'),
        v_received_at
      );
    end if;
  end if;

  insert into public.wa_inbound_message_processing as processing (
    business_id,
    message_id,
    status,
    attempts,
    lease_expires_at,
    created_at,
    updated_at
  )
  values (
    p_business_id,
    v_message_id,
    'PROCESSING',
    1,
    now() + interval '5 minutes',
    now(),
    now()
  )
  on conflict on constraint wa_inbound_message_processing_pkey do update
  set
    status = 'PROCESSING',
    attempts = processing.attempts + 1,
    lease_expires_at = now() + interval '5 minutes',
    last_error = null,
    updated_at = now()
  where processing.status in ('PENDING', 'FAILED')
    or (
      processing.status = 'PROCESSING'
      and processing.lease_expires_at <= now()
    )
  returning true into v_should_process;

  v_should_process := coalesce(v_should_process, false);
  return query
    select v_contact_id, v_conversation_id, v_message_id, v_inserted, v_should_process;
end;
$$;

create or replace function public.wa_finish_inbound_message_processing(
  p_business_id text,
  p_meta_message_id text,
  p_succeeded boolean,
  p_error_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
begin
  update public.wa_inbound_message_processing as processing
  set
    status = case when p_succeeded then 'PROCESSED' else 'FAILED' end,
    lease_expires_at = null,
    processed_at = case when p_succeeded then now() else processing.processed_at end,
    last_error = case when p_succeeded then null else left(p_error_message, 1000) end,
    updated_at = now()
  from public.wa_conversation_messages as message
  where processing.business_id = p_business_id
    and message.business_id = processing.business_id
    and message.id = processing.message_id
    and message.meta_message_id = trim(p_meta_message_id)
    and processing.status = 'PROCESSING'
  returning processing.message_id into v_message_id;

  return v_message_id;
end;
$$;

create or replace function public.wa_apply_message_status(
  p_business_id text,
  p_meta_message_id text,
  p_status text,
  p_occurred_at timestamptz,
  p_error_code text default null,
  p_error_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
  v_occurred_at timestamptz := coalesce(p_occurred_at, now());
begin
  if p_status not in ('SENT', 'DELIVERED', 'READ', 'FAILED') then
    return null;
  end if;

  update public.wa_conversation_messages as message
  set
    status = case
      when message.status in ('READ', 'FAILED') then message.status
      when p_status = 'FAILED' then 'FAILED'
      when p_status = 'READ' then 'READ'
      when message.status = 'DELIVERED' then 'DELIVERED'
      when p_status = 'DELIVERED' then 'DELIVERED'
      when message.status = 'SENT' then 'SENT'
      else p_status
    end,
    sent_at = case
      when p_status = 'SENT' then coalesce(message.sent_at, v_occurred_at)
      else message.sent_at
    end,
    delivered_at = case
      when p_status = 'DELIVERED' then coalesce(message.delivered_at, v_occurred_at)
      else message.delivered_at
    end,
    read_at = case
      when p_status = 'READ' then coalesce(message.read_at, v_occurred_at)
      else message.read_at
    end,
    error_code = case when p_status = 'FAILED' then left(p_error_code, 120) else message.error_code end,
    error_message = case
      when p_status = 'FAILED' then left(p_error_message, 1000)
      else message.error_message
    end
  where message.business_id = p_business_id
    and message.meta_message_id = trim(p_meta_message_id)
  returning message.id into v_message_id;

  return v_message_id;
end;
$$;

create or replace function public.wa_link_conversation_runtime(
  p_business_id text,
  p_conversation_id uuid,
  p_business_flow_id text,
  p_flow_version_id text,
  p_current_node_id text,
  p_handoff_paused boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_business_flow_id text;
  v_previous_flow_version_id text;
begin
  if nullif(trim(p_business_id), '') is null then
    raise exception 'business_id is required';
  end if;
  if nullif(trim(p_business_flow_id), '') is null then
    raise exception 'business_flow_id is required';
  end if;
  if nullif(trim(p_flow_version_id), '') is null then
    raise exception 'flow_version_id is required';
  end if;

  if not exists (
    select 1
    from public.wa_business_flow_versions as version
    join public.wa_business_flows as flow
      on flow.id = version.business_flow_id
    where version.id = p_flow_version_id
      and version.business_flow_id = p_business_flow_id
      and flow.business_id = p_business_id
  ) then
    raise exception 'Flow runtime linkage does not belong to the business';
  end if;

  select
    conversation.business_flow_id,
    conversation.flow_version_id
  into
    v_previous_business_flow_id,
    v_previous_flow_version_id
  from public.wa_conversations as conversation
  where conversation.business_id = p_business_id
    and conversation.id = p_conversation_id
  for update;

  if not found then
    raise exception 'Conversation was not found for the business';
  end if;

  update public.wa_conversations
  set
    business_flow_id = p_business_flow_id,
    flow_version_id = p_flow_version_id,
    current_node_id = p_current_node_id,
    updated_at = now()
  where business_id = p_business_id
    and id = p_conversation_id;

  if v_previous_business_flow_id is distinct from p_business_flow_id
    or v_previous_flow_version_id is distinct from p_flow_version_id
    or not exists (
      select 1
      from public.wa_conversation_events as event
      where event.business_id = p_business_id
        and event.conversation_id = p_conversation_id
        and event.event_type = 'FLOW_STARTED'
        and event.payload ->> 'flowVersionId' = p_flow_version_id
    )
  then
    insert into public.wa_conversation_events (
      business_id,
      conversation_id,
      event_type,
      actor_type,
      payload
    )
    values (
      p_business_id,
      p_conversation_id,
      'FLOW_STARTED',
      'BOT',
      jsonb_build_object(
        'businessFlowId', p_business_flow_id,
        'flowVersionId', p_flow_version_id,
        'currentNodeId', p_current_node_id
      )
    );
  end if;

  if coalesce(p_handoff_paused, false)
    and not exists (
      select 1
      from public.wa_conversation_events as event
      where event.business_id = p_business_id
        and event.conversation_id = p_conversation_id
        and event.event_type = 'FLOW_STOPPED'
        and event.payload ->> 'reason' = 'HUMAN_HANDOFF'
        and event.payload ->> 'flowVersionId' = p_flow_version_id
        and event.payload ->> 'currentNodeId' is not distinct from p_current_node_id
    )
  then
    insert into public.wa_conversation_events (
      business_id,
      conversation_id,
      event_type,
      actor_type,
      payload
    )
    values (
      p_business_id,
      p_conversation_id,
      'FLOW_STOPPED',
      'BOT',
      jsonb_build_object(
        'reason', 'HUMAN_HANDOFF',
        'businessFlowId', p_business_flow_id,
        'flowVersionId', p_flow_version_id,
        'currentNodeId', p_current_node_id
      )
    );
  end if;

  return true;
end;
$$;

revoke all on function public.wa_ingest_inbound_message(
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb
) from public, anon, authenticated;

revoke all on function public.wa_apply_message_status(
  text,
  text,
  text,
  timestamptz,
  text,
  text
) from public, anon, authenticated;

revoke all on function public.wa_finish_inbound_message_processing(
  text,
  text,
  boolean,
  text
) from public, anon, authenticated;

revoke all on function public.wa_link_conversation_runtime(
  text,
  uuid,
  text,
  text,
  text,
  boolean
) from public, anon, authenticated;

grant execute on function public.wa_ingest_inbound_message(
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb
) to service_role;

grant execute on function public.wa_apply_message_status(
  text,
  text,
  text,
  timestamptz,
  text,
  text
) to service_role;

grant execute on function public.wa_finish_inbound_message_processing(
  text,
  text,
  boolean,
  text
) to service_role;

grant execute on function public.wa_link_conversation_runtime(
  text,
  uuid,
  text,
  text,
  text,
  boolean
) to service_role;

grant select, insert, update, delete on public.wa_inbound_message_processing to service_role;

commit;
