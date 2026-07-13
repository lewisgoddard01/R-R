import { createClient } from "@/lib/supabase/server";

export default async function AdminRevenue() {
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: rows } = await supabase
    .from("bookings")
    .select("status, class_sessions(starts_at, classes(name, price_pence))")
    .in("status", ["booked", "attended"])
    .eq("payment_status", "paid")
    .gte("class_sessions.starts_at", startOfMonth.toISOString());

  type Row = { class_sessions: { starts_at: string; classes: { name: string; price_pence: number } } | null };
  const valid = ((rows ?? []) as unknown as Row[]).filter((r) => r.class_sessions?.classes);

  const totalPence = valid.reduce((sum, r) => sum + (r.class_sessions?.classes.price_pence ?? 0), 0);
  const byClass = new Map<string, { count: number; pence: number }>();
  valid.forEach((r) => {
    const c = r.class_sessions!.classes;
    const cur = byClass.get(c.name) ?? { count: 0, pence: 0 };
    cur.count += 1;
    cur.pence += c.price_pence;
    byClass.set(c.name, cur);
  });

  return (
    <>
      <div className="admin-card" style={{ marginTop: "2rem" }}>
        <h3>This month</h3>
        <p className="admin-empty" style={{ marginBottom: "1.2rem" }}>
          Paid bookings this month, at each class&apos;s listed price. Classes booked using a 5-class
          bundle are counted here too, even though that revenue was collected when the bundle was
          purchased — so the true cash figure may differ slightly from this total.
        </p>
        <p style={{ fontFamily: "var(--serif)", fontSize: "2.6rem", color: "var(--orange)" }}>
          £{(totalPence / 100).toFixed(2)}
        </p>
        <p style={{ color: "var(--muted)" }}>{valid.length} booked spot{valid.length === 1 ? "" : "s"} this month</p>
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>By class</h3>
        {byClass.size === 0 ? (
          <p className="admin-empty">No bookings yet this month.</p>
        ) : (
          <div className="admin-table">
            {Array.from(byClass.entries()).map(([name, v]) => (
              <div className="admin-row" key={name}>
                <span>{name}</span>
                <span>{v.count} spot{v.count === 1 ? "" : "s"}</span>
                <span>£{(v.pence / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
