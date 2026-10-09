-- Lets pricing page items be bought as class credits (e.g. a monthly offer
-- or a block of one class type). An item is buyable when price_pence and
-- credits are set; class_id limits its credits to that one class.

alter table public.pricing_items
  add column if not exists price_pence int,
  add column if not exists credits int,
  add column if not exists valid_days int not null default 42,
  add column if not exists class_id uuid references public.classes(id) on delete set null,
  add column if not exists one_per_customer boolean not null default false;

alter table public.class_packs
  add column if not exists class_id uuid references public.classes(id) on delete set null,
  add column if not exists pricing_item_id uuid references public.pricing_items(id) on delete set null;

-- Replaces the no-argument version. Credits tied to a class are only spent on
-- that class, and are used before general credits so a block isn't left
-- unused while bundle credits run down. Called with no argument (older
-- code), only general credits are used.
drop function if exists public.consume_class_credit();
create or replace function public.consume_class_credit(p_class_id uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_pack record;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select id into v_pack from public.class_packs
    where user_id = v_uid
      and classes_remaining > 0
      and expires_at > now()
      and (class_id is null or class_id = p_class_id)
    order by (class_id is null) asc, expires_at asc
    for update skip locked
    limit 1;

  if v_pack.id is null then return null; end if;

  update public.class_packs set classes_remaining = classes_remaining - 1 where id = v_pack.id;
  return v_pack.id;
end;
$$;
grant execute on function public.consume_class_credit(uuid) to authenticated;
