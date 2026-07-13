import type { Metadata } from "next";
import { Rule } from "@/components/rule";
import { DarkMap } from "@/components/dark-map";

export const metadata: Metadata = {
  title: "Contact — Revive & Reform",
  description: "Get in touch with Revive & Reform, Reformer Pilates & wellness in Ripley, Derbyshire.",
};

export default function Contact() {
  return (
    <section className="sec page-head">
      <div className="wrap">
        <h1 className="display" data-reveal>
          Get in <em>touch.</em>
        </h1>
        <p className="lede intro" data-reveal>
          Questions about classes, bookings, massage therapy, or renting space? We&apos;d love to
          hear from you.
        </p>
        <Rule />

        <div className="contact">
          <dl className="contact__list" data-reveal>
            <div>
              <dt>Email</dt>
              <dd>
                <a href="mailto:info@reviveandreform.co.uk">info@reviveandreform.co.uk</a>
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                <a href="tel:+441773292102">01773 292102</a>
              </dd>
            </div>
            <div>
              <dt>Web</dt>
              <dd>reviveandreform.co.uk</dd>
            </div>
            <div>
              <dt>Studio</dt>
              <dd>
                1D Oxford Street, Ripley, Derbyshire, DE5 3AG
                <br />
                <a
                  href="https://www.google.com/maps/search/?api=1&query=53.049499,-1.406437"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: ".92rem" }}
                >
                  Get directions →
                </a>
              </dd>
            </div>
          </dl>

          <div className="note-card" data-reveal>
            <h3>Booking online</h3>
            <p>
              We&apos;re setting up online booking and payments so you can buy single classes or
              bundles, redeem class codes, and manage everything from your own account. In the
              meantime, email or call us and we&apos;ll get you booked in.
            </p>
          </div>
        </div>

        <a
          href="https://www.google.com/maps/search/?api=1&query=53.049499,-1.406437"
          target="_blank"
          rel="noopener noreferrer"
          className="map-card"
          data-reveal
          aria-label="Open Revive & Reform's location in Google Maps"
        >
          <DarkMap
            lat={53.049499}
            lng={-1.406437}
            label="Map showing Revive & Reform, 1D Oxford Street, Ripley, Derbyshire, DE5 3AG"
          />
          <span className="map-card__cta">Get directions in Google Maps →</span>
        </a>
      </div>
    </section>
  );
}
