import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { RevealController } from "@/components/reveal-controller";
import { createClient } from "@/lib/supabase/server";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Revive & Reform — Reformer Pilates & Wellness Studio",
  description:
    "Boutique reformer Pilates and a calm wellness studio. Eight to a class, never more. Revive the body, reform the routine.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    isAdmin = profile?.role === "admin";
  }

  return (
    <html lang="en" className={`${fraunces.variable} ${hanken.variable}`}>
      <body>
        <Nav isLoggedIn={Boolean(user)} isAdmin={isAdmin} />
        {children}
        <Footer />
        <RevealController />
      </body>
    </html>
  );
}
