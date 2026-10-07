import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditCancelledBookingAction } from "@/app/admin/actions";

async function creditNow(bookingId: string) {
  "use server";
  const { error } = await creditCancelledBookingAction(bookingId);
  if (error) redirect(`/admin?error=${encodeURIComponent(error)}`);
  redirect("/admin?saved=Credit%20added%20to%20their%20account.");
}

export default async function AdminOverview({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error: errorMsg, saved } = await searchParams;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ count: classCount }, { count: upcomingCount }, { count: waitlistCount }, { data: soon }] =
    await Promise.all([
      supabase.from("classes").select("id", { count: "exact", head: true }).eq("active", true),
      supabase
        .from("class_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "scheduled")
        .gte("starts_at", now),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "waitlisted"),
      supabase
        .from("class_sessions")
        .select("id, starts_at, capacity, instructor, classes(name)")
        .eq("status", "scheduled")
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(6),
    ]);

  // Who's waiting, and for what — uses the service-role client because profiles/emails
  // for OTHER customers aren't visible to the admin's own RLS-scoped session.
  const admin = createAdminClient();
  const { data: waitlisted } = await admin
    .from("bookings")
    .select("id, user_id, created_at, class_sessions(starts_at, classes(name))")
    .eq("status", "waitlisted")
    .order("created_at", { ascending: true });

  type WaitRow = {
    id: string;
    user_id: string;
    created_at: string;
    class_sessions: { starts_at: string; classes: { name: string } | null } | null;
  };
  const waitRows = ((waitlisted ?? []) as unknown as WaitRow[]).filter((w) => w.class_sessions);

  let waitDisplay: { id: string; who: string; className: string; when: string; waitingSince: string }[] = [];
  if (waitRows.length > 0) {
    const uniqueIds = Array.from(new Set(waitRows.map((w) => w.user_id)));
    const [{ data: profiles }, { data: usersPage }] = await Promise.all([
      admin.from("profiles").select("id, full_name").in("id", uniqueIds),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const emailById = new Map(usersPage.users.map((u) => [u.id, u.email]));

    waitDisplay = waitRows
      .sort((a, b) => +new Date(a.class_sessions!.starts_at) - +new Date(b.class_sessions!.starts_at))
      .map((w) => ({
        id: w.id,
        who: nameById.get(w.user_id) || emailById.get(w.user_id) || "Unknown customer",
        className: w.class_sessions!.classes?.name ?? "",
        when: new Date(w.class_sessions!.starts_at).toLocaleString("en-GB", { timeZone: "Europe/London",           weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        waitingSince: new Date(w.created_at).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" }),
      }));
  }

  const { data: notified } = await admin
    .from("waitlist_notifications")
    .select("id, recipient, sent, created_at, class_sessions(starts_at, classes(name))")
    .order("created_at", { ascending: false })
    .limit(20);
  type NotifiedRow = {
    id: string;
    recipient: string;
    sent: boolean;
    created_at: string;
    class_sessions: { starts_at: string; classes: { name: string } | null } | null;
  };
  const notifiedRows = (notified ?? []) as unknown as NotifiedRow[];
  const shortDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "Europe/London",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Recent cancellations — same RLS-bypass reasoning as the waitlist above.
  const { data: cancelled } = await admin
    .from("bookings")
    .select(
      "id, user_id, cancelled_at, payment_status, refunded_at, paid_via_pack_id, stripe_payment_intent_id, class_sessions(starts_at, classes(name))"
    )
    .eq("status", "cancelled")
    .not("cancelled_at", "is", null)
    .order("cancelled_at", { ascending: false })
    .limit(10);

  type CancelRow = {
    id: string;
    user_id: string;
    cancelled_at: string;
    payment_status: string;
    refunded_at: string | null;
    paid_via_pack_id: string | null;
    stripe_payment_intent_id: string | null;
    class_sessions: { starts_at: string; classes: { name: string } | null } | null;
  };
  const cancelRows = ((cancelled ?? []) as unknown as CancelRow[]).filter((c) => c.class_sessions);

  // Card-paid cancellations used to be refunded to the card; they now get a
  // refund_credit pack instead. Matching on the payment intent tells them apart.
  const intentIds = cancelRows.map((c) => c.stripe_payment_intent_id).filter((id): id is string => Boolean(id));
  const { data: creditPacks } = intentIds.length
    ? await admin
        .from("class_packs")
        .select("stripe_payment_intent_id")
        .eq("kind", "refund_credit")
        .in("stripe_payment_intent_id", intentIds)
    : { data: [] };
  const creditedIntents = new Set((creditPacks ?? []).map((p) => p.stripe_payment_intent_id));

  let cancelDisplay: {
    id: string;
    userId: string;
    who: string;
    className: string;
    when: string;
    cancelledOn: string;
    outcome: string;
    needsCredit: boolean;
  }[] = [];
  if (cancelRows.length > 0) {
    const uniqueIds = Array.from(new Set(cancelRows.map((c) => c.user_id)));
    const [{ data: profiles }, { data: usersPage }] = await Promise.all([
      admin.from("profiles").select("id, full_name").in("id", uniqueIds),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const emailById = new Map(usersPage.users.map((u) => [u.id, u.email]));

    cancelDisplay = cancelRows.map((c) => ({
      id: c.id,
      userId: c.user_id,
      needsCredit:
        !c.refunded_at &&
        c.payment_status === "paid" &&
        +new Date(c.class_sessions!.starts_at) - +new Date(c.cancelled_at) >= 24 * 60 * 60 * 1000,
      who: nameById.get(c.user_id) || emailById.get(c.user_id) || "Unknown customer",
      className: c.class_sessions!.classes?.name ?? "",
      when: new Date(c.class_sessions!.starts_at).toLocaleString("en-GB", { timeZone: "Europe/London",         weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      cancelledOn: new Date(c.cancelled_at).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" }),
      outcome: (() => {
        if (c.refunded_at) {
          if (c.paid_via_pack_id) return "credit returned to account";
          if (c.stripe_payment_intent_id && creditedIntents.has(c.stripe_payment_intent_id)) {
            return "credited to account";
          }
          return "refunded to card";
        }
        if (c.payment_status !== "paid") return "no payment taken";
        const wasOutside24h =
          +new Date(c.class_sessions!.starts_at) - +new Date(c.cancelled_at) >= 24 * 60 * 60 * 1000;
        return wasOutside24h ? "⚠ credit not added — needs sorting manually" : "no credit (within 24h)";
      })(),
    }));
  }

  return (
    <>
      {errorMsg && <p style={{ color: "var(--orange)", marginTop: "1.5rem" }}>Couldn&apos;t do that: {errorMsg}</p>}
      {saved && !errorMsg && <p style={{ color: "var(--muted)", marginTop: "1.5rem" }}>✓ {saved}</p>}
      <div className="admin-stats">
        <div className="admin-stat">
          <span>{classCount ?? 0}</span>
          <p>Active classes</p>
        </div>
        <div className="admin-stat">
          <span>{upcomingCount ?? 0}</span>
          <p>Upcoming sessions</p>
        </div>
        <div className="admin-stat">
          <span>{waitlistCount ?? 0}</span>
          <p>People on a waitlist</p>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: "2rem" }}>
        <h3>Waitlists</h3>
        {waitDisplay.length === 0 ? (
          <p className="admin-empty">Nobody&apos;s waiting for a spot right now.</p>
        ) : (
          <div className="admin-table">
            {waitDisplay.map((w) => (
              <div className="admin-row" key={w.id}>
                <span>{w.who}</span>
                <span>{w.className}</span>
                <span>{w.when}</span>
                <span>waiting since {w.waitingSince}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>Waitlist emails sent</h3>
        <p style={{ color: "var(--muted)", marginBottom: "1rem", fontSize: ".9rem" }}>
          When a spot opens up, everyone waiting is emailed a link to book it — first to book gets it.
        </p>
        {notifiedRows.length === 0 ? (
          <p className="admin-empty">No waitlist emails have gone out yet.</p>
        ) : (
          <div className="admin-table">
            {notifiedRows.map((n) => (
              <div className="admin-row" key={n.id}>
                <span>{n.recipient}</span>
                <span>{n.class_sessions?.classes?.name ?? ""}</span>
                <span>{n.class_sessions ? shortDateTime(n.class_sessions.starts_at) : ""}</span>
                <span style={n.sent ? undefined : { color: "var(--orange)" }}>
                  {n.sent ? `✓ emailed ${shortDateTime(n.created_at)}` : "⚠ didn't send — contact them directly"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>Recent cancellations</h3>
        {cancelDisplay.length === 0 ? (
          <p className="admin-empty">No cancellations yet.</p>
        ) : (
          <div className="admin-table">
            {cancelDisplay.map((c) => (
              <div className="admin-row" key={c.id}>
                <Link href={`/admin/customers/${c.userId}`}>{c.who}</Link>
                <span>{c.className}</span>
                <span>{c.when}</span>
                <span style={c.needsCredit ? { color: "var(--orange)" } : undefined}>
                  cancelled {c.cancelledOn} · {c.outcome}
                  {c.needsCredit && (
                    <form action={creditNow.bind(null, c.id)} style={{ display: "inline", marginLeft: ".6rem" }}>
                      <button type="submit" className="admin-link-btn">
                        Add credit now
                      </button>
                    </form>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>Next up</h3>
        {!soon || soon.length === 0 ? (
          <p className="admin-empty">No sessions scheduled yet — add some in Classes &amp; sessions.</p>
        ) : (
          <div className="admin-table">
            {soon.map((s) => (
              <div className="admin-row" key={s.id}>
                <span>{new Date(s.starts_at).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span>{(s.classes as unknown as { name: string } | null)?.name}</span>
                <span>{s.instructor || "—"}</span>
                <span>cap {s.capacity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ marginTop: "2rem" }}>
        <Link href="/admin/classes" className="btn btn--primary">
          Manage classes &amp; sessions <span className="btn__x">→</span>
        </Link>
      </p>
    </>
  );
}
