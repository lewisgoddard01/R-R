import { notFound, redirect } from "next/navigation";
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

export default async function AdminClassDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error: errorMsg, saved } = await searchParams;
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
    const { error } = await updateClassAction(id, formData);
    if (error) redirect(`/admin/classes/${id}?error=${encodeURIComponent(error)}`);
    redirect(`/admin/classes/${id}?saved=Changes%20saved.`);
  }
  async function deleteAction() {
    "use server";
    const { error } = await deleteClassAction(id);
    if (error) redirect(`/admin/classes/${id}?error=${encodeURIComponent(error)}`);
  }
  async function addSessionAction(formData: FormData) {
    "use server";
    const { error } = await createSessionAction(id, formData);
    if (error) redirect(`/admin/classes/${id}?error=${encodeURIComponent(error)}`);
    redirect(`/admin/classes/${id}?saved=Added%20to%20the%20timetable.`);
  }
  async function cancelSession(sessionId: string) {
    "use server";
    const { error } = await cancelSessionAction(sessionId, id);
    if (error) redirect(`/admin/classes/${id}?error=${encodeURIComponent(error)}`);
    redirect(`/admin/classes/${id}?saved=Class%20cancelled.`);
  }
  async function editSession(sessionId: string, formData: FormData) {
    "use server";
    const { error } = await updateSessionAction(sessionId, id, formData);
    if (error) redirect(`/admin/classes/${id}?error=${encodeURIComponent(error)}`);
    redirect(`/admin/classes/${id}?saved=Changes%20saved.`);
  }

  return (
    <>
      <div className="admin-card" style={{ marginTop: "2rem" }}>
        <h3>Edit class</h3>
        {errorMsg && (
          <p style={{ color: "var(--orange)", marginBottom: "1rem" }}>Couldn&apos;t save: {errorMsg}</p>
        )}
        {saved && !errorMsg && <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>✓ {saved}</p>}
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
              Repeat weekly, for how many weeks?
              <input name="repeat_weeks" type="number" defaultValue={5} min={1} max={52} required />
              <small style={{ color: "var(--muted)" }}>1 = just this once. Any number up to 52 works.</small>
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
