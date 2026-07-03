-- Rembr — Phase 2 schema
-- Run this in Supabase → SQL Editor → New query → paste all → Run

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cadence text not null, -- 'daily' | 'weekly' | 'monthly' | 'every_monday' | 'every_other_day' | 'custom'
  type text not null default 'simple', -- 'simple' (just a ping) | 'target' (tracks toward a number, e.g. water)
  target_value numeric, -- e.g. 3000 (ml of water) — null for simple reminders
  target_unit text, -- e.g. 'ml', 'times' — null for simple reminders
  created_at timestamptz default now(),
  active boolean default true
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references reminders(id) on delete cascade,
  responded_at timestamptz default now(),
  raw_response text, -- what they typed, e.g. "I had 320ml"
  parsed_value numeric, -- extracted number, e.g. 320
  completed boolean default false -- true when a target reminder's goal is met for that period
);

create table if not exists user_patterns (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references reminders(id) on delete cascade,
  avg_response_minutes numeric, -- how long they typically take to respond
  typical_value numeric, -- their usual amount (e.g. usually logs 300ml at a time)
  missed_streak int default 0,
  last_updated timestamptz default now()
);

-- Row Level Security: since this is a single-user personal app for now (no login yet),
-- we allow the anon key full access. TIGHTEN THIS before any public/multi-user release —
-- this is intentionally open for Phase 2 speed, not a final security posture.

alter table reminders enable row level security;
alter table checkins enable row level security;
alter table user_patterns enable row level security;

create policy "anon full access - reminders" on reminders for all using (true) with check (true);
create policy "anon full access - checkins" on checkins for all using (true) with check (true);
create policy "anon full access - user_patterns" on user_patterns for all using (true) with check (true);
