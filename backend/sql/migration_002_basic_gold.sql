-- ── MODIFICAÇÃO: migração Bronze/Prata/Ouro -> Basic/Gold
-- ── DATA: 2026-05-18

alter table users
  add column if not exists plan text not null default 'basic',
  add column if not exists is_gold boolean not null default false,
  add column if not exists access_status text not null default 'active',
  add column if not exists password_hash text,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists kiwify_customer_id text;

alter table users drop constraint if exists users_plan_check;
alter table users add constraint users_plan_check check (plan in ('basic', 'gold'));
alter table users add constraint users_access_status_check check (access_status in ('active', 'inactive', 'refunded'));

update users set plan = 'gold', is_gold = true where plan in ('ouro', 'gold');
update users set plan = 'basic', is_gold = false where plan in ('bronze', 'prata', 'basic') or plan is null;

alter table subscriptions drop constraint if exists subscriptions_plan_check;
alter table subscriptions add constraint subscriptions_plan_check check (plan in ('basic', 'gold'));

update subscriptions set plan = 'gold' where plan = 'ouro';
update subscriptions set plan = 'basic' where plan in ('bronze', 'prata');
