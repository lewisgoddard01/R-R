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

  // Anchor the "typical week" window to the next upcoming session rather
  // than strictly today, so the schedule still previews correctly before the
  // studio's first live date — any 7-day span contains each weekday once, so
  // it stays accurate once sessions are actually running too.
  const now = new Date();
  const { data: nextSession } = await supabase
    .from("class_sessions")
    .select("starts_at")
    .eq("status", "scheduled")
    .gte("starts_at", now.toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const windowStart = nextSession ? new Date(nextSession.starts_at) : now;
  const windowEnd = new Date(windowStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("starts_at, instructor, classes(name, short_description)")
    .eq("status", "scheduled")
    .gte("starts_at", windowStart.toISOString())
    .lte("starts_at", windowEnd.toISOString())
    .order("starts_at", { ascending: true });

  const rows = (sessions ?? []) as unknown as SessionRow[];

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
