create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  plan text not null default 'basic' check (plan in ('basic', 'gold')),
  is_gold boolean not null default false,
  access_status text not null default 'active' check (access_status in ('active', 'inactive', 'refunded')),
  password_hash text,
  must_change_password boolean not null default false,
  kiwify_customer_id text,
  created_at timestamptz not null default now(),
  lgpd_consent_at timestamptz
);

create index if not exists idx_users_plan on users(plan);
create index if not exists idx_users_is_gold on users(is_gold);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null default 'kiwify',
  provider_customer_id text,
  provider_subscription_id text,
  provider_product_id text,
  plan text not null check (plan in ('basic', 'gold')),
  status text not null check (status in ('active', 'past_due', 'canceled', 'chargeback', 'refunded')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create index if not exists idx_subscriptions_user_id on subscriptions(user_id);

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload_json jsonb not null,
  status text not null default 'processing',
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists idx_webhook_events_status on webhook_events(status);
