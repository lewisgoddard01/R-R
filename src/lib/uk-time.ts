// Every class time on this site is meant in UK local time (the studio is in
// Derbyshire), but plain `new Date(...)`/`toLocaleString(...)` without an
// explicit timeZone use whatever timezone the *server* happens to be
// running in — which differs between local dev (BST) and Netlify's
// production runtime (UTC), so the same stored instant displayed
// differently depending on where the code ran. These helpers make "UK
// time" explicit everywhere instead of relying on the runtime's zone.

const UK_TZ = "Europe/London";

function londonOffsetMs(utcGuess: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: UK_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(utcGuess).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - utcGuess.getTime();
}

// Takes "YYYY-MM-DD" and "HH:mm" meant as UK local wall-clock time (as
// typed into an admin date/time input) and returns the correct UTC instant
// — correctly handling BST vs GMT for whichever date is given.
export function ukWallTimeToUTC(dateStr: string, timeStr: string): Date {
  const guess = new Date(`${dateStr}T${timeStr}:00Z`);
  const offset = londonOffsetMs(guess);
  return new Date(guess.getTime() - offset);
}

// UK-local wall-clock parts for a stored UTC instant — used wherever we
// need to reason about "what UK date/time is this", e.g. the 9am cutoff.
export function ukParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: UK_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

// Formatting helpers — always explicit about the UK timezone, so display
// is consistent regardless of which environment renders the page.
export function formatUKTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { timeZone: UK_TZ, hour: "2-digit", minute: "2-digit" });
}

export function formatUKDateTime(
  date: Date,
  opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }
): string {
  return date.toLocaleString("en-GB", { timeZone: UK_TZ, ...opts });
}

export function formatUKDate(
  date: Date,
  opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }
): string {
  return date.toLocaleDateString("en-GB", { timeZone: UK_TZ, ...opts });
}
