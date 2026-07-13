-- Revive & Reform — database schema (run this in the Supabase SQL Editor)
-- Supabase Dashboard → SQL Editor → New query → paste all of this → Run.

-- 1) Customer profiles: one row per logged-in user.
--    Stores the waiver + health questionnaire so they're only filled in ONCE.
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text,
  phone               text,
  role                text not null default 'customer' check (role in ('customer','admin')),
  waiver_signed_at    timestamptz,
  health_completed_at timestamptz,
  health              jsonb,
  created_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Customers can see and edit only their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- 2) Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
