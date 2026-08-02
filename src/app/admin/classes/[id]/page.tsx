import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  updateClassAction,
  deleteClassAction,
  createSessionAction,
  cancelSessionAction,
  updateSessionAction,
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

export default async function AdminClassDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cls }, { data: sessions }] = await Promise.all([
    supabase.from("classes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("class_sessions")
      .select("id, starts_at, capacity, instructor, status, bookings(status)")
      .eq("class_id", id)
      .eq("status", "scheduled")
      .order("starts_at", { ascending: true }),
  ]);

  if (!cls) notFound();

  async function updateAction(formData: FormData) {
    "use server";
    await updateClassAction(id, formData);
  }
  async function deleteAction() {
    "use server";
    await deleteClassAction(id);
  }
  async function addSessionAction(formData: FormData) {
    "use server";
    await createSessionAction(id, formData);
  }
  async function cancelSession(sessionId: string) {
    "use server";
    await cancelSessionAction(sessionId, id);
  }
  async function editSession(sessionId: string, formData: FormData) {
    "use server";
    await updateSessionAction(sessionId, id, formData);
  }

  return (
    <>
      <div className="admin-card" style={{ marginTop: "2rem" }}>
        <h3>Edit class</h3>
        <form action={updateAction} className="admin-form">
          <div className="admin-form__grid">
            <label>
              Name
              <input name="name" required defaultValue={cls.name} />
            </label>
            <label>
              Category / tag
              <input name="category" defaultValue={cls.category ?? ""} />
            </label>
            <label>
              Duration (min)
              <input name="duration_min" type="number" defaultValue={cls.duration_min} min={10} step={5} />
            </label>
            <label>
              Default capacity
              <input name="default_capacity" type="number" defaultValue={cls.default_capacity} min={1} max={40} />
            </label>
            <label>
              Price (£)
              <input name="price" type="number" defaultValue={cls.price_pence / 100} min={0} step={0.5} />
            </label>
            <label className="admin-check">
              <input name="active" type="checkbox" defaultChecked={cls.active} /> Visible to customers
            </label>
          </div>
          <label>
            Description
            <textarea name="description" rows={3} defaultValue={cls.description ?? ""} />
          </label>
          <label>
            Short overview
            <input
              name="short_description"
              defaultValue={cls.short_description ?? ""}
              placeholder="One line, shown under each slot on the timetable"
            />
          </label>
          <div style={{ display: "flex", gap: ".8rem" }}>
            <button type="submit" className="btn btn--primary">
              Save changes
            </button>
          </div>
        </form>
        <form action={deleteAction} style={{ marginTop: "1rem" }}>
          <ConfirmButton
            className="btn btn--ghost"
            confirmText={`Delete "${cls.name}" and all its sessions? This can't be undone.`}
          >
            Delete class
          </ConfirmButton>
        </form>
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>Add sessions (future dates)</h3>
        <form action={addSessionAction} className="admin-form">
          <div className="admin-form__grid">
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
              <input name="capacity" type="number" defaultValue={cls.default_capacity} min={1} max={40} />
            </label>
            <label>
              Instructor
              <input name="instructor" placeholder="e.g. Alix" />
            </label>
            <label>
              Repeat weekly, for
              <select name="repeat_weeks" defaultValue={5}>
                <option value={1}>Just this once</option>
                <option value={5}>5 weeks (covers the bookable month)</option>
                <option value={8}>8 weeks</option>
                <option value={12}>12 weeks</option>
              </select>
            </label>
          </div>
          <button type="submit" className="btn btn--primary">
            Add to timetable
          </button>
        </form>
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>Upcoming sessions</h3>
        {!sessions || sessions.length === 0 ? (
          <p className="admin-empty">No upcoming sessions for this class yet.</p>
        ) : (
          <div className="admin-table">
            {sessions.map((s) => {
              const booked = (s.bookings as { status: string }[]).filter((b) => b.status === "booked").length;
              const waitlisted = (s.bookings as { status: string }[]).filter((b) => b.status === "waitlisted").length;
              const startsAt = new Date(s.starts_at);
              return (
                <form
                  action={editSession.bind(null, s.id)}
                  className="admin-row admin-row--edit"
                  key={s.id}
                  style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", alignItems: "center" }}
                >
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
                    formAction={cancelSession.bind(null, s.id)}
                  >
                    Cancel
                  </ConfirmButton>
                </form>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
