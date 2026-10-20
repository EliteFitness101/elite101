-- Elite NG creator growth foundation.
-- Stores account metadata and workflow state only. OAuth access/refresh tokens must remain
-- in a server-side secret store and must never be written to these client-readable tables.

create table if not exists public.elite_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_name text not null,
  slug text,
  brand_type text not null default 'creator'
    check (brand_type in ('creator', 'brand', 'agency', 'local_business')),
  website_url text,
  bio text,
  brand_voice text,
  brand_assets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.elite_social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_profile_id uuid references public.elite_brand_profiles(id) on delete set null,
  provider text not null
    check (provider in ('tiktok', 'meta', 'youtube', 'google_business_profile')),
  provider_account_id text,
  account_label text,
  scopes text[] not null default '{}',
  connection_status text not null default 'pending'
    check (connection_status in ('pending', 'connected', 'reauthorization_required', 'revoked', 'error')),
  -- Opaque pointer only. Never store provider access or refresh tokens in this table.
  token_secret_ref text,
  token_expires_at timestamptz,
  last_verified_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

create table if not exists public.elite_content_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_profile_id uuid references public.elite_brand_profiles(id) on delete set null,
  connection_id uuid references public.elite_social_connections(id) on delete set null,
  provider text not null
    check (provider in ('tiktok', 'meta', 'youtube', 'google_business_profile', 'manual')),
  title text,
  caption text,
  asset_url text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  published_at timestamptz,
  provider_post_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.elite_brand_portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_profile_id uuid references public.elite_brand_profiles(id) on delete set null,
  title text not null,
  portfolio_type text not null
    check (portfolio_type in ('creator_media_kit', 'brand_identity', 'campaign_case_study', 'agency_capabilities')),
  slug text,
  content jsonb not null default '{}'::jsonb,
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists elite_brand_profiles_user_updated_idx
  on public.elite_brand_profiles (user_id, updated_at desc);
create index if not exists elite_social_connections_user_provider_idx
  on public.elite_social_connections (user_id, provider, connection_status);
create index if not exists elite_content_jobs_user_status_schedule_idx
  on public.elite_content_jobs (user_id, status, scheduled_at);
create index if not exists elite_content_jobs_due_idx
  on public.elite_content_jobs (scheduled_at)
  where status = 'scheduled';
create index if not exists elite_brand_portfolios_user_updated_idx
  on public.elite_brand_portfolios (user_id, updated_at desc);
create index if not exists elite_brand_portfolios_public_idx
  on public.elite_brand_portfolios (slug)
  where visibility = 'public';

alter table public.elite_brand_profiles enable row level security;
alter table public.elite_social_connections enable row level security;
alter table public.elite_content_jobs enable row level security;
alter table public.elite_brand_portfolios enable row level security;

-- Brand profile ownership.
drop policy if exists "Users manage their own Elite brand profiles" on public.elite_brand_profiles;
create policy "Users manage their own Elite brand profiles"
  on public.elite_brand_profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can read connection status for their own accounts. Connection writes are reserved
-- for trusted server-side OAuth handlers using the service role.
drop policy if exists "Users read their own Elite social connections" on public.elite_social_connections;
create policy "Users read their own Elite social connections"
  on public.elite_social_connections for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can create and manage their own content workflow records. Publishing workers must
-- independently validate ownership, connection state, approval, schedule, and provider scope.
drop policy if exists "Users manage their own Elite content jobs" on public.elite_content_jobs;
create policy "Users manage their own Elite content jobs"
  on public.elite_content_jobs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Portfolio ownership and privacy. Public sharing should be implemented through a narrowly
-- scoped server/view path; this policy intentionally does not expose public rows anonymously.
drop policy if exists "Users manage their own Elite portfolios" on public.elite_brand_portfolios;
create policy "Users manage their own Elite portfolios"
  on public.elite_brand_portfolios for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.elite_social_connections is
  'Provider account metadata only; OAuth tokens belong in a server-side secret store.';
comment on column public.elite_social_connections.token_secret_ref is
  'Opaque server-side secret-store reference. Must never contain a raw provider token.';
comment on table public.elite_content_jobs is
  'Creator content workflow and publication state. Does not itself schedule or publish content.';
comment on table public.elite_brand_portfolios is
  'Creator/brand portfolio content. Public delivery requires a separately reviewed read path.';
