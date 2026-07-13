import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Rule } from "@/components/rule";
import { bookSessionAction, createCheckoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Book a class — Revive & Reform",
  description: "Book your Reformer Pilates class at Revive & Reform, Ripley — up to 3 weeks ahead.",
};

type SessionRow = {
  id: string;
  starts_at: string;
  capacity: number;
  instructor: string | null;
  classes: { id: string; name: string; price_pence: number } | null;
};

export default async function Book({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; joined?: string; cancelled?: string }>;
}) {
  const { error: errorMsg, joined, cancelled } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let waiverDone = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("waiver_signed_at, health_completed_at")
      .eq("id", user.id)
      .maybeSingle();
    waiverDone = Boolean(profile?.waiver_signed_at && profile?.health_completed_at);
  }

  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 21); // customers can book up to 3 weeks ahead

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("id, starts_at, capacity, instructor, classes(id, name, price_pence)")
    .eq("status", "scheduled")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString())
    .order("starts_at", { ascending: true });

  const rows = (sessions ?? []) as unknown as SessionRow[];
  const ids = rows.map((r) => r.id);

  const [{ data: availability }, { data: myBookings }] = await Promise.all([
    ids.length ? supabase.rpc("session_availability", { p_session_ids: ids }) : Promise.resolve({ data: [] }),
    user && ids.length
      ? supabase
          .from("bookings")
          .select("session_id, status")
          .eq("user_id", user.id)
          .in("session_id", ids)
          .in("status", ["booked", "waitlisted"])
      : Promise.resolve({ data: [] }),
  ]);

  type Availability = { session_id: string; capacity: number; booked_count: number; spaces_left: number };
  const spacesById = new Map<string, number>(
    ((availability ?? []) as Availability[]).map((a) => [a.session_id, a.spaces_left])
  );
  const myStatusById = new Map<string, string>((myBookings ?? []).map((b) => [b.session_id, b.status]));

  async function book(sessionId: string) {
    "use server";
    await bookSessionAction(sessionId);
  }

  async function payAndBook(sessionId: string) {
    "use server";
    await createCheckoutAction(sessionId);
  }

  const byDay = new Map<string, SessionRow[]>();
  rows.forEach((r) => {
    const key = new Date(r.starts_at).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(r);
  });

  return (
    <section className="sec page-head">
      <div className="wrap">
        <h1 className="display" data-reveal>
          Book a <em>class.</em>
        </h1>
        <p className="lede intro" data-reveal>
          Everything on the timetable for the next three weeks. Full classes offer a waitlist — if
          someone drops out, we&apos;ll email the next person automatically.
        </p>
        <Rule />

        {errorMsg && (
          <div className="note-card" data-reveal style={{ marginBottom: "2rem" }}>
            <p>{errorMsg}</p>
          </div>
        )}
        {joined === "waitlist" && (
          <div className="note-card" data-reveal style={{ marginBottom: "2rem" }}>
            <p>You&apos;re on the waitlist — we&apos;ll email you the moment a spot opens up.</p>
          </div>
        )}
        {cancelled === "1" && (
          <div className="note-card" data-reveal style={{ marginBottom: "2rem" }}>
            <p>Checkout was cancelled — your spot wasn&apos;t booked. Feel free to try again.</p>
          </div>
        )}

        {!user && (
          <div className="note-card" data-reveal style={{ marginBottom: "2rem" }}>
            <h3>Log in to book</h3>
            <p>
              You&apos;ll need an account so we can hold your spot, email your confirmation, and keep
              your health form on file.
            </p>
            <p style={{ marginTop: "1rem" }}>
              <Link href="/login?next=/book" className="btn btn--primary">
                Log in or create an account <span className="btn__x">→</span>
              </Link>
            </p>
          </div>
        )}
        {user && !waiverDone && (
          <div className="note-card" data-reveal style={{ marginBottom: "2rem" }}>
            <h3>One quick step first</h3>
            <p>Complete our health form and waiver — just once — before you book your first class.</p>
            <p style={{ marginTop: "1rem" }}>
              <Link href="/account/waiver" className="btn btn--primary">
                Complete health &amp; waiver <span className="btn__x">→</span>
              </Link>
            </p>
          </div>
        )}

        {byDay.size === 0 ? (
          <p className="admin-empty" data-reveal>
            Nothing&apos;s scheduled yet — check back soon, or{" "}
            <Link href="/contact" style={{ color: "var(--orange)" }}>
              get in touch
            </Link>
            .
          </p>
        ) : (
          Array.from(byDay.entries()).map(([day, daySessions]) => (
            <div key={day} data-reveal style={{ marginBottom: "2.2rem" }}>
              <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.3rem", color: "var(--orange)", marginBottom: ".8rem" }}>
                {day}
              </h3>
              <div className="clist">
                {daySessions.map((s) => {
                  const spacesLeft = spacesById.get(s.id) ?? s.capacity;
                  const mine = myStatusById.get(s.id);
                  const time = new Date(s.starts_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                  const canAct = user && waiverDone && !mine;

                  return (
                    <div className="crow" key={s.id}>
                      <span className="crow__name">
                        {time} — {s.classes?.name}
                      </span>
                      <span className="crow__tag">{s.instructor || ""}</span>
                      <span className="crow__meta">
                        {mine === "booked" && <span style={{ color: "var(--orange)" }}>You&apos;re booked ✓</span>}
                        {mine === "waitlisted" && <span style={{ color: "var(--muted)" }}>On the waitlist</span>}
                        {!mine && spacesLeft > 0 && `${spacesLeft} space${spacesLeft === 1 ? "" : "s"} left`}
                        {!mine && spacesLeft <= 0 && "Full"}
                      </span>

                      {canAct && spacesLeft > 0 && (
                        <form action={payAndBook.bind(null, s.id)} style={{ gridColumn: "1/-1" }}>
                          <button type="submit" className="btn btn--primary" style={{ marginTop: ".6rem" }}>
                            Book — £{((s.classes?.price_pence ?? 0) / 100).toFixed(2)}
                          </button>
                        </form>
                      )}
                      {canAct && spacesLeft <= 0 && (
                        <form action={book.bind(null, s.id)} style={{ gridColumn: "1/-1" }}>
                          <button type="submit" className="btn btn--ghost" style={{ marginTop: ".6rem" }}>
                            Join the waitlist
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
