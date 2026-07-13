import { sendEmail, ADMIN_EMAIL } from "@/lib/email";

export async function sendBookingConfirmationEmail(params: { email: string; className: string; when: string }) {
  const { email, className, when } = params;
  await Promise.all([
    sendEmail({
      to: email,
      subject: `Booking confirmed — ${className}`,
      html: `<p>You're booked in for <strong>${className}</strong> on ${when}. See you on the reformer!</p><p>— Revive &amp; Reform</p>`,
    }).catch(() => {}),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `New booking — ${className}`,
      html: `<p>${email} just booked ${className} on ${when}.</p>`,
    }).catch(() => {}),
  ]);
}

export async function sendCancellationEmails(params: {
  email: string;
  className: string;
  when: string;
  refundNote: string;
}) {
  const { email, className, when, refundNote } = params;
  await Promise.all([
    sendEmail({
      to: email,
      subject: `Booking cancelled — ${className}`,
      html: `<p>Your booking for <strong>${className}</strong> on ${when} has been cancelled.</p><p>${refundNote}</p><p>— Revive &amp; Reform</p>`,
    }).catch(() => {}),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Cancellation — ${className}`,
      html: `<p>${email} just cancelled their booking for <strong>${className}</strong> on ${when}.</p><p>${refundNote}</p>`,
    }).catch(() => {}),
  ]);
}
