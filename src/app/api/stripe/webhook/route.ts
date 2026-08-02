import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, ADMIN_EMAIL } from "@/lib/email";
import { notifyWaitlistOfOpening } from "@/lib/waitlist";
import { findBundle, PACK_VALIDITY_DAYS } from "@/lib/packs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  // Trimmed because hosting dashboards frequently store env values with a
  // trailing newline/space when pasted, which silently breaks signature
  // verification. A signing secret never legitimately has surrounding space.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const admin = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const bundle = session.metadata?.kind ? findBundle(session.metadata.kind) : undefined;
    if (bundle) {
      const userId = session.metadata!.user_id;
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
      const expiresAt = new Date(Date.now() + PACK_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

      if (userId) {
        // Stripe retries this webhook on timeout/5xx — without this check a
        // retried event would insert a second class_packs row and give the
        // customer double credits for one payment. A unique index on
        // stripe_checkout_session_id (see schema_v12) backs this up at the
        // DB level too.
        const { data: existingPack } = await admin
          .from("class_packs")
          .select("id")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();

        if (!existingPack) {
          await admin.from("class_packs").insert({
            user_id: userId,
            kind: bundle.kind,
            classes_total: bundle.classes,
            classes_remaining: bundle.classes,
            price_paid_pence: session.amount_total ?? 0,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            expires_at: expiresAt,
          });

          const { data: userRes } = await admin.auth.admin.getUserById(userId);
          const email = userRes?.user?.email;
          if (email) {
            await sendEmail({
              to: email,
              subject: `Your ${bundle.label} is ready`,
              html: `<p>Payment received — you now have <strong>${bundle.classes} classes</strong> to use, valid for ${PACK_VALIDITY_DAYS} days. Just book as normal and a credit will be used automatically instead of taking payment.</p><p>— Revive &amp; Reform</p>`,
            }).catch(() => {});
            await sendEmail({
              to: ADMIN_EMAIL,
              subject: `New ${bundle.label} purchased`,
              html: `<p>${email} just bought a ${bundle.label} bundle.</p>`,
            }).catch(() => {});
          }
        }
      }
      return NextResponse.json({ received: true });
    }

    const bookingId = session.metadata?.booking_id;
    if (bookingId) {
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

      await admin
        .from("bookings")
        .update({ payment_status: "paid", stripe_payment_intent_id: paymentIntentId })
        .eq("id", bookingId)
        .eq("payment_status", "unpaid");

      const { data: booking } = await admin
        .from("bookings")
        .select("user_id, class_sessions(starts_at, classes(name))")
        .eq("id", bookingId)
        .maybeSingle();

      const cs = booking?.class_sessions as unknown as { starts_at: string; classes: { name: string } | null } | null;
      if (booking && cs) {
        const { data: userRes } = await admin.auth.admin.getUserById(booking.user_id);
        const email = userRes?.user?.email;
        const className = cs.classes?.name ?? "your class";
        const when = new Date(cs.starts_at).toLocaleString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        });
        if (email) {
          await sendEmail({
            to: email,
            subject: `Booking confirmed — ${className}`,
            html: `<p>You're booked in for <strong>${className}</strong> on ${when}. Payment received — see you on the reformer!</p><p>— Revive &amp; Reform</p>`,
          }).catch(() => {});
          await sendEmail({
            to: ADMIN_EMAIL,
            subject: `New paid booking — ${className}`,
            html: `<p>${email} just booked and paid for ${className} on ${when}.</p>`,
          }).catch(() => {});
        }
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;
    const sessionId = session.metadata?.session_id;
    if (bookingId) {
      const { data: booking } = await admin
        .from("bookings")
        .select("status, payment_status")
        .eq("id", bookingId)
        .maybeSingle();
      if (booking?.status === "booked" && booking.payment_status === "unpaid") {
        await admin.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
        if (sessionId) await notifyWaitlistOfOpening(sessionId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
