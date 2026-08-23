import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addTimetableSessionAction,
  updateSessionAction,
  cancelSessionAction,
  bulkCancelWeekdayAction,
  addFreeBookingAction,
} from "@/app/admin/actions";
import { ConfirmButton } from "@/components/confirm-button";

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function dateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type SessionRow = {
  id: string;
  starts_at: string;
  capacity: number;
  instructor: string | null;
  class_id: string;
  bookings: { status: string }[];
  classes: { name: string; short_description: string | null } | null;
};

export default async function AdminTimetable({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; removed?: string; saved?: string }>;
}) {
  const { error: errorMsg, removed, saved } = await searchParams;
  const supabase = await createClient();

  const [{ data: classes }, { data: sessions }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, short_description, default_capacity")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("class_sessions")
      .select("id, starts_at, capacity, instructor, class_id, bookings(status), classes(name, short_description)")
      .eq("status", "scheduled")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(300),
  ]);

  const rows = (sessions ?? []) as unknown as SessionRow[];

  const byDate = new Map<string, SessionRow[]>();
  for (const r of rows) {
    const key = new Date(r.starts_at).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(r);
  }

  async function addSession(formData: FormData) {
    "use server";
    const { error } = await addTimetableSessionAction(formData);
    if (error) redirect(`/admin/timetable?error=${encodeURIComponent(error)}`);
    redirect("/admin/timetable?saved=Added%20to%20the%20timetable.");
  }

  async function editSession(sessionId: string, classId: string, formData: FormData) {
    "use server";
    const { error } = await updateSessionAction(sessionId, classId, formData);
    if (error) redirect(`/admin/timetable?error=${encodeURIComponent(error)}`);
    redirect("/admin/timetable?saved=Changes%20saved.");
  }
  async function cancelSession(sessionId: string, classId: string) {
    "use server";
    const { error } = await cancelSessionAction(sessionId, classId);
    if (error) redirect(`/admin/timetable?error=${encodeURIComponent(error)}`);
    redirect("/admin/timetable?saved=Class%20cancelled.");
  }
  async function addFree(sessionId: string, classId: string, formData: FormData) {
    "use server";
    const { error } = await addFreeBookingAction(sessionId, classId, formData);
    if (error) redirect(`/admin/timetable?error=${encodeURIComponent(error)}`);
    redirect("/admin/timetable?saved=Added%20them%20for%20free.");
  }
  async function removeWeekday(formData: FormData) {
    "use server";
    const result = await bulkCancelWeekdayAction(formData);
    if (result.error) redirect(`/admin/timetable?error=${encodeURIComponent(result.error)}`);
    redirect(`/admin/timetable?removed=${result.cancelledCount ?? 0}`);
  }

  return (
    <>
      <div className="admin-card" style={{ marginTop: "2rem" }}>
        <h3>Add to the timetable</h3>
        <p className="admin-empty">
          Pick a class, then the date, time and who&apos;s teaching it. Tick a repeat if it runs
          every week — it&apos;ll add all the future dates in one go.
        </p>
        {errorMsg && (
          <p style={{ color: "var(--orange)", marginBottom: "1rem" }}>Couldn&apos;t save: {errorMsg}</p>
        )}
        {saved && !errorMsg && <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>✓ {saved}</p>}
        {(!classes || classes.length === 0) && (
          <p className="admin-empty">
            No classes to schedule yet — add a class type first under Classes &amp; sessions.
          </p>
        )}
        {classes && classes.length > 0 && (
          <form action={addSession} className="admin-form">
            <div className="admin-form__grid">
              <label>
                Class
                <select name="class_id" required>
                  {classes.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input name="date" type="date" required />
              </label>
              <label>
                Time
                <input name="time" type="time" required />
              </label>
              <label>
                Capacity
                <input name="capacity" type="number" defaultValue={8} min={1} max={40} />
              </label>
              <label>
                Instructor
                <input name="instructor" placeholder="e.g. Alix" required />
              </label>
              <label>
                Repeat weekly, for how many weeks?
                <input name="repeat_weeks" type="number" defaultValue={1} min={1} max={52} required />
                <small style={{ color: "var(--muted)" }}>1 = just this once. Any number up to 52 works.</small>
              </label>
            </div>
            <button type="submit" className="btn btn--primary">
              Add to timetable
            </button>
          </form>
        )}
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>Remove a whole day</h3>
        <p className="admin-empty">
          Takes every upcoming class off that weekday in one go — e.g. to stop running Sunday
          classes. Booked customers are automatically emailed and refunded, same as cancelling one
          class.
        </p>
        {removed !== undefined && !errorMsg && (
          <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
            {removed === "0" ? "Nothing was scheduled on that day." : `Removed ${removed} class(es).`}
          </p>
        )}
        <form action={removeWeekday} style={{ display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
          <select name="weekday" required>
            {WEEKDAY_NAMES.map((d) => (
              <option value={d} key={d}>
                {d}
              </option>
            ))}
          </select>
          <ConfirmButton
            className="btn btn--ghost"
            confirmText="Remove every upcoming class on this day? Booked customers will be emailed and refunded automatically. This can't be undone."
          >
            Remove all classes on this day
          </ConfirmButton>
        </form>
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>Upcoming timetable</h3>
        {byDate.size === 0 ? (
          <p className="admin-empty">Nothing scheduled yet — add a session above.</p>
        ) : (
          Array.from(byDate.entries()).map(([date, daySessions]) => (
            <div key={date} style={{ marginBottom: "1.6rem" }}>
              <h4 style={{ color: "var(--orange)", marginBottom: ".6rem" }}>{date}</h4>
              <div className="admin-table">
                {daySessions.map((s) => {
                  const startsAt = new Date(s.starts_at);
                  const booked = s.bookings.filter((b) => b.status === "booked").length;
                  const waitlisted = s.bookings.filter((b) => b.status === "waitlisted").length;
                  return (
                    <div className="admin-row" key={s.id} style={{ display: "block" }}>
                      <form
                        action={editSession.bind(null, s.id, s.class_id)}
                        style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", alignItems: "center" }}
                      >
                        <select name="class_id" defaultValue={s.class_id} style={{ minWidth: "10rem" }}>
                          {classes?.map((c) => (
                            <option value={c.id} key={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <input name="date" type="date" defaultValue={dateInputValue(startsAt)} required />
                        <input name="time" type="time" defaultValue={timeInputValue(startsAt)} required />
                        <input
                          name="capacity"
                          type="number"
                          defaultValue={s.capacity}
                          min={1}
                          max={40}
                          style={{ width: "4.5rem" }}
                        />
                        <input name="instructor" defaultValue={s.instructor ?? ""} placeholder="Instructor" />
                        <span style={{ fontSize: ".85rem", color: "var(--muted)" }}>
                          {booked}/{s.capacity} booked{waitlisted > 0 ? ` · ${waitlisted} waiting` : ""}
                        </span>
                        <Link href={`/admin/roster/${s.id}`} className="admin-link-btn">
                          View list
                        </Link>
                        <button type="submit" className="btn btn--ghost">
                          Save
                        </button>
                        <ConfirmButton
                          className="admin-link-btn"
                          confirmText="Cancel this session? Booked customers will need to be told separately."
                          formAction={cancelSession.bind(null, s.id, s.class_id)}
                        >
                          Cancel
                        </ConfirmButton>
                      </form>
                      <form
                        action={addFree.bind(null, s.id, s.class_id)}
                        style={{ display: "flex", gap: ".5rem", alignItems: "center", width: "100%", marginTop: ".4rem" }}
                      >
                        <input
                          name="email"
                          type="email"
                          placeholder="Customer's email — add them for free"
                          style={{ flex: "1 1 16rem" }}
                          required
                        />
                        <button type="submit" className="btn btn--ghost" style={{ fontSize: ".82rem" }}>
                          Add for free
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
