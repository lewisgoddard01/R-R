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
  price_pence: number | null;
  credits: number | null;
  valid_days: number;
  class_id: string | null;
  one_per_customer: boolean;
};

type ClassOption = { id: string; name: string };

// Module scope on purpose: inline server actions serialise any variable they
// close over, and a function can't be serialised.
function done(error: string | undefined, message: string): never {
  if (error) redirect(`/admin/pricing?error=${encodeURIComponent(error)}`);
  redirect(`/admin/pricing?saved=${encodeURIComponent(message)}`);
}

function BuyFields({ item, classes }: { item?: PricingItem; classes: ClassOption[] }) {
  const buyable = Boolean(item?.price_pence && item?.credits);
  return (
    <fieldset
      style={{
        border: "1px solid var(--line, rgba(255,255,255,.15))",
        borderRadius: "8px",
        padding: ".8rem 1rem",
        width: "100%",
        display: "flex",
        flexWrap: "wrap",
        gap: ".8rem",
        alignItems: "center",
      }}
    >
      <label className="admin-check" style={{ width: "100%" }}>
        <input name="buyable" type="checkbox" defaultChecked={buyable} /> <strong>Customers can buy this</strong>
        <span style={{ color: "var(--muted)", fontSize: ".85rem" }}> — adds a Buy button and gives them class credits</span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
        Costs £
        <input
          name="price"
          type="number"
          min={0}
          step={0.01}
          defaultValue={item?.price_pence ? item.price_pence / 100 : ""}
          style={{ width: "6rem" }}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
        Gives
        <input name="credits" type="number" min={1} max={50} defaultValue={item?.credits ?? ""} style={{ width: "4.5rem" }} />
        credits
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
        Use within
        <input name="valid_days" type="number" min={1} max={365} defaultValue={item?.valid_days ?? 42} style={{ width: "4.5rem" }} />
        days
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
        For
        <select name="class_id" defaultValue={item?.class_id ?? ""}>
          <option value="">any class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} only
            </option>
          ))}
        </select>
      </label>
      <label className="admin-check">
        <input name="one_per_customer" type="checkbox" defaultChecked={item?.one_per_customer ?? false} /> One per customer
      </label>
    </fieldset>
  );
}

export default async function AdminPricing({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error: errorMsg, saved } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: classData }] = await Promise.all([
    supabase
      .from("pricing_items")
      .select(
        "id, name, subtitle, price_label, featured, sort_order, active, price_pence, credits, valid_days, class_id, one_per_customer"
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("classes").select("id, name").order("name", { ascending: true }),
  ]);
  const items = (data ?? []) as PricingItem[];
  const classes = (classData ?? []) as ClassOption[];

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
          For offers, class blocks, events or new prices. Tick &ldquo;Customers can buy this&rdquo; to give it a
          Buy button — buyers get class credits, used automatically when they book.
        </p>
        {errorMsg && (
          <p style={{ color: "var(--orange)", marginBottom: "1rem" }}>Couldn&apos;t save: {errorMsg}</p>
        )}
        {saved && !errorMsg && <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>✓ {saved}</p>}
        <form action={addItem} className="admin-form">
          <div className="admin-form__grid">
            <label>
              Name
              <input name="name" required placeholder="e.g. November offer" />
            </label>
            <label>
              Price shown
              <input name="price_label" placeholder="e.g. Free, POA (filled in if buyable)" />
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
            <input name="subtitle" placeholder="e.g. Six classes, use within six weeks" />
          </label>
          <BuyFields classes={classes} />
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
                <input
                  name="price_label"
                  defaultValue={item.price_label}
                  style={{ width: "6rem" }}
                  aria-label="Price shown"
                />
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
                {item.price_pence && item.credits ? <span className="admin-badge admin-badge--on">Buyable</span> : null}
                <BuyFields item={item} classes={classes} />
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
