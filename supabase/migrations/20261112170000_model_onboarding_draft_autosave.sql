create table if not exists public.model_onboarding_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  current_step smallint not null default 1 check (current_step between 1 and 4),
  updated_at timestamptz not null default now()
);
alter table public.model_onboarding_drafts enable row level security;
drop policy if exists model_onboarding_drafts_select_owner on public.model_onboarding_drafts;
create policy model_onboarding_drafts_select_owner on public.model_onboarding_drafts
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists model_onboarding_drafts_insert_owner on public.model_onboarding_drafts;
create policy model_onboarding_drafts_insert_owner on public.model_onboarding_drafts
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists model_onboarding_drafts_update_owner on public.model_onboarding_drafts;
create policy model_onboarding_drafts_update_owner on public.model_onboarding_drafts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.model_onboarding_drafts to authenticated;
