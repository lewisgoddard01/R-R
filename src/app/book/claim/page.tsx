import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { claimWaitlistSpotAction } from "@/app/book/actions";

export const metadata: Metadata = {
  title: "Book onto this class — Revive & Reform",
};

export default async function ClaimWaitlistSpot({
  searchParams,
}: {
  searchParams: Promise<{ booking_id?: string }>;
}) {
  const { booking_id } = await searchParams;
  if (!booking_id) redirect("/book");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/book/claim?booking_id=${booking_id}`)}`);

  const { data: booking } = await supabase
    .from("bookings")
    .select("status, class_sessions(starts_at, classes(name, price_pence))")
    .eq("id", booking_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const session = booking?.class_sessions as unknown as {
    starts_at: string;
    classes: { name: string; price_pence: number } | null;
  } | null;

  async function claim() {
    "use server";
    await claimWaitlistSpotAction(booking_id!);
  }

  return (
    <section className="sec page-head">
      <div className="wrap" style={{ maxWidth: "460px" }}>
        <h1 className="display">Book onto this class.</h1>

        {!booking || !session ? (
          <p className="lede intro">
            We couldn&apos;t find that waitlist entry — it may have already been sorted.{" "}
            <Link href="/book" style={{ color: "var(--orange)" }}>
              Browse classes
            </Link>
            .
          </p>
        ) : booking.status === "booked" ? (
          <p className="lede intro">
            Good news — you&apos;re already booked in for this class.{" "}
            <Link href="/account/bookings" style={{ color: "var(--orange)" }}>
              View my bookings
            </Link>
            .
          </p>
        ) : booking.status !== "waitlisted" ? (
          <p className="lede intro">
            This spot&apos;s no longer available.{" "}
            <Link href="/book" style={{ color: "var(--orange)" }}>
              Browse other classes
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="lede intro">
              A spot opened up in <strong>{session.classes?.name}</strong> on{" "}
              {new Date(session.starts_at).toLocaleString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
              . It&apos;s first come, first served — book onto it before someone else does.
            </p>
            <form action={claim}>
              <button type="submit" className="btn btn--primary btn--full">
                Book onto this class — £{((session.classes?.price_pence ?? 0) / 100).toFixed(2)}{" "}
                <span className="btn__x">→</span>
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
