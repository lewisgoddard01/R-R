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

type Slot = { time: string; name: string; who?: string };

const WEEK: { day: string; slots: Slot[] }[] = [
  {
    day: "Monday",
    slots: [
      { time: "09:30", name: "Revive & Reform", who: "Karen" },
      { time: "10:30", name: "Revive & Reform", who: "Karen" },
      { time: "14:00", name: "Revive & Thrive" },
      { time: "16:45", name: "Revive & Thrive", who: "Alix" },
      { time: "17:45", name: "Revive Slow Flow", who: "Alix" },
    ],
  },
  {
    day: "Tuesday",
    slots: [
      { time: "07:00", name: "Rise & Revive", who: "Karen" },
      { time: "13:00", name: "Revive Slow Flow", who: "Adele" },
      { time: "14:00", name: "Revive Foundations", who: "Adele" },
      { time: "18:00", name: "Reform Power", who: "Alix" },
      { time: "19:00", name: "Revive Foundations", who: "Alix" },
    ],
  },
  {
    day: "Wednesday",
    slots: [
      { time: "09:30", name: "Revive Foundations", who: "Laura" },
      { time: "10:30", name: "Reform Power", who: "Laura" },
      { time: "18:00", name: "Revive Slow Flow", who: "Adele" },
      { time: "19:00", name: "Reform Power", who: "Adele" },
    ],
  },
  {
    day: "Thursday",
    slots: [
      { time: "07:00", name: "Rise & Revive", who: "Karen" },
      { time: "08:00", name: "Revive & Reform", who: "Karen" },
      { time: "13:30", name: "Revive Foundations", who: "Alix" },
      { time: "18:00", name: "Revive Foundations", who: "Adele" },
      { time: "19:00", name: "Revive Slow Flow", who: "Adele" },
    ],
  },
  {
    day: "Friday",
    slots: [
      { time: "07:00", name: "Revive & Reform", who: "Alix" },
      { time: "09:00", name: "Rise & Revive", who: "Karen" },
      { time: "10:00", name: "Reform Power", who: "Karen" },
      { time: "11:00", name: "Revive & Thrive", who: "Karen" },
      { time: "16:30", name: "Revive Foundations" },
      { time: "17:30", name: "Revive & Thrive" },
      { time: "18:30", name: "Revive Foundations" },
    ],
  },
  {
    day: "Saturday",
    slots: [
      { time: "09:00", name: "Revive Foundations" },
      { time: "10:00", name: "Revive & Thrive" },
      { time: "11:00", name: "Revive Foundations" },
    ],
  },
  {
    day: "Sunday",
    slots: [
      { time: "11:00", name: "Revive Slow Flow" },
      { time: "12:00", name: "Revive Foundations" },
      { time: "13:00", name: "Revive & Thrive" },
    ],
  },
];

export default async function Timetable() {
  // Admin-authored overviews win; anything not set in the admin falls back to
  // the built-in copy so a slot is never left without an explanation.
  const supabase = await createClient();
  const { data: dbClasses } = await supabase.from("classes").select("name, short_description");
  const adminShort = new Map(
    (dbClasses ?? [])
      .filter((c) => c.short_description)
      .map((c) => [c.name as string, c.short_description as string])
  );
  const overview = (name: string) => adminShort.get(name) ?? classShort(name);

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
          {WEEK.map((d) => (
            <div className="tt-day" data-day={d.day} key={d.day}>
              <h3>{d.day}</h3>
              {d.slots.map((s, i) => (
                <Link className="tt-slot" key={`${s.time}-${i}`} href="/book">
                  <time>{s.time}</time>
                  <b>{s.name}</b>
                  {s.who && <span>with {s.who}</span>}
                  {overview(s.name) && <small className="tt-slot__desc">{overview(s.name)}</small>}
                </Link>
              ))}
            </div>
          ))}
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
