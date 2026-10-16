-- ChatB2K dynamic talent profile, enrichment event outbox, and 24-hour follow-up queue.
create extension if not exists pgcrypto;

create table if not exists public.chatb2k_talent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  profile_type text not null check (profile_type in ('model','brand','host','creator','professional','job_seeker','other')),
  source_table text not null, source_id uuid not null, display_name text, email text, phone text,
  preferences jsonb not null default '{}'::jsonb, career_choices jsonb not null default '[]'::jsonb,
  goals jsonb not null default '[]'::jsonb, portfolio jsonb not null default '{}'::jsonb,
  social_profiles jsonb not null default '[]'::jsonb, enrichment jsonb not null default '{}'::jsonb,
  score numeric null check (score is null or (score >= 0 and score <= 100)), score_basis text,
  onboarding_status text not null default 'received' check (onboarding_status in ('received','enrichment_pending','enriched','action_required','complete','error')),
  consent jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(profile_type, source_id)
);
create index if not exists chatb2k_talent_profiles_user_idx on public.chatb2k_talent_profiles(user_id);
create index if not exists chatb2k_talent_profiles_type_status_idx on public.chatb2k_talent_profiles(profile_type,onboarding_status);

create table if not exists public.chatb2k_talent_events (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.chatb2k_talent_profiles(id) on delete cascade,
  event_type text not null, dedupe_key text not null unique,
  status text not null default 'queued' check (status in ('queued','processing','sent','pending_configuration','retry','failed','cancelled')),
  channel text, payload jsonb not null default '{}'::jsonb, provider_response jsonb not null default '{}'::jsonb,
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(), last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), sent_at timestamptz
);
create index if not exists chatb2k_talent_events_due_idx on public.chatb2k_talent_events(status,next_attempt_at);

create table if not exists public.chatb2k_talent_followups (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.chatb2k_talent_profiles(id) on delete cascade,
  followup_type text not null default 'request_bigo_id', channel text, due_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued','processing','sent','skipped','pending_configuration','retry','failed','cancelled')),
  dedupe_key text not null unique, payload jsonb not null default '{}'::jsonb, attempts integer not null default 0,
  last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), sent_at timestamptz
);
create index if not exists chatb2k_talent_followups_due_idx on public.chatb2k_talent_followups(status,due_at);

alter table public.chatb2k_talent_profiles enable row level security;
alter table public.chatb2k_talent_events enable row level security;
alter table public.chatb2k_talent_followups enable row level security;
revoke all on public.chatb2k_talent_profiles from anon, authenticated;
revoke all on public.chatb2k_talent_events from anon, authenticated;
revoke all on public.chatb2k_talent_followups from anon, authenticated;
grant all on public.chatb2k_talent_profiles to service_role;
grant all on public.chatb2k_talent_events to service_role;
grant all on public.chatb2k_talent_followups to service_role;

create or replace function public.chatb2k_touch_talent_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists chatb2k_talent_profiles_touch on public.chatb2k_talent_profiles;
create trigger chatb2k_talent_profiles_touch before update on public.chatb2k_talent_profiles for each row execute function public.chatb2k_touch_talent_updated_at();
drop trigger if exists chatb2k_talent_events_touch on public.chatb2k_talent_events;
create trigger chatb2k_talent_events_touch before update on public.chatb2k_talent_events for each row execute function public.chatb2k_touch_talent_updated_at();
drop trigger if exists chatb2k_talent_followups_touch on public.chatb2k_talent_followups;
create trigger chatb2k_talent_followups_touch before update on public.chatb2k_talent_followups for each row execute function public.chatb2k_touch_talent_updated_at();

do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname = 'chatb2k-talent-followup-worker' loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;
select cron.schedule('chatb2k-talent-followup-worker','*/5 * * * *',$job$
  select net.http_post(
    url := 'https://vbqjvmnhdtdhmeeudqnn.supabase.co/functions/v1/chatb2k-talent-intelligence',
    headers := jsonb_build_object('Content-Type','application/json','x-content-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='buffer_cron_secret')),
    body := jsonb_build_object('action','process_due','source','supabase-cron','time',now()),
    timeout_milliseconds := 30000
  ) as request_id;
$job$);
