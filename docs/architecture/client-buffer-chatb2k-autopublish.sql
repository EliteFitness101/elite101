-- Additive client-owned Buffer -> ChatB2K media intake.
-- Existing rights, QA, organization and channel gates remain authoritative.
create table if not exists public.buffer_client_media_intake (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  model_id uuid not null references public.models(id) on delete cascade,
  source_url text not null,
  source_host text not null,
  rights_holder text,
  rights_evidence_url text,
  rights_attested_at timestamptz,
  status text not null default 'pending' check (status in ('pending','approved','rejected','ingested')),
  asset_registry_id uuid references public.content_asset_registry(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, source_url)
);
create index if not exists buffer_client_media_intake_owner_idx
  on public.buffer_client_media_intake(owner_user_id, status, created_at desc);
alter table public.buffer_client_media_intake enable row level security;
revoke all on public.buffer_client_media_intake from anon, authenticated;
grant all on public.buffer_client_media_intake to service_role;
