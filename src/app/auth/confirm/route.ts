import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EmailOtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

// Verifies a Supabase email link (signup confirmation, password reset, etc.)
// server-side via token_hash, then redirects with the session already set in
// cookies. This avoids the PKCE code/verifier mismatch that happens when the
// link is opened in a different browser context than it was requested from
// (very common on mobile — request in Safari, open the link from Mail).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=Invalid%20or%20expired%20link", request.url));
}
