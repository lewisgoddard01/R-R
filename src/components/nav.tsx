"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/team", label: "Team" },
  { href: "/classes", label: "Classes" },
  { href: "/timetable", label: "Timetable" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function Nav({ isLoggedIn, isAdmin }: { isLoggedIn: boolean; isAdmin: boolean }) {
  const pathname = usePathname();
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav${stuck ? " stuck" : ""}${open ? " open" : ""}`}>
      <Link href="/" className="brand" onClick={() => setOpen(false)}>
        Revive <em>&amp;</em> Reform
      </Link>
      <nav className="nav-links" aria-label="Primary">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? "active" : undefined}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        {isAdmin && (
          <Link href="/admin" className="nav-admin" onClick={() => setOpen(false)}>
            Admin
          </Link>
        )}
        <Link href={isLoggedIn ? "/account" : "/login"} className="nav-login" onClick={() => setOpen(false)}>
          {isLoggedIn ? "Account" : "Log in"}
        </Link>
        <Link href="/timetable" className="btn btn--primary" onClick={() => setOpen(false)}>
          Book a class
        </Link>
      </nav>
      <button
        className="burger"
        aria-label="Toggle menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
      </button>
    </header>
  );
}
