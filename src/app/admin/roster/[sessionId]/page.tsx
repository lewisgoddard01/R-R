import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasHealthFlags, type HealthAnswers } from "@/lib/health-questionnaire";
import { adminRemoveBookingAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/confirm-button";

export default async function AdminRoster({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { sessionId } = await params;
  const { error: errorMsg, saved } = await searchParams;
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

  async function remove(bookingId: string, formData: FormData) {
    "use server";
    void formData;
    const { error } = await adminRemoveBookingAction(bookingId);
    if (error) redirect(`/admin/roster/${sessionId}?error=${encodeURIComponent(error)}`);
    redirect(`/admin/roster/${sessionId}?saved=Removed%20from%20the%20class.`);
  }

  return (
    <div className="admin-card" style={{ marginTop: "2rem" }}>
      <h3>
        {className} — {when}
      </h3>
      {errorMsg && <p style={{ color: "var(--orange)", marginBottom: "1rem" }}>Couldn&apos;t save: {errorMsg}</p>}
      {saved && !errorMsg && <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>✓ {saved}</p>}
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
            <div
              className="admin-row"
              key={r.id}
              style={{ alignItems: "center", gridTemplateColumns: "1.4fr 1fr 1fr auto auto" }}
            >
              <Link href={`/admin/customers/${r.user_id}`}>{r.name}</Link>
              <span style={{ color: "var(--muted)" }}>
                {r.email}
                {r.phone && <div style={{ fontSize: ".82rem" }}>{r.phone}</div>}
              </span>
              <span style={{ color: "var(--muted)" }}>{r.payment_status === "comped" ? "Free (comped)" : r.payment_status}</span>
              <span style={{ color: r.flagged ? "var(--orange)" : "var(--muted)" }}>
                {r.flagged ? "⚠ Health notes" : ""}
              </span>
              <form action={remove.bind(null, r.id)}>
                <ConfirmButton
                  className="admin-link-btn"
                  confirmText={`Remove ${r.name} from ${className} on ${when}? If they paid, a class credit will be added to their account.`}
                >
                  Remove
                </ConfirmButton>
              </form>
            </div>
          ))}
        </div>
      )}

      {waitlisted.length > 0 && (
        <>
          <h3 style={{ marginTop: "1.6rem" }}>Waitlist</h3>
          <div className="admin-table">
            {waitlisted.map((r) => (
              <div
              className="admin-row"
              key={r.id}
              style={{ alignItems: "center", gridTemplateColumns: "1.4fr 1fr 1fr auto auto" }}
            >
                <Link href={`/admin/customers/${r.user_id}`}>{r.name}</Link>
                <span style={{ color: "var(--muted)" }}>
                  {r.email}
                  {r.phone && <div style={{ fontSize: ".82rem" }}>{r.phone}</div>}
                </span>
                <span style={{ color: "var(--muted)" }}>Waitlisted</span>
                <span style={{ color: r.flagged ? "var(--orange)" : "var(--muted)" }}>
                  {r.flagged ? "⚠ Health notes" : ""}
                </span>
                <form action={remove.bind(null, r.id)}>
                  <ConfirmButton
                    className="admin-link-btn"
                    confirmText={`Remove ${r.name} from the waitlist for ${className} on ${when}?`}
                  >
                    Remove
                  </ConfirmButton>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
