-- One offers system: the welcome offer and bundles move out of code and into
-- pricing_items, so the studio can edit, add, remove and schedule all of them.

alter table public.pricing_items
  add column if not exists section text not null default 'list',
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists legacy_kind text;

create unique index if not exists pricing_items_legacy_kind_key
  on public.pricing_items (legacy_kind) where legacy_kind is not null;

-- The four offers that used to be hard-coded, keeping any Hide setting.
insert into public.pricing_items
  (name, subtitle, price_label, price_pence, credits, valid_days, one_per_customer, section, sort_order, legacy_kind, active)
select v.name, v.subtitle, v.price_label, v.price_pence, v.credits, 42, v.one_per_customer, v.section, v.sort_order, v.kind,
       coalesce((select s.active from public.bundle_settings s where s.kind = v.kind), true)
from (values
  ('Welcome offer', 'Two classes for new clients — come and try us out. One per customer.', '£20', 2000, 2, true, 'featured', 0, 'welcome'),
  ('2 classes', null, '£39', 3900, 2, false, 'bundle', 10, 'pack2'),
  ('5 classes', null, '£90', 9000, 5, false, 'bundle', 20, 'pack5'),
  ('10 classes', null, '£170', 17000, 10, false, 'bundle', 30, 'pack10')
) as v(name, subtitle, price_label, price_pence, credits, one_per_customer, section, sort_order, kind)
where not exists (select 1 from public.pricing_items p where p.legacy_kind = v.kind);

-- Link earlier purchases to their offer, so "one per customer" still blocks
-- anyone who already had the welcome offer and sales counts include them.
update public.class_packs cp
  set pricing_item_id = p.id
  from public.pricing_items p
  where cp.pricing_item_id is null and p.legacy_kind = cp.kind;

drop table if exists public.bundle_settings;
