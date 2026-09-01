import type { MetadataRoute } from "next";
import { createAbsolutePublicUrl, getSiteOrigin, isSearchIndexingEnabled } from "@/features/seo/site-url";
export default function robots(): MetadataRoute.Robots {
  if (!isSearchIndexingEnabled()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/admin"] }, sitemap: createAbsolutePublicUrl("/sitemap.xml"), host: getSiteOrigin() };
}
