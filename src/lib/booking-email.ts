import { sendEmail, ADMIN_EMAIL } from "@/lib/email";

export async function sendBookingConfirmationEmail(params: { email: string; className: string; when: string }) {
  const { email, className, when } = params;
  await sendEmail({
    to: email,
    subject: `Booking confirmed — ${className}`,
    html: `<p>You're booked in for <strong>${className}</strong> on ${when}. See you on the reformer!</p><p>— Revive &amp; Reform</p>`,
  }).catch(() => {});
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New booking — ${className}`,
    html: `<p>${email} just booked ${className} on ${when}.</p>`,
  }).catch(() => {});
}
