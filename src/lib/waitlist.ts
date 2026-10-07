import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, ADMIN_EMAIL } from "@/lib/email";

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

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      waitlisted.map((b) => b.user_id)
    );
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string | null]));

  const sent: string[] = [];
  const failed: string[] = [];

  await Promise.all(
    waitlisted.map(async (booking) => {
      let label = nameById.get(booking.user_id) || "A customer";
      try {
        const { data: userRes } = await admin.auth.admin.getUserById(booking.user_id);
        const email = userRes?.user?.email;
        if (!email) {
          failed.push(`${label} (no email address on file)`);
          return;
        }
        label = `${label} (${email})`;
        await sendEmail({
          to: email,
          subject: `A spot's opened up — book onto ${className}!`,
          html: `<p>Good news — a spot just opened up in <strong>${className}</strong> on ${when}, and you're on the waitlist.</p><p>It's first come, first served, so if you'd still like it, book onto the class now:</p><p><a href="${BASE_URL}/book/claim?booking_id=${booking.id}" style="color:#EA7B2B;font-weight:600;">Book onto this class →</a></p><p>If you're no longer able to make it, no action needed — you'll stay on the waitlist for next time.</p><p>— Revive &amp; Reform</p>`,
        });
        sent.push(label);
      } catch {
        // One failed email shouldn't stop the others from being notified.
        failed.push(label);
      }
    })
  );

  const list = (people: string[]) => `<ul>${people.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`;
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: failed.length
      ? `Waitlist emails for ${className} — ${failed.length} didn't send`
      : `Waitlist emailed for ${className} (${sent.length} ${sent.length === 1 ? "person" : "people"})`,
    html:
      `<p>A spot opened up in <strong>${escapeHtml(className)}</strong> on ${when}, so everyone on the waitlist was emailed a link to book it. First to book gets the spot.</p>` +
      (sent.length ? `<p><strong>Emailed:</strong></p>${list(sent)}` : "") +
      (failed.length
        ? `<p><strong>Couldn't be emailed — please contact them directly:</strong></p>${list(failed)}`
        : ""),
  }).catch(() => {});
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
