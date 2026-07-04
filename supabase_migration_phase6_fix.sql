-- Rembr — Phase 6 fix: resolves "infinite recursion detected in policy for relation profiles"
-- Run in Supabase → SQL Editor → New query → paste → Run

-- A SECURITY DEFINER function bypasses RLS internally, so using it inside a policy
-- doesn't trigger the same policy again (which is what caused the recursion).
create or replace function my_household_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select household_id from profiles where id = auth.uid()
$$;

-- Replace the recursive policy with one that uses the safe function instead
drop policy if exists "view household profiles" on profiles;
create policy "view household profiles" on profiles for select using (
  household_id = my_household_id()
);

-- Tidy up the other policies to use the same safe function (equivalent logic, cleaner and faster)
drop policy if exists "view own household" on households;
create policy "view own household" on households for select using (
  id = my_household_id()
);

drop policy if exists "household members full access - reminders" on reminders;
create policy "household members full access - reminders" on reminders for all using (
  household_id = my_household_id()
) with check (
  household_id = my_household_id()
);

drop policy if exists "household members full access - checkins" on checkins;
create policy "household members full access - checkins" on checkins for all using (
  reminder_id in (select id from reminders where household_id = my_household_id())
) with check (
  reminder_id in (select id from reminders where household_id = my_household_id())
);

drop policy if exists "household members full access - user_patterns" on user_patterns;
create policy "household members full access - user_patterns" on user_patterns for all using (
  reminder_id in (select id from reminders where household_id = my_household_id())
) with check (true);
