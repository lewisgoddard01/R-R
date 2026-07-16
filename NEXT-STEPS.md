# Revive & Reform — what's left to set up

## Migrations — all done ✅
`schema_v3` through `schema_v9` have all been run and verified (including a live exploit test
confirming `v8`'s security fix actually blocks the vulnerabilities it's meant to). Nothing
outstanding here.

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
  runs every 15 minutes and emails everyone booked into a class starting in ~5 hours.
  - [x] `CRON_SECRET` added to Netlify, function confirmed registered with its schedule in the
        Functions tab, and the live endpoint tested directly (401 without the secret, 200 with it).
        Fully live.

## Stripe webhook
- [x] Test-mode webhook created, pointing at `https://reviveandreform.co.uk/api/stripe/webhook`,
      secret saved as `STRIPE_TEST_WEBHOOK_SECRET` in `.env.local` for reference.
- [x] `STRIPE_WEBHOOK_SECRET` confirmed correctly set in Netlify — verified by sending a properly
      signed test event straight to the live endpoint and getting a real `{"received":true}` back.
- [x] Full real end-to-end test done (test card `4242 4242 4242 4242`): logged in, clicked Book,
      paid through a genuine Stripe Checkout page, webhook fired, DB correctly marked the booking
      paid, success page confirmed. Done via a disposable test account against local dev with
      Stripe's test keys temporarily swapped in — the live site's keys/lockout were never touched.

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
