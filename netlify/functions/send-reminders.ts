import { schedule } from "@netlify/functions";

// Runs every 15 minutes, independently of anyone having the site open —
// hits our own /api/cron/reminders route (shared-secret protected), which
// does the actual work of finding bookings ~5 hours out and emailing them.
export const handler = schedule("*/15 * * * *", async () => {
  try {
    const res = await fetch("https://reviveandreform.co.uk/api/cron/reminders", {
      headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
    });
    const body = await res.text();
    console.log("send-reminders:", res.status, body);
  } catch (err) {
    console.error("send-reminders failed:", err);
  }
  return { statusCode: 200, body: "" };
});
