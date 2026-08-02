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
  classes: { name: string; short_description: string | null } | null;
};

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function Timetable() {
  const supabase = await createClient();

  // Anchor the "typical week" window to the busiest upcoming 7-day span
  // (not just whichever session happens to come first) so one stray/test
  // session scheduled ahead of the real recurring schedule can't hijack the
  // whole page and hide everything else — any 7-day span contains each
  // weekday once, so this stays accurate once sessions are actually running.
  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const { data: upcoming } = await supabase
    .from("class_sessions")
    .select("starts_at, instructor, classes(name, short_description)")
    .eq("status", "scheduled")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString())
    .order("starts_at", { ascending: true });

  const upcomingRows = (upcoming ?? []) as unknown as SessionRow[];

  let windowStart = now;
  if (upcomingRows.length > 0) {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    let bestStart = new Date(upcomingRows[0].starts_at);
    let bestCount = 0;
    for (const candidate of upcomingRows) {
      const candidateStart = new Date(candidate.starts_at);
      const candidateEnd = new Date(candidateStart.getTime() + WEEK_MS);
      const count = upcomingRows.filter((r) => {
        const t = new Date(r.starts_at);
        return t >= candidateStart && t < candidateEnd;
      }).length;
      if (count > bestCount) {
        bestCount = count;
        bestStart = candidateStart;
      }
    }
    windowStart = bestStart;
  }
  const windowEnd = new Date(windowStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const rows = upcomingRows.filter((r) => {
    const t = new Date(r.starts_at);
    return t >= windowStart && t < windowEnd;
  });

  const byDay = new Map<string, SessionRow[]>();
  for (const r of rows) {
    const day = new Date(r.starts_at).toLocaleDateString("en-GB", { weekday: "long" });
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(r);
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
                  const time = new Date(s.starts_at).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
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
