-- Revive & Reform — session-cancellation refunds + class reminders
-- (run AFTER schema_v8_security_hardening.sql)
-- Supabase Dashboard → SQL Editor → New query → paste all of this → Run.

-- ── admin_refund_pack_credit(): returns one credit to a pack, for use ONLY
--    from trusted admin-triggered server code (the service-role client).
--    Unlike refund_class_credit(), this doesn't scope to auth.uid() — an
--    admin cancelling a whole session refunds bookings that belong to OTHER
--    people, so there's no calling-user session to match against. Not
--    granted to `authenticated` — only postgres/service_role can call it,
--    which in practice means only our own admin server actions.
create or replace function public.admin_refund_pack_credit(p_pack_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.class_packs
    set classes_remaining = least(classes_remaining + 1, classes_total)
    where id = p_pack_id;
end;
$$;

-- Tracks whether a "your class is in ~5 hours" reminder has already gone
-- out for a booking, so the reminder cron job never double-sends.
alter table public.bookings add column if not exists reminder_sent_at timestamptz;
