-- Teamwork Chores production seed data.
-- Run after supabase/schema.sql. Update Gmail values before the final production run.

insert into families (name)
values ('Teamwork Chores')
on conflict (name) do nothing;

with family as (
  select id from families where name = 'Teamwork Chores' order by created_at limit 1
)
insert into family_members (
  family_id,
  profile_key,
  display_name,
  role,
  age,
  gmail,
  max_difficulty,
  target_hard,
  daily_work_target_minutes,
  fine_rate,
  account_balance
)
select family.id, member.profile_key, member.display_name, member.role::app_role, member.age, member.gmail, member.max_difficulty, member.target_hard, member.daily_work_target_minutes, member.fine_rate, 0
from family
cross join (values
  ('karmel', 'Karmel', 'admin', null, 'karmel.larson@gmail.com', 10, false, 30, 0),
  ('brigham', 'Brigham', 'admin', null, null, 10, false, 30, 0),
  ('vanessa', 'Vanessa', 'helper', null, null, 10, false, 30, 0),
  ('thayne', 'Thayne', 'child', 20, null, 10, true, 40, 5),
  ('brig', 'Brig Jr.', 'child', 18, null, 10, true, 40, 5),
  ('josh', 'Josh', 'child', 16, null, 10, true, 35, 5),
  ('jojo', 'JoJo', 'child', 15, null, 10, true, 35, 5),
  ('louis', 'Louis', 'child', 12, null, 6, false, 30, 3),
  ('brielle', 'Brielle', 'child', 8, null, 4, false, 20, 2)
) as member(profile_key, display_name, role, age, gmail, max_difficulty, target_hard, daily_work_target_minutes, fine_rate)
on conflict (family_id, profile_key) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  age = excluded.age,
  gmail = coalesce(family_members.gmail, excluded.gmail),
  max_difficulty = excluded.max_difficulty,
  target_hard = excluded.target_hard,
  daily_work_target_minutes = excluded.daily_work_target_minutes,
  fine_rate = excluded.fine_rate,
  updated_at = now();

with members as (
  select family_id, id, role, cell_phone, text_reminders_enabled
  from family_members
)
insert into notification_preferences (
  family_id,
  member_id,
  cell_phone,
  sms_enabled,
  notify_noon_review,
  notify_extensions,
  notify_redo,
  notify_teen_reminders
)
select
  family_id,
  id,
  cell_phone,
  text_reminders_enabled,
  role = 'admin',
  role in ('admin', 'child'),
  role = 'child',
  role = 'child'
from members
on conflict (member_id) do update set
  cell_phone = excluded.cell_phone,
  sms_enabled = notification_preferences.sms_enabled or excluded.sms_enabled,
  notify_noon_review = notification_preferences.notify_noon_review or excluded.notify_noon_review,
  notify_extensions = notification_preferences.notify_extensions or excluded.notify_extensions,
  notify_redo = notification_preferences.notify_redo or excluded.notify_redo,
  notify_teen_reminders = notification_preferences.notify_teen_reminders or excluded.notify_teen_reminders,
  updated_at = now();

insert into storage.buckets (id, name, public)
values ('family-photos', 'family-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "family photo uploads require auth" on storage.objects;
create policy "family photo uploads require auth"
on storage.objects for insert
to authenticated
with check (bucket_id = 'family-photos');

drop policy if exists "family photo reads require auth" on storage.objects;
create policy "family photo reads require auth"
on storage.objects for select
to authenticated
using (bucket_id = 'family-photos');

with family as (
  select id from families where name = 'Teamwork Chores' order by created_at limit 1
)
insert into chores (family_id, name, minutes, difficulty, frequency, fit, notice, training_notes, active)
select family.id, chore.name, chore.minutes, chore.difficulty, chore.frequency::chore_frequency, chore.fit::chore_fit, chore.notice::chore_notice, chore.training_notes, chore.active
from family
cross join (values
  ('Take out trash', 2, 2, 'Daily', 'Anyone', 'Starts after 24 hours', '', true),
  ('Unload dishwasher', 8, 3, 'Daily', 'Anyone', 'Starts after 24 hours', '', true),
  ('Load breakfast dishes', 6, 2, 'Daily', 'Anyone', 'Starts after 24 hours', '', true),
  ('Wipe kitchen counters', 8, 3, 'Daily', 'Anyone', 'Starts after 24 hours', '', true),
  ('Sweep kitchen', 10, 4, 'Daily', 'Anyone', 'Starts after 24 hours', '', true),
  ('Wipe kitchen table and chairs', 7, 3, 'Daily', 'Anyone', 'Starts after 24 hours', '', true),
  ('Check pantry floor for crumbs', 5, 2, 'Daily', 'Anyone', 'Starts after 24 hours', '', true),
  ('Empty small bathroom trash cans', 6, 2, 'Weekly', 'Anyone', 'Starts after 24 hours', '', true),
  ('Feed pets and refill water', 6, 2, 'Daily', 'Anyone', 'Starts after 24 hours', '', true),
  ('Clean pet bowls', 8, 3, 'Weekly', 'Anyone', 'Starts after 24 hours', '', true),
  ('Pick up pet toys', 5, 2, 'Daily', 'Louis and Brielle', 'Starts after 24 hours', '', true),
  ('Fold towels', 12, 4, 'Weekly', 'Anyone', 'Starts after 24 hours', '', true),
  ('Match socks', 10, 3, 'Weekly', 'Anyone', 'Starts after 24 hours', '', true),
  ('Put away personal laundry', 15, 4, 'Weekly', 'Anyone', 'Starts after 24 hours', '', true),
  ('Start towel load', 5, 5, 'Weekly', 'Older kids', 'Starts after 24 hours', '', true),
  ('Move laundry to dryer', 4, 4, 'Weekly', 'Older kids', 'Starts after 24 hours', '', true),
  ('Vacuum living room', 15, 5, 'Weekly', 'Older kids', 'Starts after 24 hours', '', true),
  ('Vacuum stairs', 18, 6, 'Weekly', 'Older kids', 'Starts after 24 hours', '', true),
  ('Dust living room surfaces', 12, 4, 'Weekly', 'Anyone', 'Starts after 24 hours', '', true),
  ('Move garbage cans to curb', 5, 3, 'Monday only', 'Anyone', 'Starts after 24 hours', '', true),
  ('Water front plants', 10, 3, 'Daily', 'Anyone', 'Starts after 24 hours', '', true),
  ('Water backyard plants', 12, 4, 'Daily', 'Anyone', 'Starts after 24 hours', '', true),
  ('Pull weeds from front bed', 20, 6, 'Weekly', 'Older kids', 'Starts after 24 hours', '', true),
  ('Mow front strip', 25, 7, 'Monday only', 'Boys', 'Starts after 24 hours', '', true),
  ('Clean out fridge leftovers', 15, 5, 'Weekly', 'Older kids', 'Starts after 24 hours', '', true),
  ('Make 10 layered salad jars', 30, 7, 'Weekly', 'Older kids', 'Starts after 24 hours', 'Make 5 pint jars and 5 quart jars. Keep wet ingredients low, add sturdy vegetables next, greens near the top, seal and label with date.', true),
  ('Prep breakfast burritos', 25, 6, 'Weekly', 'Older kids', 'Starts after 24 hours', 'Cook filling safely, cool before wrapping, label the freezer bag with date and count.', true),
  ('Wash and chop snack vegetables', 18, 4, 'Weekly', 'Anyone', 'Starts after 24 hours', 'Wash produce first, use a clean board, dry containers, and put cut vegetables at eye level in the fridge.', true),
  ('Pack lunch snack bins', 15, 3, 'Weekly', 'Anyone', 'Starts after 24 hours', 'Portion snacks evenly, check expiration dates, and leave the pantry shelf tidy.', true),
  ('Clean out gutters', 30, 9, 'Monthly', 'Boys only', 'Starts after 24 hours', '', false)
) as chore(name, minutes, difficulty, frequency, fit, notice, training_notes, active)
on conflict (family_id, lower(name)) do update set
  minutes = excluded.minutes,
  difficulty = excluded.difficulty,
  frequency = excluded.frequency,
  fit = excluded.fit,
  notice = excluded.notice,
  training_notes = excluded.training_notes,
  active = excluded.active,
  updated_at = now();
