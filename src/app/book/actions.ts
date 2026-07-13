"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { promoteWaitlistAndNotify } from "@/lib/waitlist";
import { sendBookingConfirmationEmail, sendCancellationEmails } from "@/lib/booking-email";
import { PACK_SIZE, PACK_PRICE_PENCE } from "@/lib/packs";

export async function bookSessionAction(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to book a class." };

  const { data, error } = await supabase.rpc("book_session", { p_session_id: sessionId });
  if (error) return { error: error.message };

  revalidatePath("/book");
  revalidatePath("/account/bookings");
  const row = data?.[0];
  return { status: row?.result_status as "booked" | "waitlisted" };
}

// Reserves a spot (or a waitlist place, if the class is full). If the
// customer has a class-pack credit available it's spent immediately and the
// booking is confirmed with no payment step. Otherwise the customer is sent
// to Stripe Checkout — the reservation holds for 30 minutes, and if payment
// isn't completed the webhook releases it back to the class.
export async function createCheckoutAction(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/book");

  const { data, error } = await supabase.rpc("book_session", { p_session_id: sessionId });
  revalidatePath("/book");
  revalidatePath("/account/bookings");
  if (error) redirect(`/book?error=${encodeURIComponent(error.message)}`);

  const row = data?.[0];
  if (row?.result_status === "waitlisted") redirect("/book?joined=waitlist");

  const { data: session } = await supabase
    .from("class_sessions")
    .select("id, starts_at, classes(name, price_pence)")
    .eq("id", sessionId)
    .maybeSingle();
  const cls = session?.classes as unknown as { name: string; price_pence: number } | null;
  if (!cls || !session) redirect("/book?error=Class%20not%20found");

  const { data: myBooking } = await supabase
    .from("bookings")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "booked")
    .maybeSingle();
  if (!myBooking) redirect("/book?error=Booking%20not%20found");

  const { data: packId } = await supabase.rpc("consume_class_credit");
  if (packId) {
    await supabase
      .from("bookings")
      .update({ payment_status: "paid", paid_via_pack_id: packId })
      .eq("id", myBooking.id);
    revalidatePath("/book");
    revalidatePath("/account/bookings");

    const when = new Date(session.starts_at).toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    if (user.email) {
      await sendBookingConfirmationEmail({ email: user.email, className: cls.name, when });
    }
    redirect(`/book/success?booking_id=${myBooking.id}`);
  }

  const origin = (await headers()).get("origin") ?? "https://reviveandreform.co.uk";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: { name: cls.name },
          unit_amount: cls.price_pence,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/book/success?booking_id=${myBooking.id}`,
    cancel_url: `${origin}/book?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    customer_email: user.email ?? undefined,
    metadata: { booking_id: myBooking.id, session_id: sessionId, user_id: user.id },
  });

  await supabase
    .from("bookings")
    .update({ stripe_checkout_session_id: checkoutSession.id })
    .eq("id", myBooking.id);

  redirect(checkoutSession.url!);
}

// Buys a 5-class bundle: flat £80 Stripe Checkout, not tied to any session.
// The webhook creates the class_packs row once payment completes.
export async function createPackCheckoutAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/pricing");

  const origin = (await headers()).get("origin") ?? "https://reviveandreform.co.uk";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: { name: `${PACK_SIZE}-class bundle` },
          unit_amount: PACK_PRICE_PENCE,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/account?packPurchased=1`,
    cancel_url: `${origin}/pricing?packCancelled=1`,
    customer_email: user.email ?? undefined,
    metadata: { kind: "pack5", user_id: user.id },
  });

  redirect(checkoutSession.url!);
}

// 24-hour cancellation policy: cancelling 24h+ before the class refunds in
// full; cancelling within 24h still releases the spot (to the waitlist) but
// is not refunded.
const CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function cancelBookingAction(bookingId: string, sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const [{ data: existing }, { data: session }] = await Promise.all([
    supabase
      .from("bookings")
      .select("payment_status, stripe_payment_intent_id, paid_via_pack_id")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("class_sessions").select("starts_at, classes(name)").eq("id", sessionId).maybeSingle(),
  ]);

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  const withinRefundWindow = session ? +new Date(session.starts_at) - Date.now() >= CANCELLATION_WINDOW_MS : false;
  let refunded = false;

  if (withinRefundWindow && existing?.payment_status === "paid") {
    if (existing.paid_via_pack_id) {
      try {
        await supabase.rpc("refund_class_credit", { p_pack_id: existing.paid_via_pack_id });
        await supabase.from("bookings").update({ refunded_at: new Date().toISOString() }).eq("id", bookingId);
        refunded = true;
      } catch {
        // Refund failure shouldn't block the cancellation.
      }
    } else if (existing.stripe_payment_intent_id) {
      try {
        await stripe.refunds.create({ payment_intent: existing.stripe_payment_intent_id });
        await supabase
          .from("bookings")
          .update({ payment_status: "refunded", refunded_at: new Date().toISOString() })
          .eq("id", bookingId);
        refunded = true;
      } catch {
        // Refund failure shouldn't block the cancellation — refund manually from the Stripe dashboard if needed.
      }
    }
  }

  const noRefund = existing?.payment_status === "paid" && !withinRefundWindow;

  const cls = session?.classes as unknown as { name: string } | null;
  const cancellationEmail =
    user.email && cls && session
      ? (() => {
          const when = new Date(session.starts_at).toLocaleString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          });
          const refundNote = refunded
            ? existing?.paid_via_pack_id
              ? "Your class credit has been returned to your account."
              : "You've been refunded in full."
            : noRefund
              ? "As this was within 24 hours of the class, it wasn't refunded."
              : "No payment was taken for this booking.";
          return sendCancellationEmails({ email: user.email!, className: cls.name, when, refundNote });
        })()
      : Promise.resolve();

  await Promise.all([cancellationEmail, promoteWaitlistAndNotify(sessionId)]);

  revalidatePath("/book");
  revalidatePath("/account/bookings");
  revalidatePath("/admin");
  return { ok: true, refunded, noRefund };
}
