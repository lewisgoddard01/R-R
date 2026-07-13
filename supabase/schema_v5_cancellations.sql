-- Revive & Reform — cancellation tracking (run AFTER schema_v4_packs.sql)
-- Supabase Dashboard → SQL Editor → New query → paste all of this → Run.

alter table public.bookings add column if not exists cancelled_at timestamptz;
create index if not exists bookings_cancelled_at_idx on public.bookings(cancelled_at desc);

-- Set whenever a cancellation actually returns money or a class credit (cash
-- refund via Stripe or credit returned to a pack) — distinct from
-- payment_status, which stays 'paid' on a credit-refunded booking.
alter table public.bookings add column if not exists refunded_at timestamptz;
