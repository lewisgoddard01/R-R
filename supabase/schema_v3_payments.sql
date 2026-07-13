-- Revive & Reform — payments (run AFTER schema_v2_booking.sql)
-- Supabase Dashboard → SQL Editor → New query → paste all of this → Run.

alter table public.bookings
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded')),
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

-- A booked (not waitlisted) spot only truly holds a place once it's paid for,
-- so unpaid 'booked' rows older than 35 minutes (Stripe Checkout Sessions we
-- create expire after 30 min) are safe to release back to the class.
create or replace function public.release_expired_unpaid_bookings()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_row record;
begin
  for v_row in
    select id, session_id from public.bookings
    where status = 'booked' and payment_status = 'unpaid'
      and created_at < now() - interval '35 minutes'
  loop
    update public.bookings set status = 'cancelled' where id = v_row.id;
    perform public.promote_waitlist(v_row.session_id);
  end loop;
end;
$$;
grant execute on function public.release_expired_unpaid_bookings() to authenticated;
