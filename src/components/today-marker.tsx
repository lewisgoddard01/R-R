"use client";

import { useEffect } from "react";

/** Highlights today's column in the timetable using the visitor's local day.
 *  Pure progressive enhancement — if JS is off, the grid simply shows no "today". */
export function TodayMarker() {
  useEffect(() => {
    const today = new Date().toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long" });
    document.querySelectorAll<HTMLElement>("[data-day]").forEach((el) => {
      el.classList.toggle("tt-day--today", el.dataset.day === today);
    });
  }, []);
  return null;
}
