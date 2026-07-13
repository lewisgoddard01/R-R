import type { Metadata } from "next";
import Link from "next/link";
import { Rule } from "@/components/rule";
import { TodayMarker } from "@/components/today-marker";

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
      { time: "16:30", name: "Revive Foundations", who: "Melissa" },
      { time: "17:30", name: "Revive & Thrive", who: "Melissa" },
      { time: "18:30", name: "Revive Foundations", who: "Melissa" },
    ],
  },
  {
    day: "Saturday",
    slots: [
      { time: "09:00", name: "Revive Foundations", who: "Melissa" },
      { time: "10:00", name: "Revive & Thrive", who: "Melissa" },
      { time: "11:00", name: "Revive Foundations", who: "Melissa" },
    ],
  },
  {
    day: "Sunday",
    slots: [
      { time: "11:00", name: "Revive Slow Flow", who: "Melissa" },
      { time: "12:00", name: "Revive Foundations", who: "Melissa" },
      { time: "13:00", name: "Revive & Thrive", who: "Melissa" },
    ],
  },
];

export default function Timetable() {
  return (
    <section className="sec page-head">
      <div className="wrap">
        <h1 className="display" data-reveal>
          The <em>timetable.</em>
        </h1>
        <p className="lede intro" data-reveal>
          Our typical weekly schedule in Ripley. Tap any class to see real dates and book — you can
          book up to three weeks ahead.
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
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="prose" data-reveal style={{ marginTop: "2rem" }}>
          <p style={{ fontSize: "0.95rem", color: "var(--muted)" }}>
            Please double-check this timetable — your original table came through a little scrambled,
            so I&apos;ve reconstructed it and tidied a few spellings. Send me any corrections and
            I&apos;ll update it instantly.
          </p>
        </div>

        <p style={{ marginTop: "1.6rem" }} data-reveal>
          <Link href="/contact" className="btn btn--ghost">
            Questions? Contact us <span className="btn__x">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
