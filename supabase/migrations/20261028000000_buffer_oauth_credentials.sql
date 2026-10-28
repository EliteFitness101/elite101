-- Store Buffer OAuth credentials as an application-encrypted singleton.
-- The table has no client-facing policies; only trusted server-side service-role code may access it.
create table if not exists public.resofit_buffer_oauth_credentials (
  singleton boolean primary key default true check (singleton = true),
  token_ciphertext text not null,
  token_iv text not null,
  token_tag text not null,
  scope text not null default '',
  token_type text not null default 'Bearer',
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resofit_buffer_oauth_credentials enable row level security;
revoke all on table public.resofit_buffer_oauth_credentials from anon, authenticated;
grant all on table public.resofit_buffer_oauth_credentials to service_role;

comment on table public.resofit_buffer_oauth_credentials is
  'Server-only Buffer OAuth token bundle; token_ciphertext is AES-256-GCM encrypted by the elite101 server runtime.';
