-- Migração: plan/is_gold -> status (BASICO | OURO)

alter table users add column if not exists status text;

update users
set status = case
  when is_gold = true or lower(coalesce(plan, '')) in ('gold', 'ouro') then 'OURO'
  else 'BASICO'
end
where status is null or status not in ('BASICO', 'OURO');

alter table users alter column status set default 'BASICO';
alter table users alter column status set not null;

alter table users drop constraint if exists users_status_check;
alter table users add constraint users_status_check check (status in ('BASICO', 'OURO'));

alter table users drop column if exists plan;
alter table users drop column if exists is_gold;

alter table subscriptions drop constraint if exists subscriptions_plan_check;
alter table subscriptions add constraint subscriptions_plan_check check (plan in ('BASICO', 'OURO'));

update subscriptions set plan = 'OURO' where lower(plan) in ('gold', 'ouro');
update subscriptions set plan = 'BASICO' where lower(plan) in ('basic', 'bronze', 'prata', 'basico') or plan is null;
