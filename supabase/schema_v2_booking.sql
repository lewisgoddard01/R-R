-- Revive & Reform — booking system (run AFTER schema.sql)
-- Supabase Dashboard → SQL Editor → New query → paste all of this → Run.

-- ── Admin check helper ──────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ── Classes (the types of class Alix runs, e.g. "Reform Power") ────
create table if not exists public.classes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  category      text,               -- e.g. Energetic / Mindful / Beginner / Strength
  duration_min  int not null default 50,
  default_capacity int not null default 8,
  price_pence   int not null default 2000,   -- £20 default
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── Sessions (a specific dated/timed occurrence of a class) ─────────
create table if not exists public.class_sessions (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  starts_at   timestamptz not null,
  capacity    int not null,          -- copied from class default at creation; admin can override
  instructor  text,
  status      text not null default 'scheduled' check (status in ('scheduled','cancelled')),
  created_at  timestamptz not null default now()
);
create index if not exists class_sessions_starts_at_idx on public.class_sessions(starts_at);

-- ── Bookings (who's in, who's waiting) ───────────────────────────────
create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.class_sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'booked' check (status in ('booked','waitlisted','cancelled','attended')),
  created_at  timestamptz not null default now()
);
-- one active (booked/waitlisted) row per person per session
create unique index if not exists bookings_active_unique
  on public.bookings(session_id, user_id)
  where status in ('booked','waitlisted');

alter table public.classes enable row level security;
alter table public.class_sessions enable row level security;
alter table public.bookings enable row level security;

-- classes: signed-in users see active ones; admins see & manage everything
drop policy if exists "classes_select" on public.classes;
create policy "classes_select" on public.classes
  for select using (active = true or public.is_admin());
drop policy if exists "classes_admin_write" on public.classes;
create policy "classes_admin_write" on public.classes
  for all using (public.is_admin()) with check (public.is_admin());

-- sessions: signed-in users see scheduled ones; admins manage everything
drop policy if exists "sessions_select" on public.class_sessions;
create policy "sessions_select" on public.class_sessions
  for select using (status = 'scheduled' or public.is_admin());
drop policy if exists "sessions_admin_write" on public.class_sessions;
create policy "sessions_admin_write" on public.class_sessions
  for all using (public.is_admin()) with check (public.is_admin());

-- bookings: customers see/manage their own; admins see/manage everything
drop policy if exists "bookings_select_own" on public.bookings;
create policy "bookings_select_own" on public.bookings
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own" on public.bookings
  for insert with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "bookings_update_own" on public.bookings;
create policy "bookings_update_own" on public.bookings
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ── book_session(): atomically books or waitlists the caller ────────
create or replace function public.book_session(p_session_id uuid)
returns table(result_status text, spaces_left int)
language plpgsql security definer set search_path = public as $$
declare
  v_capacity int;
  v_booked_count int;
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select capacity into v_capacity from public.class_sessions
    where id = p_session_id and status = 'scheduled' for update;
  if v_capacity is null then raise exception 'This class is no longer available'; end if;

  if exists(select 1 from public.bookings
            where session_id = p_session_id and user_id = v_uid and status in ('booked','waitlisted')) then
    raise exception 'You already have a spot (or a waitlist place) for this class';
  end if;

  select count(*) into v_booked_count from public.bookings
    where session_id = p_session_id and status = 'booked';

  v_status := case when v_booked_count < v_capacity then 'booked' else 'waitlisted' end;
  insert into public.bookings(session_id, user_id, status) values (p_session_id, v_uid, v_status);

  return query select v_status, greatest(v_capacity - v_booked_count - (case when v_status = 'booked' then 1 else 0 end), 0);
end;
$$;
grant execute on function public.book_session(uuid) to authenticated;

-- ── promote_waitlist(): moves the earliest waitlisted person to booked,
--    called right after a cancellation frees a spot. Returns their user_id
--    (or null) so the app can email them. ─────────────────────────────
create or replace function public.promote_waitlist(p_session_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_next record;
begin
  select id, user_id into v_next from public.bookings
    where session_id = p_session_id and status = 'waitlisted'
    order by created_at asc limit 1 for update;
  if v_next.id is null then return null; end if;
  update public.bookings set status = 'booked' where id = v_next.id;
  return v_next.user_id;
end;
$$;
grant execute on function public.promote_waitlist(uuid) to authenticated;

-- ── session_availability(): safe aggregate spaces-left count, callable
--    by customers, WITHOUT exposing who else has booked (RLS on bookings
--    would otherwise hide other people's rows from the count too). ────
create or replace function public.session_availability(p_session_ids uuid[])
returns table(session_id uuid, capacity int, booked_count int, spaces_left int)
language sql stable security definer set search_path = public as $$
  select cs.id, cs.capacity,
         count(b.id) filter (where b.status = 'booked')::int as booked_count,
         greatest(cs.capacity - count(b.id) filter (where b.status = 'booked'), 0)::int as spaces_left
  from public.class_sessions cs
  left join public.bookings b on b.session_id = cs.id
  where cs.id = any(p_session_ids)
  group by cs.id, cs.capacity;
$$;
grant execute on function public.session_availability(uuid[]) to authenticated;

-- ── Make yourself an admin (edit the email, then run this line only) ─
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
