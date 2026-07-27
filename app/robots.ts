import { getSiteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/team",
          "/dashboard",
          "/login",
          "/player/login",
          "/reset-password",
          "/auth",
          "/api/admin",
          "/api/auth",
          "/api/cron",
          "/api/team",
          "/api/uploads/private",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
