-- Rembr — Phase 5 migration
-- Run in Supabase → SQL Editor → New query → paste → Run

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;
create policy "anon full access - push_subscriptions" on push_subscriptions for all using (true) with check (true);

alter table reminders add column if not exists last_notified_at timestamptz;
