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

alter table family_settings
  add column if not exists bonus_rules jsonb not null default '{"monthly":[{"days":5,"amount":5},{"days":7,"amount":10},{"days":30,"amount":50}],"super":[{"days":100,"amount":100}],"points":[{"rank":1,"amount":25},{"rank":2,"amount":15},{"rank":3,"amount":10}]}'::jsonb;

create table if not exists helper_pay_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  helper_id uuid not null references family_members(id) on delete cascade,
  week_label text not null,
  hours numeric(8,2) not null default 0,
  rate numeric(8,2) not null default 17,
  paid boolean not null default false,
  paid_by uuid references family_members(id),
  paid_at timestamptz,
  shifts jsonb not null default '[]'::jsonb,
  updated_by uuid references family_members(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(helper_id, week_label)
);

alter table helper_pay_records enable row level security;

drop policy if exists "members read helper pay" on helper_pay_records;
create policy "members read helper pay" on helper_pay_records for select using (auth.uid() is not null);

drop policy if exists "helpers update own unpaid helper pay" on helper_pay_records;
create policy "helpers update own unpaid helper pay" on helper_pay_records for update using (helper_id = current_member_id() and paid = false) with check (helper_id = current_member_id() and paid = false);

drop policy if exists "helpers create own helper pay" on helper_pay_records;
create policy "helpers create own helper pay" on helper_pay_records for insert with check (helper_id = current_member_id());

drop policy if exists "admins manage helper pay" on helper_pay_records;
create policy "admins manage helper pay" on helper_pay_records for all using (is_admin()) with check (is_admin());

create table if not exists helper_tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  helper_id uuid not null references family_members(id) on delete cascade,
  column_id text not null check (column_id in ('daily', 'projects', 'oneoff')),
  title text not null,
  detail text not null default '',
  position integer not null default 0,
  updated_by uuid references family_members(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists ingredient_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  helper_id uuid not null references family_members(id) on delete cascade,
  name text not null,
  requested_by uuid references family_members(id),
  requested_at timestamptz not null default now(),
  purchased_by uuid references family_members(id),
  purchased_at timestamptz,
  created_at timestamptz not null default now()
);

alter table helper_tasks enable row level security;
alter table ingredient_requests enable row level security;

drop policy if exists "members read helper tasks" on helper_tasks;
create policy "members read helper tasks" on helper_tasks for select using (auth.uid() is not null);

drop policy if exists "helpers manage own helper tasks" on helper_tasks;
create policy "helpers manage own helper tasks" on helper_tasks for all using (helper_id = current_member_id()) with check (helper_id = current_member_id());

drop policy if exists "admins manage helper tasks" on helper_tasks;
create policy "admins manage helper tasks" on helper_tasks for all using (is_admin()) with check (is_admin());

drop policy if exists "members read ingredient requests" on ingredient_requests;
create policy "members read ingredient requests" on ingredient_requests for select using (auth.uid() is not null);

drop policy if exists "helpers create own ingredient requests" on ingredient_requests;
create policy "helpers create own ingredient requests" on ingredient_requests for insert with check (helper_id = current_member_id());

drop policy if exists "admins manage ingredient requests" on ingredient_requests;
create policy "admins manage ingredient requests" on ingredient_requests for all using (is_admin()) with check (is_admin());

create table if not exists family_feed_posts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid references family_members(id) on delete set null,
  chore_record_id uuid references chore_records(id) on delete set null,
  chore_name text not null,
  image_path text not null,
  created_by uuid references family_members(id),
  created_at timestamptz not null default now()
);

create table if not exists family_feed_reactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  post_id uuid not null references family_feed_posts(id) on delete cascade,
  actor_id uuid not null references family_members(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like', 'comment')),
  comment_text text not null default '',
  points integer not null default 0,
  created_at timestamptz not null default now(),
  unique(post_id, actor_id, reaction_type)
);

alter table family_feed_posts enable row level security;
alter table family_feed_reactions enable row level security;

drop policy if exists "members read family feed posts" on family_feed_posts;
create policy "members read family feed posts" on family_feed_posts for select using (auth.uid() is not null);

drop policy if exists "members create family feed posts" on family_feed_posts;
create policy "members create family feed posts" on family_feed_posts for insert with check (created_by = current_member_id() or is_admin());

drop policy if exists "admins manage family feed posts" on family_feed_posts;
create policy "admins manage family feed posts" on family_feed_posts for all using (is_admin()) with check (is_admin());

drop policy if exists "members read family feed reactions" on family_feed_reactions;
create policy "members read family feed reactions" on family_feed_reactions for select using (auth.uid() is not null);

drop policy if exists "members create own family feed reactions" on family_feed_reactions;
create policy "members create own family feed reactions" on family_feed_reactions for insert with check (actor_id = current_member_id());

drop policy if exists "admins manage family feed reactions" on family_feed_reactions;
create policy "admins manage family feed reactions" on family_feed_reactions for all using (is_admin()) with check (is_admin());

create table if not exists review_finalizations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references family_members(id) on delete cascade,
  service_date date not null,
  deadline text not null,
  missed text[] not null default '{}',
  charged numeric(10,2) not null default 0,
  ledger_entry_id uuid references ledger_entries(id) on delete set null,
  existing_deadline_fine boolean not null default false,
  streak_credited boolean not null default false,
  excused boolean not null default false,
  hold_reason text not null default '',
  finalized_by uuid references family_members(id),
  finalized_at timestamptz not null default now(),
  unique(child_id, service_date)
);

alter table review_finalizations enable row level security;

drop policy if exists "members read review finalizations" on review_finalizations;
create policy "members read review finalizations" on review_finalizations for select using (auth.uid() is not null);

drop policy if exists "admins manage review finalizations" on review_finalizations;
create policy "admins manage review finalizations" on review_finalizations for all using (is_admin()) with check (is_admin());

with family as (
  select id from families where name = 'Teamwork Chores' order by created_at limit 1
)
insert into family_settings (
  family_id,
  default_deadline,
  review_reminder_time,
  extension_approver,
  extension_contact,
  review_recipient,
  review_contact,
  bonus_rules
)
select
  id,
  '12:00 PM',
  '12:00 PM',
  'Brigham-dad',
  '801-830-0011',
  'Mom Karmel',
  '801-427-9293',
  '{"monthly":[{"days":5,"amount":5},{"days":7,"amount":10},{"days":30,"amount":50}],"super":[{"days":100,"amount":100}],"points":[{"rank":1,"amount":25},{"rank":2,"amount":15},{"rank":3,"amount":10}]}'::jsonb
from family
on conflict (family_id) do update set
  default_deadline = excluded.default_deadline,
  review_reminder_time = excluded.review_reminder_time,
  extension_approver = excluded.extension_approver,
  extension_contact = excluded.extension_contact,
  review_recipient = excluded.review_recipient,
  review_contact = excluded.review_contact,
  bonus_rules = excluded.bonus_rules,
  updated_at = now();

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
