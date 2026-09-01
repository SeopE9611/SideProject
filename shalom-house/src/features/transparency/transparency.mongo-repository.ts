import "server-only";
import type { Filter } from "mongodb";
import { getMongoDatabase } from "@/lib/mongodb";
import { isCanonicalTransparencyDate } from "./transparency.admin-validation";
import { TRANSPARENCY_DOCUMENT_COLLECTION_NAME, type MongoTransparencyDocument } from "./transparency.mongo-schema";
import type { PublicTransparencyDocument, PublicTransparencyDocumentMedia } from "./transparency.repository";
import { isTransparencyCategory, isTransparencyReadyForPublication } from "./transparency.types";

const validSlug = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
function publicFilter(now: Date): Filter<MongoTransparencyDocument> {
  return {
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: { $type: "date", $lte: now },
    privacyReviewStatus: "confirmed",
    finalDocumentStatus: "final",
    archivedAt: null,
    deletedAt: null,
  };
}
function publicDocument(document: MongoTransparencyDocument, now: Date): PublicTransparencyDocument | null {
  if (
    !validSlug(document.slug) ||
    typeof document.title !== "string" ||
    !document.title.trim() ||
    !isTransparencyCategory(document.category) ||
    typeof document.periodLabel !== "string" ||
    !document.periodLabel.trim() ||
    typeof document.summary !== "string" ||
    !isCanonicalTransparencyDate(document.documentDate) ||
    !(document.publishedAt instanceof Date) ||
    Number.isNaN(document.publishedAt.getTime()) ||
    document.publishedAt.getTime() > now.getTime() ||
    document.publicationStatus !== "published" ||
    document.approvalStatus !== "approved" ||
    !isTransparencyReadyForPublication(document) ||
    document.file?.mimeType !== "application/pdf" ||
    !Number.isInteger(document.file.byteSize) ||
    document.file.byteSize < 1
  )
    return null;
  return {
    slug: document.slug,
    title: document.title,
    category: document.category,
    periodLabel: document.periodLabel,
    summary: document.summary,
    documentDate: document.documentDate,
    publishedAt: document.publishedAt.toISOString(),
    fileType: "PDF",
    byteSize: document.file.byteSize,
  };
}
export class MongoTransparencyRepository {
  async listPublished(): Promise<readonly PublicTransparencyDocument[]> {
    const now = new Date();
    const documents = await (
      await getMongoDatabase()
    )
      .collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME)
      .find(publicFilter(now))
      .sort({ documentDate: -1, publishedAt: -1, _id: -1 })
      .limit(100)
      .toArray();
    return documents.flatMap((document) => {
      const item = publicDocument(document, now);
      return item ? [item] : [];
    });
  }
  async findMediaBySlug(slug: string): Promise<PublicTransparencyDocumentMedia | null> {
    if (!validSlug(slug)) return null;
    const now = new Date();
    const document = await (
      await getMongoDatabase()
    )
      .collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME)
      .findOne({ ...publicFilter(now), slug });
    if (!document || !publicDocument(document, now)) return null;
    return {
      bucket: document.file.bucket,
      objectPath: document.file.objectPath,
      mimeType: document.file.mimeType,
      byteSize: document.file.byteSize,
    };
  }
}
