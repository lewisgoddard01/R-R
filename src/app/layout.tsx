import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { RevealController } from "@/components/reveal-controller";
import { CookieNotice } from "@/components/cookie-notice";
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
  metadataBase: new URL("https://reviveandreform.co.uk"),
  title: "Reformer Pilates in Ripley, Derbyshire — Revive & Reform",
  description:
    "Boutique Reformer Pilates studio in Ripley, Derbyshire. Small classes, eight to a class, never more. Book online — beginner-friendly, everyone welcome.",
  keywords: [
    "Reformer Pilates Ripley",
    "Pilates Derbyshire",
    "Pilates studio Ripley",
    "Reformer Pilates classes",
    "Pilates near Ripley",
  ],
  authors: [{ name: "Revive & Reform" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://reviveandreform.co.uk",
    siteName: "Revive & Reform",
    title: "Reformer Pilates in Ripley, Derbyshire — Revive & Reform",
    description:
      "Boutique Reformer Pilates studio in Ripley, Derbyshire. Small classes, eight to a class, never more.",
    images: [{ url: "/assets/logo.jpg", width: 1200, height: 1200, alt: "Revive & Reform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reformer Pilates in Ripley, Derbyshire — Revive & Reform",
    description:
      "Boutique Reformer Pilates studio in Ripley, Derbyshire. Small classes, eight to a class, never more.",
    images: ["/assets/logo.jpg"],
  },
  robots: { index: true, follow: true },
};

const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": "ExerciseGym",
  name: "Revive & Reform",
  description:
    "Boutique Reformer Pilates and wellness studio in Ripley, Derbyshire. Small classes, eight to a class, never more.",
  url: "https://reviveandreform.co.uk",
  telephone: "+441773292102",
  email: "info@reviveandreform.co.uk",
  address: {
    "@type": "PostalAddress",
    streetAddress: "1D Oxford Street",
    addressLocality: "Ripley",
    addressRegion: "Derbyshire",
    postalCode: "DE5 3AG",
    addressCountry: "GB",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 53.049499,
    longitude: -1.406437,
  },
  image: "https://reviveandreform.co.uk/assets/logo.jpg",
  priceRange: "££",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
        />
        <Nav isLoggedIn={Boolean(user)} isAdmin={isAdmin} />
        {children}
        <Footer />
        <CookieNotice />
        <RevealController />
      </body>
    </html>
  );
}
