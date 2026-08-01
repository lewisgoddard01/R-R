import { NextRequest, NextResponse } from "next/server";
import { sendClassReminders } from "@/lib/reminders";

// Called by a Netlify Scheduled Function every 15 minutes (see
// netlify/functions/send-reminders.ts) — never exposed to customers, gated
// by a shared secret so nobody else can trigger mass reminder emails.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")?.trim();
  // Trimmed for the same reason as the Stripe webhook secret — pasted env
  // values often pick up a trailing newline in hosting dashboards.
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendClassReminders();
  return NextResponse.json({ ok: true, ...result });
}
