import "server-only";
import { ObjectId } from "mongodb";
import { getMongoDatabase } from "@/lib/mongodb";
import { NEWS_COLLECTION_NAME, type MongoNewsPostDocument } from "@/features/news/news.mongo-schema";
import { PROGRAM_COLLECTION_NAME, type MongoProgramDocument } from "@/features/programs/program.mongo-schema";
import { GALLERY_ITEM_COLLECTION_NAME, type MongoGalleryItemDocument } from "@/features/gallery/gallery.mongo-schema";
import {
  TRANSPARENCY_DOCUMENT_COLLECTION_NAME,
  type MongoTransparencyDocument,
} from "@/features/transparency/transparency.mongo-schema";
import { adminTrashDomains, type AdminTrashDomain, type AdminTrashItem } from "./admin-trash.types";
const PAGE_SIZE = 20;
const domains = {
  news: { collection: NEWS_COLLECTION_NAME, label: "뉴스" },
  programs: { collection: PROGRAM_COLLECTION_NAME, label: "프로그램" },
  gallery: { collection: GALLERY_ITEM_COLLECTION_NAME, label: "활동사진" },
  transparency: {
    collection: TRANSPARENCY_DOCUMENT_COLLECTION_NAME,
    label: "자료공개",
  },
} as const;
type TrashProjection = Pick<
  MongoNewsPostDocument | MongoProgramDocument | MongoGalleryItemDocument | MongoTransparencyDocument,
  "_id" | "title" | "slug" | "deletedAt" | "updatedAt"
>;
export function normalizeAdminTrashPage(value: unknown): number {
  const page = typeof value === "string" && /^[0-9]+$/.test(value) ? Number(value) : value;
  if (typeof page !== "number" || !Number.isSafeInteger(page)) return 1;
  return Math.min(10000, Math.max(1, page));
}
export async function listAdminTrash(input: {
  domain?: string;
  page?: number;
}): Promise<{ items: AdminTrashItem[]; page: number; hasNext: boolean }> {
  const database = await getMongoDatabase(),
    page = normalizeAdminTrashPage(input.page);
  const selected: AdminTrashDomain[] = adminTrashDomains.includes(input.domain as AdminTrashDomain)
    ? [input.domain as AdminTrashDomain]
    : [...adminTrashDomains];
  const batches = await Promise.all(
    selected.map(async (domain) => ({
      domain,
      documents: await database
        .collection<TrashProjection>(domains[domain].collection)
        .find(
          { deletedAt: { $type: "date" } },
          {
            projection: {
              _id: 1,
              title: 1,
              slug: 1,
              deletedAt: 1,
              updatedAt: 1,
            },
          },
        )
        .sort({ deletedAt: -1, _id: -1 })
        .limit(page * PAGE_SIZE + 1)
        .toArray(),
    })),
  );
  const all = batches
    .flatMap(({ domain, documents }) =>
      documents.flatMap((document) =>
        document._id instanceof ObjectId &&
        typeof document.title === "string" &&
        typeof document.slug === "string" &&
        document.deletedAt instanceof Date &&
        !Number.isNaN(document.deletedAt.getTime()) &&
        document.updatedAt instanceof Date &&
        !Number.isNaN(document.updatedAt.getTime())
          ? [
              {
                id: document._id.toHexString(),
                domain,
                domainLabel: domains[domain].label,
                title: document.title,
                slug: document.slug,
                deletedAt: document.deletedAt.toISOString(),
                updatedAt: document.updatedAt.toISOString(),
              },
            ]
          : [],
      ),
    )
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt) || b.id.localeCompare(a.id));
  const start = (page - 1) * PAGE_SIZE,
    items = all.slice(start, start + PAGE_SIZE);
  return { items, page, hasNext: all.length > start + PAGE_SIZE };
}
