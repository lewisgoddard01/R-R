import { createAdminClient } from "@/lib/supabase/admin";
import { sendClassReminderEmail } from "@/lib/booking-email";

// Sends a reminder email to everyone booked into a class starting in ~5
// hours. Meant to be called by a scheduled job every 15-30 minutes — the
// window below is wide enough to not miss a session between runs, and
// reminder_sent_at is the real dedup guard so overlapping runs never
// double-send even if the window overlaps.
const REMINDER_HOURS_BEFORE = 5;
const WINDOW_PADDING_MINUTES = 15;

export async function sendClassReminders() {
  const admin = createAdminClient();
  const now = Date.now();
  const targetMs = now + REMINDER_HOURS_BEFORE * 60 * 60 * 1000;
  const windowStart = new Date(targetMs - WINDOW_PADDING_MINUTES * 60 * 1000);
  const windowEnd = new Date(targetMs + WINDOW_PADDING_MINUTES * 60 * 1000);

  const { data: sessions } = await admin
    .from("class_sessions")
    .select("id, starts_at, classes(name)")
    .eq("status", "scheduled")
    .gte("starts_at", windowStart.toISOString())
    .lte("starts_at", windowEnd.toISOString());

  if (!sessions || sessions.length === 0) return { sent: 0 };

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const sessionIds = sessions.map((s) => s.id);

  const { data: bookings } = await admin
    .from("bookings")
    .select("id, user_id, session_id")
    .in("session_id", sessionIds)
    .eq("status", "booked")
    .is("reminder_sent_at", null);

  if (!bookings || bookings.length === 0) return { sent: 0 };

  let sent = 0;
  await Promise.all(
    bookings.map(async (booking) => {
      const session = sessionById.get(booking.session_id);
      if (!session) return;
      const className = (session.classes as unknown as { name: string } | null)?.name ?? "your class";
      const when = new Date(session.starts_at).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });

      const { data: userRes } = await admin.auth.admin.getUserById(booking.user_id);
      const email = userRes?.user?.email;
      if (!email) return;

      await sendClassReminderEmail({ email, className, when });
      await admin.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", booking.id);
      sent++;
    })
  );

  return { sent };
}
