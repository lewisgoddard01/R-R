import type { Metadata } from "next";
import Link from "next/link";
import { Rule } from "@/components/rule";
import { TodayMarker } from "@/components/today-marker";
import { classShort } from "@/lib/class-info";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Timetable — Revive & Reform",
  description: "Weekly Reformer Pilates timetable at Revive & Reform, Ripley, Derbyshire.",
};

type SessionRow = {
  starts_at: string;
  instructor: string | null;
  class_id: string;
  classes: { name: string; short_description: string | null } | null;
};

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function Timetable() {
  const supabase = await createClient();

  // Every upcoming session is grouped by which weekday it falls on — not by
  // a specific calendar week — so anything an admin adds shows up here
  // immediately regardless of how far out its date is, and the same weekly
  // slot recurring for months doesn't repeat itself: within a day, the
  // earliest occurrence of each distinct time+class is kept as the
  // representative one.
  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const { data: upcoming } = await supabase
    .from("class_sessions")
    .select("starts_at, instructor, class_id, classes(name, short_description)")
    .eq("status", "scheduled")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString())
    .order("starts_at", { ascending: true });

  const upcomingRows = (upcoming ?? []) as unknown as SessionRow[];

  const byDay = new Map<string, SessionRow[]>();
  const seenSlots = new Map<string, Set<string>>();
  for (const r of upcomingRows) {
    const day = new Date(r.starts_at).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long" });
    const time = new Date(r.starts_at).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
    const slotKey = `${time}|${r.class_id}`;

    if (!seenSlots.has(day)) seenSlots.set(day, new Set());
    const seen = seenSlots.get(day)!;
    if (seen.has(slotKey)) continue; // already have the earliest occurrence of this slot
    seen.add(slotKey);

    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(r);
  }
  // Slots can be deduped from different dates, so re-sort each day by
  // time-of-day rather than relying on the order they were first seen in.
  for (const slots of byDay.values()) {
    slots.sort((a, b) => new Date(a.starts_at).getHours() * 60 + new Date(a.starts_at).getMinutes()
      - (new Date(b.starts_at).getHours() * 60 + new Date(b.starts_at).getMinutes()));
  }

  // Admin-authored overviews win; anything not set in the admin falls back to
  // the built-in copy so a slot is never left without an explanation.
  const overview = (name: string, short: string | null) => short ?? classShort(name);

  return (
    <section className="sec page-head">
      <div className="wrap">
        <h1 className="display" data-reveal>
          The <em>timetable.</em>
        </h1>
        <p className="lede intro" data-reveal>
          Our typical weekly schedule in Ripley. Tap any class to see real dates and book — you can
          book up to a month ahead.
        </p>
        <Rule />

        <TodayMarker />
        <div className="tt-grid" data-reveal>
          {DAY_ORDER.map((day) => {
            const slots = byDay.get(day) ?? [];
            return (
              <div className="tt-day" data-day={day} key={day}>
                <h3>{day}</h3>
                {slots.length === 0 && <p className="admin-empty">No classes</p>}
                {slots.map((s, i) => {
                  const time = new Date(s.starts_at).toLocaleTimeString("en-GB", { timeZone: "Europe/London",                     hour: "2-digit",
                    minute: "2-digit",
                  });
                  const name = s.classes?.name ?? "";
                  return (
                    <Link className="tt-slot" key={`${s.starts_at}-${i}`} href="/book">
                      <time>{time}</time>
                      <b>{name}</b>
                      {s.instructor && <span>with {s.instructor}</span>}
                      {overview(name, s.classes?.short_description ?? null) && (
                        <small className="tt-slot__desc">
                          {overview(name, s.classes?.short_description ?? null)}
                        </small>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: "clamp(2rem,4vw,3rem)" }} data-reveal>
          <Link href="/contact" className="btn btn--ghost">
            Questions? Contact us <span className="btn__x">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
