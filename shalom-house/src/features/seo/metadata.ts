import type { Metadata } from "next";
import { findPublicSeoRoute } from "./public-routes";
import { getMetadataBase, getSearchVerification, isSearchIndexingEnabled } from "./site-url";

const name = "샬롬의 집";
const defaultImage = { url: "/api/social-image", alt: "샬롬의 집 장애인거주시설 공식 홈페이지", width: 1200, height: 630 };
export function createRootMetadata(): Metadata {
  const indexing = isSearchIndexingEnabled();
  const verified = indexing ? getSearchVerification() : { google: undefined, naver: undefined };
  return { metadataBase: getMetadataBase(), title: { default: name, template: `%s | ${name}` },
    description: findPublicSeoRoute("/").description, applicationName: name, creator: name, publisher: name,
    robots: { index: indexing, follow: indexing }, verification: indexing ? {
      ...(verified.google ? { google: verified.google } : {}),
      ...(verified.naver ? { other: { "naver-site-verification": verified.naver } } : {}),
    } : undefined };
}
export function createDynamicPublicMetadata(input: { path: string; title: string; description: string; type: "website" | "article"; publishedTime?: string; modifiedTime?: string; section?: string; image?: { url: string; alt: string; width: number; height: number } | null }): Metadata {
  const image = input.image ?? defaultImage;
  const title = input.path === "/" ? input.title : `${input.title} | ${name}`;
  return { title: { absolute: title }, description: input.description, alternates: { canonical: input.path },
    openGraph: { locale: "ko_KR", siteName: name, url: input.path, title, description: input.description, type: input.type,
      images: [image], ...(input.type === "article" ? { publishedTime: input.publishedTime, modifiedTime: input.modifiedTime, section: input.section } : {}) },
    twitter: { card: "summary_large_image", title, description: input.description, images: [image.url] } };
}
export function createPublicPageMetadata(path: string): Metadata {
  const route = findPublicSeoRoute(path);
  return createDynamicPublicMetadata({ ...route, type: "website" });
}
