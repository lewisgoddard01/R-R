/** The carriage rule — a thin orange line led by a dot that "glides" in on reveal.
 *  The site's one signature motif; replaces eyebrows and numbered section markers. */
export function Rule({ className = "", tight = false }: { className?: string; tight?: boolean }) {
  return (
    <div className={`rule${tight ? " rule--tight" : ""}${className ? " " + className : ""}`} data-reveal aria-hidden="true">
      <span className="rule__track" />
      <span className="rule__line" />
      <span className="rule__dot" />
    </div>
  );
}

/** Small leaf glyph lifted from the logo's foliage — flags the welcome offer / birthday class. */
export function Leaf({ label }: { label?: string }) {
  return (
    <span className="leaf-flag">
      <svg viewBox="0 0 24 24" role="img" aria-label={label || "feature"}>
        <path
          d="M12 2C7 7 4 11 4 15a8 8 0 0 0 16 0c0-4-3-8-8-13Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M12 6v11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}
