-- Live verification for wa_conversation_collaboration_rpc.sql.
-- Every synthetic row and state change is rolled back before PASS is returned.

begin;

do $verification$
declare
  v_conversation public.wa_conversations%rowtype;
  v_assignee_one uuid := gen_random_uuid();
  v_assignee_two uuid := gen_random_uuid();
  v_foreign_assignee uuid := gen_random_uuid();
  v_foreign_business_id text;
  v_tag_id uuid;
  v_reply_id uuid;
  v_result record;
begin
  select conversation.*
  into v_conversation
  from public.wa_conversations as conversation
  where conversation.business_id = 'double-a-test-business'
  order by conversation.last_message_at desc nulls last, conversation.created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No live Double A test conversation is available';
  end if;

  select business.id
  into v_foreign_business_id
  from public.wa_businesses as business
  where business.id <> v_conversation.business_id
  order by business.id
  limit 1;

  if v_foreign_business_id is null then
    raise exception 'A second business is required for the tenant-isolation assertion';
  end if;

  insert into public.wa_business_users (id, business_id, email, role, status, display_name)
  values
    (
      v_assignee_one,
      v_conversation.business_id,
      'codex-collab-one-' || gen_random_uuid()::text || '@example.invalid',
      'STAFF',
      'ACTIVE',
      'Rollback Operator One'
    ),
    (
      v_assignee_two,
      v_conversation.business_id,
      'codex-collab-two-' || gen_random_uuid()::text || '@example.invalid',
      'MANAGER',
      'ACTIVE',
      'Rollback Operator Two'
    ),
    (
      v_foreign_assignee,
      v_foreign_business_id,
      'codex-collab-foreign-' || gen_random_uuid()::text || '@example.invalid',
      'STAFF',
      'ACTIVE',
      'Rollback Foreign Operator'
    );

  insert into public.wa_tags (business_id, name, color)
  values (
    v_conversation.business_id,
    'Codex rollback ' || substr(gen_random_uuid()::text, 1, 8),
    'violet'
  )
  returning id into v_tag_id;

  select * into v_result
  from public.wa_change_conversation_collaboration(
    v_conversation.business_id,
    v_conversation.id,
    'SET_PRIORITY',
    'codex-collab-priority-20260718-a',
    'INTERNAL_ADMIN',
    'codex-live-audit',
    'URGENT',
    null,
    null
  );
  if not v_result.applied or v_result.current_priority <> 'URGENT' then
    raise exception 'Priority change failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_change_conversation_collaboration(
    v_conversation.business_id,
    v_conversation.id,
    'SET_PRIORITY',
    'codex-collab-priority-20260718-a',
    'INTERNAL_ADMIN',
    'codex-live-audit',
    'URGENT',
    null,
    null
  );
  if not v_result.applied or not v_result.duplicate then
    raise exception 'Priority duplicate replay failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_change_conversation_collaboration(
    v_conversation.business_id,
    v_conversation.id,
    'SET_PRIORITY',
    'codex-collab-priority-20260718-a',
    'INTERNAL_ADMIN',
    'codex-live-audit',
    'LOW',
    null,
    null
  );
  if v_result.block_code <> 'IDEMPOTENCY_CONFLICT' then
    raise exception 'Changed-payload replay was not blocked: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_change_conversation_collaboration(
    v_conversation.business_id,
    v_conversation.id,
    'ASSIGN',
    'codex-collab-assign-20260718-a',
    'INTERNAL_ADMIN',
    'codex-live-audit',
    null,
    v_assignee_one,
    null
  );
  if not v_result.applied or v_result.current_assignee_user_id <> v_assignee_one then
    raise exception 'Assignment failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_change_conversation_collaboration(
    v_conversation.business_id,
    v_conversation.id,
    'ASSIGN',
    'codex-collab-transfer-20260718-a',
    'INTERNAL_ADMIN',
    'codex-live-audit',
    null,
    v_assignee_two,
    null
  );
  if not v_result.applied
     or v_result.current_assignee_user_id <> v_assignee_two
     or not exists (
       select 1
       from public.wa_conversation_events as event
       where event.id = v_result.event_id and event.event_type = 'TRANSFERRED'
     ) then
    raise exception 'Transfer failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_change_conversation_collaboration(
    v_conversation.business_id,
    v_conversation.id,
    'ASSIGN',
    'codex-collab-foreign-20260718-a',
    'INTERNAL_ADMIN',
    'codex-live-audit',
    null,
    v_foreign_assignee,
    null
  );
  if v_result.block_code <> 'ASSIGNEE_NOT_AVAILABLE' then
    raise exception 'Cross-tenant assignment was not blocked: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_change_conversation_collaboration(
    v_conversation.business_id,
    v_conversation.id,
    'UNASSIGN',
    'codex-collab-unassign-20260718-a',
    'INTERNAL_ADMIN',
    'codex-live-audit',
    null,
    null,
    null
  );
  if not v_result.applied or v_result.current_assignee_user_id is not null then
    raise exception 'Unassignment failed: %', row_to_json(v_result);
  end if;

  update public.wa_conversations as conversation
  set unread_count = 3
  where conversation.business_id = v_conversation.business_id
    and conversation.id = v_conversation.id;

  select * into v_result
  from public.wa_change_conversation_collaboration(
    v_conversation.business_id,
    v_conversation.id,
    'MARK_READ',
    'codex-collab-read-20260718-a',
    'BUSINESS_USER',
    'codex-live-owner',
    null,
    null,
    false
  );
  if not v_result.applied or v_result.current_unread_count <> 0 then
    raise exception 'Mark-read failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_change_conversation_collaboration(
    v_conversation.business_id,
    v_conversation.id,
    'MARK_UNREAD',
    'codex-collab-unread-20260718-a',
    'BUSINESS_USER',
    'codex-live-owner',
    null,
    null,
    true
  );
  if not v_result.applied or v_result.current_unread_count <> 1 then
    raise exception 'Mark-unread failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_add_conversation_note(
    v_conversation.business_id,
    v_conversation.id,
    'Rollback-only internal note',
    'codex-collab-note-20260718-a',
    'INTERNAL_ADMIN',
    'codex-live-audit'
  );
  if not v_result.applied or v_result.duplicate then
    raise exception 'Internal note failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_add_conversation_note(
    v_conversation.business_id,
    v_conversation.id,
    'Rollback-only internal note',
    'codex-collab-note-20260718-a',
    'INTERNAL_ADMIN',
    'codex-live-audit'
  );
  if not v_result.applied or not v_result.duplicate then
    raise exception 'Internal-note duplicate replay failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_change_conversation_tag(
    v_conversation.business_id,
    v_conversation.id,
    v_tag_id,
    'ADD',
    'codex-collab-tag-add-20260718-a',
    'BUSINESS_USER',
    'codex-live-owner'
  );
  if not v_result.applied then
    raise exception 'Tag add failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_change_conversation_tag(
    v_conversation.business_id,
    v_conversation.id,
    v_tag_id,
    'REMOVE',
    'codex-collab-tag-remove-20260718-a',
    'BUSINESS_USER',
    'codex-live-owner'
  );
  if not v_result.applied then
    raise exception 'Tag remove failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_save_canned_reply(
    v_conversation.business_id,
    'CREATE',
    'codex-collab-canned-create-20260718-a',
    'BUSINESS_USER',
    'codex-live-owner',
    null,
    'Rollback greeting',
    'Hello from the rollback verification.',
    '/codexrollback0718',
    'Verification'
  );
  if not v_result.applied or v_result.duplicate then
    raise exception 'Canned reply create failed: %', row_to_json(v_result);
  end if;
  v_reply_id := v_result.changed_reply_id;

  select * into v_result
  from public.wa_save_canned_reply(
    v_conversation.business_id,
    'CREATE',
    'codex-collab-canned-create-20260718-a',
    'BUSINESS_USER',
    'codex-live-owner',
    null,
    'Rollback greeting',
    'Hello from the rollback verification.',
    '/codexrollback0718',
    'Verification'
  );
  if not v_result.applied or not v_result.duplicate
     or v_result.changed_reply_id <> v_reply_id then
    raise exception 'Canned reply duplicate replay failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_save_canned_reply(
    v_conversation.business_id,
    'UPDATE',
    'codex-collab-canned-update-20260718-a',
    'INTERNAL_ADMIN',
    'codex-live-audit',
    v_reply_id,
    'Rollback greeting updated',
    'Updated rollback verification body.',
    '/codexrollback0718',
    'Verification'
  );
  if not v_result.applied or v_result.current_title <> 'Rollback greeting updated' then
    raise exception 'Canned reply update failed: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.wa_save_canned_reply(
    v_conversation.business_id,
    'ARCHIVE',
    'codex-collab-canned-archive-20260718-a',
    'INTERNAL_ADMIN',
    'codex-live-audit',
    v_reply_id,
    null,
    null,
    null,
    null
  );
  if not v_result.applied or v_result.current_is_active then
    raise exception 'Canned reply archive failed: %', row_to_json(v_result);
  end if;
end;
$verification$;

rollback;

select 'PASS: collaboration transaction rolled back' as verification;
