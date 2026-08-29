-- supabase/migrations/0001_init.sql

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  familiarity_level text not null check (familiarity_level in ('new','some_experience','experienced')),
  emotional_bandwidth text not null check (emotional_bandwidth in ('low','moderate','high')),
  primary_focus text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
create policy profiles_owner on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create table public.journey_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage_slug text not null,
  lesson_slug text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, stage_slug, lesson_slug)
);
create index journey_progress_user_id_idx on public.journey_progress (user_id);

alter table public.journey_progress enable row level security;
alter table public.journey_progress force row level security;
create policy journey_progress_owner on public.journey_progress
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.journal_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage_slug text,
  lesson_slug text,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  safety_flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index journal_entries_user_id_idx on public.journal_entries (user_id);

alter table public.journal_entries enable row level security;
alter table public.journal_entries force row level security;
create policy journal_entries_owner on public.journal_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.companion_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  growth_stage text not null default 'seed',
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  streak_freezes_remaining integer not null default 3,
  last_activity_date date,
  updated_at timestamptz not null default now()
);

alter table public.companion_state enable row level security;
alter table public.companion_state force row level security;
create policy companion_state_owner on public.companion_state
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.badges (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null
);

alter table public.badges enable row level security;
create policy badges_readable on public.badges
  for select to authenticated
  using (true);

insert into public.badges (id, name, description, icon) values
  ('first-entry', 'First Words', 'Wrote your first journal entry.', 'seedling'),
  ('recognition-complete', 'Noticing', 'Completed the Recognition stage.', 'eye'),
  ('acceptance-complete', 'Making Room', 'Completed the Acceptance stage.', 'hands'),
  ('three-day-streak', 'Steady', 'Showed up three days in a row.', 'flame'),
  ('seven-day-streak', 'Rooted', 'Showed up seven days in a row.', 'tree')
on conflict (id) do nothing;

create table public.user_badges (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
create index user_badges_user_id_idx on public.user_badges (user_id);
create index user_badges_badge_id_idx on public.user_badges (badge_id);

alter table public.user_badges enable row level security;
alter table public.user_badges force row level security;
create policy user_badges_owner on public.user_badges
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
