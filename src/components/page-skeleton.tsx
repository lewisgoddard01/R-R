// Shown automatically by Next.js (via loading.tsx files) while a page's
// server-side data fetch is still in flight, so customers see something
// moving instead of a blank screen.
export function PageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <section className="sec page-head">
      <div className="wrap">
        <div className="skel skel-title" />
        <div className="skel skel-line" style={{ width: "80%" }} />
        <div className="skel skel-line" style={{ width: "55%", marginBottom: "2.5rem" }} />
        <div className="skel-grid">
          {Array.from({ length: cards }).map((_, i) => (
            <div className="skel-block" key={i}>
              <div className="skel skel-line" style={{ width: "70%" }} />
              <div className="skel skel-line" style={{ width: "90%" }} />
              <div className="skel skel-line" style={{ width: "40%", marginBottom: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
