// Shared between the customer-facing waiver form (src/components/waiver-form.tsx)
// and the admin health-record viewer (src/app/admin/customers/**) so the
// condition list and "is this worth flagging" logic can't drift apart.

export const CONDITIONS = [
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

export type HealthAnswers = {
  priorPilates?: string;
  priorPilatesDetail?: string;
  reasonForPilates?: string;
  heartCondition?: string;
  chestPain?: string;
  dizziness?: string;
  bloodPressure?: string;
  medication?: string;
  medicationDetail?: string;
  pregnant?: string;
  conditions?: string[];
  conditionsDetail?: string;
  otherReason?: string;
  otherReasonDetail?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  signature?: string;
  photoConsent?: boolean;
};

// Anything an instructor would want to know about before class — used to
// show a quick warning badge on class rosters without dumping full medical
// detail into a list view.
export function hasHealthFlags(health: HealthAnswers | null | undefined): boolean {
  if (!health) return false;
  return Boolean(
    health.heartCondition === "Yes" ||
      health.chestPain === "Yes" ||
      health.dizziness === "Yes" ||
      (health.pregnant && health.pregnant !== "No") ||
      health.otherReason === "Yes" ||
      (health.conditions && health.conditions.length > 0)
  );
}

export function conditionLabel(key: string): string {
  return CONDITIONS.find((c) => c.key === key)?.label ?? key;
}
