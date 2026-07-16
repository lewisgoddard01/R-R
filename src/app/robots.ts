import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/login", "/reset-password"],
    },
    sitemap: "https://reviveandreform.co.uk/sitemap.xml",
  };
}
