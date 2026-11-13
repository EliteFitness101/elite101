create table if not exists public.brand_onboarding_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.brand_onboarding_drafts enable row level security;
drop policy if exists brand_onboarding_drafts_select_owner on public.brand_onboarding_drafts;
create policy brand_onboarding_drafts_select_owner on public.brand_onboarding_drafts
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists brand_onboarding_drafts_insert_owner on public.brand_onboarding_drafts;
create policy brand_onboarding_drafts_insert_owner on public.brand_onboarding_drafts
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists brand_onboarding_drafts_update_owner on public.brand_onboarding_drafts;
create policy brand_onboarding_drafts_update_owner on public.brand_onboarding_drafts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists brand_onboarding_drafts_delete_owner on public.brand_onboarding_drafts;
create policy brand_onboarding_drafts_delete_owner on public.brand_onboarding_drafts
  for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.brand_onboarding_drafts to authenticated;
