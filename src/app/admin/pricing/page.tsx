import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createPricingItemAction,
  updatePricingItemAction,
  setPricingItemActiveAction,
  deletePricingItemAction,
} from "@/app/admin/actions";
import { ConfirmButton } from "@/components/confirm-button";

type PricingItem = {
  id: string;
  name: string;
  subtitle: string | null;
  price_label: string;
  featured: boolean;
  sort_order: number;
  active: boolean;
};

// Module scope on purpose: inline server actions serialise any variable they
// close over, and a function can't be serialised.
function done(error: string | undefined, message: string): never {
  if (error) redirect(`/admin/pricing?error=${encodeURIComponent(error)}`);
  redirect(`/admin/pricing?saved=${encodeURIComponent(message)}`);
}

export default async function AdminPricing({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error: errorMsg, saved } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("pricing_items")
    .select("id, name, subtitle, price_label, featured, sort_order, active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const items = (data ?? []) as PricingItem[];

  async function addItem(formData: FormData) {
    "use server";
    const { error } = await createPricingItemAction(formData);
    done(error, "Added to the pricing page.");
  }

  async function saveItem(id: string, formData: FormData) {
    "use server";
    const { error } = await updatePricingItemAction(id, formData);
    done(error, "Saved.");
  }

  async function toggleItem(id: string, active: boolean) {
    "use server";
    const { error } = await setPricingItemActiveAction(id, active);
    done(error, active ? "Now showing on the pricing page." : "Hidden from the pricing page.");
  }

  async function removeItem(id: string) {
    "use server";
    const { error } = await deletePricingItemAction(id);
    done(error, "Deleted.");
  }

  return (
    <>
      <div className="admin-card" style={{ marginTop: "2rem" }}>
        <h3>Add to the pricing page</h3>
        <p style={{ color: "var(--muted)", marginBottom: "1rem", fontSize: ".9rem" }}>
          For one-off events, workshops or new prices. The welcome offer and bundles are set separately
          as they&apos;re linked to card payments.
        </p>
        {errorMsg && (
          <p style={{ color: "var(--orange)", marginBottom: "1rem" }}>Couldn&apos;t save: {errorMsg}</p>
        )}
        {saved && !errorMsg && <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>✓ {saved}</p>}
        <form action={addItem} className="admin-form">
          <div className="admin-form__grid">
            <label>
              Name
              <input name="name" required placeholder="e.g. Christmas workshop" />
            </label>
            <label>
              Price
              <input name="price_label" required placeholder="e.g. £25, Free, POA" />
            </label>
            <label>
              Position
              <input name="sort_order" type="number" defaultValue={(items.at(-1)?.sort_order ?? 0) + 10} step={1} />
            </label>
            <label className="admin-check">
              <input name="featured" type="checkbox" /> Highlight with leaf
            </label>
          </div>
          <label>
            Small print
            <input name="subtitle" placeholder="e.g. Saturday 13 December, 10am — 90 minutes" />
          </label>
          <button type="submit" className="btn btn--primary">
            Add item
          </button>
        </form>
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>Pricing page items</h3>
        <p style={{ color: "var(--muted)", marginBottom: "1rem", fontSize: ".9rem" }}>
          Hide an item to take it off the page for now; delete it to remove it for good. Lower position
          numbers show first.
        </p>
        {items.length === 0 ? (
          <p className="admin-empty">Nothing on the price list yet — add something above.</p>
        ) : (
          <div className="admin-table">
            {items.map((item) => (
              <form
                action={saveItem.bind(null, item.id)}
                className="admin-row admin-row--edit"
                key={item.id}
                style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", alignItems: "center", opacity: item.active ? 1 : 0.6 }}
              >
                <input name="name" defaultValue={item.name} required aria-label="Name" />
                <input name="subtitle" defaultValue={item.subtitle ?? ""} placeholder="Small print" aria-label="Small print" />
                <input name="price_label" defaultValue={item.price_label} required style={{ width: "6rem" }} aria-label="Price" />
                <input
                  name="sort_order"
                  type="number"
                  defaultValue={item.sort_order}
                  style={{ width: "4.5rem" }}
                  aria-label="Position"
                />
                <label className="admin-check">
                  <input name="featured" type="checkbox" defaultChecked={item.featured} /> Leaf
                </label>
                <span className={item.active ? "admin-badge admin-badge--on" : "admin-badge"}>
                  {item.active ? "Showing" : "Hidden"}
                </span>
                <button type="submit" className="btn btn--ghost">
                  Save
                </button>
                <button type="submit" className="admin-link-btn" formAction={toggleItem.bind(null, item.id, !item.active)}>
                  {item.active ? "Hide" : "Show"}
                </button>
                <ConfirmButton
                  className="admin-link-btn"
                  confirmText={`Delete "${item.name}" from the pricing page for good? You can hide it instead if it might come back.`}
                  formAction={removeItem.bind(null, item.id)}
                >
                  Delete
                </ConfirmButton>
              </form>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
