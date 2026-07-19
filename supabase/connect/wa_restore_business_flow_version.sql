-- Atomic, tenant-scoped restore of an immutable flow snapshot into a new draft.
-- The currently active published version remains unchanged.

create or replace function public.wa_restore_business_flow_version(
  p_business_id text,
  p_source_version_id text,
  p_actor text,
  p_validation_result jsonb
)
returns public.wa_business_flow_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flow public.wa_business_flows%rowtype;
  v_source public.wa_business_flow_versions%rowtype;
  v_restored public.wa_business_flow_versions%rowtype;
  v_version_number integer;
begin
  if nullif(btrim(p_business_id), '') is null
    or nullif(btrim(p_source_version_id), '') is null
    or nullif(btrim(p_actor), '') is null then
    raise exception 'Business, source version, and actor are required';
  end if;

  select *
    into v_flow
    from public.wa_business_flows
   where business_id = p_business_id
   for update;

  if not found then
    raise exception 'Business flow was not found';
  end if;

  select *
    into v_source
    from public.wa_business_flow_versions
   where id = p_source_version_id
     and business_flow_id = v_flow.id;

  if not found then
    raise exception 'Business flow version was not found';
  end if;

  if v_source.status = 'DRAFT' then
    raise exception 'A draft version cannot be restored as another draft';
  end if;

  select coalesce(max(version_number), 0) + 1
    into v_version_number
    from public.wa_business_flow_versions
   where business_flow_id = v_flow.id;

  update public.wa_business_flow_versions
     set status = 'ARCHIVED'
   where business_flow_id = v_flow.id
     and status = 'DRAFT';

  insert into public.wa_business_flow_versions (
    id,
    business_flow_id,
    version_number,
    status,
    flow_json,
    validation_result,
    created_by_user_id,
    revision,
    published_at,
    created_at
  ) values (
    v_flow.id || '-v' || v_version_number,
    v_flow.id,
    v_version_number,
    'DRAFT',
    v_source.flow_json,
    p_validation_result,
    p_actor,
    1,
    null,
    now()
  )
  returning * into v_restored;

  update public.wa_business_flows
     set updated_at = now()
   where id = v_flow.id;

  return v_restored;
end;
$$;

revoke all on function public.wa_restore_business_flow_version(text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.wa_restore_business_flow_version(text, text, text, jsonb)
  to service_role;
