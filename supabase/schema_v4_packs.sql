-- Revive & Reform — class packs / bundles (run AFTER schema_v3_payments.sql)
-- Supabase Dashboard → SQL Editor → New query → paste all of this → Run.

create table if not exists public.class_packs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  classes_total     int not null,
  classes_remaining int not null,
  price_paid_pence  int not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  purchased_at      timestamptz not null default now(),
  expires_at        timestamptz not null,
  check (classes_remaining >= 0 and classes_remaining <= classes_total)
);
create index if not exists class_packs_user_idx on public.class_packs(user_id);

alter table public.bookings add column if not exists paid_via_pack_id uuid references public.class_packs(id);

alter table public.class_packs enable row level security;

drop policy if exists "class_packs_select_own" on public.class_packs;
create policy "class_packs_select_own" on public.class_packs
  for select using (user_id = auth.uid() or public.is_admin());

-- ── consume_class_credit(): atomically takes one credit from the caller's
--    oldest non-expired pack that still has classes remaining. Returns the
--    pack id used, or null if the caller has no usable credit. ────────────
create or replace function public.consume_class_credit()
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_pack record;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select id into v_pack from public.class_packs
    where user_id = v_uid and classes_remaining > 0 and expires_at > now()
    order by expires_at asc
    for update skip locked
    limit 1;

  if v_pack.id is null then return null; end if;

  update public.class_packs set classes_remaining = classes_remaining - 1 where id = v_pack.id;
  return v_pack.id;
end;
$$;
grant execute on function public.consume_class_credit() to authenticated;

-- ── refund_class_credit(): returns one credit to a specific pack (used when
--    a credit-booked class is cancelled within the refund window). ────────
create or replace function public.refund_class_credit(p_pack_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.class_packs
    set classes_remaining = least(classes_remaining + 1, classes_total)
    where id = p_pack_id and user_id = auth.uid();
end;
$$;
grant execute on function public.refund_class_credit(uuid) to authenticated;
