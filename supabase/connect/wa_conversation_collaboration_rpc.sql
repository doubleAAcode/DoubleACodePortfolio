-- Atomic, tenant-scoped inbox collaboration commands.
-- Prerequisites:
--   wa_flow_manager_core_schema.sql
--   wa_conversation_lifecycle_rpc.sql

begin;

alter table public.wa_conversation_events
  drop constraint if exists wa_conversation_events_event_type_check;
alter table public.wa_conversation_events
  add constraint wa_conversation_events_event_type_check check (event_type in (
    'CREATED',
    'STATUS_CHANGED',
    'ASSIGNED',
    'TRANSFERRED',
    'UNASSIGNED',
    'PRIORITY_CHANGED',
    'READ_STATE_CHANGED',
    'SNOOZED',
    'REOPENED',
    'TAG_ADDED',
    'TAG_REMOVED',
    'NOTE_ADDED',
    'FLOW_STARTED',
    'FLOW_STOPPED'
  ));

create table if not exists public.wa_canned_reply_audit_events (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  canned_reply_id uuid not null references public.wa_canned_replies(id) on delete restrict,
  action text not null,
  actor_kind text not null,
  actor_username text not null,
  command_idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (action in ('CREATED', 'UPDATED', 'ARCHIVED')),
  check (actor_kind in ('INTERNAL_ADMIN', 'BUSINESS_USER')),
  check (length(trim(actor_username)) between 1 and 320),
  check (length(trim(command_idempotency_key)) between 8 and 200),
  check (jsonb_typeof(payload) = 'object'),
  unique (business_id, command_idempotency_key)
);

create index if not exists wa_canned_reply_audit_business_idx
  on public.wa_canned_reply_audit_events (business_id, created_at desc);

alter table public.wa_canned_reply_audit_events enable row level security;
grant select, insert on public.wa_canned_reply_audit_events to service_role;

create or replace function public.wa_change_conversation_collaboration(
  p_business_id text,
  p_conversation_id uuid,
  p_operation text,
  p_idempotency_key text,
  p_actor_kind text,
  p_actor_username text,
  p_priority text default null,
  p_assignee_user_id uuid default null,
  p_unread boolean default null
)
returns table (
  changed_conversation_id uuid,
  changed_business_id text,
  changed_operation text,
  current_priority text,
  current_assignee_user_id uuid,
  current_unread_count integer,
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
  v_command jsonb;
  v_event_id uuid;
  v_event_type text;
  v_next_priority text;
  v_next_assignee_user_id uuid;
  v_next_unread_count integer;
begin
  if nullif(trim(p_business_id), '') is null then
    raise exception 'business_id is required';
  end if;
  if p_conversation_id is null then
    raise exception 'conversation_id is required';
  end if;
  if p_operation not in ('SET_PRIORITY', 'ASSIGN', 'UNASSIGN', 'MARK_READ', 'MARK_UNREAD') then
    raise exception 'operation is invalid';
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

  if p_operation = 'SET_PRIORITY' and p_priority not in ('LOW', 'NORMAL', 'HIGH', 'URGENT') then
    raise exception 'priority is invalid';
  end if;
  if p_operation = 'ASSIGN' and p_assignee_user_id is null then
    raise exception 'assignee_user_id is required';
  end if;
  if p_operation in ('MARK_READ', 'MARK_UNREAD')
     and p_unread is distinct from (p_operation = 'MARK_UNREAD') then
    raise exception 'unread does not match operation';
  end if;

  v_command := jsonb_build_object(
    'operation', p_operation,
    'priority', p_priority,
    'assigneeUserId', p_assignee_user_id,
    'unread', p_unread
  );

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id || ':' || trim(p_idempotency_key), 0)
  );

  select event.*
  into v_existing_event
  from public.wa_conversation_events as event
  where event.business_id = p_business_id
    and event.command_idempotency_key = trim(p_idempotency_key);

  if found then
    if v_existing_event.conversation_id <> p_conversation_id
       or v_existing_event.payload -> 'command' is distinct from v_command then
      return query select
        p_conversation_id,
        p_business_id,
        p_operation,
        null::text,
        null::uuid,
        null::integer,
        false,
        true,
        'IDEMPOTENCY_CONFLICT'::text,
        v_existing_event.id;
      return;
    end if;

    return query select
      v_existing_event.conversation_id,
      v_existing_event.business_id,
      p_operation,
      nullif(v_existing_event.payload ->> 'priority', ''),
      nullif(v_existing_event.payload ->> 'assigneeUserId', '')::uuid,
      (v_existing_event.payload ->> 'unreadCount')::integer,
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

  v_next_priority := v_conversation.priority;
  v_next_assignee_user_id := v_conversation.assignee_user_id;
  v_next_unread_count := v_conversation.unread_count;

  if p_operation = 'SET_PRIORITY' then
    v_next_priority := p_priority;
    v_event_type := 'PRIORITY_CHANGED';
  elsif p_operation = 'ASSIGN' then
    if not exists (
      select 1
      from public.wa_business_users as business_user
      where business_user.business_id = p_business_id
        and business_user.id = p_assignee_user_id
        and business_user.status = 'ACTIVE'
    ) then
      return query select
        v_conversation.id,
        v_conversation.business_id,
        p_operation,
        v_conversation.priority,
        v_conversation.assignee_user_id,
        v_conversation.unread_count,
        false,
        false,
        'ASSIGNEE_NOT_AVAILABLE'::text,
        null::uuid;
      return;
    end if;
    v_next_assignee_user_id := p_assignee_user_id;
    v_event_type := case
      when v_conversation.assignee_user_id is null then 'ASSIGNED'
      else 'TRANSFERRED'
    end;
  elsif p_operation = 'UNASSIGN' then
    v_next_assignee_user_id := null;
    v_event_type := 'UNASSIGNED';
  elsif p_operation = 'MARK_READ' then
    v_next_unread_count := 0;
    v_event_type := 'READ_STATE_CHANGED';
  else
    v_next_unread_count := greatest(v_conversation.unread_count, 1);
    v_event_type := 'READ_STATE_CHANGED';
  end if;

  if v_next_priority is not distinct from v_conversation.priority
     and v_next_assignee_user_id is not distinct from v_conversation.assignee_user_id
     and v_next_unread_count = v_conversation.unread_count then
    return query select
      v_conversation.id,
      v_conversation.business_id,
      p_operation,
      v_conversation.priority,
      v_conversation.assignee_user_id,
      v_conversation.unread_count,
      false,
      false,
      null::text,
      null::uuid;
    return;
  end if;

  update public.wa_conversations as conversation
  set
    priority = v_next_priority,
    assignee_user_id = v_next_assignee_user_id,
    unread_count = v_next_unread_count
  where conversation.business_id = p_business_id
    and conversation.id = p_conversation_id;

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
      'command', v_command,
      'previousPriority', v_conversation.priority,
      'priority', v_next_priority,
      'previousAssigneeUserId', v_conversation.assignee_user_id,
      'assigneeUserId', v_next_assignee_user_id,
      'previousUnreadCount', v_conversation.unread_count,
      'unreadCount', v_next_unread_count,
      'actorKind', p_actor_kind,
      'actorUsername', trim(p_actor_username)
    ),
    trim(p_idempotency_key)
  )
  returning id into v_event_id;

  return query select
    v_conversation.id,
    v_conversation.business_id,
    p_operation,
    v_next_priority,
    v_next_assignee_user_id,
    v_next_unread_count,
    true,
    false,
    null::text,
    v_event_id;
end;
$$;

create or replace function public.wa_add_conversation_note(
  p_business_id text,
  p_conversation_id uuid,
  p_note text,
  p_idempotency_key text,
  p_actor_kind text,
  p_actor_username text
)
returns table (
  changed_conversation_id uuid,
  changed_business_id text,
  applied boolean,
  duplicate boolean,
  block_code text,
  event_id uuid
)
language plpgsql
set search_path = public
as $$
declare
  v_existing_event public.wa_conversation_events%rowtype;
  v_command jsonb;
  v_event_id uuid;
begin
  if nullif(trim(p_business_id), '') is null or p_conversation_id is null then
    raise exception 'business_id and conversation_id are required';
  end if;
  if length(trim(coalesce(p_note, ''))) not between 1 and 4000 then
    raise exception 'note must be between 1 and 4000 characters';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 200
     or trim(p_idempotency_key) !~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$' then
    raise exception 'idempotency_key is invalid';
  end if;
  if p_actor_kind not in ('INTERNAL_ADMIN', 'BUSINESS_USER')
     or length(trim(coalesce(p_actor_username, ''))) not between 1 and 320 then
    raise exception 'actor is invalid';
  end if;

  v_command := jsonb_build_object('operation', 'ADD_NOTE', 'note', trim(p_note));
  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id || ':' || trim(p_idempotency_key), 0)
  );

  select event.*
  into v_existing_event
  from public.wa_conversation_events as event
  where event.business_id = p_business_id
    and event.command_idempotency_key = trim(p_idempotency_key);

  if found then
    if v_existing_event.conversation_id <> p_conversation_id
       or v_existing_event.payload -> 'command' is distinct from v_command then
      return query select p_conversation_id, p_business_id, false, true,
        'IDEMPOTENCY_CONFLICT'::text, v_existing_event.id;
      return;
    end if;
    return query select v_existing_event.conversation_id, v_existing_event.business_id,
      true, true, null::text, v_existing_event.id;
    return;
  end if;

  perform 1
  from public.wa_conversations as conversation
  where conversation.business_id = p_business_id
    and conversation.id = p_conversation_id
  for update;
  if not found then
    raise exception 'Conversation was not found for the business';
  end if;

  insert into public.wa_conversation_events (
    business_id, conversation_id, event_type, actor_type, payload, command_idempotency_key
  )
  values (
    p_business_id,
    p_conversation_id,
    'NOTE_ADDED',
    'USER',
    jsonb_build_object(
      'command', v_command,
      'note', trim(p_note),
      'actorKind', p_actor_kind,
      'actorUsername', trim(p_actor_username),
      'internal', true
    ),
    trim(p_idempotency_key)
  )
  returning id into v_event_id;

  return query select p_conversation_id, p_business_id, true, false, null::text, v_event_id;
end;
$$;

create or replace function public.wa_change_conversation_tag(
  p_business_id text,
  p_conversation_id uuid,
  p_tag_id uuid,
  p_operation text,
  p_idempotency_key text,
  p_actor_kind text,
  p_actor_username text
)
returns table (
  changed_conversation_id uuid,
  changed_business_id text,
  changed_tag_id uuid,
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
  v_command jsonb;
  v_event_id uuid;
  v_tag_name text;
  v_changed_count integer;
begin
  if nullif(trim(p_business_id), '') is null
     or p_conversation_id is null
     or p_tag_id is null then
    raise exception 'business_id, conversation_id, and tag_id are required';
  end if;
  if p_operation not in ('ADD', 'REMOVE') then
    raise exception 'operation is invalid';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 200
     or trim(p_idempotency_key) !~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$' then
    raise exception 'idempotency_key is invalid';
  end if;
  if p_actor_kind not in ('INTERNAL_ADMIN', 'BUSINESS_USER')
     or length(trim(coalesce(p_actor_username, ''))) not between 1 and 320 then
    raise exception 'actor is invalid';
  end if;

  v_command := jsonb_build_object(
    'operation', p_operation || '_TAG',
    'tagId', p_tag_id
  );
  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id || ':' || trim(p_idempotency_key), 0)
  );

  select event.*
  into v_existing_event
  from public.wa_conversation_events as event
  where event.business_id = p_business_id
    and event.command_idempotency_key = trim(p_idempotency_key);

  if found then
    if v_existing_event.conversation_id <> p_conversation_id
       or v_existing_event.payload -> 'command' is distinct from v_command then
      return query select p_conversation_id, p_business_id, p_tag_id, false, true,
        'IDEMPOTENCY_CONFLICT'::text, v_existing_event.id;
      return;
    end if;
    return query select v_existing_event.conversation_id, v_existing_event.business_id,
      p_tag_id, true, true, null::text, v_existing_event.id;
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

  select tag.name
  into v_tag_name
  from public.wa_tags as tag
  where tag.business_id = p_business_id
    and tag.id = p_tag_id;
  if not found then
    return query select v_conversation.id, v_conversation.business_id, p_tag_id,
      false, false, 'TAG_NOT_FOUND'::text, null::uuid;
    return;
  end if;

  if p_operation = 'ADD' then
    insert into public.wa_contact_tags (business_id, contact_id, tag_id)
    values (p_business_id, v_conversation.contact_id, p_tag_id)
    on conflict (contact_id, tag_id) do nothing;
    get diagnostics v_changed_count = row_count;
  else
    delete from public.wa_contact_tags as contact_tag
    where contact_tag.business_id = p_business_id
      and contact_tag.contact_id = v_conversation.contact_id
      and contact_tag.tag_id = p_tag_id;
    get diagnostics v_changed_count = row_count;
  end if;

  if v_changed_count = 0 then
    return query select v_conversation.id, v_conversation.business_id, p_tag_id,
      false, false, null::text, null::uuid;
    return;
  end if;

  insert into public.wa_conversation_events (
    business_id, conversation_id, event_type, actor_type, payload, command_idempotency_key
  )
  values (
    p_business_id,
    p_conversation_id,
    case when p_operation = 'ADD' then 'TAG_ADDED' else 'TAG_REMOVED' end,
    'USER',
    jsonb_build_object(
      'command', v_command,
      'tagId', p_tag_id,
      'tagName', v_tag_name,
      'actorKind', p_actor_kind,
      'actorUsername', trim(p_actor_username)
    ),
    trim(p_idempotency_key)
  )
  returning id into v_event_id;

  return query select v_conversation.id, v_conversation.business_id, p_tag_id,
    true, false, null::text, v_event_id;
end;
$$;

create or replace function public.wa_save_canned_reply(
  p_business_id text,
  p_operation text,
  p_idempotency_key text,
  p_actor_kind text,
  p_actor_username text,
  p_reply_id uuid default null,
  p_title text default null,
  p_body text default null,
  p_shortcut text default null,
  p_category text default null
)
returns table (
  changed_reply_id uuid,
  changed_business_id text,
  current_title text,
  current_body text,
  current_shortcut text,
  current_category text,
  current_is_active boolean,
  current_created_at timestamptz,
  current_updated_at timestamptz,
  applied boolean,
  duplicate boolean,
  block_code text,
  audit_event_id uuid
)
language plpgsql
set search_path = public
as $$
declare
  v_reply public.wa_canned_replies%rowtype;
  v_existing_audit public.wa_canned_reply_audit_events%rowtype;
  v_command jsonb;
  v_audit_id uuid;
  v_action text;
  v_shortcut text;
  v_category text;
begin
  if nullif(trim(p_business_id), '') is null then
    raise exception 'business_id is required';
  end if;
  if p_operation not in ('CREATE', 'UPDATE', 'ARCHIVE') then
    raise exception 'operation is invalid';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 200
     or trim(p_idempotency_key) !~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$' then
    raise exception 'idempotency_key is invalid';
  end if;
  if p_actor_kind not in ('INTERNAL_ADMIN', 'BUSINESS_USER')
     or length(trim(coalesce(p_actor_username, ''))) not between 1 and 320 then
    raise exception 'actor is invalid';
  end if;
  if p_operation <> 'CREATE' and p_reply_id is null then
    raise exception 'reply_id is required';
  end if;
  if p_operation in ('CREATE', 'UPDATE') then
    if length(trim(coalesce(p_title, ''))) not between 1 and 120 then
      raise exception 'title must be between 1 and 120 characters';
    end if;
    if length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
      raise exception 'body must be between 1 and 4000 characters';
    end if;
    if p_shortcut is not null and length(trim(p_shortcut)) not between 1 and 64 then
      raise exception 'shortcut must be between 1 and 64 characters';
    end if;
    if p_category is not null and length(trim(p_category)) not between 1 and 80 then
      raise exception 'category must be between 1 and 80 characters';
    end if;
  end if;

  v_shortcut := nullif(trim(p_shortcut), '');
  v_category := nullif(trim(p_category), '');
  v_command := jsonb_build_object(
    'operation', p_operation,
    'replyId', p_reply_id,
    'title', case when p_operation = 'ARCHIVE' then null else trim(p_title) end,
    'body', case when p_operation = 'ARCHIVE' then null else trim(p_body) end,
    'shortcut', case when p_operation = 'ARCHIVE' then null else v_shortcut end,
    'category', case when p_operation = 'ARCHIVE' then null else v_category end
  );

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id || ':' || trim(p_idempotency_key), 0)
  );

  select audit.*
  into v_existing_audit
  from public.wa_canned_reply_audit_events as audit
  where audit.business_id = p_business_id
    and audit.command_idempotency_key = trim(p_idempotency_key);

  if found then
    if v_existing_audit.payload -> 'command' is distinct from v_command then
      return query select p_reply_id, p_business_id, null::text, null::text, null::text,
        null::text, null::boolean, null::timestamptz, null::timestamptz,
        false, true, 'IDEMPOTENCY_CONFLICT'::text, v_existing_audit.id;
      return;
    end if;

    select reply.*
    into v_reply
    from public.wa_canned_replies as reply
    where reply.business_id = p_business_id
      and reply.id = v_existing_audit.canned_reply_id;

    return query select v_reply.id, v_reply.business_id, v_reply.title, v_reply.body,
      v_reply.shortcut, v_reply.category, v_reply.is_active, v_reply.created_at,
      v_reply.updated_at, true, true, null::text, v_existing_audit.id;
    return;
  end if;

  if p_operation = 'CREATE' then
    begin
      insert into public.wa_canned_replies (
        business_id, title, body, shortcut, category, is_active
      ) values (
        p_business_id, trim(p_title), trim(p_body), v_shortcut, v_category, true
      ) returning * into v_reply;
    exception when unique_violation then
      return query select null::uuid, p_business_id, null::text, null::text, null::text,
        null::text, null::boolean, null::timestamptz, null::timestamptz,
        false, false, 'SHORTCUT_CONFLICT'::text, null::uuid;
      return;
    end;
    v_action := 'CREATED';
  else
    select reply.*
    into v_reply
    from public.wa_canned_replies as reply
    where reply.business_id = p_business_id
      and reply.id = p_reply_id
    for update;
    if not found then
      return query select p_reply_id, p_business_id, null::text, null::text, null::text,
        null::text, null::boolean, null::timestamptz, null::timestamptz,
        false, false, 'CANNED_REPLY_NOT_FOUND'::text, null::uuid;
      return;
    end if;

    if p_operation = 'ARCHIVE' then
      if not v_reply.is_active then
        return query select v_reply.id, v_reply.business_id, v_reply.title, v_reply.body,
          v_reply.shortcut, v_reply.category, v_reply.is_active, v_reply.created_at,
          v_reply.updated_at, false, false, null::text, null::uuid;
        return;
      end if;
      update public.wa_canned_replies as reply
      set is_active = false
      where reply.business_id = p_business_id and reply.id = p_reply_id
      returning * into v_reply;
      v_action := 'ARCHIVED';
    else
      if v_reply.title = trim(p_title)
         and v_reply.body = trim(p_body)
         and v_reply.shortcut is not distinct from v_shortcut
         and v_reply.category is not distinct from v_category
         and v_reply.is_active then
        return query select v_reply.id, v_reply.business_id, v_reply.title, v_reply.body,
          v_reply.shortcut, v_reply.category, v_reply.is_active, v_reply.created_at,
          v_reply.updated_at, false, false, null::text, null::uuid;
        return;
      end if;
      begin
        update public.wa_canned_replies as reply
        set title = trim(p_title), body = trim(p_body), shortcut = v_shortcut,
          category = v_category, is_active = true
        where reply.business_id = p_business_id and reply.id = p_reply_id
        returning * into v_reply;
      exception when unique_violation then
        return query select p_reply_id, p_business_id, null::text, null::text, null::text,
          null::text, null::boolean, null::timestamptz, null::timestamptz,
          false, false, 'SHORTCUT_CONFLICT'::text, null::uuid;
        return;
      end;
      v_action := 'UPDATED';
    end if;
  end if;

  insert into public.wa_canned_reply_audit_events (
    business_id, canned_reply_id, action, actor_kind, actor_username,
    command_idempotency_key, payload
  ) values (
    p_business_id, v_reply.id, v_action, p_actor_kind, trim(p_actor_username),
    trim(p_idempotency_key), jsonb_build_object('command', v_command)
  ) returning id into v_audit_id;

  return query select v_reply.id, v_reply.business_id, v_reply.title, v_reply.body,
    v_reply.shortcut, v_reply.category, v_reply.is_active, v_reply.created_at,
    v_reply.updated_at, true, false, null::text, v_audit_id;
end;
$$;

revoke all on function public.wa_change_conversation_collaboration(
  text, uuid, text, text, text, text, text, uuid, boolean
) from public, anon, authenticated;
grant execute on function public.wa_change_conversation_collaboration(
  text, uuid, text, text, text, text, text, uuid, boolean
) to service_role;

revoke all on function public.wa_add_conversation_note(
  text, uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.wa_add_conversation_note(
  text, uuid, text, text, text, text
) to service_role;

revoke all on function public.wa_change_conversation_tag(
  text, uuid, uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.wa_change_conversation_tag(
  text, uuid, uuid, text, text, text, text
) to service_role;

revoke all on function public.wa_save_canned_reply(
  text, text, text, text, text, uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.wa_save_canned_reply(
  text, text, text, text, text, uuid, text, text, text, text
) to service_role;

commit;
