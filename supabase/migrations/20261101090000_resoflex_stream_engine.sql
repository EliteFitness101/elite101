-- ResoFlex stream control plane. Additive; does not modify ChatB2K publishing tables.
create extension if not exists pgcrypto;
create table if not exists public.resoflex_stream_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  enabled boolean not null default false,
  cron_expression text,
  timezone text not null default 'Africa/Lagos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.resoflex_stream_jobs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.resoflex_stream_schedules(id) on delete set null,
  idempotency_key text not null unique,
  requested_by text,
  status text not null default 'queued' check (status in ('queued','claimed','running','stopping','stopped','failed')),
  worker_id text,
  lease_until timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists resoflex_stream_jobs_claim_idx on public.resoflex_stream_jobs(status,created_at);
create table if not exists public.resoflex_stream_sessions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.resoflex_stream_jobs(id) on delete cascade,
  status text not null,
  detail jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists resoflex_stream_one_live_session on public.resoflex_stream_sessions ((status)) where status in ('starting','running','stopping');
alter table public.resoflex_stream_schedules enable row level security;
alter table public.resoflex_stream_jobs enable row level security;
alter table public.resoflex_stream_sessions enable row level security;
revoke all on public.resoflex_stream_schedules,public.resoflex_stream_jobs,public.resoflex_stream_sessions from anon,authenticated;
grant all on public.resoflex_stream_schedules,public.resoflex_stream_jobs,public.resoflex_stream_sessions to service_role;

create or replace function public.resoflex_stream_enqueue_job(p_schedule_id uuid,p_idempotency_key text,p_requested_by text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare j public.resoflex_stream_jobs;
begin
 insert into public.resoflex_stream_jobs(schedule_id,idempotency_key,requested_by)
 values(p_schedule_id,p_idempotency_key,p_requested_by)
 on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
 returning * into j;
 return to_jsonb(j);
end $$;

create or replace function public.resoflex_stream_claim_job(p_worker_id text)
returns setof public.resoflex_stream_jobs language plpgsql security definer set search_path=public as $$
begin
 return query
 with candidate as (
  select id from public.resoflex_stream_jobs
  where status='queued' or (status='claimed' and lease_until < now())
  order by created_at for update skip locked limit 1
 )
 update public.resoflex_stream_jobs j
 set status='claimed',worker_id=p_worker_id,lease_until=now()+interval '90 seconds',
     attempts=attempts+1,updated_at=now()
 from candidate c where j.id=c.id returning j.*;
end $$;

create or replace function public.resoflex_stream_update_session(p_job_id uuid,p_status text,p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
 update public.resoflex_stream_jobs set status=p_status,updated_at=now(),lease_until=null where id=p_job_id;
 insert into public.resoflex_stream_sessions(job_id,status,detail,started_at,ended_at)
 values(p_job_id,p_status,coalesce(p_detail,'{}'::jsonb),
   case when p_status='running' then now() end,
   case when p_status in ('failed','stopped') then now() end);
end $$;
revoke all on function public.resoflex_stream_enqueue_job(uuid,text,text) from public,anon,authenticated;
revoke all on function public.resoflex_stream_claim_job(text) from public,anon,authenticated;
revoke all on function public.resoflex_stream_update_session(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.resoflex_stream_enqueue_job(uuid,text,text) to service_role;
grant execute on function public.resoflex_stream_claim_job(text) to service_role;
grant execute on function public.resoflex_stream_update_session(uuid,text,jsonb) to service_role;
