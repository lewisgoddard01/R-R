import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function BookingSuccess({
  searchParams,
}: {
  searchParams: Promise<{ booking_id?: string }>;
}) {
  const { booking_id } = await searchParams;
  const supabase = await createClient();

  let confirmed = false;
  if (booking_id) {
    const { data } = await supabase.from("bookings").select("payment_status").eq("id", booking_id).maybeSingle();
    confirmed = data?.payment_status === "paid";
  }

  return (
    <section className="sec page-head">
      <div className="wrap" style={{ maxWidth: "640px" }}>
        <h1 className="display">
          Payment <em>received.</em>
        </h1>
        <p className="lede intro">
          {confirmed
            ? "You're all booked in — a confirmation email is on its way."
            : "Thanks — we're just confirming your payment with Stripe. Check My bookings in a moment if this doesn't update straight away."}
        </p>
        <p style={{ marginTop: "2rem" }}>
          <Link href="/account/bookings" className="btn btn--primary">
            View my bookings <span className="btn__x">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
