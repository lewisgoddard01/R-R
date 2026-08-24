import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasHealthFlags, type HealthAnswers } from "@/lib/health-questionnaire";

export default async function AdminRoster({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("class_sessions")
    .select("starts_at, instructor, capacity, classes(name)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) notFound();

  const { data: bookings } = await admin
    .from("bookings")
    .select("id, user_id, status, payment_status")
    .eq("session_id", sessionId)
    .in("status", ["booked", "waitlisted"]);

  const userIds = (bookings ?? []).map((b) => b.user_id);
  const [{ data: profiles }, { data: usersPage }] = await Promise.all([
    userIds.length
      ? admin.from("profiles").select("id, full_name, phone, health").in("id", userIds)
      : Promise.resolve({ data: [] }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const emailById = new Map(usersPage?.users.map((u) => [u.id, u.email ?? ""]) ?? []);

  const rows = (bookings ?? []).map((b) => {
    const profile = profileById.get(b.user_id);
    return {
      ...b,
      name: profile?.full_name || "(no name on file)",
      email: emailById.get(b.user_id) ?? "",
      phone: profile?.phone ?? "",
      flagged: hasHealthFlags(profile?.health as HealthAnswers | undefined),
    };
  });

  const booked = rows.filter((r) => r.status === "booked");
  const waitlisted = rows.filter((r) => r.status === "waitlisted");
  const className = (session.classes as unknown as { name: string } | null)?.name ?? "Class";
  const when = new Date(session.starts_at).toLocaleString("en-GB", { timeZone: "Europe/London",     weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="admin-card" style={{ marginTop: "2rem" }}>
      <h3>
        {className} — {when}
      </h3>
      <p className="admin-empty" style={{ marginBottom: "1.2rem" }}>
        {session.instructor ? `With ${session.instructor}. ` : ""}
        {booked.length}/{session.capacity} booked{waitlisted.length > 0 ? ` · ${waitlisted.length} waiting` : ""}.
        A red flag means they&apos;ve noted a health condition worth checking before class.
      </p>

      {booked.length === 0 ? (
        <p className="admin-empty">Nobody&apos;s booked onto this class yet.</p>
      ) : (
        <div className="admin-table">
          {booked.map((r) => (
            <Link className="admin-row admin-row--link" href={`/admin/customers/${r.user_id}`} key={r.id}>
              <span>{r.name}</span>
              <span style={{ color: "var(--muted)" }}>
                {r.email}
                {r.phone && <div style={{ fontSize: ".82rem" }}>{r.phone}</div>}
              </span>
              <span style={{ color: "var(--muted)" }}>{r.payment_status === "comped" ? "Free (comped)" : r.payment_status}</span>
              <span style={{ color: r.flagged ? "var(--orange)" : "var(--muted)" }}>
                {r.flagged ? "⚠ Health notes" : ""}
              </span>
            </Link>
          ))}
        </div>
      )}

      {waitlisted.length > 0 && (
        <>
          <h3 style={{ marginTop: "1.6rem" }}>Waitlist</h3>
          <div className="admin-table">
            {waitlisted.map((r) => (
              <Link className="admin-row admin-row--link" href={`/admin/customers/${r.user_id}`} key={r.id}>
                <span>{r.name}</span>
                <span style={{ color: "var(--muted)" }}>
                {r.email}
                {r.phone && <div style={{ fontSize: ".82rem" }}>{r.phone}</div>}
              </span>
                <span />
                <span style={{ color: r.flagged ? "var(--orange)" : "var(--muted)" }}>
                  {r.flagged ? "⚠ Health notes" : ""}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
