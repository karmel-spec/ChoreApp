-- Teamwork Chores production backend schema.
-- Apply in Supabase SQL editor after creating the project.

create extension if not exists pgcrypto;

create type app_role as enum ('admin', 'child', 'helper');
create type chore_frequency as enum ('Daily', 'Monday only', 'Weekly', 'Monthly', 'One-off');
create type chore_fit as enum ('Anyone', 'Boys', 'Older kids', 'Louis and Brielle', 'Brielle only', 'Boys only', 'Vanessa');
create type chore_notice as enum ('Starts after 24 hours', 'Start today', 'Start next week');
create type ledger_kind as enum ('fine', 'bonus', 'helper_pay');
create type photo_kind as enum ('family_hero', 'profile', 'proof', 'feed');
create type notification_kind as enum ('noon_review', 'extension', 'redo', 'teen_reminder');

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Teamwork Chores' unique,
  hero_photo_path text,
  created_at timestamptz not null default now()
);

create table family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  auth_user_id uuid unique,
  profile_key text not null,
  display_name text not null,
  role app_role not null,
  age integer,
  gmail text,
  cell_phone text,
  text_reminders_enabled boolean not null default false,
  profile_photo_path text,
  max_difficulty integer not null default 10 check (max_difficulty between 1 and 10),
  target_hard boolean not null default false,
  daily_work_target_minutes integer not null default 30 check (daily_work_target_minutes between 5 and 60),
  fine_rate numeric(8,2) not null default 5,
  account_balance numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(family_id, profile_key)
);

create table chores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  minutes integer not null check (minutes between 1 and 180),
  difficulty integer not null check (difficulty between 1 and 10),
  frequency chore_frequency not null default 'Daily',
  fit chore_fit not null default 'Anyone',
  notice chore_notice not null default 'Starts after 24 hours',
  training_notes text not null default '',
  active boolean not null default true,
  created_by uuid references family_members(id),
  updated_by uuid references family_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index chores_family_lower_name_key on chores(family_id, lower(name));

create table chore_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references family_members(id) on delete cascade,
  chore_id uuid references chores(id) on delete set null,
  chore_name text not null,
  chore_type text not null check (chore_type in ('priority', 'rotating')),
  service_date date not null,
  completed_at timestamptz,
  proof_photo_path text,
  proof_submitted_at timestamptz,
  review_status text not null default 'waiting' check (review_status in ('waiting', 'approved', 'redo')),
  reviewed_by uuid references family_members(id),
  reviewed_at timestamptz,
  redo_note text,
  unique(child_id, service_date, chore_type, chore_name)
);

create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid references family_members(id) on delete cascade,
  kind ledger_kind not null,
  title text not null,
  amount numeric(10,2) not null,
  service_date date,
  period text,
  paid boolean not null default false,
  charged_by uuid references family_members(id),
  charged_at timestamptz,
  awarded_by uuid references family_members(id),
  awarded_at timestamptz,
  paid_by uuid references family_members(id),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table availability_holds (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references family_members(id) on delete cascade,
  start_date date not null,
  days integer not null check (days between 1 and 60),
  reason text not null,
  created_by uuid references family_members(id),
  removed_by uuid references family_members(id),
  removed_at timestamptz,
  created_at timestamptz not null default now()
);

create table extension_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references family_members(id) on delete cascade,
  service_date date not null,
  requested_deadline text not null,
  reason text not null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'denied')),
  requested_by uuid references family_members(id),
  decided_by uuid references family_members(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid references family_members(id) on delete set null,
  chore_record_id uuid references chore_records(id) on delete set null,
  kind photo_kind not null,
  storage_path text not null,
  caption text,
  created_by uuid references family_members(id),
  created_at timestamptz not null default now()
);

create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  cell_phone text,
  sms_enabled boolean not null default false,
  push_enabled boolean not null default false,
  notify_noon_review boolean not null default false,
  notify_extensions boolean not null default false,
  notify_redo boolean not null default false,
  notify_teen_reminders boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(member_id)
);

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  recipient_id uuid references family_members(id) on delete set null,
  kind notification_kind not null,
  destination text not null,
  body text not null,
  provider_message_id text,
  status text not null default 'queued',
  created_by uuid references family_members(id),
  created_at timestamptz not null default now()
);

alter table families enable row level security;
alter table family_members enable row level security;
alter table chores enable row level security;
alter table chore_records enable row level security;
alter table ledger_entries enable row level security;
alter table availability_holds enable row level security;
alter table extension_requests enable row level security;
alter table photos enable row level security;
alter table notification_preferences enable row level security;
alter table notification_log enable row level security;

create or replace function current_member_role()
returns app_role
language sql
security definer
set search_path = public
as $$
  select role from family_members where auth_user_id = auth.uid() limit 1;
$$;

create or replace function current_member_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from family_members where auth_user_id = auth.uid() limit 1;
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select current_member_role() = 'admin';
$$;

create policy "members can read family data" on family_members for select using (auth.uid() is not null);
create policy "members can update own contact profile" on family_members for update using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create policy "admins can manage members" on family_members for all using (is_admin()) with check (is_admin());

create policy "members can read chores" on chores for select using (auth.uid() is not null);
create policy "admins manage chores" on chores for all using (is_admin()) with check (is_admin());

create policy "members read chore records" on chore_records for select using (auth.uid() is not null);
create policy "children update own chore records" on chore_records for update using (child_id = current_member_id()) with check (child_id = current_member_id());
create policy "admins manage chore records" on chore_records for all using (is_admin()) with check (is_admin());

create policy "members read ledger" on ledger_entries for select using (auth.uid() is not null);
create policy "admins manage ledger" on ledger_entries for all using (is_admin()) with check (is_admin());

create policy "members read holds" on availability_holds for select using (auth.uid() is not null);
create policy "admins manage holds" on availability_holds for all using (is_admin()) with check (is_admin());

create policy "members read extensions" on extension_requests for select using (auth.uid() is not null);
create policy "children request own extensions" on extension_requests for insert with check (child_id = current_member_id());
create policy "admins manage extensions" on extension_requests for all using (is_admin()) with check (is_admin());

create policy "members read photos" on photos for select using (auth.uid() is not null);
create policy "members add own photos" on photos for insert with check (created_by = current_member_id() or is_admin());
create policy "admins manage photos" on photos for all using (is_admin()) with check (is_admin());

create policy "members read notification preferences" on notification_preferences for select using (auth.uid() is not null);
create policy "members update own notification preferences" on notification_preferences for update using (member_id = current_member_id()) with check (member_id = current_member_id());
create policy "admins manage notification preferences" on notification_preferences for all using (is_admin()) with check (is_admin());

create policy "admins read notification logs" on notification_log for select using (is_admin());
create policy "admins create notification logs" on notification_log for insert with check (is_admin());
