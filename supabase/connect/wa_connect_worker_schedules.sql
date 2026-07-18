-- Minute-level Connect worker schedules for Supabase-hosted production.
--
-- The outbox job never stores its bearer in cron.job. It resolves the current
-- Vault value at execution time and becomes a no-op while the secret is absent.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.wa_disable_connect_worker_schedules()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_job record;
  v_disabled_count integer := 0;
begin
  for v_job in
    select job.jobid
    from cron.job as job
    where job.jobname in (
      'connect-lifecycle-minute',
      'connect-human-outbox-minute'
    )
  loop
    if cron.unschedule(v_job.jobid) then
      v_disabled_count := v_disabled_count + 1;
    end if;
  end loop;

  return v_disabled_count;
end;
$$;

create or replace function public.wa_configure_connect_worker_schedules()
returns table (
  lifecycle_job_id bigint,
  human_outbox_job_id bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle_job_id bigint;
  v_human_outbox_job_id bigint;
begin
  perform public.wa_disable_connect_worker_schedules();

  select cron.schedule(
    'connect-lifecycle-minute',
    '* * * * *',
    $cron$select count(*) from public.wa_wake_due_snoozed_conversations(50);$cron$
  )
  into v_lifecycle_job_id;

  select cron.schedule(
    'connect-human-outbox-minute',
    '* * * * *',
    $cron$
      select net.http_post(
        url := 'https://www.doubleacode.com/api/connect/admin/human-outbox/process',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || secret.decrypted_secret
        ),
        body := jsonb_build_object('limit', 10),
        timeout_milliseconds := 10000
      )
      from vault.decrypted_secrets as secret
      where secret.name = 'connect_worker_secret'
      order by secret.created_at desc
      limit 1;
    $cron$
  )
  into v_human_outbox_job_id;

  return query select v_lifecycle_job_id, v_human_outbox_job_id;
end;
$$;

revoke all on function public.wa_disable_connect_worker_schedules()
  from public, anon, authenticated, service_role;
revoke all on function public.wa_configure_connect_worker_schedules()
  from public, anon, authenticated, service_role;

select * from public.wa_configure_connect_worker_schedules();
