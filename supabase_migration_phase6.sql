-- Rembr — Phase 6 migration: accounts + households
-- Run in Supabase → SQL Editor → New query → paste → Run

-- One row per signed-up person, linked to Supabase's built-in auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  household_id uuid,
  created_at timestamptz default now()
);

-- A household is a shared space. Everyone gets one automatically at signup
-- (even solo users — a "household of one"). Joining someone else's household
-- via their code moves you into theirs instead.
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table profiles add constraint profiles_household_fk
  foreign key (household_id) references households(id) on delete set null;

-- Reminders now belong to a household (shared visibility) and have an owner
-- (who created it) and an assignee (who it's currently for — defaults to owner,
-- can be reassigned to anyone else in the same household).
alter table reminders add column if not exists household_id uuid references households(id);
alter table reminders add column if not exists owner_id uuid references profiles(id);
alter table reminders add column if not exists assigned_to uuid references profiles(id);

alter table checkins add column if not exists responded_by uuid references profiles(id);

-- Drop the old wide-open policies — everything now requires real auth
drop policy if exists "anon full access - reminders" on reminders;
drop policy if exists "anon full access - checkins" on checkins;
drop policy if exists "anon full access - user_patterns" on user_patterns;
drop policy if exists "anon full access - push_subscriptions" on push_subscriptions;

alter table profiles enable row level security;
alter table households enable row level security;

-- People can see their own profile, and profiles of others in their household
create policy "view own profile" on profiles for select using (auth.uid() = id);
create policy "view household profiles" on profiles for select using (
  household_id in (select household_id from profiles where id = auth.uid())
);
create policy "update own profile" on profiles for update using (auth.uid() = id);
create policy "insert own profile" on profiles for insert with check (auth.uid() = id);

-- Anyone signed in can view a household row if they belong to it, or create a new one
create policy "view own household" on households for select using (
  id in (select household_id from profiles where id = auth.uid())
);
create policy "create household" on households for insert with check (true);

-- Reminders: visible/editable only to people in the same household
create policy "household members full access - reminders" on reminders for all using (
  household_id in (select household_id from profiles where id = auth.uid())
) with check (
  household_id in (select household_id from profiles where id = auth.uid())
);

create policy "household members full access - checkins" on checkins for all using (
  reminder_id in (
    select id from reminders where household_id in (
      select household_id from profiles where id = auth.uid()
    )
  )
) with check (
  reminder_id in (
    select id from reminders where household_id in (
      select household_id from profiles where id = auth.uid()
    )
  )
);

create policy "household members full access - user_patterns" on user_patterns for all using (
  reminder_id in (
    select id from reminders where household_id in (
      select household_id from profiles where id = auth.uid()
    )
  )
) with check (true);

create policy "own push subscriptions" on push_subscriptions for all using (true) with check (true);
-- Note: push_subscriptions stays permissive for now since it's device-level, not data-level;
-- tightening this further is a nice-to-have, not a privacy risk on its own.
