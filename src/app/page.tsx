import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { Rule, Leaf } from "@/components/rule";

const PREVIEW = [
  { name: "Revive & Reform", tag: "Energetic", meta: "Full body" },
  { name: "Revive Foundations", tag: "Beginner", meta: "Start here" },
  { name: "Revive Slow Flow", tag: "Mindful", meta: "Slow & precise" },
  { name: "Reform Power", tag: "Strength", meta: "Faster paced" },
];

export default function Home() {
  return (
    <>
      {/* HERO / WELCOME */}
      <section className="hero">
        <LogoMark />
        <div className="hero__thesis">
          <h1 className="display hero__title">
            <span>Revive the body.</span>
            <span>
              <em>Reform</em> the routine.
            </span>
          </h1>
          <Rule className="hero__rule" />
          <p className="lede">
            Welcome to Revive &amp; Reform — Reformer Pilates &amp; wellness in Ripley, Derbyshire.
            A space where everyone is welcome, whatever your size, gender or level.
          </p>
          <div className="hero__cta">
            <Link href="/timetable" className="btn btn--primary">
              Book a class <span className="btn__x">→</span>
            </Link>
            <Link href="/about" className="btn btn--ghost">
              About
            </Link>
          </div>
        </div>
      </section>

      {/* APPROACH */}
      <section className="sec">
        <div className="wrap approach">
          <h2 className="h2 approach__intro" data-reveal>
            A room built around how you want to <em>feel.</em>
          </h2>
          <div className="pillars">
            <div className="pillar" data-reveal>
              <h3>
                <em>Everyone welcome</em>
              </h3>
              <p>Whatever your size, gender, or experience — brand new or seasoned, we&apos;ve got you.</p>
            </div>
            <div className="pillar" data-reveal>
              <h3>
                <em>Inside out</em>
              </h3>
              <p>Connect with your core, improve alignment, and get the most from every session.</p>
            </div>
            <div className="pillar" data-reveal>
              <h3>
                <em>Your pace</em>
              </h3>
              <p>Mindful progression with options and modifications throughout — challenge yourself, gently.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CLASS PREVIEW */}
      <section className="sec sec--surface">
        <div className="wrap">
          <h2 className="h2" data-reveal>
            Find your <em>way in.</em>
          </h2>
          <Rule />
          <div className="clist">
            {PREVIEW.map((c) => (
              <Link className="crow" href="/classes" key={c.name} data-reveal>
                <span className="crow__name">{c.name}</span>
                <span className="crow__tag">{c.tag}</span>
                <span className="crow__meta">{c.meta}</span>
              </Link>
            ))}
          </div>
          <p style={{ marginTop: "1.8rem" }}>
            <Link href="/classes" className="btn btn--ghost">
              All classes <span className="btn__x">→</span>
            </Link>
          </p>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="sec sec--green">
        <div className="wrap band">
          <Leaf label="Welcome offer" />
          <h2 className="h2" data-reveal>
            New here? <em>2 classes for £20.</em>
          </h2>
          <p className="lede" data-reveal>
            A one-time welcome offer so you can try us out. Come and feel what it&apos;s like to
            move without the noise.
          </p>
          <Link href="/pricing" className="btn btn--primary" data-reveal>
            See pricing <span className="btn__x">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
