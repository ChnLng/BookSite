import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api/", "/read/"],
    },
    sitemap: "https://www.visdar.fr/sitemap.xml",
    host: "https://www.visdar.fr",
  };
}
