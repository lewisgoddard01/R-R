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

// On-brand wrapper — dark header with the logo/wordmark (matching the
// site), a light card for the actual message (better cross-client
// readability than dark-on-dark body text), orange accents throughout.
// Every email sent through sendEmail() gets this automatically.
function wrapEmailHtml(bodyHtml: string): string {
  return `<div style="background:#0B0A09;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;border-collapse:collapse;">
      <tr>
        <td style="text-align:center;padding-bottom:24px;">
          <img src="https://reviveandreform.co.uk/assets/logo.jpg" alt="Revive & Reform" width="64" height="64" style="border-radius:50%;display:inline-block;" />
          <div style="color:#F4EFE6;font-size:21px;margin-top:12px;letter-spacing:.02em;">
            Revive <span style="color:#EA7B2B;font-style:italic;">&amp;</span> Reform
          </div>
        </td>
      </tr>
      <tr>
        <td style="background:#F4EFE6;border-radius:12px;padding:30px 26px;color:#1a1712;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.65;">
          <div style="border-top:3px solid #EA7B2B;width:48px;margin-bottom:20px;"></div>
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="text-align:center;padding-top:22px;color:#A69E90;font-size:12px;font-family:Arial,Helvetica,sans-serif;line-height:1.7;">
          Revive &amp; Reform · 1D Oxford Street, Ripley, Derbyshire, DE5 3AG<br/>
          <a href="https://reviveandreform.co.uk" style="color:#EA7B2B;text-decoration:none;">reviveandreform.co.uk</a>
        </td>
      </tr>
    </table>
  </div>`;
}

export async function sendEmail({ to, subject, html, replyTo = REPLY_TO }: SendArgs) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html: wrapEmailHtml(html), reply_to: replyTo }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
  return res.json();
}
