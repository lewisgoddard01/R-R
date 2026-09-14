"use client";

import { useState } from "react";

export type BookingSessionView = {
  id: string;
  time: string;
  className: string;
  instructor: string;
  metaText: string;
  metaColor: "orange" | "muted";
  description: string | null;
  cutoffNotice: boolean;
  actionKind: "pay" | "waitlist" | null;
  actionLabel: string | null;
};

export type BookingDayView = {
  key: string; // "YYYY-MM-DD", UK calendar date
  weekday: string; // "Mon"
  dayNumber: number; // 15
  fullLabel: string; // "Tuesday 15 September"
  isToday: boolean;
  sessions: BookingSessionView[];
};

type ServerAction = (sessionId: string, formData: FormData) => Promise<void>;

export function BookingCalendar({
  days,
  book,
  payAndBook,
}: {
  days: BookingDayView[];
  book: ServerAction;
  payAndBook: ServerAction;
}) {
  const firstWithClasses = days.find((d) => d.sessions.length > 0);
  const initial = days.find((d) => d.isToday) ?? firstWithClasses ?? days[0];
  const [selectedKey, setSelectedKey] = useState<string | undefined>(initial?.key);

  const selected = days.find((d) => d.key === selectedKey);

  // Pad into Monday-start weeks so the grid lines up like a real calendar.
  const weeks: (BookingDayView | null)[][] = [];
  if (days.length > 0) {
    const firstWeekdayIndex = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(days[0].weekday);
    const cells: (BookingDayView | null)[] = [...Array(firstWeekdayIndex).fill(null), ...days];
    while (cells.length % 7 !== 0) cells.push(null);
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div data-reveal>
      <div className="bcal">
        <div className="bcal__weekdays">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="bcal__grid">
          {weeks.flat().map((d, i) =>
            d ? (
              <button
                key={d.key}
                type="button"
                className={[
                  "bcal__day",
                  d.key === selectedKey ? "bcal__day--selected" : "",
                  d.isToday ? "bcal__day--today" : "",
                  d.sessions.length > 0 ? "bcal__day--has" : "bcal__day--empty",
                ].join(" ")}
                onClick={() => setSelectedKey(d.key)}
              >
                <span className="bcal__num">{d.dayNumber}</span>
                {d.sessions.length > 0 && <span className="bcal__dot" />}
              </button>
            ) : (
              <span key={`blank-${i}`} className="bcal__day bcal__day--blank" />
            )
          )}
        </div>
      </div>

      {selected && (
        <div style={{ marginTop: "2rem" }}>
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: "1.3rem",
              color: "var(--orange)",
              marginBottom: ".8rem",
            }}
          >
            {selected.fullLabel}
          </h3>

          {selected.sessions.length === 0 ? (
            <p className="admin-empty">Nothing booked on the timetable for this day.</p>
          ) : (
            <div className="clist">
              {selected.sessions.map((s) => (
                <div className="crow" key={s.id}>
                  <span className="crow__name">
                    {s.time} — {s.className}
                  </span>
                  <span className="crow__tag">{s.instructor}</span>
                  <span className="crow__meta">
                    <span style={{ color: `var(--${s.metaColor})` }}>{s.metaText}</span>
                  </span>

                  {s.description && <p className="crow__desc">{s.description}</p>}

                  {s.cutoffNotice && (
                    <p style={{ gridColumn: "1/-1", color: "var(--muted)", fontSize: ".85rem", marginTop: ".4rem" }}>
                      Booking&apos;s closed for this one — 9am classes need to be booked by 8pm the evening before.
                    </p>
                  )}
                  {s.actionKind === "pay" && (
                    <form action={payAndBook.bind(null, s.id)} style={{ gridColumn: "1/-1" }}>
                      <button type="submit" className="btn btn--primary" style={{ marginTop: ".6rem" }}>
                        {s.actionLabel}
                      </button>
                    </form>
                  )}
                  {s.actionKind === "waitlist" && (
                    <form action={book.bind(null, s.id)} style={{ gridColumn: "1/-1" }}>
                      <button type="submit" className="btn btn--ghost" style={{ marginTop: ".6rem" }}>
                        {s.actionLabel}
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
