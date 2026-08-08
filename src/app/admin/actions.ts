"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { sendSessionCancelledEmail, sendBookingConfirmationEmail } from "@/lib/booking-email";
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
    short_description: str(formData.get("short_description")) || null,
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
      short_description: str(formData.get("short_description")) || null,
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
async function insertSessions(classId: string, formData: FormData) {
  const supabase = await requireAdmin();
  const date = str(formData.get("date"));
  const time = str(formData.get("time"));
  const capacity = num(formData.get("capacity"), 8);
  const instructor = str(formData.get("instructor"));
  const repeatWeeks = Math.max(1, num(formData.get("repeat_weeks"), 1));

  if (!classId) return { error: "Pick a class." };
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
  revalidatePath("/admin/timetable");
  revalidatePath("/book");
  revalidatePath("/timetable");
  return { error: error?.message };
}

export async function createSessionAction(classId: string, formData: FormData) {
  return insertSessions(classId, formData);
}

// Same as createSessionAction, but for the unified /admin/timetable page
// where the class is picked from a dropdown inside the form itself rather
// than being fixed by which class's page you're on.
export async function addTimetableSessionAction(formData: FormData) {
  return insertSessions(str(formData.get("class_id")), formData);
}

// Shared by cancelSessionAction (one session) and bulkCancelWeekdayAction
// (many at once) — every affected customer is notified, and anyone who'd
// paid is refunded in full regardless of the 24-hour policy, since a
// studio-side cancellation isn't their fault.
async function cancelSessionCore(admin: ReturnType<typeof createAdminClient>, sessionId: string) {
  const { error } = await admin.from("class_sessions").update({ status: "cancelled" }).eq("id", sessionId);
  if (error) return { error: error.message };

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

  return { error: undefined };
}

export async function cancelSessionAction(sessionId: string, classId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const result = await cancelSessionCore(admin, sessionId);

  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/timetable");
  revalidatePath("/book");
  revalidatePath("/timetable");
  revalidatePath("/account/bookings");
  revalidatePath("/admin");
  return result;
}

// Bulk version for "take the Sunday classes off the timetable" style
// changes — cancels every future scheduled session that falls on the given
// weekday, across all classes, using the same per-customer refund/notify
// logic as cancelling one session at a time.
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function bulkCancelWeekdayAction(formData: FormData) {
  await requireAdmin();
  const weekday = str(formData.get("weekday"));
  const dayIndex = WEEKDAYS.indexOf(weekday);
  if (dayIndex === -1) return { error: "Pick a day." };

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("class_sessions")
    .select("id, starts_at")
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString());

  const matching = (sessions ?? []).filter((s) => new Date(s.starts_at).getDay() === dayIndex);

  for (const s of matching) {
    await cancelSessionCore(admin, s.id);
  }

  revalidatePath("/admin/classes");
  revalidatePath("/admin/timetable");
  revalidatePath("/book");
  revalidatePath("/timetable");
  revalidatePath("/account/bookings");
  revalidatePath("/admin");
  return { error: undefined, cancelledCount: matching.length };
}

// Lets an admin add an existing customer onto a class for free — comps,
// manual phone bookings, goodwill after a mix-up, etc. Recorded as
// payment_status 'comped' (not 'paid', so it's never counted as revenue;
// not 'unpaid', so it's never auto-released as an abandoned checkout).
export async function addFreeBookingAction(sessionId: string, classId: string, formData: FormData) {
  await requireAdmin();
  const email = str(formData.get("email")).toLowerCase();
  if (!email) return { error: "Enter the customer's email." };

  const admin = createAdminClient();

  let matchedUserId: string | null = null;
  let matchedEmail: string | null = null;
  let page = 1;
  while (!matchedUserId) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { error: error.message };
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) {
      matchedUserId = hit.id;
      matchedEmail = hit.email ?? email;
      break;
    }
    if (data.users.length < 1000) break; // last page
    page++;
  }
  if (!matchedUserId) {
    return { error: "No account found with that email — they need to sign up first." };
  }

  const { data: existing } = await admin
    .from("bookings")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", matchedUserId)
    .in("status", ["booked", "waitlisted"])
    .maybeSingle();
  if (existing) return { error: "That customer already has a spot (or a waitlist place) for this class." };

  const { error: insertError } = await admin.from("bookings").insert({
    session_id: sessionId,
    user_id: matchedUserId,
    status: "booked",
    payment_status: "comped",
  });
  if (insertError) return { error: insertError.message };

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
  await sendBookingConfirmationEmail({ email: matchedEmail!, className, when });

  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/timetable");
  revalidatePath("/book");
  revalidatePath("/account/bookings");
  return { error: undefined };
}

// ── Site content (waiver/health declaration wording, etc.) ──────────
export async function updateSiteContentAction(key: string, formData: FormData) {
  const supabase = await requireAdmin();
  const body = str(formData.get("body"));
  const { error } = await supabase
    .from("site_content")
    .upsert({ key, body, updated_at: new Date().toISOString() });
  revalidatePath("/admin/waiver");
  revalidatePath("/account/waiver");
  return { error: error?.message };
}

export async function updateSessionAction(sessionId: string, classId: string, formData: FormData) {
  const supabase = await requireAdmin();
  const date = str(formData.get("date"));
  const time = str(formData.get("time"));
  const capacity = num(formData.get("capacity"), 8);
  const instructor = str(formData.get("instructor"));
  // Optional — lets an admin reassign which class this session actually is
  // (e.g. swapping what runs in a slot) without deleting and re-adding it.
  const newClassId = str(formData.get("class_id")) || classId;

  if (!date || !time) return { error: "Pick a date and time." };
  const startsAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startsAt.getTime())) return { error: "That date/time isn't valid." };

  const { error } = await supabase
    .from("class_sessions")
    .update({ starts_at: startsAt.toISOString(), capacity, instructor, class_id: newClassId })
    .eq("id", sessionId);
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath(`/admin/classes/${newClassId}`);
  revalidatePath("/admin/timetable");
  revalidatePath("/book");
  revalidatePath("/timetable");
  return { error: error?.message };
}
