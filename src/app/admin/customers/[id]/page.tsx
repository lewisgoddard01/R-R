import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { conditionLabel, type HealthAnswers } from "@/lib/health-questionnaire";
import { adminRemoveBookingAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/confirm-button";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="admin-row" style={{ gridTemplateColumns: "1fr 2fr" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default async function AdminCustomerDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error: errorMsg, saved } = await searchParams;
  const admin = createAdminClient();

  const [{ data: profile }, { data: userRes }, { data: bookings }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, phone, waiver_signed_at, health_completed_at, health")
      .eq("id", id)
      .maybeSingle(),
    admin.auth.admin.getUserById(id),
    admin
      .from("bookings")
      .select("id, status, payment_status, session_id, class_sessions(starts_at, instructor, classes(name))")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!profile) notFound();

  const health = (profile.health ?? {}) as HealthAnswers;
  const waiverDone = Boolean(profile.waiver_signed_at && profile.health_completed_at);
  const phoneMissing = waiverDone && !profile.phone;
  const conditions = (health.conditions ?? []).map(conditionLabel);

  type BookingRow = {
    id: string;
    status: string;
    payment_status: string;
    session_id: string;
    class_sessions: { starts_at: string; instructor: string | null; classes: { name: string } | null } | null;
  };
  const now = +new Date();
  const bookingRows = ((bookings ?? []) as unknown as BookingRow[]).filter((b) => b.class_sessions);
  const upcomingBookings = bookingRows
    .filter((b) => +new Date(b.class_sessions!.starts_at) > now && ["booked", "waitlisted"].includes(b.status))
    .sort((a, b) => +new Date(a.class_sessions!.starts_at) - +new Date(b.class_sessions!.starts_at));
  const pastBookings = bookingRows
    .filter((b) => +new Date(b.class_sessions!.starts_at) <= now)
    .sort((a, b) => +new Date(b.class_sessions!.starts_at) - +new Date(a.class_sessions!.starts_at));

  function formatWhen(startsAt: string) {
    return new Date(startsAt).toLocaleString("en-GB", {
      timeZone: "Europe/London",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function remove(bookingId: string, formData: FormData) {
    "use server";
    void formData;
    const { error } = await adminRemoveBookingAction(bookingId);
    if (error) redirect(`/admin/customers/${id}?error=${encodeURIComponent(error)}`);
    redirect(`/admin/customers/${id}?saved=Removed%20from%20the%20class.`);
  }

  return (
    <>
      <div className="admin-card" style={{ marginTop: "2rem" }}>
        {errorMsg && <p style={{ color: "var(--orange)", marginBottom: "1rem" }}>Couldn&apos;t save: {errorMsg}</p>}
        {saved && !errorMsg && <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>✓ {saved}</p>}
        <h3>{profile.full_name || "(no name on file)"}</h3>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
          {userRes?.user?.email}
          {profile.phone && ` · ${profile.phone}`}
        </p>
        {!waiverDone ? (
          <p className="admin-empty">Hasn&apos;t completed the health &amp; waiver form yet.</p>
        ) : (
          <>
            <p style={{ color: "var(--muted)" }}>
              Signed {new Date(profile.waiver_signed_at!).toLocaleString("en-GB", { timeZone: "Europe/London",                 day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {phoneMissing && (
              <p style={{ color: "var(--orange)", marginTop: ".5rem" }}>
                No mobile number on file yet — they filled this in before we started asking for
                one, and can&apos;t book another class until they add it.
              </p>
            )}
          </>
        )}
      </div>

      <div className="admin-card" style={{ marginTop: "1.5rem" }}>
        <h3>Classes booked</h3>
        {upcomingBookings.length === 0 && pastBookings.length === 0 ? (
          <p className="admin-empty">No classes booked yet.</p>
        ) : (
          <>
            {upcomingBookings.length > 0 && (
              <div className="admin-table">
                {upcomingBookings.map((b) => {
                  const s = b.class_sessions!;
                  return (
                    <div
                      className="admin-row"
                      key={b.id}
                      style={{ alignItems: "center", gridTemplateColumns: "1.4fr 1fr 1fr auto" }}
                    >
                      <Link href={`/admin/roster/${b.session_id}`}>{s.classes?.name ?? "Class"}</Link>
                      <span style={{ color: "var(--muted)" }}>{formatWhen(s.starts_at)}</span>
                      <span style={{ color: "var(--muted)" }}>
                        {b.status === "waitlisted" ? "Waitlisted" : b.payment_status === "comped" ? "Free (comped)" : b.payment_status}
                      </span>
                      <form action={remove.bind(null, b.id)}>
                        <ConfirmButton
                          className="admin-link-btn"
                          confirmText={`Remove ${profile.full_name || "this customer"} from ${s.classes?.name ?? "this class"} on ${formatWhen(s.starts_at)}? If they paid, a class credit will be added to their account.`}
                        >
                          Remove
                        </ConfirmButton>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}

            {pastBookings.length > 0 && (
              <>
                <p style={{ color: "var(--muted)", marginTop: upcomingBookings.length > 0 ? "1.2rem" : 0, marginBottom: ".4rem" }}>
                  Past classes
                </p>
                <div className="admin-table">
                  {pastBookings.map((b) => {
                    const s = b.class_sessions!;
                    const label =
                      b.status === "cancelled"
                        ? "Cancelled"
                        : b.status === "attended"
                          ? "Attended"
                          : b.status === "waitlisted"
                            ? "Waitlisted (unclaimed)"
                            : "Booked";
                    return (
                      <div className="admin-row" key={b.id} style={{ gridTemplateColumns: "1.4fr 1fr 1fr" }}>
                        <span>{s.classes?.name ?? "Class"}</span>
                        <span style={{ color: "var(--muted)" }}>{formatWhen(s.starts_at)}</span>
                        <span style={{ color: "var(--muted)" }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {waiverDone && (
        <>
          <div className="admin-card" style={{ marginTop: "1.5rem" }}>
            <h3>Health questionnaire</h3>
            <Row label="Prior Pilates experience" value={health.priorPilates} />
            <Row label="Detail" value={health.priorPilatesDetail} />
            <Row label="Reason for taking up Pilates" value={health.reasonForPilates} />
            <Row label="Heart condition?" value={health.heartCondition} />
            <Row label="Chest pain during activity?" value={health.chestPain} />
            <Row label="Dizziness / loses consciousness?" value={health.dizziness} />
            <Row label="Blood pressure issue?" value={health.bloodPressure} />
            <Row label="On medication affecting exercise?" value={health.medication} />
            <Row label="Medication detail" value={health.medicationDetail} />
            <Row label="Pregnant / recently given birth?" value={health.pregnant} />
            <Row label="Conditions ticked" value={conditions.length ? conditions.join(", ") : null} />
            <Row label="Condition detail" value={health.conditionsDetail} />
            <Row label="Anything else to know?" value={health.otherReason} />
            <Row label="Detail" value={health.otherReasonDetail} />
          </div>

          <div className="admin-card" style={{ marginTop: "1.5rem" }}>
            <h3>Emergency contact</h3>
            <Row label="Name" value={health.emergencyName} />
            <Row label="Phone" value={health.emergencyPhone} />
          </div>

          <div className="admin-card" style={{ marginTop: "1.5rem" }}>
            <h3>Consent</h3>
            <Row label="Signed as" value={health.signature} />
            <Row label="Photo/video consent" value={health.photoConsent ? "Yes" : "No"} />
          </div>
        </>
      )}
    </>
  );
}
