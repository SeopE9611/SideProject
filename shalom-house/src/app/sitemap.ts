import type { MetadataRoute } from "next";
import { getNewsRepository } from "@/features/news/news.repository";
import { getProgramRepository } from "@/features/programs/program.repository";
import { getGalleryRepository } from "@/features/gallery/gallery.repository";
import { publicSeoRoutes } from "@/features/seo/public-routes";
import { createAbsolutePublicUrl, isSearchIndexingEnabled } from "@/features/seo/site-url";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isSearchIndexingEnabled()) return [];
  const requests = [getNewsRepository().listPublishedSitemapEntries(), getProgramRepository().listPublishedSitemapEntries(), getGalleryRepository().listPublishedSitemapEntries()];
  const domains = ["news", "programs", "gallery"] as const;
  const prefixes = ["/news/", "/life/programs/", "/life/gallery/"];
  const settled = await Promise.allSettled(requests);
  const entries: MetadataRoute.Sitemap = publicSeoRoutes.map(({ path }) => ({ url: createAbsolutePublicUrl(path) }));
  settled.forEach((result, index) => {
    if (result.status === "rejected") { console.error("sitemap 조회에 실패했습니다.", { domain: domains[index], errorName: result.reason instanceof Error ? result.reason.name : "UnknownError" }); return; }
    result.value.forEach((item) => entries.push({ url: createAbsolutePublicUrl(`${prefixes[index]}${encodeURIComponent(item.slug)}`), lastModified: item.lastModified }));
  });
  return [...new Map(entries.map((entry) => [entry.url, entry])).values()].sort((a, b) => a.url.localeCompare(b.url)).slice(0, 50_000);
}
