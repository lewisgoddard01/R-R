import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminOverview() {
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
        when: new Date(w.class_sessions!.starts_at).toLocaleString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        waitingSince: new Date(w.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      }));
  }

  return (
    <>
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
        <h3>Next up</h3>
        {!soon || soon.length === 0 ? (
          <p className="admin-empty">No sessions scheduled yet — add some in Classes &amp; sessions.</p>
        ) : (
          <div className="admin-table">
            {soon.map((s) => (
              <div className="admin-row" key={s.id}>
                <span>{new Date(s.starts_at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
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
