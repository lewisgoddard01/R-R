import { sendEmail, ADMIN_EMAIL } from "@/lib/email";

export async function sendBookingConfirmationEmail(params: { email: string; className: string; when: string }) {
  const { email, className, when } = params;
  await Promise.all([
    sendEmail({
      to: email,
      subject: `Booking confirmed — ${className}`,
      html: `<p>You're booked in for <strong>${className}</strong> on ${when}. See you on the reformer!</p><p>Please remember to bring grip socks to your class — these can be purchased at R&amp;R for £3 if needed (cash only).</p><p>— Revive &amp; Reform</p>`,
    }).catch(() => {}),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `New booking — ${className}`,
      html: `<p>${email} just booked ${className} on ${when}.</p>`,
    }).catch(() => {}),
  ]);
}

// Sent to a customer when the STUDIO cancels a whole session (not a
// customer-initiated cancellation) — different framing, and no admin copy
// since the admin is the one who just triggered this.
export async function sendSessionCancelledEmail(params: {
  email: string;
  className: string;
  when: string;
  refundNote: string;
}) {
  const { email, className, when, refundNote } = params;
  await sendEmail({
    to: email,
    subject: `Class cancelled — ${className}`,
    html: `<p>We're sorry — <strong>${className}</strong> on ${when} has had to be cancelled by the studio.</p><p>${refundNote}</p><p>Please accept our apologies for the inconvenience — have a look at <a href="https://reviveandreform.co.uk/book">other classes</a> to rebook.</p><p>— Revive &amp; Reform</p>`,
  }).catch(() => {});
}

// Sent ~5 hours before a booked class starts, as a reminder.
export async function sendClassReminderEmail(params: { email: string; className: string; when: string }) {
  const { email, className, when } = params;
  await sendEmail({
    to: email,
    subject: `Reminder — ${className} today at ${when}`,
    html: `<p>Just a reminder — you're booked in for <strong>${className}</strong> today at ${when}.</p><p>See you on the reformer!</p><p>— Revive &amp; Reform</p>`,
  }).catch(() => {});
}

export async function sendCancellationEmails(params: {
  email: string;
  className: string;
  when: string;
  refundNote: string;
  refundFailed?: boolean;
}) {
  const { email, className, when, refundNote, refundFailed } = params;
  await Promise.all([
    sendEmail({
      to: email,
      subject: `Booking cancelled — ${className}`,
      html: `<p>Your booking for <strong>${className}</strong> on ${when} has been cancelled.</p><p>${refundNote}</p><p>— Revive &amp; Reform</p>`,
    }).catch(() => {}),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: refundFailed
        ? `ACTION NEEDED — refund failed for ${className}`
        : `Cancellation — ${className}`,
      html: `<p>${email} just cancelled their booking for <strong>${className}</strong> on ${when}.</p><p>${refundNote}</p>`,
    }).catch(() => {}),
  ]);
}
