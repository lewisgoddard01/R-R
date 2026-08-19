-- Extends the server-side waiver-completion check (schema_v12) to also
-- require a phone number — otherwise a customer who completed the waiver
-- before the phone field existed could still book by calling the RPC
-- directly, bypassing the UI's updated waiverDone check.
create or replace function public.book_session(p_session_id uuid)
returns table(result_status text, spaces_left int)
language plpgsql security definer set search_path = public as $$
declare
  v_capacity int;
  v_booked_count int;
  v_uid uuid := auth.uid();
  v_status text;
  v_waiver_done boolean;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select (waiver_signed_at is not null and health_completed_at is not null and phone is not null and phone <> '')
    into v_waiver_done
    from public.profiles where id = v_uid;
  if not coalesce(v_waiver_done, false) then
    raise exception 'Please complete the health & waiver form (including your mobile number) before booking a class';
  end if;

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
