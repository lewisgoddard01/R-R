"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const YES_NO = ["No", "Yes"] as const;

const CONDITIONS = [
  { key: "abdominal", label: "Abdominal disorder or recent surgery" },
  { key: "arthritis", label: "Arthritis (osteo or rheumatoid)" },
  { key: "backPain", label: "Unspecified back pain" },
  { key: "spinalInjury", label: "Spinal injury" },
  { key: "jointReplacement", label: "Joint replacement" },
  { key: "jointSensitivity", label: "Knee, hip, shoulder or neck sensitivities" },
  { key: "respiratory", label: "Asthma or other respiratory issues" },
  { key: "epilepsy", label: "Epilepsy" },
  { key: "diabetes", label: "Diabetes" },
  { key: "autoimmune", label: "Auto-immune disorder (e.g. M.E., M.S., Lupus)" },
  { key: "anxietyDepression", label: "Anxiety or depression" },
  { key: "migraine", label: "Migraine" },
  { key: "sensory", label: "Sensory disorder affecting eyes or ears" },
] as const;

// Renders **bold** markers within a paragraph and splits paragraphs on
// blank lines — matches the admin-editable plain-text format in site_content.
function renderWaiverText(text: string) {
  return text.split(/\n\s*\n/).map((para, i) => {
    const parts = para.split(/\*\*(.+?)\*\*/g);
    return (
      <p style={{ marginBottom: ".9rem" }} key={i}>
        {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
      </p>
    );
  });
}

export function WaiverForm({ userId, waiverText }: { userId: string; waiverText: string }) {
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

    // A screening questionnaire covering the same ground as the standard
    // Pilates readiness-questionnaire categories (cardiac risk, blood
    // pressure, pregnancy, and the common condition groups instructors need
    // to know about) — written in our own words for Revive & Reform, not a
    // copy of any copyrighted form.
    const health = {
      priorPilates: get("priorPilates"),
      priorPilatesDetail: get("priorPilatesDetail"),
      reasonForPilates: get("reasonForPilates"),
      heartCondition: get("heartCondition"),
      chestPain: get("chestPain"),
      dizziness: get("dizziness"),
      bloodPressure: get("bloodPressure"),
      medication: get("medication"),
      medicationDetail: get("medicationDetail"),
      pregnant: get("pregnant"),
      conditions: CONDITIONS.filter((c) => f.get(`condition_${c.key}`) === "on").map((c) => c.key),
      conditionsDetail: get("conditionsDetail"),
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
          <label htmlFor="priorPilates">Have you done Pilates before (mat or reformer)?</label>
          <select id="priorPilates" name="priorPilates" defaultValue="No">
            {YES_NO.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="priorPilatesDetail">If yes, which style(s) and roughly how long?</label>
          <input id="priorPilatesDetail" name="priorPilatesDetail" type="text" />
        </div>
        <div className="field">
          <label htmlFor="reasonForPilates">What&apos;s brought you to Pilates? (optional)</label>
          <input id="reasonForPilates" name="reasonForPilates" type="text" />
        </div>

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
          <label htmlFor="bloodPressure">Do you have high or low blood pressure?</label>
          <select id="bloodPressure" name="bloodPressure" defaultValue="No">
            {YES_NO.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="medication">Are you currently taking medication that could affect your ability to exercise?</label>
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
          <label>Please tick any of the following that apply to you</label>
          <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", marginTop: ".4rem" }}>
            {CONDITIONS.map((c) => (
              <label key={c.key} className="check" style={{ fontSize: ".92rem" }}>
                <input type="checkbox" name={`condition_${c.key}`} /> {c.label}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="conditionsDetail">
            If you ticked anything above, please give brief detail
          </label>
          <input id="conditionsDetail" name="conditionsDetail" type="text" />
        </div>

        <div className="field">
          <label htmlFor="otherReason">Is there anything else you think we should know about your health?</label>
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
        <div className="waiver-text">{renderWaiverText(waiverText)}</div>
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
