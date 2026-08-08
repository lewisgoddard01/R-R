-- Lets admins add a customer onto a class for free (comps, manual phone
-- bookings, goodwill gestures) without it being mistaken for a real £0
-- payment or an abandoned unpaid checkout that gets auto-released.
alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check
  check (payment_status in ('unpaid', 'paid', 'refunded', 'comped'));
