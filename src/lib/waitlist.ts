import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

// Promotes the earliest waitlisted person for a session into a freed 'booked'
// spot and emails them. Used both when a customer cancels and when an unpaid
// Stripe Checkout Session expires without payment.
export async function promoteWaitlistAndNotify(sessionId: string) {
  const admin = createAdminClient();
  const { data: promotedUserId } = await admin.rpc("promote_waitlist", { p_session_id: sessionId });
  if (!promotedUserId) return;

  try {
    const { data: userRes } = await admin.auth.admin.getUserById(promotedUserId);
    const email = userRes?.user?.email;
    const { data: session } = await admin
      .from("class_sessions")
      .select("starts_at, classes(name)")
      .eq("id", sessionId)
      .maybeSingle();
    const className = (session?.classes as unknown as { name: string } | null)?.name ?? "your class";
    const when = session?.starts_at
      ? new Date(session.starts_at).toLocaleString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    if (email) {
      await sendEmail({
        to: email,
        subject: `A spot opened up — you're in! (${className})`,
        html: `<p>Good news — someone dropped out of <strong>${className}</strong> on ${when}, and you were next on the waitlist, so we've moved you into the class.</p><p>See you there! If you can no longer make it, please log in and cancel so we can offer the spot to someone else.</p><p>— Revive &amp; Reform</p>`,
      });
    }
  } catch {
    // Promotion already happened in the DB even if the email fails — don't block the caller.
  }
}
