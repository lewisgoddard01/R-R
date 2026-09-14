import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Rule } from "@/components/rule";
import { bookSessionAction, createCheckoutAction } from "./actions";
import { bookingsAreOpen, BOOKINGS_OPEN_AT_LABEL, bookingHorizon } from "@/lib/booking-window";
import { ukParts, ukWallTimeToUTC } from "@/lib/uk-time";
import { BookingCalendar, type BookingDayView, type BookingSessionView } from "@/components/booking-calendar";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export const metadata: Metadata = {
  title: "Book a class — Revive & Reform",
  description: "Book your Reformer Pilates class at Revive & Reform, Ripley — up to a month ahead.",
};

type SessionRow = {
  id: string;
  starts_at: string;
  capacity: number;
  instructor: string | null;
  classes: { id: string; name: string; price_pence: number; description: string | null } | null;
};

// A brief, one-line hook for the booking list — just the first sentence of
// the full class description shown elsewhere (e.g. /classes, /admin/classes).
function briefDescription(description: string | null | undefined) {
  if (!description) return null;
  const match = description.match(/^.+?[.!?](?=\s|$)/);
  return match ? match[0] : description;
}

export default async function Book({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; joined?: string; cancelled?: string; class?: string }>;
}) {
  const { error: errorMsg, joined, cancelled, class: classFilter } = await searchParams;

  if (!bookingsAreOpen()) {
    return (
      <section className="sec page-head">
        <div className="wrap">
          <h1 className="display" data-reveal>
            Book a <em>class.</em>
          </h1>
          <Rule />
          <div className="note-card" data-reveal>
            <h3>Bookings open {BOOKINGS_OPEN_AT_LABEL}</h3>
            <p>
              We&apos;re not quite ready to take bookings yet — check back on {BOOKINGS_OPEN_AT_LABEL}.
              In the meantime, have a look at our{" "}
              <Link href="/timetable" style={{ color: "var(--orange)" }}>
                timetable
              </Link>{" "}
              or{" "}
              <Link href="/contact" style={{ color: "var(--orange)" }}>
                get in touch
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let waiverDone = false;
  let hasCredit = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, waiver_signed_at, health_completed_at")
      .eq("id", user.id)
      .maybeSingle();
    waiverDone = Boolean(profile?.waiver_signed_at && profile?.health_completed_at && profile?.phone);

    // Booking already spends a credit automatically before charging a card
    // (see settlePaymentAndRedirect) — this just changes the button label so
    // customers with a credit don't think they're about to be charged again.
    const { count } = await supabase
      .from("class_packs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("classes_remaining", 0)
      .gt("expires_at", new Date().toISOString());
    hasCredit = Boolean(count && count > 0);
  }

  const now = new Date();
  const horizon = bookingHorizon(now); // customers can book up to a month ahead

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("id, starts_at, capacity, instructor, classes(id, name, price_pence, description)")
    .eq("status", "scheduled")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString())
    .order("starts_at", { ascending: true });

  const allRows = (sessions ?? []) as unknown as SessionRow[];
  const rows = classFilter ? allRows.filter((r) => r.classes?.name === classFilter) : allRows;
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

  // Every calendar day from today through the booking horizon (inclusive),
  // in UK dates — not just days that already have a session — so the
  // calendar shows a real month rather than only the days with classes on.
  const todayUK = ukParts(now);
  const horizonUK = ukParts(horizon);
  const todayKey = dateKey(todayUK.year, todayUK.month, todayUK.day);

  const sessionsByDayKey = new Map<string, SessionRow[]>();
  rows.forEach((r) => {
    const p = ukParts(new Date(r.starts_at));
    const key = dateKey(p.year, p.month, p.day);
    if (!sessionsByDayKey.has(key)) sessionsByDayKey.set(key, []);
    sessionsByDayKey.get(key)!.push(r);
  });

  const days: BookingDayView[] = [];
  const cursor = new Date(Date.UTC(todayUK.year, todayUK.month - 1, todayUK.day, 12));
  const horizonCursor = new Date(Date.UTC(horizonUK.year, horizonUK.month - 1, horizonUK.day, 12));
  while (cursor <= horizonCursor) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth() + 1;
    const d = cursor.getUTCDate();
    const key = dateKey(y, m, d);
    const daySessions = (sessionsByDayKey.get(key) ?? []).map((s): BookingSessionView => {
      const spacesLeft = spacesById.get(s.id) ?? s.capacity;
      const mine = myStatusById.get(s.id);
      const time = new Date(s.starts_at).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
      const canAct = Boolean(user && waiverDone && !mine);

      const startUK = ukParts(new Date(s.starts_at));
      let pastCutoff = false;
      if (startUK.hour === 9 && startUK.minute === 0) {
        const dayBefore = new Date(Date.UTC(startUK.year, startUK.month - 1, startUK.day - 1));
        const cutoffDate = dateKey(dayBefore.getUTCFullYear(), dayBefore.getUTCMonth() + 1, dayBefore.getUTCDate());
        const cutoff = ukWallTimeToUTC(cutoffDate, "20:00");
        pastCutoff = now > cutoff;
      }

      let metaText: string;
      let metaColor: "orange" | "muted";
      if (mine === "booked") {
        metaText = "You're booked ✓";
        metaColor = "orange";
      } else if (mine === "waitlisted") {
        metaText = "On the waitlist";
        metaColor = "muted";
      } else if (spacesLeft > 0) {
        metaText = `${spacesLeft} space${spacesLeft === 1 ? "" : "s"} left`;
        metaColor = "muted";
      } else {
        metaText = "Full";
        metaColor = "muted";
      }

      let actionKind: "pay" | "waitlist" | null = null;
      let actionLabel: string | null = null;
      if (canAct && !pastCutoff) {
        if (spacesLeft > 0) {
          actionKind = "pay";
          actionLabel = hasCredit ? "Book — use 1 credit" : `Book — £${((s.classes?.price_pence ?? 0) / 100).toFixed(2)}`;
        } else {
          actionKind = "waitlist";
          actionLabel = "Join the waitlist";
        }
      }

      return {
        id: s.id,
        time,
        className: s.classes?.name ?? "Class",
        instructor: s.instructor || "",
        metaText,
        metaColor,
        description: briefDescription(s.classes?.description),
        cutoffNotice: canAct && pastCutoff,
        actionKind,
        actionLabel,
      };
    });
    daySessions.sort((a, b) => a.time.localeCompare(b.time));

    days.push({
      key,
      weekday: WEEKDAY_NAMES[cursor.getUTCDay()],
      dayNumber: d,
      fullLabel: cursor.toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }),
      isToday: key === todayKey,
      sessions: daySessions,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return (
    <section className="sec page-head">
      <div className="wrap">
        <h1 className="display" data-reveal>
          Book a <em>class.</em>
        </h1>
        <p className="lede intro" data-reveal>
          Everything on the timetable for the next month. Full classes offer a waitlist — if
          someone drops out, everyone waiting is emailed automatically so you can claim the spot.
        </p>
        <Rule />

        {classFilter && (
          <div className="note-card" data-reveal style={{ marginBottom: "2rem" }}>
            <p>
              Showing only <strong>{classFilter}</strong> —{" "}
              <Link href="/book" style={{ color: "var(--orange)" }}>
                show every class
              </Link>
              .
            </p>
          </div>
        )}

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

        {days.every((d) => d.sessions.length === 0) ? (
          <p className="admin-empty" data-reveal>
            Nothing&apos;s scheduled yet — check back soon, or{" "}
            <Link href="/contact" style={{ color: "var(--orange)" }}>
              get in touch
            </Link>
            .
          </p>
        ) : (
          <BookingCalendar days={days} book={book} payAndBook={payAndBook} />
        )}
      </div>
    </section>
  );
}
