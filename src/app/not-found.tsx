import Link from "next/link";

export default function NotFound() {
  return (
    <section className="sec nf">
      <span className="amp" aria-hidden="true">
        &amp;
      </span>
      <h1 className="display" style={{ position: "relative" }}>
        Off the <em>rails.</em>
      </h1>
      <p className="lede" style={{ textAlign: "center", position: "relative" }}>
        This page has glided off its track. Let&apos;s get you back to the studio.
      </p>
      <div className="hero__cta" style={{ position: "relative" }}>
        <Link href="/" className="btn btn--primary">
          Back home <span className="btn__x">→</span>
        </Link>
        <Link href="/timetable" className="btn btn--ghost">
          Book a class
        </Link>
      </div>
    </section>
  );
}
