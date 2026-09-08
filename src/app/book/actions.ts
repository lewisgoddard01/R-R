"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { notifyWaitlistOfOpening } from "@/lib/waitlist";
import { sendBookingConfirmationEmail, sendCancellationEmails } from "@/lib/booking-email";
import { findBundle, WELCOME_PACK, PACK_VALIDITY_DAYS } from "@/lib/packs";
import { bookingsAreOpen, BOOKINGS_OPEN_AT_LABEL } from "@/lib/booking-window";

// This is the "Join the waitlist" button — only ever shown when a class
// appears full. But book_session() decides booked-vs-waitlisted from the
// real capacity at the moment it runs, not what the button assumed — so if
// a spot opened between page load and the click (e.g. someone, including
// this same customer, just cancelled), it can return "booked" for real. If
// we let that sit as a free confirmed spot, that's a genuine way to end up
// booked without ever paying. So a "booked" result here is routed through
// exactly the same payment step as the paid booking button, instead of
// being treated as done.
export async function bookSessionAction(sessionId: string) {
  if (!bookingsAreOpen()) {
    redirect(`/book?error=${encodeURIComponent(`Bookings open on ${BOOKINGS_OPEN_AT_LABEL} — check back soon!`)}`);
  }

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

  await settlePaymentAndRedirect({
    supabase,
    userEmail: user.email,
    bookingId: myBooking.id,
    sessionId,
    session,
    cls,
  });
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type BookedClassInfo = { name: string; price_pence: number };
type BookedSessionInfo = { starts_at: string };

// Shared by a fresh booking and a claimed waitlist spot: if the customer has
// a class-pack credit available it's spent immediately and the booking is
// confirmed with no payment step. Otherwise they're sent to Stripe Checkout —
// the reservation holds for 30 minutes, and if payment isn't completed the
// webhook releases it back to the class. Always ends in a redirect.
async function settlePaymentAndRedirect(params: {
  supabase: SupabaseServerClient;
  userEmail: string | undefined;
  bookingId: string;
  sessionId: string;
  session: BookedSessionInfo;
  cls: BookedClassInfo;
}): Promise<never> {
  const { supabase, userEmail, bookingId, sessionId, session, cls } = params;

  const { data: packId } = await supabase.rpc("consume_class_credit");
  if (packId) {
    // Customers can't write payment_status/paid_via_pack_id directly (see
    // schema_v8_security_hardening.sql) — this is legitimate server-side
    // confirmation that a credit was just atomically consumed above.
    await createAdminClient()
      .from("bookings")
      .update({ payment_status: "paid", paid_via_pack_id: packId })
      .eq("id", bookingId);
    revalidatePath("/book");
    revalidatePath("/account/bookings");

    const when = new Date(session.starts_at).toLocaleString("en-GB", { timeZone: "Europe/London",       weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    if (userEmail) {
      await sendBookingConfirmationEmail({ email: userEmail, className: cls.name, when });
    }
    redirect(`/book/success?booking_id=${bookingId}`);
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
    success_url: `${origin}/book/success?booking_id=${bookingId}`,
    cancel_url: `${origin}/book?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    customer_email: userEmail,
    metadata: { booking_id: bookingId, session_id: sessionId },
  });

  // Just records which Checkout Session this booking is waiting on — the
  // webhook (using its own admin client) is what actually marks it paid.
  await createAdminClient()
    .from("bookings")
    .update({ stripe_checkout_session_id: checkoutSession.id })
    .eq("id", bookingId);

  redirect(checkoutSession.url!);
}

// Reserves a spot (or a waitlist place, if the class is full), then hands
// off to settlePaymentAndRedirect for an actual paid spot.
export async function createCheckoutAction(sessionId: string) {
  if (!bookingsAreOpen()) {
    redirect(`/book?error=${encodeURIComponent(`Bookings open on ${BOOKINGS_OPEN_AT_LABEL} — check back soon!`)}`);
  }

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

  await settlePaymentAndRedirect({
    supabase,
    userEmail: user.email,
    bookingId: myBooking.id,
    sessionId,
    session,
    cls,
  });
}

// Called when a customer clicks their "Claim your spot →" link from a
// waitlist-opening email. First to successfully claim wins the freed spot;
// everyone else's claim attempt returns 'gone'.
export async function claimWaitlistSpotAction(bookingId: string) {
  if (!bookingsAreOpen()) {
    redirect(`/book?error=${encodeURIComponent(`Bookings open on ${BOOKINGS_OPEN_AT_LABEL} — check back soon!`)}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/book/claim?booking_id=${bookingId}`)}`);

  const { data: result } = await supabase.rpc("claim_waitlist_spot", { p_booking_id: bookingId });

  if (result !== "claimed") {
    const messages: Record<string, string> = {
      gone: "Sorry — someone else booked onto that class first.",
      not_yours: "That booking link isn't for your account.",
      not_found: "We couldn't find that booking.",
      already_resolved: "That spot's already been sorted.",
      class_cancelled: "That class is no longer available.",
    };
    redirect(`/book?error=${encodeURIComponent(messages[result as string] ?? "That spot is no longer available.")}`);
  }

  const { data: booking } = await supabase.from("bookings").select("session_id").eq("id", bookingId).maybeSingle();
  if (!booking) redirect("/book?error=Booking%20not%20found");
  const sessionId = booking.session_id;

  const { data: session } = await supabase
    .from("class_sessions")
    .select("starts_at, classes(name, price_pence)")
    .eq("id", sessionId)
    .maybeSingle();
  const cls = session?.classes as unknown as { name: string; price_pence: number } | null;
  if (!cls || !session) redirect("/book?error=Class%20not%20found");

  revalidatePath("/book");
  revalidatePath("/account/bookings");
  revalidatePath("/admin");

  await settlePaymentAndRedirect({
    supabase,
    userEmail: user.email,
    bookingId,
    sessionId,
    session,
    cls,
  });
}

// Buys a class-credit bundle (or the one-time welcome offer): flat Stripe
// Checkout, not tied to any session. The webhook creates the class_packs row
// once payment completes. The welcome offer is enforced as one-time-per-
// customer here — if they've already got one on record, we refuse and
// explain rather than letting them buy a second discounted intro pack.
export async function createBundleCheckoutAction(kind: string) {
  if (!bookingsAreOpen()) {
    redirect(`/pricing?error=${encodeURIComponent(`Bookings open on ${BOOKINGS_OPEN_AT_LABEL} — check back soon!`)}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/pricing");

  const bundle = findBundle(kind);
  if (!bundle) redirect("/pricing?error=Unknown%20bundle");

  if (bundle.kind === WELCOME_PACK.kind) {
    const { data: existingWelcome } = await supabase
      .from("class_packs")
      .select("id")
      .eq("user_id", user.id)
      .eq("kind", WELCOME_PACK.kind)
      .maybeSingle();
    if (existingWelcome) {
      redirect(`/pricing?error=${encodeURIComponent("You've already used the welcome offer — it's one-time only.")}`);
    }
  }

  const origin = (await headers()).get("origin") ?? "https://reviveandreform.co.uk";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: { name: bundle.label },
          unit_amount: bundle.pricePence,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/account?packPurchased=1`,
    cancel_url: `${origin}/pricing?packCancelled=1`,
    customer_email: user.email ?? undefined,
    metadata: { kind: bundle.kind, user_id: user.id },
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
    supabase.from("class_sessions").select("starts_at, classes(name, price_pence)").eq("id", sessionId).maybeSingle(),
  ]);

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  const withinRefundWindow = session ? +new Date(session.starts_at) - Date.now() >= CANCELLATION_WINDOW_MS : false;
  const refundShouldBeAttempted = withinRefundWindow && existing?.payment_status === "paid";
  let refunded = false;
  let refundFailed = false;

  if (refundShouldBeAttempted) {
    // Customers can't write refunded_at/payment_status directly (see
    // schema_v8_security_hardening.sql) — these are legitimate server-side
    // confirmations that a refund was just actually processed above.
    const admin = createAdminClient();
    if (existing!.paid_via_pack_id) {
      try {
        await supabase.rpc("refund_class_credit", { p_pack_id: existing!.paid_via_pack_id });
        await admin.from("bookings").update({ refunded_at: new Date().toISOString() }).eq("id", bookingId);
        refunded = true;
      } catch {
        refundFailed = true;
      }
    } else if (existing!.stripe_payment_intent_id) {
      try {
        // Cancellation refunds are issued as an R&R class credit, not cash
        // back to the customer's card — matches the studio's stated policy.
        const clsForCredit = session?.classes as unknown as { price_pence: number } | null;
        const expiresAt = new Date(Date.now() + PACK_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const { error: creditErr } = await admin.from("class_packs").insert({
          user_id: user.id,
          kind: "refund_credit",
          classes_total: 1,
          classes_remaining: 1,
          price_paid_pence: clsForCredit?.price_pence ?? 0,
          stripe_payment_intent_id: existing!.stripe_payment_intent_id,
          expires_at: expiresAt,
        });
        if (creditErr) throw creditErr;
        await admin
          .from("bookings")
          .update({ payment_status: "refunded", refunded_at: new Date().toISOString() })
          .eq("id", bookingId);
        refunded = true;
      } catch {
        refundFailed = true;
      }
    } else {
      refundFailed = true;
    }
  }

  const noRefund = existing?.payment_status === "paid" && !withinRefundWindow;

  const cls = session?.classes as unknown as { name: string } | null;
  const cancellationEmail =
    user.email && cls && session
      ? (() => {
          const when = new Date(session.starts_at).toLocaleString("en-GB", { timeZone: "Europe/London",             weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          });
          const refundNote = refunded
            ? "A class credit has been added to your Revive & Reform account — refunds are issued as credit, not a cash refund."
            : refundFailed
              ? "We couldn't process your credit automatically — Alix will sort this out manually within a few days."
              : noRefund
                ? "As this was within 24 hours of the class, no credit was issued."
                : "No payment was taken for this booking.";
          return sendCancellationEmails({ email: user.email!, className: cls.name, when, refundNote, refundFailed });
        })()
      : Promise.resolve();

  await Promise.all([cancellationEmail, notifyWaitlistOfOpening(sessionId)]);

  revalidatePath("/book");
  revalidatePath("/account/bookings");
  revalidatePath("/admin");
  return { ok: true, refunded, noRefund, refundFailed };
}
