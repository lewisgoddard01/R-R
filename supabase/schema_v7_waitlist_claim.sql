-- Revive & Reform — "first to claim" waitlist (run AFTER schema_v6_bundle_tiers.sql)
-- Supabase Dashboard → SQL Editor → New query → paste all of this → Run.
--
-- Replaces automatic FIFO waitlist promotion: when a spot opens, everyone on
-- that session's waitlist is emailed a claim link. Nobody's status changes
-- until someone actually claims it — first to successfully claim gets it.

-- ── claim_waitlist_spot(): atomically converts the caller's own waitlisted
--    booking to 'booked', but only if there's still a free spot. Returns:
--    'claimed'   — success, the spot is now theirs (still needs payment/credit)
--    'gone'      — someone else claimed it first (or it filled up otherwise)
--    'not_yours' — this booking doesn't belong to the caller
--    'not_found' — no such booking
--    'already_resolved' — this booking isn't in 'waitlisted' state any more
--    'class_cancelled' — the session itself no longer exists/is scheduled
create or replace function public.claim_waitlist_spot(p_booking_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_booking record;
  v_capacity int;
  v_booked_count int;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select id, user_id, session_id, status into v_booking
    from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then return 'not_found'; end if;
  if v_booking.user_id <> v_uid then return 'not_yours'; end if;
  if v_booking.status <> 'waitlisted' then return 'already_resolved'; end if;

  select capacity into v_capacity from public.class_sessions
    where id = v_booking.session_id and status = 'scheduled' for update;
  if v_capacity is null then return 'class_cancelled'; end if;

  select count(*) into v_booked_count from public.bookings
    where session_id = v_booking.session_id and status = 'booked';
  if v_booked_count >= v_capacity then return 'gone'; end if;

  update public.bookings set status = 'booked' where id = p_booking_id;
  return 'claimed';
end;
$$;
grant execute on function public.claim_waitlist_spot(uuid) to authenticated;
