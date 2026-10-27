create table if not exists public.elite_media_checkouts (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  auth_user_id uuid,
  email text not null,
  full_name text not null,
  phone text not null,
  offer_slug text not null,
  offer_name text not null,
  amount_ngn integer not null check (amount_ngn > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  billing_interval text not null check (billing_interval in ('once','monthly')),
  paystack_plan_code text,
  paystack_subscription_code text,
  status text not null default 'pending' check (status in ('pending','paid','active','past_due','cancelled','failed')),
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists elite_media_checkouts_email_idx on public.elite_media_checkouts (email, created_at desc);
create index if not exists elite_media_checkouts_subscription_idx on public.elite_media_checkouts (paystack_subscription_code) where paystack_subscription_code is not null;
alter table public.elite_media_checkouts enable row level security;
revoke all on public.elite_media_checkouts from anon, authenticated;
