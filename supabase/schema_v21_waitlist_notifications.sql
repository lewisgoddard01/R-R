-- One row per "a spot's opened up" email sent to a waitlisted customer, so
-- the admin dashboard can show who was told and whether it actually sent.
-- Written only by server code with the service-role key (bypasses RLS).
create table if not exists public.waitlist_notifications (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  user_id uuid not null,
  recipient text not null,
  sent boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_notifications_created_at_idx
  on public.waitlist_notifications (created_at desc);

alter table public.waitlist_notifications enable row level security;

drop policy if exists "waitlist_notifications_admin_read" on public.waitlist_notifications;
create policy "waitlist_notifications_admin_read" on public.waitlist_notifications
  for select using (public.is_admin());
