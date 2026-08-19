-- Customer's own mobile number (separate from the emergency contact's
-- number already collected in the waiver's health jsonb) — plain column
-- so it's directly queryable/displayable on the admin Customers pages.
alter table public.profiles add column if not exists phone text;

-- schema_v8_security_hardening.sql restricted customers to only updating
-- health/health_completed_at/waiver_signed_at on their own profile (to stop
-- e.g. self-promoting to admin) — phone needs adding to that allowlist or
-- the waiver form's save would silently fail exactly like the site_content
-- bug did.
revoke update on public.profiles from authenticated;
grant update (health, health_completed_at, waiver_signed_at, phone) on public.profiles to authenticated;
