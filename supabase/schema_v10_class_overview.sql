-- Revive & Reform — admin-editable class overview
-- (run AFTER schema_v9_notifications.sql)
-- Supabase Dashboard → SQL Editor → New query → paste all of this → Run.

-- A short one-line overview of the class, shown under each slot on the public
-- timetable and on the booking list. Distinct from `description`, which is the
-- longer paragraph on the Classes page. Nullable — when it's not set, the site
-- falls back to the built-in copy in src/lib/class-info.ts.
alter table public.classes add column if not exists short_description text;
