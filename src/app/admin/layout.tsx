import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/account");

  return (
    <section className="sec page-head">
      <div className="wrap">
        <div className="admin-head">
          <div>
            <p className="cap">Admin</p>
            <h1 className="h2">Studio dashboard.</h1>
          </div>
          <Link href="/" className="btn btn--ghost">
            ← Back to site
          </Link>
        </div>
        <nav className="admin-nav">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/classes">Classes &amp; sessions</Link>
          <Link href="/admin/revenue">Revenue</Link>
        </nav>
        {children}
      </div>
    </section>
  );
}
