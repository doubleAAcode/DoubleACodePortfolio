-- Repair the deployed inbound-ingest RPC after production exposed an ambiguous
-- reference between its message_id return column and processing-table column.
-- Prerequisite: wa_messaging_operations_rpc.sql

begin;

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

commit;
