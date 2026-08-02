import type { Metadata } from "next";
import Link from "next/link";
import { Rule } from "@/components/rule";
import { CLASSES } from "@/lib/class-info";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Classes — Revive & Reform",
  description:
    "Our Reformer Pilates classes — from beginner foundations to power flows — in Ripley, Derbyshire.",
};

export default async function Classes() {
  // Admin-authored classes win; anything the admin hasn't touched yet falls
  // back to the built-in copy so this page is never left half-empty.
  const supabase = await createClient();
  const { data: dbClasses } = await supabase
    .from("classes")
    .select("name, category, description")
    .eq("active", true)
    .order("name", { ascending: true });

  const dbByName = new Map((dbClasses ?? []).map((c) => [c.name, c]));
  const staticOnly = CLASSES.filter((c) => !dbByName.has(c.name));

  const classes = [
    ...(dbClasses ?? []).map((c) => ({
      name: c.name,
      tag: c.category || "",
      body: c.description || "",
    })),
    ...staticOnly.map((c) => ({ name: c.name, tag: c.tag, body: c.body })),
  ];

  return (
    <section className="sec page-head">
      <div className="wrap">
        <h1 className="display" data-reveal>
          Our <em>classes.</em>
        </h1>
        <p className="lede intro" data-reveal>
          Every class focuses on moving from the inside out — connecting with your core, improving
          alignment, and getting the most from every session in a nurturing, encouraging space where
          everyone feels seen and supported. Options and modifications are offered throughout.
        </p>
        <Rule />

        <div className="clist">
          {classes.map((c) => (
            <article className="crow" key={c.name} data-reveal>
              <span className="crow__name">{c.name}</span>
              <span className="crow__tag">{c.tag}</span>
              <p className="crow__desc">{c.body}</p>
            </article>
          ))}
        </div>

        <p style={{ marginTop: "clamp(2rem,4vw,3rem)" }} data-reveal>
          <Link href="/timetable" className="btn btn--primary">
            See the timetable <span className="btn__x">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
