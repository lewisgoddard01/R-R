"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { sendSessionCancelledEmail } from "@/lib/booking-email";
import { sendEmail, ADMIN_EMAIL } from "@/lib/email";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/account");
  return supabase;
}

function str(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}
function num(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ── Classes ──────────────────────────────────────────────────────────
export async function createClassAction(formData: FormData) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("classes").insert({
    name: str(formData.get("name")),
    description: str(formData.get("description")),
    category: str(formData.get("category")),
    duration_min: num(formData.get("duration_min"), 50),
    default_capacity: num(formData.get("default_capacity"), 8),
    price_pence: Math.round(num(formData.get("price"), 20) * 100),
    active: true,
  });
  revalidatePath("/admin/classes");
  return { error: error?.message };
}

export async function updateClassAction(classId: string, formData: FormData) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("classes")
    .update({
      name: str(formData.get("name")),
      description: str(formData.get("description")),
      category: str(formData.get("category")),
      duration_min: num(formData.get("duration_min"), 50),
      default_capacity: num(formData.get("default_capacity"), 8),
      price_pence: Math.round(num(formData.get("price"), 20) * 100),
      active: formData.get("active") === "on",
    })
    .eq("id", classId);
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
  return { error: error?.message };
}

export async function deleteClassAction(classId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("classes").delete().eq("id", classId);
  revalidatePath("/admin/classes");
  if (!error) redirect("/admin/classes");
  return { error: error?.message };
}

// ── Sessions (dated occurrences) ────────────────────────────────────
export async function createSessionAction(classId: string, formData: FormData) {
  const supabase = await requireAdmin();
  const date = str(formData.get("date"));
  const time = str(formData.get("time"));
  const capacity = num(formData.get("capacity"), 8);
  const instructor = str(formData.get("instructor"));
  const repeatWeeks = Math.max(1, num(formData.get("repeat_weeks"), 1));

  if (!date || !time) return { error: "Pick a date and time." };
  const startsAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startsAt.getTime())) return { error: "That date/time isn't valid." };

  const rows = Array.from({ length: repeatWeeks }, (_, i) => {
    const d = new Date(startsAt);
    d.setDate(d.getDate() + i * 7);
    return { class_id: classId, starts_at: d.toISOString(), capacity, instructor, status: "scheduled" as const };
  });

  const { error } = await supabase.from("class_sessions").insert(rows);
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/book");
  return { error: error?.message };
}

// Cancelling a whole session (studio-side — instructor ill, etc.) is
// different from a customer cancelling their own booking: every affected
// customer is notified, and anyone who'd paid is refunded in full
// regardless of the 24-hour policy, since this isn't their fault.
export async function cancelSessionAction(sessionId: string, classId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("class_sessions").update({ status: "cancelled" }).eq("id", sessionId);
  if (error) {
    revalidatePath(`/admin/classes/${classId}`);
    return { error: error.message };
  }

  const { data: session } = await admin
    .from("class_sessions")
    .select("starts_at, classes(name)")
    .eq("id", sessionId)
    .maybeSingle();
  const className = (session?.classes as unknown as { name: string } | null)?.name ?? "the class";
  const when = session?.starts_at
    ? new Date(session.starts_at).toLocaleString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const { data: affected } = await admin
    .from("bookings")
    .select("id, user_id, status, payment_status, paid_via_pack_id, stripe_payment_intent_id")
    .eq("session_id", sessionId)
    .in("status", ["booked", "waitlisted"]);

  const now = new Date().toISOString();
  const refundFailures: string[] = [];

  await Promise.all(
    (affected ?? []).map(async (booking) => {
      const wasBooked = booking.status === "booked";
      let refunded = false;
      let refundFailed = false;

      await admin.from("bookings").update({ status: "cancelled", cancelled_at: now }).eq("id", booking.id);

      if (wasBooked && booking.payment_status === "paid") {
        try {
          if (booking.paid_via_pack_id) {
            await admin.rpc("admin_refund_pack_credit", { p_pack_id: booking.paid_via_pack_id });
            await admin.from("bookings").update({ refunded_at: now }).eq("id", booking.id);
          } else if (booking.stripe_payment_intent_id) {
            await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent_id });
            await admin.from("bookings").update({ payment_status: "refunded", refunded_at: now }).eq("id", booking.id);
          }
          refunded = true;
        } catch {
          refundFailed = true;
          refundFailures.push(booking.id);
        }
      }

      const { data: userRes } = await admin.auth.admin.getUserById(booking.user_id);
      const email = userRes?.user?.email;
      if (!email) return;

      const refundNote = !wasBooked
        ? "You were on the waitlist for this class, so no payment was taken."
        : refunded
          ? booking.paid_via_pack_id
            ? "Your class credit has been returned to your account."
            : "You've been refunded in full."
          : refundFailed
            ? "We couldn't process your refund automatically — Alix will sort this out manually."
            : "No payment was taken for this booking.";

      await sendSessionCancelledEmail({ email, className, when, refundNote });
    })
  );

  if (refundFailures.length > 0) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `ACTION NEEDED — ${refundFailures.length} refund(s) failed cancelling ${className}`,
      html: `<p>Cancelling <strong>${className}</strong> on ${when} failed to auto-refund ${refundFailures.length} booking(s). Please check and refund manually from the Stripe dashboard or admin panel. Booking IDs: ${refundFailures.join(", ")}</p>`,
    }).catch(() => {});
  }

  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/book");
  revalidatePath("/account/bookings");
  revalidatePath("/admin");
  return { error: undefined };
}

export async function updateSessionCapacityAction(sessionId: string, classId: string, capacity: number) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("class_sessions").update({ capacity }).eq("id", sessionId);
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/book");
  return { error: error?.message };
}
