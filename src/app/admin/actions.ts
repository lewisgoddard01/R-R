"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/account");
  return supabase;
}

function str(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}
function num(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ── Classes ──────────────────────────────────────────────────────────
export async function createClassAction(formData: FormData) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("classes").insert({
    name: str(formData.get("name")),
    description: str(formData.get("description")),
    category: str(formData.get("category")),
    duration_min: num(formData.get("duration_min"), 50),
    default_capacity: num(formData.get("default_capacity"), 8),
    price_pence: Math.round(num(formData.get("price"), 20) * 100),
    active: true,
  });
  revalidatePath("/admin/classes");
  return { error: error?.message };
}

export async function updateClassAction(classId: string, formData: FormData) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("classes")
    .update({
      name: str(formData.get("name")),
      description: str(formData.get("description")),
      category: str(formData.get("category")),
      duration_min: num(formData.get("duration_min"), 50),
      default_capacity: num(formData.get("default_capacity"), 8),
      price_pence: Math.round(num(formData.get("price"), 20) * 100),
      active: formData.get("active") === "on",
    })
    .eq("id", classId);
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
  return { error: error?.message };
}

export async function deleteClassAction(classId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("classes").delete().eq("id", classId);
  revalidatePath("/admin/classes");
  if (!error) redirect("/admin/classes");
  return { error: error?.message };
}

// ── Sessions (dated occurrences) ────────────────────────────────────
export async function createSessionAction(classId: string, formData: FormData) {
  const supabase = await requireAdmin();
  const date = str(formData.get("date"));
  const time = str(formData.get("time"));
  const capacity = num(formData.get("capacity"), 8);
  const instructor = str(formData.get("instructor"));
  const repeatWeeks = Math.max(1, num(formData.get("repeat_weeks"), 1));

  if (!date || !time) return { error: "Pick a date and time." };
  const startsAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startsAt.getTime())) return { error: "That date/time isn't valid." };

  const rows = Array.from({ length: repeatWeeks }, (_, i) => {
    const d = new Date(startsAt);
    d.setDate(d.getDate() + i * 7);
    return { class_id: classId, starts_at: d.toISOString(), capacity, instructor, status: "scheduled" as const };
  });

  const { error } = await supabase.from("class_sessions").insert(rows);
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/book");
  return { error: error?.message };
}

export async function cancelSessionAction(sessionId: string, classId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("class_sessions").update({ status: "cancelled" }).eq("id", sessionId);
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/book");
  return { error: error?.message };
}

export async function updateSessionCapacityAction(sessionId: string, classId: string, capacity: number) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("class_sessions").update({ capacity }).eq("id", sessionId);
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/book");
  return { error: error?.message };
}
