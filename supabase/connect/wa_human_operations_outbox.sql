-- Durable, retry-safe human WhatsApp text replies for Flow Manager.
-- Prerequisites: wa_flow_manager_core_schema.sql and wa_messaging_operations_rpc.sql.

begin;

create table if not exists public.wa_human_outbox (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  conversation_id uuid not null,
  contact_id uuid not null,
  connection_id text,
  message_id uuid,
  idempotency_key text not null,
  message_type text not null default 'TEXT',
  body text not null,
  requested_by_kind text not null,
  requested_by_username text not null,
  requested_by_user_id uuid,
  status text not null default 'PENDING',
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz,
  lease_expires_at timestamptz,
  meta_message_id text,
  error_code text,
  error_message text,
  service_window_expires_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, idempotency_key),
  foreign key (business_id, conversation_id)
    references public.wa_conversations(business_id, id) on delete cascade,
  foreign key (business_id, contact_id)
    references public.wa_contacts(business_id, id) on delete restrict,
  foreign key (business_id, connection_id)
    references public.wa_whatsapp_connections(business_id, id) on delete restrict,
  foreign key (business_id, message_id)
    references public.wa_conversation_messages(business_id, id) on delete restrict,
  foreign key (business_id, requested_by_user_id)
    references public.wa_business_users(business_id, id) on delete restrict,
  check (length(trim(idempotency_key)) between 8 and 200),
  check (message_type = 'TEXT'),
  check (length(trim(body)) between 1 and 4096),
  check (requested_by_kind in ('INTERNAL_ADMIN', 'BUSINESS_USER')),
  check (length(trim(requested_by_username)) between 1 and 320),
  check (status in (
    'PENDING', 'SENDING', 'SENT', 'RETRYABLE', 'FAILED', 'BLOCKED', 'CANCELLED'
  )),
  check (attempt_count >= 0),
  check (max_attempts between 1 and 10)
);

create unique index if not exists wa_human_outbox_message_uidx
  on public.wa_human_outbox (business_id, message_id)
  where message_id is not null;

create unique index if not exists wa_human_outbox_meta_uidx
  on public.wa_human_outbox (business_id, meta_message_id)
  where meta_message_id is not null;

create index if not exists wa_human_outbox_due_idx
  on public.wa_human_outbox (status, next_attempt_at, created_at)
  where status in ('PENDING', 'RETRYABLE', 'SENDING');

create index if not exists wa_human_outbox_conversation_idx
  on public.wa_human_outbox (business_id, conversation_id, created_at desc);

create table if not exists public.wa_human_outbox_attempts (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  outbox_id uuid not null,
  attempt_number integer not null,
  status text not null default 'SENDING',
  http_status integer,
  retryable boolean,
  meta_message_id text,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (outbox_id, attempt_number),
  foreign key (business_id, outbox_id)
    references public.wa_human_outbox(business_id, id) on delete cascade,
  check (attempt_number >= 1),
  check (status in ('SENDING', 'SENT', 'RETRYABLE', 'FAILED', 'CANCELLED')),
  check (http_status is null or http_status >= 0)
);

create index if not exists wa_human_outbox_attempts_outbox_idx
  on public.wa_human_outbox_attempts (business_id, outbox_id, attempt_number desc);

drop trigger if exists wa_human_outbox_set_updated_at on public.wa_human_outbox;
create trigger wa_human_outbox_set_updated_at
before update on public.wa_human_outbox
for each row execute function public.wa_set_updated_at();

create or replace function public.wa_claim_human_text_reply(
  p_business_id text,
  p_conversation_id uuid,
  p_idempotency_key text,
  p_body text,
  p_requested_by_kind text,
  p_requested_by_username text
)
returns table (
  outbox_id uuid,
  message_id uuid,
  business_id text,
  conversation_id uuid,
  connection_id text,
  recipient_phone text,
  outbox_status text,
  attempt_number integer,
  should_send boolean,
  block_code text,
  service_window_expires_at timestamptz
)
language plpgsql
set search_path = public
as $$
declare
  v_conversation public.wa_conversations%rowtype;
  v_contact public.wa_contacts%rowtype;
  v_existing public.wa_human_outbox%rowtype;
  v_outbox_id uuid;
  v_message_id uuid;
  v_window_expires_at timestamptz;
begin
  if nullif(trim(p_business_id), '') is null then
    raise exception 'business_id is required';
  end if;
  if p_conversation_id is null then
    raise exception 'conversation_id is required';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 200 then
    raise exception 'idempotency_key is invalid';
  end if;
  if length(trim(coalesce(p_body, ''))) not between 1 and 4096 then
    raise exception 'body is invalid';
  end if;
  if p_requested_by_kind not in ('INTERNAL_ADMIN', 'BUSINESS_USER') then
    raise exception 'requested_by_kind is invalid';
  end if;
  if length(trim(coalesce(p_requested_by_username, ''))) not between 1 and 320 then
    raise exception 'requested_by_username is invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id || ':' || trim(p_idempotency_key), 0));

  select outbox.*
  into v_existing
  from public.wa_human_outbox as outbox
  where outbox.business_id = p_business_id
    and outbox.idempotency_key = trim(p_idempotency_key);

  if found then
    select contact.phone_e164
    into v_contact.phone_e164
    from public.wa_contacts as contact
    where contact.business_id = v_existing.business_id
      and contact.id = v_existing.contact_id;

    if v_existing.conversation_id <> p_conversation_id
       or v_existing.body <> trim(p_body) then
      return query
      select
        v_existing.id,
        v_existing.message_id,
        v_existing.business_id,
        v_existing.conversation_id,
        v_existing.connection_id,
        v_contact.phone_e164,
        v_existing.status,
        v_existing.attempt_count,
        false,
        'IDEMPOTENCY_CONFLICT'::text,
        v_existing.service_window_expires_at;
      return;
    end if;

    return query
    select
      v_existing.id,
      v_existing.message_id,
      v_existing.business_id,
      v_existing.conversation_id,
      v_existing.connection_id,
      v_contact.phone_e164,
      v_existing.status,
      v_existing.attempt_count,
      false,
      case when v_existing.status = 'BLOCKED' then coalesce(v_existing.error_code, 'TEMPLATE_REQUIRED') end,
      v_existing.service_window_expires_at;
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
  if v_conversation.status = 'CLOSED' then
    raise exception 'Conversation must be reopened before replying';
  end if;

  select contact.*
  into v_contact
  from public.wa_contacts as contact
  where contact.business_id = p_business_id
    and contact.id = v_conversation.contact_id;

  if not found then
    raise exception 'Conversation contact was not found for the business';
  end if;

  v_window_expires_at := v_conversation.last_customer_message_at + interval '24 hours';
  if v_conversation.last_customer_message_at is null or v_window_expires_at <= now() then
    insert into public.wa_human_outbox (
      business_id,
      conversation_id,
      contact_id,
      connection_id,
      idempotency_key,
      body,
      requested_by_kind,
      requested_by_username,
      status,
      error_code,
      error_message,
      service_window_expires_at
    )
    values (
      p_business_id,
      p_conversation_id,
      v_conversation.contact_id,
      v_conversation.connection_id,
      trim(p_idempotency_key),
      trim(p_body),
      p_requested_by_kind,
      trim(p_requested_by_username),
      'BLOCKED',
      'TEMPLATE_REQUIRED',
      'The WhatsApp customer-service window is closed.',
      v_window_expires_at
    )
    returning id into v_outbox_id;

    return query
    select
      v_outbox_id,
      null::uuid,
      p_business_id,
      p_conversation_id,
      v_conversation.connection_id,
      v_contact.phone_e164,
      'BLOCKED'::text,
      0,
      false,
      'TEMPLATE_REQUIRED'::text,
      v_window_expires_at;
    return;
  end if;

  if v_conversation.connection_id is null then
    raise exception 'Conversation has no WhatsApp connection';
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
    status,
    metadata
  )
  values (
    p_business_id,
    p_conversation_id,
    v_conversation.contact_id,
    v_conversation.connection_id,
    'OUTBOUND',
    'HUMAN',
    'TEXT',
    trim(p_body),
    'SENDING',
    jsonb_build_object(
      'idempotencyKey', trim(p_idempotency_key),
      'requestedByKind', p_requested_by_kind,
      'requestedByUsername', trim(p_requested_by_username)
    )
  )
  returning id into v_message_id;

  insert into public.wa_human_outbox (
    business_id,
    conversation_id,
    contact_id,
    connection_id,
    message_id,
    idempotency_key,
    body,
    requested_by_kind,
    requested_by_username,
    status,
    attempt_count,
    lease_expires_at,
    service_window_expires_at
  )
  values (
    p_business_id,
    p_conversation_id,
    v_conversation.contact_id,
    v_conversation.connection_id,
    v_message_id,
    trim(p_idempotency_key),
    trim(p_body),
    p_requested_by_kind,
    trim(p_requested_by_username),
    'SENDING',
    1,
    now() + interval '2 minutes',
    v_window_expires_at
  )
  returning id into v_outbox_id;

  insert into public.wa_human_outbox_attempts (
    business_id,
    outbox_id,
    attempt_number,
    status
  )
  values (p_business_id, v_outbox_id, 1, 'SENDING');

  return query
  select
    v_outbox_id,
    v_message_id,
    p_business_id,
    p_conversation_id,
    v_conversation.connection_id,
    v_contact.phone_e164,
    'SENDING'::text,
    1,
    true,
    null::text,
    v_window_expires_at;
end;
$$;

create or replace function public.wa_complete_human_text_reply(
  p_business_id text,
  p_outbox_id uuid,
  p_attempt_number integer,
  p_succeeded boolean,
  p_http_status integer default null,
  p_meta_message_id text default null,
  p_error_code text default null,
  p_error_message text default null,
  p_retryable boolean default false
)
returns table (
  outbox_id uuid,
  message_id uuid,
  outbox_status text,
  attempt_number integer,
  next_attempt_at timestamptz
)
language plpgsql
set search_path = public
as $$
declare
  v_outbox public.wa_human_outbox%rowtype;
  v_status text;
  v_next_attempt_at timestamptz;
begin
  select outbox.*
  into v_outbox
  from public.wa_human_outbox as outbox
  where outbox.business_id = p_business_id
    and outbox.id = p_outbox_id
  for update;

  if not found then
    raise exception 'Human outbox item was not found for the business';
  end if;
  if v_outbox.status <> 'SENDING' or v_outbox.attempt_count <> p_attempt_number then
    raise exception 'Human outbox attempt is not current';
  end if;

  if p_succeeded and nullif(trim(coalesce(p_meta_message_id, '')), '') is null then
    p_succeeded := false;
    p_retryable := true;
    p_error_code := 'PROVIDER_ID_MISSING';
    p_error_message := 'WhatsApp accepted the request without returning a message ID.';
  end if;

  if p_succeeded then
    v_status := 'SENT';
    v_next_attempt_at := null;
  elsif coalesce(p_retryable, false) and v_outbox.attempt_count < v_outbox.max_attempts then
    v_status := 'RETRYABLE';
    v_next_attempt_at := now() + case
      when v_outbox.attempt_count = 1 then interval '30 seconds'
      when v_outbox.attempt_count = 2 then interval '1 minute'
      else interval '5 minutes'
    end;
  else
    v_status := 'FAILED';
    v_next_attempt_at := null;
  end if;

  update public.wa_human_outbox_attempts as attempt
  set
    status = v_status,
    http_status = p_http_status,
    retryable = coalesce(p_retryable, false),
    meta_message_id = nullif(trim(p_meta_message_id), ''),
    error_code = left(nullif(trim(p_error_code), ''), 120),
    error_message = left(nullif(trim(p_error_message), ''), 1000),
    completed_at = now()
  where attempt.business_id = p_business_id
    and attempt.outbox_id = p_outbox_id
    and attempt.attempt_number = p_attempt_number;

  update public.wa_human_outbox
  set
    status = v_status,
    next_attempt_at = v_next_attempt_at,
    lease_expires_at = null,
    meta_message_id = case when p_succeeded then trim(p_meta_message_id) else meta_message_id end,
    error_code = case when p_succeeded then null else left(nullif(trim(p_error_code), ''), 120) end,
    error_message = case when p_succeeded then null else left(nullif(trim(p_error_message), ''), 1000) end,
    sent_at = case when p_succeeded then now() else sent_at end
  where business_id = p_business_id
    and id = p_outbox_id;

  if v_outbox.message_id is not null then
    update public.wa_conversation_messages
    set
      status = case
        when p_succeeded then 'SENT'
        when v_status = 'RETRYABLE' then 'QUEUED'
        else 'FAILED'
      end,
      meta_message_id = case when p_succeeded then trim(p_meta_message_id) else meta_message_id end,
      error_code = case when p_succeeded then null else left(nullif(trim(p_error_code), ''), 120) end,
      error_message = case when p_succeeded then null else left(nullif(trim(p_error_message), ''), 1000) end,
      sent_at = case when p_succeeded then now() else sent_at end
    where business_id = p_business_id
      and id = v_outbox.message_id;
  end if;

  if p_succeeded then
    update public.wa_conversations
    set
      last_message_preview = left(v_outbox.body, 500),
      last_message_at = now(),
      last_agent_message_at = now()
    where business_id = p_business_id
      and id = v_outbox.conversation_id;
  end if;

  return query
  select p_outbox_id, v_outbox.message_id, v_status, p_attempt_number, v_next_attempt_at;
end;
$$;

alter table public.wa_human_outbox enable row level security;
alter table public.wa_human_outbox_attempts enable row level security;

revoke all on table public.wa_human_outbox from public, anon, authenticated;
revoke all on table public.wa_human_outbox_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.wa_human_outbox to service_role;
grant select, insert, update, delete on public.wa_human_outbox_attempts to service_role;

revoke all on function public.wa_claim_human_text_reply(text, uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.wa_claim_human_text_reply(text, uuid, text, text, text, text)
  to service_role;

revoke all on function public.wa_complete_human_text_reply(
  text, uuid, integer, boolean, integer, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.wa_complete_human_text_reply(
  text, uuid, integer, boolean, integer, text, text, text, boolean
) to service_role;

commit;
