import type { Metadata } from "next";
import Link from "next/link";
import { Rule, Leaf } from "@/components/rule";
import { createItemCheckoutAction } from "@/app/book/actions";
import { createClient } from "@/lib/supabase/server";
import { bookingsAreOpen, BOOKINGS_OPEN_AT_LABEL } from "@/lib/booking-window";
import { OFFER_COLUMNS, isBuyable, isOnSale, savingsPence, type Offer } from "@/lib/offers";

export const metadata: Metadata = {
  title: "Pricing — Revive & Reform",
  description: "Class prices, bundles and private sessions at Revive & Reform, Ripley.",
};

function endsLabel(o: Offer) {
  if (!o.ends_at) return null;
  return `Offer ends ${new Date(o.ends_at).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "long" })}`;
}

export default async function Pricing({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorMsg } = await searchParams;
  const open = bookingsAreOpen();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("pricing_items")
    .select(OFFER_COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const offers = ((rows ?? []) as Offer[]).filter((o) => isOnSale(o));
  const featured = offers.filter((o) => o.section === "featured");
  const list = offers.filter((o) => o.section === "list");
  const bundles = offers.filter((o) => o.section === "bundle");

  const alreadyBought = new Set<string>();
  if (user) {
    const { data: bought } = await supabase
      .from("class_packs")
      .select("pricing_item_id")
      .eq("user_id", user.id)
      .not("pricing_item_id", "is", null);
    (bought ?? []).forEach((b) => alreadyBought.add(b.pricing_item_id as string));
  }
  const usedUp = (o: Offer) => o.one_per_customer && alreadyBought.has(o.id);

  async function buy(itemId: string) {
    "use server";
    await createItemCheckoutAction(itemId);
  }

  function BuyButton({ offer, primary }: { offer: Offer; primary?: boolean }) {
    if (!isBuyable(offer) || !open) return null;
    if (usedUp(offer)) {
      return (
        <p style={{ marginTop: ".8rem", color: "var(--muted)", fontSize: ".9rem" }}>
          You&apos;ve already had this one — it&apos;s one per customer.
        </p>
      );
    }
    return (
      <form action={buy.bind(null, offer.id)} style={{ marginTop: primary ? "1rem" : ".7rem" }}>
        <button type="submit" className={primary ? "btn btn--primary" : "btn btn--ghost"}>
          Buy {offer.name} <span className="btn__x">→</span>
        </button>
      </form>
    );
  }

  return (
    <section className="sec page-head">
      <div className="wrap">
        <h1 className="display" data-reveal>
          Pricing.
        </h1>
        <p className="lede intro" data-reveal>
          Pay as you go, or buy a bundle and save — the more you book, the less each class costs.
        </p>
        <Rule />

        {errorMsg && (
          <div className="note-card" data-reveal style={{ marginBottom: "2rem" }}>
            <p>{errorMsg}</p>
          </div>
        )}

        {!open && (
          <div className="note-card" data-reveal style={{ marginBottom: "2rem" }}>
            <h3>Purchases open {BOOKINGS_OPEN_AT_LABEL}</h3>
            <p>We&apos;re not quite ready to take payments yet — these prices are for reference until then.</p>
          </div>
        )}

        {featured.map((o) => (
          <div className="price-band" data-reveal key={o.id}>
            <div>
              <Leaf label={o.name} />
              {o.subtitle && <p style={{ marginTop: ".5rem" }}>{o.subtitle}</p>}
              {endsLabel(o) && <p style={{ color: "var(--orange)", fontSize: ".9rem" }}>{endsLabel(o)}</p>}
              <BuyButton offer={o} primary />
            </div>
            <span className="price-row__amt">{o.price_label}</span>
          </div>
        ))}

        {list.length > 0 && (
          <div className="prices" data-reveal>
            {list.map((o) => (
              <div className="price-row" key={o.id}>
                <span className="price-row__name">
                  {o.featured ? <Leaf label={o.name} /> : o.name}
                  {o.subtitle && <small>{o.subtitle}</small>}
                  {endsLabel(o) && <small style={{ color: "var(--orange)" }}>{endsLabel(o)}</small>}
                  <BuyButton offer={o} />
                </span>
                <span className="price-row__amt">{o.price_label}</span>
              </div>
            ))}
          </div>
        )}

        {bundles.length > 0 && (
          <>
            <p style={{ marginTop: ".8rem", fontSize: ".9rem" }} data-reveal>
              <a href="#bundles" style={{ color: "var(--orange)" }}>
                Coming regularly? Bundles save you money ↓
              </a>
            </p>

            <div className="bundles" id="bundles" data-reveal>
              <h3>Bundles — pay per class, but less</h3>
              {bundles.map((o) => {
                const savings = savingsPence(o);
                return (
                  <div className="bundle" key={o.id}>
                    <b>
                      {o.name}
                      {o.price_pence && o.credits ? (
                        <small> · £{(o.price_pence / 100 / o.credits).toFixed(2)} per class</small>
                      ) : null}
                      {savings > 0 && (
                        <small style={{ color: "var(--orange)", display: "block" }}>
                          Save £{(savings / 100).toFixed(2)} vs booking one at a time
                        </small>
                      )}
                      {o.subtitle && <small style={{ display: "block" }}>{o.subtitle}</small>}
                      {endsLabel(o) && <small style={{ color: "var(--orange)", display: "block" }}>{endsLabel(o)}</small>}
                    </b>
                    <span>{o.price_label}</span>
                  </div>
                );
              })}
              {bundles.map((o) => (
                <BuyButton offer={o} key={o.id} />
              ))}
            </div>
          </>
        )}

        <p style={{ marginTop: "clamp(2rem,4vw,3rem)" }} data-reveal>
          <Link href="/timetable" className="btn btn--primary">
            Book a class <span className="btn__x">→</span>
          </Link>
        </p>

        <p className="lede" style={{ marginTop: "2rem", fontSize: "0.95rem" }} data-reveal>
          Cancellation policy: all cancellations within a 24-hour period don&apos;t receive credit.
          Cancellations before this time are credited back to your Revive &amp; Reform account as a
          class credit — not a cash refund to your card.
        </p>
      </div>
    </section>
  );
}
