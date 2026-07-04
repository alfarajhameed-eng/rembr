-- Rembr — simple labeling, no accounts required
-- Run in Supabase → SQL Editor → New query → paste → Run

alter table reminders add column if not exists assigned_label text;
