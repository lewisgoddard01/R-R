# Revive & Reform — what's left to set up

## 0. NEW: turn on the booking system  (do this first — it's free, no accounts needed)
- [ ] Supabase → **SQL Editor** → New query → paste in `supabase/schema_v2_booking.sql` → Run.
      (This adds classes, sessions, bookings and the waitlist system on top of what you ran before.)
- [ ] Make yourself an admin: at the bottom of that same SQL file there's a commented-out line —
      edit it with your login email and run just that line. This unlocks `/admin` for you.
- [ ] Go to **yoursite.com/admin/classes** → add your real classes (name, price, default capacity)
      → open each class → add sessions (dates/times, repeat weekly for up to 12 weeks).
- [ ] Test it yourself: log in as a normal customer, complete the health form once, book a class,
      and check it appears under "My bookings".
- → Real card payment isn't live yet (that needs Stripe, step 1 below) — for now, booking reserves
  the spot but doesn't take a card payment. Once Stripe is connected we'll wire real checkout in.

## 1. Stripe payments  (real card payments — code is written, needs 2 steps to switch on)
- [x] Publishable + secret **test** keys added to `.env.local` (the app runs on these for now).
- [x] Live keys also saved (`STRIPE_LIVE_PUBLISHABLE_KEY` / `STRIPE_LIVE_SECRET_KEY`) but not wired
      in yet — swap them in only when you're ready to actually launch (see "Going live" below).
- [ ] Supabase → **SQL Editor** → New query → paste in `supabase/schema_v3_payments.sql` → Run.
      (Adds payment tracking columns to `bookings` — booking will error without this.)
- [ ] Create the webhook so Stripe can confirm payments back to the app:
      - **Local testing**: install the Stripe CLI, run `stripe login`, then
        `stripe listen --forward-to localhost:3000/api/stripe/webhook` — it prints a
        `whsec_...` secret, paste that into `STRIPE_WEBHOOK_SECRET` in `.env.local` and restart the dev server.
      - **Once live**: Stripe Dashboard → Developers → Webhooks → Add endpoint →
        `https://yoursite.com/api/stripe/webhook`, listen for `checkout.session.completed` and
        `checkout.session.expired` → copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] Test with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.
- How it works: clicking "Book" reserves the spot for 30 minutes and sends you to Stripe Checkout;
  the webhook marks it paid and emails the confirmation. If payment isn't completed in time, the
  spot is released and the next waitlisted person is promoted automatically. Cancelling a paid
  booking triggers an automatic Stripe refund.
- → The 5-class bundle is now built (see below) — run its migration too when you do this one.

## 1b. 5-class bundle  (code done, needs its own migration)
- [ ] Supabase → **SQL Editor** → New query → paste in `supabase/schema_v4_packs.sql` → Run
      (run this **after** `schema_v3_payments.sql` above — it builds on it).
- How it works: "Buy the 5-class bundle" on `/pricing` charges £80 via Stripe Checkout and grants
  5 credits, valid 90 days. Booking a class then uses a credit automatically instead of charging —
  no Checkout redirect, instant confirmation email. Cancelling 24h+ ahead returns the credit;
  within 24h it's forfeited. Remaining credits show on `/account`.

### Going live (once you're ready to take real payments)
- [ ] Complete Stripe's account activation (business details, bank account, ID verification) —
      Stripe blocks live payouts until this is done.
- [ ] Tell Claude "switch Stripe to live" and I'll swap `STRIPE_LIVE_PUBLISHABLE_KEY` /
      `STRIPE_LIVE_SECRET_KEY` into the active slots.
- [ ] Create a **second, live-mode** webhook endpoint (same steps as above, but in Live mode) and
      update `STRIPE_WEBHOOK_SECRET` with its signing secret.

## 2. Domain  (reviveandreform.co.uk)
- [ ] Make sure you control the domain and its DNS (registrar/host login).
- [ ] Needed for: verifying email in Resend (step 3) AND putting the live site online later.

## 3. Finish the Resend emails  (needs the domain)
- [x] `reviveandreform.co.uk` added to Resend and DNS records verified — emails can now send
      from/to `info@reviveandreform.co.uk`.
- [ ] **Fix Custom SMTP in Supabase** — turned on for branded confirmation emails, but it's currently
      broken: sign-up fails with a `{}` / 500 error because the confirmation email can't send.
      **Quick unblock**: Project Settings → Authentication → SMTP Settings → turn Custom SMTP **off**
      to restore sign-ups immediately (falls back to Supabase's default mailer, unbranded but working).
      **Proper fix** (do this before re-enabling): double-check Host = `smtp.resend.com`,
      Username = `resend` (literally that word), Password = the full `RESEND_API_KEY`, and that the
      Port + encryption match (port `465` needs SSL/TLS on, port `587` needs STARTTLS) — a mismatch
      here is the most common cause of this exact failure. Tell Claude once it's off/fixed to retest.

## Also before go-live
- [ ] **Rotate** the Supabase secret key + Resend key (they were shared in chat) and send the new
      Supabase secret to Claude.
- [ ] Confirm the **timetable** is correct (it was reconstructed from a scrambled paste).
- [ ] GitHub + Vercel accounts to deploy the live site (Vercel Pro ~$20/mo for commercial, or
      Cloudflare Pages free-for-commercial).
- [ ] Have a solicitor glance over the waiver/health-form wording on `/account/waiver` before you
      rely on it — it's written properly but isn't a substitute for legal sign-off.

## Already done ✅
Marketing site (orange & black, real logo, your content) · customer logins · profiles ·
sign-once health questionnaire + waiver (PAR-Q-style health screen) · dark map on Contact ·
**admin dashboard** (`/admin`) to add/edit/remove classes and generate future session dates ·
**booking system** with capacity limits, waitlists, and automatic promotion + email when a spot
frees up · **revenue page** (estimated until Stripe is connected).
