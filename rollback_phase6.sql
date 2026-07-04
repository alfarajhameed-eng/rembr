-- Rembr — rollback Phase 6 access rules
-- Run in Supabase → SQL Editor → New query → paste → Run

drop policy if exists "household members full access - reminders" on reminders;
drop policy if exists "household members full access - checkins" on checkins;
drop policy if exists "household members full access - user_patterns" on user_patterns;

create policy "anon full access - reminders" on reminders for all using (true) with check (true);
create policy "anon full access - checkins" on checkins for all using (true) with check (true);
create policy "anon full access - user_patterns" on user_patterns for all using (true) with check (true);

-- Make sure nothing is orphaned/hidden — clear any household scoping that got set
update reminders set household_id = null, owner_id = null;
