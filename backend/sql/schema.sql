create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  lgpd_consent_at timestamptz
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null default 'kiwify',
  provider_customer_id text,
  provider_subscription_id text,
  plan text not null check (plan in ('bronze', 'prata', 'ouro')),
  status text not null check (status in ('active', 'past_due', 'canceled', 'chargeback')),
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
