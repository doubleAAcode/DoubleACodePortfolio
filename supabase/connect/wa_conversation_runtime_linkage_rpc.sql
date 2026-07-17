-- Link deterministic runtime state to the durable Flow Manager conversation.
--
-- Prerequisites:
--   wa_flow_manager_core_schema.sql
--   wa_flow_templates_schema.sql

begin;

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

revoke all on function public.wa_link_conversation_runtime(
  text,
  uuid,
  text,
  text,
  text,
  boolean
) from public, anon, authenticated;

grant execute on function public.wa_link_conversation_runtime(
  text,
  uuid,
  text,
  text,
  text,
  boolean
) to service_role;

commit;
