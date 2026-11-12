-- ============================================================================
-- AetherOrbit database schema (Supabase / Postgres 15+)
-- Run in the Supabase SQL editor, or with `supabase db push`.
-- Re-runnable: objects are created only if missing.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles: one row per auth user (public-facing account details)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  display_name  text check (char_length(display_name) <= 80),
  avatar_url    text,
  location_name text not null default 'Vallichira, Kerala',
  latitude      double precision not null default 9.719833 check (latitude between -90 and 90),
  longitude     double precision not null default 76.651694 check (longitude between -180 and 180),
  timezone      text not null default 'Asia/Kolkata',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- user_preferences: saved settings, favourites and daily-digest choices
-- ----------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id                  uuid primary key references public.profiles (id) on delete cascade,
  daily_digest             boolean  not null default true,
  digest_launches          boolean  not null default true,
  digest_celestial         boolean  not null default true,
  digest_satellite_passes  boolean  not null default true,
  favorite_satellites      integer[] not null default '{}',
  favorite_constellations  text[]    not null default '{}',
  ai_detail_level          text     not null default 'beginner'
                                    check (ai_detail_level in ('beginner', 'enthusiast')),
  updated_at               timestamptz not null default now()
);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- reminders: things a user asked to be reminded about
--   kind = 'launch'          target_ref = Launch Library 2 launch id
--   kind = 'celestial_event' target_ref = AetherOrbit event id (e.g. meteor-geminids-2026)
--   kind = 'satellite_pass'  target_ref = NORAD id ('25544')          -> every visible pass
--                            target_ref = NORAD@ISO ('25544@2026-...') -> one specific pass
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'reminder_kind') then
    create type public.reminder_kind as enum ('launch', 'celestial_event', 'satellite_pass');
  end if;
end
$$;

create table if not exists public.reminders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  kind             public.reminder_kind not null,
  target_ref       text not null check (char_length(target_ref) between 1 and 160),
  label            text not null check (char_length(label) between 1 and 200),
  event_at         timestamptz,
  metadata         jsonb not null default '{}'::jsonb,
  is_active        boolean not null default true,
  last_notified_at timestamptz,
  created_at       timestamptz not null default now(),
  constraint reminders_unique_target unique (user_id, kind, target_ref)
);

create index if not exists reminders_user_idx on public.reminders (user_id);
create index if not exists reminders_active_kind_idx on public.reminders (is_active, kind);
create index if not exists reminders_event_at_idx on public.reminders (event_at) where is_active;

-- ----------------------------------------------------------------------------
-- reminder_deliveries: one row per user per day per channel (idempotent cron)
-- ----------------------------------------------------------------------------
create table if not exists public.reminder_deliveries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  digest_date date not null,
  channel     text not null default 'email' check (channel in ('email')),
  status      text not null check (status in ('sent', 'failed', 'dry_run')),
  item_count  integer not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  constraint reminder_deliveries_unique unique (user_id, digest_date, channel)
);

create index if not exists reminder_deliveries_date_idx on public.reminder_deliveries (digest_date);

-- ----------------------------------------------------------------------------
-- New user bootstrap: create profile + default preferences on sign-up
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), '')
  )
  on conflict (id) do update set email = excluded.email;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync when a user changes it
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- (The service-role key used by the cron bypasses RLS.)
-- ----------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.user_preferences    enable row level security;
alter table public.reminders           enable row level security;
alter table public.reminder_deliveries enable row level security;

-- profiles
drop policy if exists "Profiles: read own"   on public.profiles;
drop policy if exists "Profiles: insert own" on public.profiles;
drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: read own"   on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Profiles: insert own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Profiles: update own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- user_preferences
drop policy if exists "Preferences: read own"   on public.user_preferences;
drop policy if exists "Preferences: insert own" on public.user_preferences;
drop policy if exists "Preferences: update own" on public.user_preferences;
create policy "Preferences: read own"   on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "Preferences: insert own" on public.user_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Preferences: update own" on public.user_preferences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- reminders
drop policy if exists "Reminders: read own"   on public.reminders;
drop policy if exists "Reminders: insert own" on public.reminders;
drop policy if exists "Reminders: update own" on public.reminders;
drop policy if exists "Reminders: delete own" on public.reminders;
create policy "Reminders: read own"   on public.reminders for select to authenticated using ((select auth.uid()) = user_id);
create policy "Reminders: insert own" on public.reminders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Reminders: update own" on public.reminders for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Reminders: delete own" on public.reminders for delete to authenticated using ((select auth.uid()) = user_id);

-- reminder_deliveries (read-only for users; written by the cron)
drop policy if exists "Deliveries: read own" on public.reminder_deliveries;
create policy "Deliveries: read own" on public.reminder_deliveries for select to authenticated using ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- Backfill for users who signed up before this schema existed
-- ----------------------------------------------------------------------------
insert into public.profiles (id, email)
select u.id, u.email from auth.users u
on conflict (id) do nothing;

insert into public.user_preferences (user_id)
select p.id from public.profiles p
on conflict (user_id) do nothing;
