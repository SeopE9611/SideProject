import { MongoGalleryRepository } from "./gallery.mongo-repository";
import type { ObjectId } from "mongodb";
import type { PublicSitemapEntry } from "@/features/seo/seo.types";

export type PublicGalleryCoverReference = {
  id: string;
  slug: string;
  title: string;
  altText: string;
  width: number;
  height: number;
  mediaUrl: string;
};

export type PublicGallerySummary = {
  slug: string;
  title: string;
  category: string;
  description: string;
  altText: string;
  activityDate: string;
  width: number;
  height: number;
};

export type PublicGalleryItem = PublicGallerySummary & {
  publishedAt: string;
};

export type PublicGalleryMedia = {
  bucket: string;
  objectPath: string;
  mimeType: "image/webp";
  byteSize: number;
};

export interface GalleryRepository {
  listPublishedSitemapEntries(options?: { limit?: number }): Promise<readonly PublicSitemapEntry[]>;
  listPublished(): Promise<readonly PublicGallerySummary[]>;
  findPublishedBySlug(slug: string): Promise<PublicGalleryItem | null>;
  findMediaBySlug(slug: string): Promise<PublicGalleryMedia | null>;
}

const empty: GalleryRepository = {
  async listPublishedSitemapEntries() { return []; },
  async listPublished() {
    return [];
  },
  async findPublishedBySlug() {
    return null;
  },
  async findMediaBySlug() {
    return null;
  },
};

export function getGalleryRepository(): GalleryRepository {
  const configured = process.env.SHALOM_CONTENT_SOURCE;
  const source =
    configured ||
    (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview" ? "fixture" : "empty");

  if (source === "mongodb") {
    return new MongoGalleryRepository();
  }
  if (source === "empty" || source === "fixture") {
    return empty;
  }
  throw new Error(`지원하지 않는 SHALOM_CONTENT_SOURCE 설정입니다: ${source}`);
}

export const findPublicGalleryItems = () => getGalleryRepository().listPublished();

export const findPublicGalleryBySlug = (slug: string) => getGalleryRepository().findPublishedBySlug(slug);

export const findPublicGalleryMediaBySlug = (slug: string) => getGalleryRepository().findMediaBySlug(slug);

export async function findPublicGalleryCoverById(id: ObjectId): Promise<PublicGalleryCoverReference | null> {
  if (process.env.SHALOM_CONTENT_SOURCE !== "mongodb") return null;
  return new MongoGalleryRepository().findPublicCoverById(id);
}

export async function findPublicGalleryCoversByIds(
  ids: readonly ObjectId[],
): Promise<ReadonlyMap<string, PublicGalleryCoverReference>> {
  if (process.env.SHALOM_CONTENT_SOURCE !== "mongodb") return new Map();
  return new MongoGalleryRepository().findPublicCoversByIds(ids);
}
