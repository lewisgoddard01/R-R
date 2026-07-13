import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WaiverForm } from "@/components/waiver-form";

export default async function WaiverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <section className="sec page-head">
      <div className="wrap" style={{ maxWidth: "560px" }}>
        <h1 className="display">
          Health &amp; <em>waiver.</em>
        </h1>
        <p className="lede intro">
          A quick one-off form so we can keep you safe in class. Once it&apos;s done, you can book
          any class without filling it in again.
        </p>
        <WaiverForm userId={user.id} />
      </div>
    </section>
  );
}
