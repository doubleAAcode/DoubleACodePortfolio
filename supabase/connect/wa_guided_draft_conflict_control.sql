begin;

alter table public.wa_business_flow_versions
  add column if not exists revision bigint;

update public.wa_business_flow_versions
set revision = 1
where revision is null or revision < 1;

alter table public.wa_business_flow_versions
  alter column revision set default 1,
  alter column revision set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.wa_business_flow_versions'::regclass
      and conname = 'wa_business_flow_versions_revision_positive'
  ) then
    alter table public.wa_business_flow_versions
      add constraint wa_business_flow_versions_revision_positive
      check (revision > 0);
  end if;
end
$$;

comment on column public.wa_business_flow_versions.revision is
  'Monotonic optimistic-concurrency revision for safe Guided draft saves.';

commit;
