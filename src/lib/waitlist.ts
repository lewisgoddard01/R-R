import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

const BASE_URL = "https://reviveandreform.co.uk";

// When a spot opens up (cancellation, or an unpaid hold expiring), everyone
// currently on that session's waitlist is emailed their own claim link.
// Nobody's status changes here — first person to actually claim the spot
// (see claim_waitlist_spot) gets it; the rest stay waitlisted for next time.
export async function notifyWaitlistOfOpening(sessionId: string) {
  const admin = createAdminClient();

  const { data: waitlisted } = await admin
    .from("bookings")
    .select("id, user_id")
    .eq("session_id", sessionId)
    .eq("status", "waitlisted")
    .order("created_at", { ascending: true });

  if (!waitlisted || waitlisted.length === 0) return;

  const { data: session } = await admin
    .from("class_sessions")
    .select("starts_at, classes(name)")
    .eq("id", sessionId)
    .maybeSingle();
  const className = (session?.classes as unknown as { name: string } | null)?.name ?? "your class";
  const when = session?.starts_at
    ? new Date(session.starts_at).toLocaleString("en-GB", { timeZone: "Europe/London",         weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  await Promise.all(
    waitlisted.map(async (booking) => {
      try {
        const { data: userRes } = await admin.auth.admin.getUserById(booking.user_id);
        const email = userRes?.user?.email;
        if (!email) return;
        await sendEmail({
          to: email,
          subject: `A spot's opened up — book onto ${className}!`,
          html: `<p>Good news — a spot just opened up in <strong>${className}</strong> on ${when}, and you're on the waitlist.</p><p>It's first come, first served, so if you'd still like it, book onto the class now:</p><p><a href="${BASE_URL}/book/claim?booking_id=${booking.id}" style="color:#EA7B2B;font-weight:600;">Book onto this class →</a></p><p>If you're no longer able to make it, no action needed — you'll stay on the waitlist for next time.</p><p>— Revive &amp; Reform</p>`,
        });
      } catch {
        // One failed email shouldn't stop the others from being notified.
      }
    })
  );
}
