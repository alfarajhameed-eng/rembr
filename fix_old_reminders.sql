-- Run this once, right after your first sign-up.
-- It finds your new profile/household and attaches your old reminders to it.

update reminders
set
  household_id = (select household_id from profiles where full_name = 'Hameed' limit 1),
  owner_id = (select id from profiles where full_name = 'Hameed' limit 1),
  assigned_to = (select id from profiles where full_name = 'Hameed' limit 1)
where household_id is null;

-- Show your household code so you can hand it to Wejdan's account
select code from households
where id = (select household_id from profiles where full_name = 'Hameed' limit 1);
