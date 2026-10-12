import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createPricingItemAction,
  updatePricingItemAction,
  setPricingItemActiveAction,
  deletePricingItemAction,
  duplicatePricingItemAction,
} from "@/app/admin/actions";
import { ConfirmButton } from "@/components/confirm-button";
import {
  OFFER_COLUMNS,
  OFFER_SECTIONS,
  isBuyable,
  offerStatus,
  type Offer,
  type OfferSection,
} from "@/lib/offers";
import { ukParts } from "@/lib/uk-time";

type ClassOption = { id: string; name: string };

// Module scope on purpose: inline server actions serialise any variable they
// close over, and a function can't be serialised.
function done(error: string | undefined, message: string): never {
  if (error) redirect(`/admin/pricing?error=${encodeURIComponent(error)}`);
  redirect(`/admin/pricing?saved=${encodeURIComponent(message)}`);
}

function dateInput(iso: string | null) {
  if (!iso) return "";
  const p = ukParts(new Date(iso));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" });
}

const SECTION_HELP: Record<OfferSection, string> = {
  featured: "Big box at the top of the pricing page — best for your headline offer.",
  list: "The main list of prices, offers and classes.",
  bundle: "The Bundles box, which shows the price per class and the saving.",
};

const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: ".8rem", alignItems: "center" };
const inline: React.CSSProperties = { display: "flex", alignItems: "center", gap: ".4rem" };

function OfferFields({ offer, classes, section }: { offer?: Offer; classes: ClassOption[]; section?: OfferSection }) {
  return (
    <div style={{ display: "grid", gap: ".9rem" }}>
      <div className="admin-form__grid">
        <label>
          Name
          <input name="name" required defaultValue={offer?.name} placeholder="e.g. November offer" />
        </label>
        <label>
          Shows in
          <select name="section" defaultValue={offer?.section ?? section ?? "list"}>
            {(Object.keys(OFFER_SECTIONS) as OfferSection[]).map((s) => (
              <option key={s} value={s}>
                {OFFER_SECTIONS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Position
          <input name="sort_order" type="number" step={1} defaultValue={offer?.sort_order ?? 100} />
        </label>
      </div>
      <label>
        Small print
        <input name="subtitle" defaultValue={offer?.subtitle ?? ""} placeholder="e.g. Six classes, use within twelve weeks" />
      </label>

      <fieldset style={{ border: "1px solid var(--line, rgba(255,255,255,.15))", borderRadius: "8px", padding: ".8rem 1rem", ...row }}>
        <p style={{ width: "100%", margin: 0 }}>
          <strong>Sell it online</strong>
          <span style={{ color: "var(--muted)", fontSize: ".85rem" }}>
            {" "}
            — fill in the price and credits and a Buy button appears. Leave them blank for display only.
          </span>
        </p>
        <label style={inline}>
          Costs £
          <input
            name="price"
            type="number"
            min={0}
            step={0.01}
            defaultValue={offer?.price_pence ? offer.price_pence / 100 : ""}
            style={{ width: "6rem" }}
          />
        </label>
        <label style={inline}>
          Gives
          <input name="credits" type="number" min={1} max={50} defaultValue={offer?.credits ?? ""} style={{ width: "4.5rem" }} />
          class credits
        </label>
        <label style={inline}>
          Use within
          <input name="valid_days" type="number" min={1} max={365} defaultValue={offer?.valid_days ?? 42} style={{ width: "4.5rem" }} />
          days
        </label>
        <label style={inline}>
          For
          <select name="class_id" defaultValue={offer?.class_id ?? ""}>
            <option value="">any class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} only
              </option>
            ))}
          </select>
        </label>
        <label className="admin-check">
          <input name="one_per_customer" type="checkbox" defaultChecked={offer?.one_per_customer ?? false} /> One per customer
        </label>
        <label style={{ ...inline, width: "100%" }}>
          Price shown if not sold online
          <input name="price_label" defaultValue={offer?.price_label ?? ""} placeholder="e.g. Free, POA, £40" style={{ width: "9rem" }} />
        </label>
      </fieldset>

      <fieldset style={{ border: "1px solid var(--line, rgba(255,255,255,.15))", borderRadius: "8px", padding: ".8rem 1rem", ...row }}>
        <p style={{ width: "100%", margin: 0 }}>
          <strong>Dates</strong>
          <span style={{ color: "var(--muted)", fontSize: ".85rem" }}>
            {" "}
            — optional. It appears and disappears by itself. Leave blank to show it until you hide it.
          </span>
        </p>
        <label style={inline}>
          From
          <input name="starts_on" type="date" defaultValue={dateInput(offer?.starts_at ?? null)} />
        </label>
        <label style={inline}>
          Until (end of)
          <input name="ends_on" type="date" defaultValue={dateInput(offer?.ends_at ?? null)} />
        </label>
        <label className="admin-check">
          <input name="featured" type="checkbox" defaultChecked={offer?.featured ?? false} /> Leaf icon by the name
        </label>
      </fieldset>
    </div>
  );
}

function StatusBadge({ offer }: { offer: Offer }) {
  const status = offerStatus(offer);
  const label =
    status === "showing"
      ? offer.ends_at
        ? `Showing until ${shortDate(offer.ends_at)}`
        : "Showing"
      : status === "scheduled"
        ? `Starts ${shortDate(offer.starts_at!)}`
        : status === "ended"
          ? `Ended ${shortDate(offer.ends_at!)}`
          : "Hidden";
  return <span className={status === "showing" ? "admin-badge admin-badge--on" : "admin-badge"}>{label}</span>;
}

export default async function AdminPricing({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error: errorMsg, saved } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: classData }, { data: sales }] = await Promise.all([
    supabase
      .from("pricing_items")
      .select(OFFER_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("classes").select("id, name").order("name", { ascending: true }),
    createAdminClient().from("class_packs").select("pricing_item_id").not("pricing_item_id", "is", null),
  ]);
  const offers = (data ?? []) as Offer[];
  const classes = (classData ?? []) as ClassOption[];
  const soldById = new Map<string, number>();
  (sales ?? []).forEach((s) => {
    const id = s.pricing_item_id as string;
    soldById.set(id, (soldById.get(id) ?? 0) + 1);
  });

  async function addItem(formData: FormData) {
    "use server";
    const { error } = await createPricingItemAction(formData);
    done(error, "Added.");
  }

  async function saveItem(id: string, formData: FormData) {
    "use server";
    const { error } = await updatePricingItemAction(id, formData);
    done(error, "Saved.");
  }

  async function toggleItem(id: string, active: boolean) {
    "use server";
    const { error } = await setPricingItemActiveAction(id, active);
    done(error, active ? "Switched on." : "Hidden from the pricing page.");
  }

  async function duplicateItem(id: string) {
    "use server";
    const { error } = await duplicatePricingItemAction(id);
    done(error, "Copied — the copy is hidden until you switch it on.");
  }

  async function removeItem(id: string) {
    "use server";
    const { error } = await deletePricingItemAction(id);
    done(error, "Deleted.");
  }

  return (
    <>
      {errorMsg && <p style={{ color: "var(--orange)", marginTop: "1.5rem" }}>Couldn&apos;t save: {errorMsg}</p>}
      {saved && !errorMsg && <p style={{ color: "var(--muted)", marginTop: "1.5rem" }}>✓ {saved}</p>}

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>Prices &amp; offers</h3>
        <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>
          Everything on the pricing page lives here — the welcome offer, bundles, seasonal deals and plain
          prices. Click any one to change it. Customers get class credits when they buy, used automatically
          when they book. Changing a price never affects what people have already bought.
        </p>
      </div>

      {(Object.keys(OFFER_SECTIONS) as OfferSection[]).map((section) => {
        const inSection = offers.filter((o) => o.section === section);
        return (
          <div className="admin-card" style={{ marginTop: "1.5rem" }} key={section}>
            <h3>{OFFER_SECTIONS[section]}</h3>
            <p style={{ color: "var(--muted)", marginBottom: "1rem", fontSize: ".9rem" }}>{SECTION_HELP[section]}</p>
            {inSection.length === 0 && <p className="admin-empty">Nothing here at the moment.</p>}
            <div style={{ display: "grid", gap: ".8rem" }}>
              {inSection.map((o) => {
                const sold = soldById.get(o.id) ?? 0;
                return (
                  <details
                    key={o.id}
                    style={{
                      border: "1px solid var(--line, rgba(255,255,255,.15))",
                      borderRadius: "10px",
                      padding: ".8rem 1rem",
                      opacity: offerStatus(o) === "showing" ? 1 : 0.7,
                    }}
                  >
                    <summary style={{ cursor: "pointer", ...row }}>
                      <strong>{o.name}</strong>
                      <span>{o.price_label}</span>
                      {isBuyable(o) ? (
                        <span style={{ color: "var(--muted)", fontSize: ".85rem" }}>
                          {o.credits} credit{o.credits === 1 ? "" : "s"} · {o.valid_days} days
                          {o.class_id && ` · ${classes.find((c) => c.id === o.class_id)?.name ?? "one class"} only`}
                          {o.one_per_customer && " · one each"}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: ".85rem" }}>display only</span>
                      )}
                      <StatusBadge offer={o} />
                      {isBuyable(o) && (
                        <span style={{ color: "var(--muted)", fontSize: ".85rem" }}>{sold} sold</span>
                      )}
                    </summary>
                    <form action={saveItem.bind(null, o.id)} className="admin-form" style={{ marginTop: "1rem" }}>
                      <OfferFields offer={o} classes={classes} />
                      <div style={row}>
                        <button type="submit" className="btn btn--primary">
                          Save changes
                        </button>
                        <button
                          type="submit"
                          className="btn btn--ghost"
                          formAction={toggleItem.bind(null, o.id, !o.active)}
                        >
                          {o.active ? "Hide" : "Switch on"}
                        </button>
                        <button type="submit" className="admin-link-btn" formAction={duplicateItem.bind(null, o.id)}>
                          Duplicate
                        </button>
                        <ConfirmButton
                          className="admin-link-btn"
                          confirmText={`Delete "${o.name}" for good? Credits people already bought still work. You can Hide it instead if it might come back.`}
                          formAction={removeItem.bind(null, o.id)}
                        >
                          Delete
                        </ConfirmButton>
                      </div>
                    </form>
                  </details>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <details>
          <summary style={{ cursor: "pointer" }}>
            <h3 style={{ display: "inline" }}>+ Add a new offer or price</h3>
          </summary>
          <form action={addItem} className="admin-form" style={{ marginTop: "1rem" }}>
            <OfferFields classes={classes} />
            <button type="submit" className="btn btn--primary">
              Add it
            </button>
          </form>
        </details>
      </div>
    </>
  );
}
