import type { Metadata } from "next";
import Link from "next/link";
import { Rule, Leaf } from "@/components/rule";
import { createPackCheckoutAction } from "@/app/book/actions";

export const metadata: Metadata = {
  title: "Pricing — Revive & Reform",
  description: "Class prices, bundles and private sessions at Revive & Reform, Ripley.",
};

const BUNDLES = [
  { qty: "2 classes", price: "£38", per: "£19 per class" },
  { qty: "3 classes", price: "£54", per: "£18 per class" },
  { qty: "4 classes", price: "£68", per: "£17 per class" },
  { qty: "5 classes", price: "£80", per: "£16 per class" },
];

export default function Pricing() {
  async function buyPack() {
    "use server";
    await createPackCheckoutAction();
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

        {/* the one emphasised spend on this page */}
        <div className="price-band" data-reveal>
          <div>
            <Leaf label="Welcome offer" />
            <h3 style={{ marginTop: ".5rem" }}>Two classes, one-time</h3>
            <p>For new clients — come and try us out.</p>
          </div>
          <span className="price-row__amt">£20</span>
        </div>

        <div className="prices" data-reveal>
          <div className="price-row">
            <span className="price-row__name">
              Individual class
              <small>Single session</small>
            </span>
            <span className="price-row__amt">£20</span>
          </div>
          <div className="price-row">
            <span className="price-row__name">
              Private class
              <small>One-to-one session</small>
            </span>
            <span className="price-row__amt">£60</span>
          </div>
          <div className="price-row">
            <span className="price-row__name">
              Private group
              <small>Available on request</small>
            </span>
            <span className="price-row__amt">POA</span>
          </div>
          <div className="price-row">
            <span className="price-row__name">
              <Leaf label="Birthday class" />
              <small>A free class on your birthday — ID required</small>
            </span>
            <span className="price-row__amt">Free</span>
          </div>
        </div>

        <div className="bundles" data-reveal>
          <h3>Bundles</h3>
          {BUNDLES.map((b) => (
            <div className="bundle" key={b.qty}>
              <b>
                {b.qty} <small>· {b.per}</small>
              </b>
              <span>{b.price}</span>
            </div>
          ))}
          <form action={buyPack} style={{ marginTop: "1rem" }}>
            <button type="submit" className="btn btn--primary">
              Buy the 5-class bundle <span className="btn__x">→</span>
            </button>
          </form>
        </div>

        <p style={{ marginTop: "clamp(2rem,4vw,3rem)" }} data-reveal>
          <Link href="/timetable" className="btn btn--primary">
            Book a class <span className="btn__x">→</span>
          </Link>
        </p>

        <p className="lede" style={{ marginTop: "2rem", fontSize: "0.95rem" }} data-reveal>
          Cancellation policy: cancel more than 24 hours before your class for a full refund.
          Cancelling within 24 hours releases your spot to the waitlist but isn&apos;t refunded.
        </p>
      </div>
    </section>
  );
}
