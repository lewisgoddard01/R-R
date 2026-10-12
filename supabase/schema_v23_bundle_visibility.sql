-- Lets the studio hide the welcome offer or individual bundles from admin,
-- e.g. while a seasonal offer is running. The bundles themselves stay in code
-- (src/lib/packs.ts); a kind with no row here is shown.
create table if not exists public.bundle_settings (
  kind text primary key,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.bundle_settings enable row level security;

drop policy if exists "bundle_settings readable" on public.bundle_settings;
create policy "bundle_settings readable" on public.bundle_settings
  for select using (true);

drop policy if exists "bundle_settings_admin_write" on public.bundle_settings;
create policy "bundle_settings_admin_write" on public.bundle_settings
  for all using (public.is_admin()) with check (public.is_admin());
