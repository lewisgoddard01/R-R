-- Editable price-list rows on /pricing, so the studio can add one-off events
-- and hide or permanently remove items without a code change. The welcome
-- offer and bundles stay in code (src/lib/packs.ts) as they drive checkout.
create table if not exists public.pricing_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text,
  price_label text not null,
  featured boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.pricing_items enable row level security;

drop policy if exists "pricing_items readable" on public.pricing_items;
create policy "pricing_items readable" on public.pricing_items
  for select using (active or public.is_admin());

drop policy if exists "pricing_items_admin_write" on public.pricing_items;
create policy "pricing_items_admin_write" on public.pricing_items
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed with the rows that were previously hard-coded on the pricing page.
insert into public.pricing_items (name, subtitle, price_label, featured, sort_order)
select * from (values
  ('Individual class', 'Single session', '£20', false, 10),
  ('Private class', 'One-to-one session', '£40', false, 20),
  ('Private group', 'Available on request', 'POA', false, 30),
  ('Birthday class', 'A free class on your birthday — ID required', 'Free', true, 40)
) as v(name, subtitle, price_label, featured, sort_order)
where not exists (select 1 from public.pricing_items);
