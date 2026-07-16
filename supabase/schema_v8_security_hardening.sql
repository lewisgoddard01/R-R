-- Revive & Reform — critical security fix (run AFTER schema_v7_waitlist_claim.sql)
-- Supabase Dashboard → SQL Editor → New query → paste all of this → Run.
--
-- RLS row-policies only restrict WHICH ROWS a user can touch, not WHICH
-- COLUMNS. Without this, any logged-in customer could call the Supabase
-- REST API directly (bypassing the app entirely) to:
--   - set bookings.payment_status = 'paid' on their own booking → free class
--   - set profiles.role = 'admin' on their own profile → full admin access
-- Column-level grants close this regardless of what the RLS policies allow,
-- while leaving every legitimate use (customer self-cancel, waiver
-- submission, and all SECURITY DEFINER functions / the service-role client)
-- fully working, since those bypass column grants entirely.

-- Customers may only ever directly change these two columns on their own
-- booking (self-service cancellation). Everything payment-related
-- (payment_status, paid_via_pack_id, stripe_*, refunded_at) must only be
-- set by server-side code using the service-role client, or by the
-- SECURITY DEFINER functions (book_session, consume_class_credit, etc.).
revoke update on public.bookings from authenticated;
grant update (status, cancelled_at) on public.bookings to authenticated;

-- Customers may only directly change their own health/waiver fields
-- (the one-time sign-up form). role, full_name etc. are never
-- client-writable — role changes must go through the admin dashboard.
revoke update on public.profiles from authenticated;
grant update (health, health_completed_at, waiver_signed_at) on public.profiles to authenticated;

-- Nothing in the app ever inserts into bookings directly — all booking
-- creation goes through book_session()/claim_waitlist_spot(), both
-- SECURITY DEFINER (they bypass this grant entirely, running as the
-- function owner). Direct insert would otherwise let a customer fabricate
-- an already-'paid'/'booked' row for themselves, skipping capacity checks
-- and payment entirely — so it's revoked outright rather than restricted.
revoke insert on public.bookings from authenticated;
