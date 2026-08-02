"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Self-service "right to erasure" — the privacy policy promises customers
// can ask to have their account and data deleted; previously the only way
// to honour that was manual DB surgery by the studio owner. Deleting the
// auth.users row cascades to profiles/bookings/class_packs via their
// `on delete cascade` foreign keys, so nothing else needs cleaning up here.
export async function deleteAccountAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/?accountDeleted=1");
}
