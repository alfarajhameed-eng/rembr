-- Rembr — Phase 3 migration
-- Run this in Supabase → SQL Editor → New query → paste → Run
-- Adds flexible scheduling: specific days of week, or every-N-days intervals

alter table reminders add column if not exists interval_days int;
alter table reminders add column if not exists days_of_week int[]; -- 0=Sun, 1=Mon, ... 6=Sat
