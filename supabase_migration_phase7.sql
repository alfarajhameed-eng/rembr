-- Rembr — Phase 7 migration
-- Run in Supabase → SQL Editor → New query → paste → Run

-- Track when a reminder was last fully completed (used to compute "days overdue")
alter table reminders add column if not exists last_completed_at timestamptz;

-- One-time reminders: a specific date + time instead of a recurring cadence
alter table reminders add column if not exists due_at timestamptz;

-- AI-generated nudge message, cached so we don't call the API on every page load
alter table reminders add column if not exists ai_message text;
alter table reminders add column if not exists ai_message_at timestamptz;

-- Checklist subtasks — a parent reminder (e.g. "Laundry") made up of items
-- (e.g. Whites, Mix, Baby clothes) that must ALL be checked for the parent to count as done
create table if not exists subtasks (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references reminders(id) on delete cascade,
  title text not null,
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists subtask_checkins (
  id uuid primary key default gen_random_uuid(),
  subtask_id uuid references subtasks(id) on delete cascade,
  responded_at timestamptz default now()
);

alter table subtasks enable row level security;
alter table subtask_checkins enable row level security;

create policy "anon full access - subtasks" on subtasks for all using (true) with check (true);
create policy "anon full access - subtask_checkins" on subtask_checkins for all using (true) with check (true);
