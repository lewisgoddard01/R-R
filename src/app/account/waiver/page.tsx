import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WaiverForm } from "@/components/waiver-form";
import { DEFAULT_WAIVER_TEXT } from "@/lib/waiver-content";

export default async function WaiverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: content }, { data: profile }] = await Promise.all([
    supabase.from("site_content").select("body").eq("key", "waiver_declaration").maybeSingle(),
    supabase.from("profiles").select("waiver_signed_at, health_completed_at, phone").eq("id", user.id).maybeSingle(),
  ]);
  const waiverText = content?.body || DEFAULT_WAIVER_TEXT;
  const alreadyDoneButNoPhone = Boolean(
    profile?.waiver_signed_at && profile?.health_completed_at && !profile?.phone
  );

  return (
    <section className="sec page-head">
      <div className="wrap" style={{ maxWidth: "560px" }}>
        <h1 className="display">
          Health &amp; <em>waiver.</em>
        </h1>
        <p className="lede intro">
          {alreadyDoneButNoPhone
            ? "We now also ask for a mobile number, which we didn't collect when you filled this in before — please fill it in once more so we have it on file. Sorry for the repeat form!"
            : "A quick one-off form so we can keep you safe in class. Once it's done, you can book any class without filling it in again."}
        </p>
        <WaiverForm userId={user.id} waiverText={waiverText} />
      </div>
    </section>
  );
}
