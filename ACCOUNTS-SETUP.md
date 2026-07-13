# Accounts to create (your part) — all free to start

You can do these in parallel while I port the rest of the pages. Paste the keys back here as
you get them and I'll wire each one in. **All start on free tiers.**

## 1. Supabase  ← do this first (unblocks logins + admin)
- Go to **supabase.com** → new project (pick the free plan, region: London/EU).
- Project Settings → **API**. Send me three things:
  - Project URL (`https://xxxx.supabase.co`)
  - `anon` public key
  - `service_role` key  ← secret; only used server-side, goes in `.env.local`
- This powers customer logins + the classes database + your admin area.

## 2. Stripe  (needed for payments, Phase 5)
- Go to **stripe.com** → create account (UK). Stay in **Test mode** for now.
- Developers → API keys. Send me:
  - Publishable key (`pk_test_…`)
  - Secret key (`sk_test_…`)  ← secret
- We'll add the webhook secret together when wiring checkout. No monthly fee; ~1.5%+20p per real sale later.

## 3. Resend  (needed for emails, Phase 6)
- Go to **resend.com** → sign up → API Keys → create one. Send me the key (`re_…`).
- For real emails from your domain we verify it later; testing works on their sandbox domain.

## 4. GitHub + 5. Vercel  (for going live; can wait)
- **github.com** → account (free). I'll push the code to a repo when we're ready.
- **vercel.com** → sign up *with GitHub* → import the repo to deploy. (Hobby tier is free but
  non-commercial; a live business uses Vercel Pro ~$20/mo or Cloudflare Pages free-for-commercial.)

---

### Security
Secret keys (`service_role`, `sk_test_…`, `re_…`) go in `.env.local`, which is **git-ignored**
and never sent to the browser. Test keys move no real money, so they're safe to share here while
we build; we'll swap to live keys privately at the very end.

### What unblocks what
- **Supabase** → I can build logins + the admin-edits-classes feature (Phases 2–3).
- **Stripe** → booking payments (Phase 5).
- **Resend** → confirmation emails (Phase 6).
