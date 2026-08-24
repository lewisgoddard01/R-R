import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cancelBookingAction } from "@/app/book/actions";

export default async function MyBookings({
  searchParams,
}: {
  searchParams: Promise<{ refunded?: string; norefund?: string }>;
}) {
  const { refunded, norefund } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/bookings");

  async function cancel(bookingId: string, sessionId: string) {
    "use server";
    const result = await cancelBookingAction(bookingId, sessionId);
    if (result.refunded) redirect("/account/bookings?refunded=1");
    if (result.noRefund) redirect("/account/bookings?norefund=1");
    redirect("/account/bookings");
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, payment_status, session_id, class_sessions(starts_at, instructor, classes(name))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    status: string;
    payment_status: string;
    session_id: string;
    class_sessions: { starts_at: string; instructor: string | null; classes: { name: string } | null } | null;
  };
  const now = +new Date();
  const rows = ((bookings ?? []) as unknown as Row[]).filter((b) => b.class_sessions);
  const upcoming = rows
    .filter((b) => +new Date(b.class_sessions!.starts_at) > now && ["booked", "waitlisted"].includes(b.status))
    .sort((a, b) => +new Date(a.class_sessions!.starts_at) - +new Date(b.class_sessions!.starts_at));
  // History — anything for a class that's already happened, so a customer
  // can see what they've actually been to (or missed/cancelled).
  const past = rows
    .filter((b) => +new Date(b.class_sessions!.starts_at) <= now)
    .sort((a, b) => +new Date(b.class_sessions!.starts_at) - +new Date(a.class_sessions!.starts_at));

  return (
    <section className="sec page-head">
      <div className="wrap" style={{ maxWidth: "760px" }}>
        <h1 className="display">
          My <em>bookings.</em>
        </h1>
        <p className="lede intro">Everything you&apos;ve booked or joined the waitlist for.</p>
        <p className="lede intro" style={{ fontSize: "0.95rem" }}>
          Cancellation policy: all cancellations within a 24-hour period are non-refundable.
          Cancellations before this time will be fully refunded.
        </p>

        {refunded === "1" && (
          <div className="note-card" style={{ marginBottom: "1.5rem" }}>
            <p>Booking cancelled — you&apos;ve been refunded in full.</p>
          </div>
        )}
        {norefund === "1" && (
          <div className="note-card" style={{ marginBottom: "1.5rem" }}>
            <p>Booking cancelled — as this was within 24 hours of the class, it wasn&apos;t refunded.</p>
          </div>
        )}

        <div className="clist" style={{ marginTop: "2rem" }}>
          {upcoming.length === 0 ? (
            <p className="admin-empty">No classes booked yet — pick a time and we&apos;ll save you a spot.</p>
          ) : (
            upcoming.map((b) => {
              const s = b.class_sessions!;
              const when = new Date(s.starts_at).toLocaleString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              });
              const withinRefundWindow = +new Date(s.starts_at) - now >= 24 * 60 * 60 * 1000;
              const cancelLabel =
                b.status === "booked" && b.payment_status === "paid" && !withinRefundWindow
                  ? "Cancel (no refund — within 24h)"
                  : "Cancel";
              return (
                <div className="crow" key={b.id}>
                  <span className="crow__name">{s.classes?.name}</span>
                  <span className="crow__tag">{when}</span>
                  <span className="crow__meta">
                    {b.status === "booked" && b.payment_status === "paid" && (
                      <span style={{ color: "var(--orange)" }}>Booked ✓</span>
                    )}
                    {b.status === "booked" && b.payment_status !== "paid" && (
                      <span style={{ color: "var(--muted)" }}>Payment pending</span>
                    )}
                    {b.status === "waitlisted" && <span style={{ color: "var(--muted)" }}>Waitlisted</span>}
                  </span>
                  <form action={cancel.bind(null, b.id, b.session_id)} style={{ gridColumn: "1/-1" }}>
                    <button type="submit" className="admin-link-btn" style={{ marginTop: ".4rem" }}>
                      {cancelLabel}
                    </button>
                  </form>
                </div>
              );
            })
          )}
        </div>

        {past.length > 0 && (
          <>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.5rem", marginTop: "2.5rem", marginBottom: "1rem" }}>
              Past classes
            </h2>
            <div className="clist">
              {past.map((b) => {
                const s = b.class_sessions!;
                const when = new Date(s.starts_at).toLocaleString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const label =
                  b.status === "cancelled"
                    ? "Cancelled"
                    : b.status === "attended"
                      ? "Attended"
                      : b.status === "waitlisted"
                        ? "Waitlisted (unclaimed)"
                        : "Booked";
                return (
                  <div className="crow" key={b.id}>
                    <span className="crow__name">{s.classes?.name}</span>
                    <span className="crow__tag">{when}</span>
                    <span className="crow__meta" style={{ color: "var(--muted)" }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p style={{ marginTop: "2rem" }}>
          <Link href="/book" className="btn btn--primary">
            Book another class <span className="btn__x">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
