import { createClient } from "@supabase/supabase-js";

/** SERVER-ONLY Supabase client using the service-role secret. Bypasses RLS.
 *  Never import this into a Client Component. Use only in route handlers / server actions
 *  (e.g. the Stripe webhook and admin tasks). */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
