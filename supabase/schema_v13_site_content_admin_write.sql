-- Fixes the waiver/PAR-Q text editor silently reverting on save: site_content
-- only had a SELECT policy, so an admin's actual write was rejected by RLS
-- with no error surfaced anywhere. Matches the same admin-write pattern
-- already used for classes/class_sessions (schema_v2_booking.sql).
drop policy if exists "site_content_admin_write" on public.site_content;
create policy "site_content_admin_write" on public.site_content
  for all using (public.is_admin()) with check (public.is_admin());
