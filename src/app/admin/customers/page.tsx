import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasHealthFlags } from "@/lib/health-questionnaire";

export default async function AdminCustomers() {
  const admin = createAdminClient();

  const [{ data: profiles }, { data: usersPage }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, phone, waiver_signed_at, health_completed_at, health")
      .order("full_name", { ascending: true }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailById = new Map(usersPage?.users.map((u) => [u.id, u.email ?? ""]) ?? []);

  const rows = (profiles ?? []).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? "",
    waiverDone: Boolean(p.waiver_signed_at && p.health_completed_at),
    flagged: hasHealthFlags(p.health as never),
  }));

  return (
    <div className="admin-card" style={{ marginTop: "2rem" }}>
      <h3>Customers &amp; health records</h3>
      <p className="admin-empty">
        Health &amp; waiver (PAR-Q) answers customers have submitted. A red flag means they&apos;ve
        noted a heart condition, chest pain, dizziness, pregnancy, or a health condition — open
        their record before they get on the reformer.
      </p>
      {rows.length === 0 ? (
        <p className="admin-empty">No customers yet.</p>
      ) : (
        <div className="admin-table">
          {rows.map((r) => (
            <Link className="admin-row admin-row--link" href={`/admin/customers/${r.id}`} key={r.id}>
              <span>{r.full_name || "(no name on file)"}</span>
              <span style={{ color: "var(--muted)" }}>
                {r.email}
                {r.phone && <div style={{ fontSize: ".82rem" }}>{r.phone}</div>}
              </span>
              <span className={r.waiverDone ? "admin-badge admin-badge--on" : "admin-badge"}>
                {r.waiverDone ? "Waiver complete" : "Not completed"}
              </span>
              <span style={{ color: r.flagged ? "var(--orange)" : "var(--muted)" }}>
                {r.flagged ? "⚠ Health notes" : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
