import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClassAction } from "@/app/admin/actions";

export default async function AdminClasses() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, category, price_pence, default_capacity, active")
    .order("name", { ascending: true });

  async function addClass(formData: FormData) {
    "use server";
    await createClassAction(formData);
  }

  return (
    <>
      <div className="admin-card" style={{ marginTop: "2rem" }}>
        <h3>Add a class</h3>
        <form action={addClass} className="admin-form">
          <div className="admin-form__grid">
            <label>
              Name
              <input name="name" required placeholder="e.g. Reform Power" />
            </label>
            <label>
              Category / tag
              <input name="category" placeholder="e.g. Strength" />
            </label>
            <label>
              Duration (min)
              <input name="duration_min" type="number" defaultValue={50} min={10} step={5} />
            </label>
            <label>
              Default capacity
              <input name="default_capacity" type="number" defaultValue={8} min={1} max={40} />
            </label>
            <label>
              Price (£)
              <input name="price" type="number" defaultValue={20} min={0} step={0.5} />
            </label>
          </div>
          <label>
            Short overview
            <input
              name="short_description"
              placeholder="One line, shown under each slot on the timetable"
            />
          </label>
          <label>
            Description
            <textarea name="description" rows={2} placeholder="Shown to customers when booking" />
          </label>
          <button type="submit" className="btn btn--primary">
            Add class
          </button>
        </form>
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>All classes</h3>
        {!classes || classes.length === 0 ? (
          <p className="admin-empty">No classes yet — add your first one above.</p>
        ) : (
          <div className="admin-table">
            {classes.map((c) => (
              <Link className="admin-row admin-row--link" href={`/admin/classes/${c.id}`} key={c.id}>
                <span>{c.name}</span>
                <span>{c.category || "—"}</span>
                <span>£{(c.price_pence / 100).toFixed(2)}</span>
                <span>cap {c.default_capacity}</span>
                <span className={c.active ? "admin-badge admin-badge--on" : "admin-badge"}>
                  {c.active ? "Active" : "Hidden"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
