import { createClient } from "@/lib/supabase/server";
import { updateSiteContentAction } from "@/app/admin/actions";
import { DEFAULT_WAIVER_TEXT } from "@/lib/waiver-content";

export default async function AdminWaiver() {
  const supabase = await createClient();
  const { data: content } = await supabase
    .from("site_content")
    .select("body")
    .eq("key", "waiver_declaration")
    .maybeSingle();
  const waiverText = content?.body || DEFAULT_WAIVER_TEXT;

  async function save(formData: FormData) {
    "use server";
    await updateSiteContentAction("waiver_declaration", formData);
  }

  return (
    <div className="admin-card" style={{ marginTop: "2rem" }}>
      <h3>Health &amp; waiver confirmation text</h3>
      <p className="admin-empty">
        This is the consent wording shown at the bottom of the health &amp; waiver (PAR-Q) form
        customers complete before their first class. Use a blank line between paragraphs, and
        wrap a phrase in <code>**double asterisks**</code> to make it bold.
      </p>
      <form action={save} className="admin-form">
        <textarea name="body" rows={18} defaultValue={waiverText} style={{ fontFamily: "inherit" }} />
        <button type="submit" className="btn btn--primary">
          Save changes
        </button>
      </form>
    </div>
  );
}
