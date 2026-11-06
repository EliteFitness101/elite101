-- Applied to Supabase project vbqjvmnhdtdhmeeudqnn as migration elite_buffer_multi_org_publishing.
-- This source copy is retained with Elite101 so schema intent is reviewable and reproducible.

create table if not exists public.buffer_oauth_connections (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Buffer account',
  account_id text,
  account_email text,
  account_name text,
  token_ciphertext text,
  token_iv text,
  token_tag text,
  token_type text not null default 'Bearer',
  scope text not null default '',
  expires_at timestamptz,
  status text not null default 'pending' check (status in ('pending','connected','needs_reauth','revoked','error')),
  last_verified_at timestamptz,
  last_error text,
  refresh_lock_until timestamptz,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists buffer_oauth_connections_owner_idx on public.buffer_oauth_connections(owner_user_id, created_at desc);
create unique index if not exists buffer_oauth_connections_account_uidx on public.buffer_oauth_connections(owner_user_id, account_id) where account_id is not null;

create table if not exists public.buffer_organizations (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.buffer_oauth_connections(id) on delete cascade,
  organization_id text not null,
  name text not null,
  active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id, organization_id)
);
create index if not exists buffer_organizations_connection_idx on public.buffer_organizations(connection_id, active);

alter table public.buffer_channels
  add column if not exists connection_id uuid references public.buffer_oauth_connections(id) on delete set null,
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists handle text,
  add column if not exists channel_type text,
  add column if not exists provider_disconnected boolean not null default false,
  add column if not exists provider_locked boolean not null default false,
  add column if not exists is_verified boolean not null default false,
  add column if not exists publishing_enabled boolean not null default false,
  add column if not exists last_synced_at timestamptz;

create index if not exists buffer_channels_connection_idx on public.buffer_channels(connection_id, active);
create index if not exists buffer_channels_org_idx on public.buffer_channels(organization_id, active);

create table if not exists public.buffer_channel_assignments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.buffer_oauth_connections(id) on delete cascade,
  organization_id text not null,
  channel_id text not null references public.buffer_channels(channel_id) on delete cascade,
  client_key text not null,
  host_id text,
  expected_handle text not null,
  assignment_status text not null default 'pending' check (assignment_status in ('pending','verified','revoked')),
  owner_evidence jsonb not null default '{}'::jsonb,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id, channel_id, client_key)
);
create index if not exists buffer_channel_assignments_client_idx on public.buffer_channel_assignments(client_key, assignment_status);

create table if not exists public.buffer_asset_authorizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  asset_registry_id uuid not null references public.content_asset_registry(id) on delete cascade,
  client_key text not null,
  host_id text,
  channel_id text not null references public.buffer_channels(channel_id) on delete cascade,
  organization_id text not null,
  rights_holder text not null,
  permission_scope text[] not null default array['organic_social']::text[],
  evidence jsonb not null default '{}'::jsonb,
  authorization_status text not null default 'pending' check (authorization_status in ('pending','approved','revoked','expired')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(asset_registry_id, channel_id, client_key)
);
create index if not exists buffer_asset_authorizations_asset_idx on public.buffer_asset_authorizations(asset_registry_id, authorization_status);
create index if not exists buffer_asset_authorizations_channel_idx on public.buffer_asset_authorizations(channel_id, authorization_status);

alter table public.buffer_publications
  add column if not exists connection_id uuid references public.buffer_oauth_connections(id) on delete set null,
  add column if not exists organization_id text,
  add column if not exists asset_registry_id uuid references public.content_asset_registry(id) on delete set null,
  add column if not exists client_key text,
  add column if not exists host_id text,
  add column if not exists target_handle text,
  add column if not exists rights_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists qa_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists error_message text,
  add column if not exists attempts integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.buffer_oauth_connections enable row level security;
alter table public.buffer_organizations enable row level security;
alter table public.buffer_channel_assignments enable row level security;
alter table public.buffer_asset_authorizations enable row level security;
revoke all on public.buffer_oauth_connections from anon, authenticated;
revoke all on public.buffer_organizations from anon, authenticated;
revoke all on public.buffer_channel_assignments from anon, authenticated;
revoke all on public.buffer_asset_authorizations from anon, authenticated;
grant all on public.buffer_oauth_connections to service_role;
grant all on public.buffer_organizations to service_role;
grant all on public.buffer_channel_assignments to service_role;
grant all on public.buffer_asset_authorizations to service_role;

create or replace function public.claim_buffer_oauth_refresh(p_connection_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_claimed uuid;
begin
  update public.buffer_oauth_connections
     set refresh_lock_until = now() + interval '90 seconds', updated_at = now()
   where id = p_connection_id and status = 'connected'
     and (refresh_lock_until is null or refresh_lock_until < now())
  returning id into v_claimed;
  return v_claimed is not null;
end;
$$;
create or replace function public.release_buffer_oauth_refresh(p_connection_id uuid)
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.buffer_oauth_connections set refresh_lock_until = null, updated_at = now() where id = p_connection_id;
$$;
revoke all on function public.claim_buffer_oauth_refresh(uuid) from public, anon, authenticated;
revoke all on function public.release_buffer_oauth_refresh(uuid) from public, anon, authenticated;
grant execute on function public.claim_buffer_oauth_refresh(uuid) to service_role;
grant execute on function public.release_buffer_oauth_refresh(uuid) to service_role;
