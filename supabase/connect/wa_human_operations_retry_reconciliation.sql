-- Retry claiming and ambiguous-send reconciliation for human WhatsApp replies.
-- Prerequisite: wa_human_operations_outbox.sql.

begin;

alter table public.wa_human_outbox
  drop constraint if exists wa_human_outbox_status_check;
alter table public.wa_human_outbox
  add constraint wa_human_outbox_status_check check (status in (
    'PENDING',
    'SENDING',
    'SENT',
    'RETRYABLE',
    'FAILED',
    'BLOCKED',
    'RECONCILIATION_REQUIRED',
    'CANCELLED'
  ));

alter table public.wa_human_outbox_attempts
  add column if not exists resolution text,
  add column if not exists resolved_by_username text,
  add column if not exists resolved_at timestamptz;

alter table public.wa_human_outbox_attempts
  drop constraint if exists wa_human_outbox_attempts_status_check;
alter table public.wa_human_outbox_attempts
  add constraint wa_human_outbox_attempts_status_check check (status in (
    'SENDING',
    'SENT',
    'RETRYABLE',
    'FAILED',
    'RECONCILIATION_REQUIRED',
    'CANCELLED'
  ));

alter table public.wa_human_outbox_attempts
  drop constraint if exists wa_human_outbox_attempts_resolution_check;
alter table public.wa_human_outbox_attempts
  add constraint wa_human_outbox_attempts_resolution_check check (
    resolution is null or resolution in ('CONFIRM_SENT', 'CONFIRM_FAILED', 'RETRY')
  );

create index if not exists wa_human_outbox_expired_lease_idx
  on public.wa_human_outbox (lease_expires_at, created_at)
  where status = 'SENDING';

create index if not exists wa_human_outbox_reconciliation_idx
  on public.wa_human_outbox (updated_at, id)
  where status = 'RECONCILIATION_REQUIRED';

create or replace function public.wa_quarantine_expired_human_sends(
  p_limit integer default 50
)
returns table (
  quarantined_outbox_id uuid,
  quarantined_business_id text,
  quarantined_message_id uuid,
  quarantined_attempt_number integer
)
language plpgsql
set search_path = public
as $$
declare
  v_outbox public.wa_human_outbox%rowtype;
begin
  if p_limit not between 1 and 100 then
    raise exception 'limit must be between 1 and 100';
  end if;

  for v_outbox in
    select outbox.*
    from public.wa_human_outbox as outbox
    where outbox.status = 'SENDING'
      and outbox.lease_expires_at is not null
      and outbox.lease_expires_at <= now()
    order by outbox.lease_expires_at, outbox.created_at
    for update skip locked
    limit p_limit
  loop
    update public.wa_human_outbox_attempts as attempt
    set
      status = 'RECONCILIATION_REQUIRED',
      retryable = false,
      error_code = 'SEND_OUTCOME_UNKNOWN',
      error_message = 'The send lease expired before a provider result was durably recorded.'
    where attempt.business_id = v_outbox.business_id
      and attempt.outbox_id = v_outbox.id
      and attempt.attempt_number = v_outbox.attempt_count
      and attempt.status = 'SENDING';

    update public.wa_human_outbox as outbox
    set
      status = 'RECONCILIATION_REQUIRED',
      next_attempt_at = null,
      lease_expires_at = null,
      error_code = 'SEND_OUTCOME_UNKNOWN',
      error_message = 'The provider outcome is unknown. Confirm the result before retrying.'
    where outbox.business_id = v_outbox.business_id
      and outbox.id = v_outbox.id;

    if v_outbox.message_id is not null then
      update public.wa_conversation_messages as message
      set
        status = 'FAILED',
        error_code = 'SEND_OUTCOME_UNKNOWN',
        error_message = 'The provider outcome is unknown and requires reconciliation.'
      where message.business_id = v_outbox.business_id
        and message.id = v_outbox.message_id;
    end if;

    quarantined_outbox_id := v_outbox.id;
    quarantined_business_id := v_outbox.business_id;
    quarantined_message_id := v_outbox.message_id;
    quarantined_attempt_number := v_outbox.attempt_count;
    return next;
  end loop;
end;
$$;

create or replace function public.wa_claim_due_human_text_replies(
  p_limit integer default 10,
  p_lease_seconds integer default 120
)
returns table (
  outbox_id uuid,
  message_id uuid,
  business_id text,
  conversation_id uuid,
  connection_id text,
  recipient_phone text,
  body text,
  attempt_number integer,
  service_window_expires_at timestamptz,
  should_send boolean,
  block_code text
)
language plpgsql
set search_path = public
as $$
declare
  v_outbox public.wa_human_outbox%rowtype;
  v_recipient_phone text;
  v_attempt_number integer;
begin
  if p_limit not between 1 and 50 then
    raise exception 'limit must be between 1 and 50';
  end if;
  if p_lease_seconds not between 30 and 600 then
    raise exception 'lease_seconds must be between 30 and 600';
  end if;

  for v_outbox in
    select outbox.*
    from public.wa_human_outbox as outbox
    where outbox.status = 'RETRYABLE'
      and outbox.next_attempt_at is not null
      and outbox.next_attempt_at <= now()
    order by outbox.next_attempt_at, outbox.created_at
    for update skip locked
    limit p_limit
  loop
    select contact.phone_e164
    into v_recipient_phone
    from public.wa_contacts as contact
    where contact.business_id = v_outbox.business_id
      and contact.id = v_outbox.contact_id;

    if v_outbox.attempt_count >= v_outbox.max_attempts then
      update public.wa_human_outbox as outbox
      set
        status = 'FAILED',
        next_attempt_at = null,
        lease_expires_at = null,
        error_code = 'MAX_ATTEMPTS_REACHED',
        error_message = 'The human reply exhausted its retry attempts.'
      where outbox.business_id = v_outbox.business_id
        and outbox.id = v_outbox.id;

      if v_outbox.message_id is not null then
        update public.wa_conversation_messages as message
        set
          status = 'FAILED',
          error_code = 'MAX_ATTEMPTS_REACHED',
          error_message = 'The human reply exhausted its retry attempts.'
        where message.business_id = v_outbox.business_id
          and message.id = v_outbox.message_id;
      end if;

      return query select
        v_outbox.id,
        v_outbox.message_id,
        v_outbox.business_id,
        v_outbox.conversation_id,
        v_outbox.connection_id,
        v_recipient_phone,
        v_outbox.body,
        v_outbox.attempt_count,
        v_outbox.service_window_expires_at,
        false,
        'MAX_ATTEMPTS_REACHED'::text;
      continue;
    end if;

    if v_outbox.service_window_expires_at is null
       or v_outbox.service_window_expires_at <= now() then
      update public.wa_human_outbox as outbox
      set
        status = 'BLOCKED',
        next_attempt_at = null,
        lease_expires_at = null,
        error_code = 'TEMPLATE_REQUIRED',
        error_message = 'The WhatsApp customer-service window closed before retry.'
      where outbox.business_id = v_outbox.business_id
        and outbox.id = v_outbox.id;

      if v_outbox.message_id is not null then
        update public.wa_conversation_messages as message
        set
          status = 'FAILED',
          error_code = 'TEMPLATE_REQUIRED',
          error_message = 'The WhatsApp customer-service window closed before retry.'
        where message.business_id = v_outbox.business_id
          and message.id = v_outbox.message_id;
      end if;

      return query select
        v_outbox.id,
        v_outbox.message_id,
        v_outbox.business_id,
        v_outbox.conversation_id,
        v_outbox.connection_id,
        v_recipient_phone,
        v_outbox.body,
        v_outbox.attempt_count,
        v_outbox.service_window_expires_at,
        false,
        'TEMPLATE_REQUIRED'::text;
      continue;
    end if;

    v_attempt_number := v_outbox.attempt_count + 1;

    update public.wa_human_outbox as outbox
    set
      status = 'SENDING',
      attempt_count = v_attempt_number,
      next_attempt_at = null,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      error_code = null,
      error_message = null
    where outbox.business_id = v_outbox.business_id
      and outbox.id = v_outbox.id;

    insert into public.wa_human_outbox_attempts (
      business_id,
      outbox_id,
      attempt_number,
      status
    )
    values (v_outbox.business_id, v_outbox.id, v_attempt_number, 'SENDING');

    if v_outbox.message_id is not null then
      update public.wa_conversation_messages as message
      set
        status = 'SENDING',
        error_code = null,
        error_message = null
      where message.business_id = v_outbox.business_id
        and message.id = v_outbox.message_id;
    end if;

    return query select
      v_outbox.id,
      v_outbox.message_id,
      v_outbox.business_id,
      v_outbox.conversation_id,
      v_outbox.connection_id,
      v_recipient_phone,
      v_outbox.body,
      v_attempt_number,
      v_outbox.service_window_expires_at,
      true,
      null::text;
  end loop;
end;
$$;

create or replace function public.wa_resolve_human_send_reconciliation(
  p_business_id text,
  p_outbox_id uuid,
  p_resolution text,
  p_resolved_by_username text,
  p_meta_message_id text default null,
  p_note text default null
)
returns table (
  resolved_outbox_id uuid,
  resolved_message_id uuid,
  resolved_status text,
  resolved_attempt_number integer,
  resolved_next_attempt_at timestamptz
)
language plpgsql
set search_path = public
as $$
declare
  v_outbox public.wa_human_outbox%rowtype;
  v_status text;
  v_next_attempt_at timestamptz;
  v_error_message text;
begin
  if p_resolution not in ('CONFIRM_SENT', 'CONFIRM_FAILED', 'RETRY') then
    raise exception 'resolution is invalid';
  end if;
  if length(trim(coalesce(p_resolved_by_username, ''))) not between 1 and 320 then
    raise exception 'resolved_by_username is invalid';
  end if;
  if p_resolution = 'CONFIRM_SENT'
     and nullif(trim(coalesce(p_meta_message_id, '')), '') is null then
    raise exception 'meta_message_id is required when confirming a send';
  end if;

  select outbox.*
  into v_outbox
  from public.wa_human_outbox as outbox
  where outbox.business_id = p_business_id
    and outbox.id = p_outbox_id
  for update;

  if not found then
    raise exception 'Human outbox item was not found for the business';
  end if;
  if v_outbox.status <> 'RECONCILIATION_REQUIRED' then
    raise exception 'Human outbox item does not require reconciliation';
  end if;

  v_error_message := left(
    coalesce(nullif(trim(p_note), ''), 'Resolved manually by an internal administrator.'),
    1000
  );

  if p_resolution = 'CONFIRM_SENT' then
    v_status := 'SENT';
    v_next_attempt_at := null;
  elsif p_resolution = 'RETRY'
        and v_outbox.attempt_count < v_outbox.max_attempts
        and v_outbox.service_window_expires_at is not null
        and v_outbox.service_window_expires_at > now() then
    v_status := 'RETRYABLE';
    v_next_attempt_at := now();
  elsif p_resolution = 'RETRY' then
    v_status := case
      when v_outbox.service_window_expires_at is null
        or v_outbox.service_window_expires_at <= now()
      then 'BLOCKED'
      else 'FAILED'
    end;
    v_next_attempt_at := null;
  else
    v_status := 'FAILED';
    v_next_attempt_at := null;
  end if;

  update public.wa_human_outbox_attempts as attempt
  set
    status = case when p_resolution = 'CONFIRM_SENT' then 'SENT' else 'FAILED' end,
    retryable = p_resolution = 'RETRY' and v_status = 'RETRYABLE',
    meta_message_id = case
      when p_resolution = 'CONFIRM_SENT' then trim(p_meta_message_id)
      else attempt.meta_message_id
    end,
    error_code = case
      when p_resolution = 'CONFIRM_SENT' then null
      when v_status = 'BLOCKED' then 'TEMPLATE_REQUIRED'
      when v_status = 'FAILED' and p_resolution = 'RETRY' then 'MAX_ATTEMPTS_REACHED'
      else 'MANUALLY_CONFIRMED_FAILED'
    end,
    error_message = case when p_resolution = 'CONFIRM_SENT' then null else v_error_message end,
    completed_at = now(),
    resolution = p_resolution,
    resolved_by_username = trim(p_resolved_by_username),
    resolved_at = now()
  where attempt.business_id = p_business_id
    and attempt.outbox_id = p_outbox_id
    and attempt.attempt_number = v_outbox.attempt_count
    and attempt.status = 'RECONCILIATION_REQUIRED';

  update public.wa_human_outbox as outbox
  set
    status = v_status,
    next_attempt_at = v_next_attempt_at,
    lease_expires_at = null,
    meta_message_id = case
      when p_resolution = 'CONFIRM_SENT' then trim(p_meta_message_id)
      else outbox.meta_message_id
    end,
    error_code = case
      when p_resolution = 'CONFIRM_SENT' then null
      when v_status = 'BLOCKED' then 'TEMPLATE_REQUIRED'
      when v_status = 'FAILED' and p_resolution = 'RETRY' then 'MAX_ATTEMPTS_REACHED'
      when v_status = 'RETRYABLE' then null
      else 'MANUALLY_CONFIRMED_FAILED'
    end,
    error_message = case
      when p_resolution = 'CONFIRM_SENT' or v_status = 'RETRYABLE' then null
      else v_error_message
    end,
    sent_at = case when p_resolution = 'CONFIRM_SENT' then now() else outbox.sent_at end
  where outbox.business_id = p_business_id
    and outbox.id = p_outbox_id;

  if v_outbox.message_id is not null then
    update public.wa_conversation_messages as message
    set
      status = case
        when p_resolution = 'CONFIRM_SENT' then 'SENT'
        when v_status = 'RETRYABLE' then 'QUEUED'
        else 'FAILED'
      end,
      meta_message_id = case
        when p_resolution = 'CONFIRM_SENT' then trim(p_meta_message_id)
        else message.meta_message_id
      end,
      error_code = case
        when p_resolution = 'CONFIRM_SENT' or v_status = 'RETRYABLE' then null
        when v_status = 'BLOCKED' then 'TEMPLATE_REQUIRED'
        when v_status = 'FAILED' and p_resolution = 'RETRY' then 'MAX_ATTEMPTS_REACHED'
        else 'MANUALLY_CONFIRMED_FAILED'
      end,
      error_message = case
        when p_resolution = 'CONFIRM_SENT' or v_status = 'RETRYABLE' then null
        else v_error_message
      end,
      sent_at = case when p_resolution = 'CONFIRM_SENT' then now() else message.sent_at end
    where message.business_id = p_business_id
      and message.id = v_outbox.message_id;
  end if;

  if p_resolution = 'CONFIRM_SENT' then
    update public.wa_conversations as conversation
    set
      last_message_preview = left(v_outbox.body, 500),
      last_message_at = now(),
      last_agent_message_at = now()
    where conversation.business_id = p_business_id
      and conversation.id = v_outbox.conversation_id;
  end if;

  return query select
    p_outbox_id,
    v_outbox.message_id,
    v_status,
    v_outbox.attempt_count,
    v_next_attempt_at;
end;
$$;

revoke all on function public.wa_quarantine_expired_human_sends(integer)
  from public, anon, authenticated;
grant execute on function public.wa_quarantine_expired_human_sends(integer)
  to service_role;

revoke all on function public.wa_claim_due_human_text_replies(integer, integer)
  from public, anon, authenticated;
grant execute on function public.wa_claim_due_human_text_replies(integer, integer)
  to service_role;

revoke all on function public.wa_resolve_human_send_reconciliation(
  text, uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.wa_resolve_human_send_reconciliation(
  text, uuid, text, text, text, text
) to service_role;

commit;
