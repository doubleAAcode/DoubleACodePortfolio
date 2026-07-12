-- Additive Phase 1 guard: published flow-version snapshots are immutable.
-- Status bookkeeping such as PUBLISHED -> ARCHIVED remains allowed, but semantic fields cannot change.

create or replace function public.wa_reject_published_flow_version_snapshot_update()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'PUBLISHED' then
    if tg_table_name = 'wa_flow_template_versions' then
      if new.template_id is distinct from old.template_id
        or new.version_number is distinct from old.version_number
        or new.flow_json is distinct from old.flow_json
        or new.created_by_admin_user_id is distinct from old.created_by_admin_user_id
        or new.created_at is distinct from old.created_at then
        raise exception 'Published flow template version snapshots are immutable';
      end if;
    elsif tg_table_name = 'wa_business_flow_versions' then
      if new.business_flow_id is distinct from old.business_flow_id
        or new.version_number is distinct from old.version_number
        or new.flow_json is distinct from old.flow_json
        or new.created_by_user_id is distinct from old.created_by_user_id
        or new.created_at is distinct from old.created_at then
        raise exception 'Published business flow version snapshots are immutable';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists wa_flow_template_versions_immutable_snapshot
  on public.wa_flow_template_versions;
create trigger wa_flow_template_versions_immutable_snapshot
before update on public.wa_flow_template_versions
for each row
execute function public.wa_reject_published_flow_version_snapshot_update();

drop trigger if exists wa_business_flow_versions_immutable_snapshot
  on public.wa_business_flow_versions;
create trigger wa_business_flow_versions_immutable_snapshot
before update on public.wa_business_flow_versions
for each row
execute function public.wa_reject_published_flow_version_snapshot_update();
