import type { Metadata } from "next";
import { Rule } from "@/components/rule";

export const metadata: Metadata = {
  title: "Privacy Policy — Revive & Reform",
  description: "How Revive & Reform collects, uses and protects your personal data.",
  robots: { index: false, follow: true },
};

export default function Privacy() {
  return (
    <section className="sec page-head">
      <div className="wrap">
        <h1 className="display" data-reveal>
          Privacy <em>policy.</em>
        </h1>
        <p className="lede intro" data-reveal>
          Last updated: July 2026. This explains what personal data Revive &amp; Reform collects,
          why, and what rights you have over it.
        </p>
        <Rule />

        <div className="prose" data-reveal>
          <h2>Who we are</h2>
          <p>
            Revive &amp; Reform, 1D Oxford Street, Ripley, Derbyshire, DE5 3AG
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;). You can contact us about anything in this policy
            at <a href="mailto:info@reviveandreform.co.uk" style={{ color: "var(--orange)" }}>info@reviveandreform.co.uk</a> or
            01773 292102.
          </p>

          <h2>
            What we <em>collect</em>
          </h2>
          <p>
            <strong>Account details:</strong> your name, email address and phone number, when you
            create an account or contact us.
          </p>
          <p>
            <strong>Health &amp; emergency contact information:</strong> when you complete our
            one-time health questionnaire and waiver before your first class — this includes
            details about medical conditions, injuries or medication relevant to exercising safely,
            and the name and number of an emergency contact. This is &ldquo;special category
            data&rdquo; under UK GDPR, and we only collect it with your explicit consent (given by
            completing and signing the form) and only use it to teach you safely.
          </p>
          <p>
            <strong>Booking &amp; payment information:</strong> which classes you book, cancel or
            waitlist for, and your payment history. Card payments are handled entirely by Stripe —
            we never see or store your full card details ourselves.
          </p>
          <p>
            <strong>Technical information:</strong> basic, non-identifying data collected
            automatically by our hosting provider (e.g. for security and reliability), and a
            session cookie that keeps you logged in — we don&apos;t use tracking or advertising
            cookies.
          </p>

          <h2>
            Why we use <em>it</em>
          </h2>
          <p>
            To create and manage your account and bookings; to teach classes safely, taking your
            health information into account; to process payments and refunds; to send you booking
            confirmations, waitlist updates, class reminders and important service messages; and to
            meet our legal and accounting obligations.
          </p>
          <p>
            We don&apos;t use your data for marketing unless you separately opt in, and we never
            sell your data to anyone.
          </p>

          <h2>
            Who we <em>share it with</em>
          </h2>
          <p>
            We use a small number of trusted service providers to run the site and studio, who
            each process data on our behalf under their own privacy and security terms:
          </p>
          <p>
            <strong>Stripe</strong> (payment processing) · <strong>Supabase</strong> (our secure
            database and account system) · <strong>Resend</strong> (sending booking and account
            emails). We don&apos;t share your information with anyone else, except where required
            by law or, in a genuine emergency, with emergency services as described in our waiver.
          </p>

          <h2>
            How long we <em>keep it</em>
          </h2>
          <p>
            We keep account, booking and health information for as long as you have an active
            account with us, and for a reasonable period afterwards to meet legal, accounting and
            insurance obligations. You can ask us to delete your account and data at any time —
            see &ldquo;your rights&rdquo; below.
          </p>

          <h2>
            Your <em>rights</em>
          </h2>
          <p>
            Under UK GDPR you have the right to access the personal data we hold about you, ask us
            to correct it, ask us to delete it, restrict or object to how we use it, and receive a
            copy in a portable format. To exercise any of these, email{" "}
            <a href="mailto:info@reviveandreform.co.uk" style={{ color: "var(--orange)" }}>
              info@reviveandreform.co.uk
            </a>
            . You can also complain to the{" "}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--orange)" }}
            >
              Information Commissioner&apos;s Office
            </a>{" "}
            if you think we&apos;ve mishandled your data.
          </p>

          <h2>
            Changes to this <em>policy</em>
          </h2>
          <p>
            We may update this policy from time to time — the &ldquo;last updated&rdquo; date at
            the top will always reflect the latest version.
          </p>
        </div>
      </div>
    </section>
  );
}
