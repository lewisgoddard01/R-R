-- Revive & Reform — bundle tiers + one-time welcome offer (run AFTER schema_v5_cancellations.sql)
-- Supabase Dashboard → SQL Editor → New query → paste all of this → Run.

alter table public.class_packs add column if not exists kind text not null default 'pack5';
create index if not exists class_packs_user_kind_idx on public.class_packs(user_id, kind);
