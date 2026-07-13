// Server-only email helper (Resend). Never import into a Client Component.
// All studio mail is sent FROM and notified TO info@reviveandreform.co.uk.

export const FROM = "Revive & Reform <info@reviveandreform.co.uk>";
export const ADMIN_EMAIL = "info@reviveandreform.co.uk";
export const REPLY_TO = "info@reviveandreform.co.uk";

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, html, replyTo = REPLY_TO }: SendArgs) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html, reply_to: replyTo }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
  return res.json();
}
