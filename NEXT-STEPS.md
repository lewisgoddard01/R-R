# Revive & Reform — what's left to set up

## Outstanding migrations (run in this order in Supabase → SQL Editor)
- [ ] `supabase/schema_v3_payments.sql` — payment tracking columns on `bookings`.
- [ ] `supabase/schema_v4_packs.sql` — class-pack credits (`class_packs` table).
- [ ] `supabase/schema_v5_cancellations.sql` — cancellation/refund tracking columns.
- [ ] `supabase/schema_v6_bundle_tiers.sql` — lets `class_packs` tell bundle tiers apart
      (needed for the one-time welcome offer to actually be enforced as one-time).
- [ ] `supabase/schema_v7_waitlist_claim.sql` — the "first to claim" waitlist function.
- [ ] **`supabase/schema_v8_security_hardening.sql` — critical, run this before going live.**
      Closes a real vulnerability where a logged-in customer could call the Supabase API
      directly (outside the app entirely) to mark their own booking as paid for free, or
      grant themselves admin access. See "Security" section below.
- [ ] `supabase/schema_v9_notifications.sql` — needed for admin session-cancellation refunds
      and the 5-hour class reminder emails (see "Notifications" section below).
- → Copy each file's actual **contents** into the SQL Editor (not the file path) and Run.
      Each one is safe to run even if a later step hasn't happened yet — the app degrades
      gracefully (features just don't work) rather than crashing when a migration is missing.

## Security — read before publishing
A review found and fixed two critical issues (both required a DB migration, not just app code,
since the gap was in row-level security itself):
- **Free bookings**: RLS policies checked *whose row* it was but not *which columns* could be
  changed, so a customer could directly set their own booking's `payment_status` to `paid`,
  bypassing Stripe entirely. Fixed via column-level grants in `schema_v8` — customers can now
  only ever directly write `status`/`cancelled_at` on their own booking (self-cancel); every
  payment-related field is now written exclusively by server-side code or the SECURITY DEFINER
  functions.
- **Self-promote to admin**: same bug on `profiles.role` — a customer could set their own role
  to `admin` directly. Fixed the same way; customers can now only touch their own health/waiver
  fields.
- Also added standard security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy, HSTS) — previously none were set.
- **Not done, lower priority**: a Content-Security-Policy header (skipped for now — needs careful
  tuning against the Leaflet map/fonts so it doesn't accidentally break them) and app-level rate
  limiting on checkout/signup (Supabase already rate-limits auth; Stripe Checkout session
  creation has no real abuse cost, so this is a "nice to have" not a launch blocker).
- Everything else checked out clean: admin routes are gated server-side (not just hidden in the
  UI) and can no longer be bypassed now that role can't be self-elevated; prices are always
  computed server-side, never trusted from the client; the Stripe webhook verifies its signature;
  no secrets are exposed to the browser (only the intentionally-public Supabase anon key and
  Stripe publishable key use `NEXT_PUBLIC_`); every `SECURITY DEFINER` database function has a
  pinned `search_path` (prevents a classic Postgres privilege-escalation trick).

## Notifications
- **Admin cancels a class session** (`/admin/classes/[id]`) — every affected customer (booked
  or waitlisted) is now emailed automatically. Anyone who'd paid is refunded in full
  automatically (cash via Stripe, or credit returned to their pack) — regardless of the 24-hour
  policy, since this is the studio's cancellation, not theirs. If a refund fails, Alix gets an
  "ACTION NEEDED" email listing which bookings need manual attention.
- **5-hour class reminder** — a Netlify Scheduled Function (`netlify/functions/send-reminders.ts`)
  runs every 15 minutes and emails everyone booked into a class starting in ~5 hours. Needs:
  - [ ] Add `CRON_SECRET` to **Netlify's** environment variables (value is in `.env.local` —
        this secret stops anyone but our own scheduled job from triggering mass reminder emails).
  - [ ] After deploying, check Netlify's **Functions** tab shows `send-reminders` with a
        schedule attached, to confirm it registered correctly.

## Stripe webhook
- [x] Test-mode webhook created, pointing at `https://reviveandreform.co.uk/api/stripe/webhook`,
      secret saved as `STRIPE_TEST_WEBHOOK_SECRET` in `.env.local` for reference.
- [ ] Confirm `STRIPE_WEBHOOK_SECRET` is set in **Netlify's** environment variables (not just
      `.env.local` — Netlify is what runs the live site) and redeploy after adding it.
- [ ] Test with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.

### Going live (once you're ready to take real payments)
- [ ] Complete Stripe's account activation (business details, bank account, ID verification).
- [ ] Tell Claude "switch Stripe to live" to swap `STRIPE_LIVE_PUBLISHABLE_KEY` /
      `STRIPE_LIVE_SECRET_KEY` into the active slots (in both `.env.local` and Netlify).
- [ ] Create a **second, live-mode** webhook endpoint and update `STRIPE_WEBHOOK_SECRET`
      (in Netlify) with its signing secret.

## Pricing (current, matches `/pricing`)
Individual class £20 · Welcome offer (2 classes, **one-time per customer**, enforced in code) £20 ·
2-class bundle £39 · 5-class bundle £90 · 10-class bundle £170. All bundles grant class credits
valid 90 days; booking auto-uses a credit instead of charging when available.

## Waitlist (rebuilt — no longer auto-promotes one person)
When a spot frees up (cancellation, or an unpaid Stripe hold expiring), **everyone** on that
class's waitlist gets emailed a "Claim your spot" link. First person to actually click through
and claim it gets the spot (via `/book/claim`); everyone else's attempt just says "someone else
got there first" and they stay on the waitlist for next time.

## Domain & hosting
- [x] `reviveandreform.co.uk` verified in Resend — emails send from/to `info@reviveandreform.co.uk`.
- [x] Deployed on **Netlify** (not Vercel), connected to GitHub repo `lewisgoddard01/R-R`, auto-deploys
      on push to `main`. Domain DNS points at Netlify with a valid SSL certificate.
- [x] Custom SMTP in Supabase fixed (was using a stale/wrong password) — sign-up and password
      reset both send correctly now.
- [x] Email links (signup confirm, password reset) now verify server-side via `/auth/confirm`
      instead of the old localhost-pointing / PKCE-fragile default — works reliably from any
      device or mail app.

## Also before go-live
- [ ] **Rotate** the Supabase secret key + Resend key (they were shared in chat).
- [ ] Confirm the **timetable** is correct (it was reconstructed from a scrambled paste).
- [ ] Have a solicitor glance over the waiver/health-form wording on `/account/waiver`.

## Already done ✅
Marketing site · customer logins + forgot-password · sign-once health questionnaire + waiver ·
dark map on Contact · SEO basics (sitemap, robots.txt, Open Graph, LocalBusiness structured data) ·
admin dashboard (classes/sessions, revenue, recent cancellations, who's waitlisted) · booking system
with capacity limits + first-to-claim waitlist · Stripe payments (Checkout, webhook, refunds,
multi-tier class-pack bundles) · cancellation emails to customer + admin with refund outcome.
