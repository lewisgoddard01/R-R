"use client";

import { useState } from "react";

/** Hero logo: shows /assets/logo.png when present, otherwise a drawn R&R emblem.
 *  Both spin in 3D via the .hero__logo / .hero__emblem CSS. */
export function LogoMark() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="hero__mark">
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="hero__logo"
          src="/assets/logo.jpg"
          alt="Revive & Reform"
          onError={() => setFailed(true)}
        />
      ) : (
        <Emblem />
      )}
    </div>
  );
}

function Emblem() {
  return (
    <svg className="hero__emblem" viewBox="0 0 320 320" role="img" aria-label="Revive & Reform">
      <defs>
        <path id="lf" d="M0 0 C13 -8 32 -8 44 0 C32 8 13 8 0 0 Z" />
      </defs>
      <circle cx="160" cy="160" r="154" fill="none" stroke="#EA7B2B" strokeWidth="2.5" />
      <g stroke="#EA7B2B" strokeWidth="1.3" strokeLinejoin="round">
        <use href="#lf" fill="#33402A" transform="translate(112 122) rotate(-152) scale(.9)" />
        <use href="#lf" fill="#3C4A2F" transform="translate(208 122) rotate(-28) scale(.9)" />
        <use href="#lf" fill="#2F3A26" transform="translate(128 104) rotate(-128)" />
        <use href="#lf" fill="#384730" transform="translate(192 104) rotate(-52)" />
        <use href="#lf" fill="#41512F" transform="translate(160 92) rotate(-90) scale(1.05)" />
      </g>
      <g stroke="#EA7B2B" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="120" y1="150" x2="200" y2="150" />
        <line x1="127" y1="150" x2="127" y2="161" />
        <line x1="193" y1="150" x2="193" y2="161" />
      </g>
      <text x="160" y="214" textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="600" fontSize="80" fill="#EA7B2B">
        R&amp;R
      </text>
      <text x="160" y="247" textAnchor="middle" fontFamily="var(--font-hanken), sans-serif" fontSize="14" letterSpacing="3" fill="#EA7B2B">
        REVIVE &amp; REFORM
      </text>
      <line x1="112" y1="258" x2="208" y2="258" stroke="#EA7B2B" strokeWidth="1.5" />
    </svg>
  );
}
