import { createClient } from "@/lib/supabase/server";
import {
  addTimetableSessionAction,
  updateSessionAction,
  cancelSessionAction,
} from "@/app/admin/actions";
import { ConfirmButton } from "@/components/confirm-button";

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
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorMsg } = await searchParams;
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
    if (error) {
      const { redirect } = await import("next/navigation");
      redirect(`/admin/timetable?error=${encodeURIComponent(error)}`);
    }
  }

  async function editSession(sessionId: string, classId: string, formData: FormData) {
    "use server";
    await updateSessionAction(sessionId, classId, formData);
  }
  async function cancelSession(sessionId: string, classId: string) {
    "use server";
    await cancelSessionAction(sessionId, classId);
  }

  return (
    <>
      <div className="admin-card" style={{ marginTop: "2rem" }}>
        <h3>Add to the timetable</h3>
        <p className="admin-empty">
          Pick a class, then the date, time and who&apos;s teaching it. Tick a repeat if it runs
          every week — it&apos;ll add all the future dates in one go.
        </p>
        {errorMsg && <p style={{ color: "var(--orange)", marginBottom: "1rem" }}>{errorMsg}</p>}
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
                Repeat weekly, for
                <select name="repeat_weeks" defaultValue={1}>
                  <option value={1}>Just this once</option>
                  <option value={5}>5 weeks</option>
                  <option value={8}>8 weeks</option>
                  <option value={12}>12 weeks</option>
                </select>
              </label>
            </div>
            <button type="submit" className="btn btn--primary">
              Add to timetable
            </button>
          </form>
        )}
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
                    <form
                      action={editSession.bind(null, s.id, s.class_id)}
                      className="admin-row"
                      key={s.id}
                      style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", alignItems: "center" }}
                    >
                      <div style={{ minWidth: "10rem" }}>
                        <b>{s.classes?.name}</b>
                        {s.classes?.short_description && (
                          <div style={{ fontSize: ".78rem", color: "var(--muted)" }}>
                            {s.classes.short_description}
                          </div>
                        )}
                      </div>
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
