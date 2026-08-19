import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { conditionLabel, type HealthAnswers } from "@/lib/health-questionnaire";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="admin-row" style={{ gridTemplateColumns: "1fr 2fr" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default async function AdminCustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: profile }, { data: userRes }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, phone, waiver_signed_at, health_completed_at, health")
      .eq("id", id)
      .maybeSingle(),
    admin.auth.admin.getUserById(id),
  ]);

  if (!profile) notFound();

  const health = (profile.health ?? {}) as HealthAnswers;
  const waiverDone = Boolean(profile.waiver_signed_at && profile.health_completed_at);
  const phoneMissing = waiverDone && !profile.phone;
  const conditions = (health.conditions ?? []).map(conditionLabel);

  return (
    <>
      <div className="admin-card" style={{ marginTop: "2rem" }}>
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
              Signed {new Date(profile.waiver_signed_at!).toLocaleString("en-GB", {
                day: "numeric",
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
