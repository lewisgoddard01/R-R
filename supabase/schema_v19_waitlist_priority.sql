-- Run in Supabase Dashboard → SQL Editor → New query → paste all of this → Run.
--
-- Fixes a real bug: when a booked spot was cancelled, notifyWaitlistOfOpening
-- emailed everyone on that session's waitlist a claim link — but book_session()
-- itself only checked booked_count < capacity, so any brand-new customer
-- browsing /book could grab the freed spot directly before a waitlisted
-- customer had a chance to click their link. From the studio's side this
-- looked exactly like "the waitlist person was removed but never added" —
-- because someone else got the spot instead of them.
--
-- Fix: if anyone is already waitlisted for a session, a *new* booker (who
-- isn't already on that waitlist) also joins the waitlist instead of being
-- able to book directly — same as any normal queue. Existing waitlisted
-- customers still use their emailed claim link (claim_waitlist_spot) to take
-- the spot themselves, first to click wins.
create or replace function public.book_session(p_session_id uuid)
returns table(result_status text, spaces_left int)
language plpgsql security definer set search_path = public as $$
declare
  v_capacity int;
  v_booked_count int;
  v_uid uuid := auth.uid();
  v_status text;
  v_waiver_done boolean;
  v_starts_at timestamptz;
  v_uk_start timestamp;
  v_cutoff timestamptz;
  v_has_waitlist boolean;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select (waiver_signed_at is not null and health_completed_at is not null and phone is not null and phone <> '')
    into v_waiver_done
    from public.profiles where id = v_uid;
  if not coalesce(v_waiver_done, false) then
    raise exception 'Please complete the health & waiver form (including your mobile number) before booking a class';
  end if;

  select capacity, starts_at into v_capacity, v_starts_at from public.class_sessions
    where id = p_session_id and status = 'scheduled' for update;
  if v_capacity is null then raise exception 'This class is no longer available'; end if;

  v_uk_start := v_starts_at at time zone 'Europe/London';
  if extract(hour from v_uk_start) = 9 and extract(minute from v_uk_start) = 0 then
    v_cutoff := (date_trunc('day', v_uk_start) - interval '1 day' + interval '20 hours') at time zone 'Europe/London';
    if now() > v_cutoff then
      raise exception '9am classes need to be booked by 8pm the evening before — this one''s cutoff has passed';
    end if;
  end if;

  if exists(select 1 from public.bookings
            where session_id = p_session_id and user_id = v_uid and status in ('booked','waitlisted')) then
    raise exception 'You already have a spot (or a waitlist place) for this class';
  end if;

  select count(*) into v_booked_count from public.bookings
    where session_id = p_session_id and status = 'booked';

  select exists(select 1 from public.bookings
                where session_id = p_session_id and status = 'waitlisted') into v_has_waitlist;

  v_status := case when v_booked_count < v_capacity and not v_has_waitlist then 'booked' else 'waitlisted' end;
  insert into public.bookings(session_id, user_id, status) values (p_session_id, v_uid, v_status);

  return query select v_status, greatest(v_capacity - v_booked_count - (case when v_status = 'booked' then 1 else 0 end), 0);
end;
$$;
grant execute on function public.book_session(uuid) to authenticated;
