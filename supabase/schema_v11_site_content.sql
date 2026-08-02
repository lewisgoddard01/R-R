-- Editable text blocks (waiver/health declaration, etc.) so admins can
-- update legal/consent wording without a code change.
create table if not exists public.site_content (
  key text primary key,
  body text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Anyone can read (the waiver page is shown to logged-in customers), only
-- admins can write (enforced in the server action via requireAdmin(), same
-- pattern as classes/sessions — RLS just blocks direct client writes).
drop policy if exists "site_content readable by all" on public.site_content;
create policy "site_content readable by all"
  on public.site_content for select
  using (true);

insert into public.site_content (key, body) values (
  'waiver_declaration',
  E'**Confirmation of health declaration.** I confirm the answers above are accurate to the best of my knowledge. I will inform Revive & Reform if anything changes with regard to my health.\n\nWhere I have answered "yes" to a health question, I confirm I have spoken to my GP and I am fit to take part in reformer Pilates. I accept full responsibility for my medical health and fitness while participating in classes at Revive & Reform.\n\n**Assumption of risk.** I understand that Reformer Pilates and related wellness activities involve physical exertion and carry an inherent risk of injury. I will work within my own limits, follow my instructor''s guidance, and stop and tell my instructor if I feel unwell at any point.\n\n**Release of liability.** I participate in classes at Revive & Reform voluntarily and at my own risk. To the fullest extent permitted by law, I release Revive & Reform and its instructors from liability for injury, loss or damage arising from my participation, except where caused by their negligence.\n\n**Medical authorisation.** In an emergency, I authorise Revive & Reform to seek appropriate medical assistance on my behalf and to contact the emergency contact named above. I give consent to Revive & Reform to share information with Emergency Services if required.\n\n**Photography & video.** I consent to the use of photography and videography by Revive & Reform for use on their social media pages. If this changes, I will notify the instructor in the class at the time of recording.'
) on conflict (key) do nothing;
