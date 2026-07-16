import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer__top">
        <Link href="/" className="footer__brand">
          Revive <em>&amp;</em> Reform
        </Link>
        <nav className="footer__nav" aria-label="Footer">
          <Link href="/about">About</Link>
          <Link href="/team">Team</Link>
          <Link href="/classes">Classes</Link>
          <Link href="/timetable">Timetable</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
      <p className="footer__fine">
        © {year} Revive &amp; Reform · Reformer Pilates &amp; Wellness Studio · 1D Oxford Street, Ripley, DE5 3AG
        {" · "}
        <Link href="/privacy">Privacy Policy</Link>
      </p>
    </footer>
  );
}
