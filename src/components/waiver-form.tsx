"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const YES_NO = ["No", "Yes"] as const;

export function WaiverForm({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) || "");

    // A short, original screening questionnaire covering the same ground as the
    // standard PAR-Q+ readiness categories (heart/BP, chest pain, dizziness or
    // balance, bone/joint issues, medication, pregnancy, and anything else) —
    // written in our own words for Revive & Reform, not a copy of any copyrighted form.
    const health = {
      heartCondition: get("heartCondition"),
      chestPain: get("chestPain"),
      dizziness: get("dizziness"),
      boneJoint: get("boneJoint"),
      boneJointDetail: get("boneJointDetail"),
      medication: get("medication"),
      medicationDetail: get("medicationDetail"),
      pregnant: get("pregnant"),
      otherReason: get("otherReason"),
      otherReasonDetail: get("otherReasonDetail"),
      emergencyName: get("emergencyName"),
      emergencyPhone: get("emergencyPhone"),
      signature: get("signature"),
    };
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({ health, health_completed_at: now, waiver_signed_at: now })
      .eq("id", userId);

    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <form className="auth" onSubmit={submit}>
      <fieldset className="fset">
        <legend>Health questionnaire</legend>
        <p style={{ color: "var(--muted)", fontSize: ".92rem", marginBottom: "1.2rem" }}>
          A few quick questions so we can teach you safely. If you answer &ldquo;yes&rdquo; to
          anything, that&apos;s absolutely fine — just give us a little detail and we&apos;ll make
          sure your first class is set up right for you.
        </p>

        <div className="field">
          <label htmlFor="heartCondition">Has a doctor ever told you that you have a heart condition, or that you should only do physical activity recommended by a doctor?</label>
          <select id="heartCondition" name="heartCondition" defaultValue="No">
            {YES_NO.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="chestPain">Do you feel pain or discomfort in your chest during physical activity, or have you had chest pain at rest in the last month?</label>
          <select id="chestPain" name="chestPain" defaultValue="No">
            {YES_NO.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="dizziness">Do you ever lose your balance because of dizziness, or lose consciousness?</label>
          <select id="dizziness" name="dizziness" defaultValue="No">
            {YES_NO.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="boneJoint">Do you have a bone, joint or soft-tissue problem (e.g. back, knee, hip, shoulder) that could be made worse by exercise?</label>
          <select id="boneJoint" name="boneJoint" defaultValue="No">
            {YES_NO.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="boneJointDetail">If yes, please give brief detail</label>
          <input id="boneJointDetail" name="boneJointDetail" type="text" />
        </div>
        <div className="field">
          <label htmlFor="medication">Are you currently taking medication for your heart or blood pressure, or any other medication that could affect your ability to exercise?</label>
          <select id="medication" name="medication" defaultValue="No">
            {YES_NO.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="medicationDetail">If yes, please give brief detail</label>
          <input id="medicationDetail" name="medicationDetail" type="text" />
        </div>
        <div className="field">
          <label htmlFor="pregnant">Are you currently pregnant, or have you given birth in the last 6 months?</label>
          <select id="pregnant" name="pregnant" defaultValue="No">
            <option>No</option>
            <option>Yes — pregnant</option>
            <option>Recently given birth</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="otherReason">Is there any other reason you know of why you should not do physical activity without medical guidance?</label>
          <select id="otherReason" name="otherReason" defaultValue="No">
            {YES_NO.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="otherReasonDetail">If yes, please give brief detail</label>
          <input id="otherReasonDetail" name="otherReasonDetail" type="text" />
        </div>
        <div className="field">
          <label htmlFor="emergencyName">Emergency contact — name</label>
          <input id="emergencyName" name="emergencyName" type="text" required />
        </div>
        <div className="field">
          <label htmlFor="emergencyPhone">Emergency contact — phone</label>
          <input id="emergencyPhone" name="emergencyPhone" type="tel" required />
        </div>
      </fieldset>

      <fieldset className="fset">
        <legend>Waiver &amp; consent</legend>
        <div className="waiver-text">
          <p style={{ marginBottom: ".9rem" }}>
            <strong>Confirmation of health.</strong> I confirm the answers above are accurate to the
            best of my knowledge, and I&apos;ll let Revive &amp; Reform know if anything changes.
            Where I&apos;ve answered &ldquo;yes&rdquo; to a health question, I confirm I am safe to
            take part in Reformer Pilates and wellness sessions, seeking my own medical advice first
            where appropriate.
          </p>
          <p style={{ marginBottom: ".9rem" }}>
            <strong>Assumption of risk.</strong> I understand that Reformer Pilates and related
            wellness activities involve physical exertion and carry an inherent risk of injury. I
            will work within my own limits, follow my instructor&apos;s guidance, and stop and tell
            my instructor if I feel unwell, dizzy, or in pain at any point.
          </p>
          <p style={{ marginBottom: ".9rem" }}>
            <strong>Release of liability.</strong> I take part in classes and treatments at Revive
            &amp; Reform voluntarily and at my own risk. To the fullest extent permitted by law, I
            release Revive &amp; Reform and its instructors from liability for injury, loss or
            damage arising from my participation, except where caused by their negligence.
          </p>
          <p>
            <strong>Medical authorisation.</strong> In an emergency, I authorise Revive &amp; Reform
            to seek appropriate medical assistance on my behalf and to contact the emergency contact
            named above.
          </p>
        </div>
        <label className="check">
          <input type="checkbox" name="agree" required /> I have read and agree to the above.
        </label>
        <div className="field" style={{ marginTop: "1rem" }}>
          <label htmlFor="signature">Type your full name to sign</label>
          <input id="signature" name="signature" type="text" required autoComplete="name" />
        </div>
      </fieldset>

      {msg && <p className="auth__msg">{msg}</p>}

      <button type="submit" className="btn btn--primary btn--full" disabled={busy}>
        {busy ? "Saving…" : "Save & continue"}
      </button>
      <p className="auth__toggle">You&apos;ll only need to complete this once.</p>
    </form>
  );
}
