import type { Metadata } from "next";
import Link from "next/link";
import { Rule, Leaf } from "@/components/rule";
import { createBundleCheckoutAction } from "@/app/book/actions";
import { WELCOME_PACK, BUNDLES, bundleSavingsPence } from "@/lib/packs";
import { createClient } from "@/lib/supabase/server";
import { bookingsAreOpen, BOOKINGS_OPEN_AT_LABEL } from "@/lib/booking-window";

export const metadata: Metadata = {
  title: "Pricing — Revive & Reform",
  description: "Class prices, bundles and private sessions at Revive & Reform, Ripley.",
};

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

  let welcomeOfferUsed = false;
  if (user) {
    const { data } = await supabase
      .from("class_packs")
      .select("id")
      .eq("user_id", user.id)
      .eq("kind", WELCOME_PACK.kind)
      .maybeSingle();
    welcomeOfferUsed = Boolean(data);
  }

  const { data: priceRows } = await supabase
    .from("pricing_items")
    .select("id, name, subtitle, price_label, featured")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const priceItems = (priceRows ?? []) as {
    id: string;
    name: string;
    subtitle: string | null;
    price_label: string;
    featured: boolean;
  }[];

  async function buyWelcome() {
    "use server";
    await createBundleCheckoutAction(WELCOME_PACK.kind);
  }

  async function buyBundle(kind: string) {
    "use server";
    await createBundleCheckoutAction(kind);
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

        {/* the one emphasised spend on this page */}
        <div className="price-band" data-reveal>
          <div>
            <Leaf label="Welcome offer" />
            <h3 style={{ marginTop: ".5rem" }}>Two classes, one-time</h3>
            <p>For new clients — come and try us out.</p>
            {welcomeOfferUsed ? (
              <p style={{ marginTop: ".8rem", color: "var(--muted)", fontSize: ".9rem" }}>
                You&apos;ve already used this offer.
              </p>
            ) : open ? (
              <form action={buyWelcome} style={{ marginTop: "1rem" }}>
                <button type="submit" className="btn btn--primary">
                  Claim welcome offer <span className="btn__x">→</span>
                </button>
              </form>
            ) : null}
          </div>
          <span className="price-row__amt">£20</span>
        </div>

        {priceItems.length > 0 && (
          <div className="prices" data-reveal>
            {priceItems.map((item) => (
              <div className="price-row" key={item.id}>
                <span className="price-row__name">
                  {item.featured ? <Leaf label={item.name} /> : item.name}
                  {item.subtitle && <small>{item.subtitle}</small>}
                </span>
                <span className="price-row__amt">{item.price_label}</span>
              </div>
            ))}
          </div>
        )}
        <p style={{ marginTop: ".8rem", fontSize: ".9rem" }} data-reveal>
          <a href="#bundles" style={{ color: "var(--orange)" }}>
            Coming regularly? Bundles save you money ↓
          </a>
        </p>

        <div className="bundles" id="bundles" data-reveal>
          <h3>Bundles — pay per class, but less</h3>
          {BUNDLES.map((b) => {
            const savings = bundleSavingsPence(b);
            return (
              <div className="bundle" key={b.kind}>
                <b>
                  {b.label} <small>· £{(b.pricePence / 100 / b.classes).toFixed(2)} per class</small>
                  {savings > 0 && (
                    <small style={{ color: "var(--orange)", display: "block" }}>
                      Save £{(savings / 100).toFixed(2)} vs booking one at a time
                    </small>
                  )}
                </b>
                <span>£{(b.pricePence / 100).toFixed(2)}</span>
              </div>
            );
          })}
          {open &&
            BUNDLES.map((b) => (
              <form action={buyBundle.bind(null, b.kind)} key={b.kind} style={{ marginTop: ".6rem" }}>
                <button type="submit" className="btn btn--ghost">
                  Buy {b.label} <span className="btn__x">→</span>
                </button>
              </form>
            ))}
        </div>

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
