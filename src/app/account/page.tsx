import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteAccountAction } from "@/app/account/actions";

export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ packPurchased?: string }>;
}) {
  const { packPurchased } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, phone, waiver_signed_at, health_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: packs } = await supabase
    .from("class_packs")
    .select("classes_remaining, expires_at")
    .eq("user_id", user.id)
    .gt("classes_remaining", 0)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true });

  const totalCredits = (packs ?? []).reduce((sum, p) => sum + p.classes_remaining, 0);
  const nextExpiry = packs?.[0]?.expires_at;

  const firstName = (profile?.full_name || user.email || "").split(" ")[0];
  const waiverDone = Boolean(profile?.waiver_signed_at && profile?.health_completed_at && profile?.phone);

  async function deleteAccount() {
    "use server";
    await deleteAccountAction();
  }

  return (
    <section className="sec page-head">
      <div className="wrap" style={{ maxWidth: "680px" }}>
        <h1 className="display">
          Hi{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="lede intro">Your Revive &amp; Reform account.</p>

        {packPurchased === "1" && (
          <div className="note-card" style={{ marginTop: "1.5rem" }}>
            <p>Payment received — your class bundle is ready to use.</p>
          </div>
        )}

        {error ? (
          <div className="note-card" style={{ marginTop: "clamp(2rem,4vw,3rem)" }}>
            <h3>Finishing setup</h3>
            <p>
              Your login works! The profile database table isn&apos;t created yet — run
              <code style={{ color: "var(--orange)" }}> supabase/schema.sql</code> in the Supabase
              SQL editor and this will light up.
            </p>
          </div>
        ) : (
          <div style={{ marginTop: "clamp(2rem,4vw,3rem)" }}>
            <div className="account__row">
              <span>Signed in as</span>
              <span style={{ color: "var(--muted)" }}>{user.email}</span>
            </div>
            <div className="account__row">
              <span>Health &amp; waiver</span>
              <span style={{ color: waiverDone ? "var(--muted)" : "var(--orange)" }}>
                {waiverDone ? "Completed ✓" : "Not completed yet"}
              </span>
            </div>
            {totalCredits > 0 && (
              <div className="account__row">
                <span>Class credits</span>
                <span style={{ color: "var(--orange)" }}>
                  {totalCredits} class{totalCredits === 1 ? "" : "es"} left
                  {nextExpiry &&
                    ` · expires ${new Date(nextExpiry).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "long" })}`}
                </span>
              </div>
            )}

            {!waiverDone && (
              <div className="note-card" style={{ marginTop: "1.6rem" }}>
                <h3>One quick step before you book</h3>
                <p>
                  Please complete a short health questionnaire and sign our waiver — just once.
                  After that you&apos;re free to book any class without filling it in again.
                </p>
                <p style={{ marginTop: "1.2rem" }}>
                  <Link href="/account/waiver" className="btn btn--primary">
                    Complete health &amp; waiver <span className="btn__x">→</span>
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: ".8rem", flexWrap: "wrap", marginTop: "2rem" }}>
          <Link href="/book" className="btn btn--primary">
            Book a class <span className="btn__x">→</span>
          </Link>
          <Link href="/account/bookings" className="btn btn--ghost">
            My bookings
          </Link>
          <LogoutButton />
        </div>

        <form action={deleteAccount} style={{ marginTop: "2.5rem" }}>
          <ConfirmButton
            className="admin-link-btn"
            confirmText="Delete your account and all your data (bookings, health form, class credits)? This can't be undone."
          >
            Delete my account
          </ConfirmButton>
        </form>
      </div>
    </section>
  );
}
