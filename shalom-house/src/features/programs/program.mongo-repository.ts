import { ObjectId, type Document, type Filter, type WithId } from "mongodb";
import { getMongoDatabase } from "@/lib/mongodb";
import { findPublicGalleryCoverById, findPublicGalleryCoversByIds, type PublicGalleryCoverReference } from "@/features/gallery/gallery.repository";
import { isValidStoredProgramAttachment } from "./program.media-validation";
import { PROGRAM_COLLECTION_NAME, type MongoProgramDocument } from "./program.mongo-schema";
import { normalizePublicProgramLimit, type ProgramRepository } from "./program.repository";
import { isValidProgramSlug, type PublicProgram, type PublicProgramSummary } from "./program.types";

const validDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function validAttachment(document: WithId<Document>) {
  if (!(document._id instanceof ObjectId)) return false;
  const value = document.attachment;
  if (value == null) return value === null || value === undefined ? null : false;
  return isValidStoredProgramAttachment(value, document.updatedAt, document._id.toHexString()) ? value : false;
}

function isValidPublishedProgramDocument(
  document: WithId<Document>,
  options: { requireBody: boolean; now: Date },
): boolean {
  if (
    !(document._id instanceof ObjectId) ||
    !isValidProgramSlug(document.slug) ||
    !text(document.category) || !text(document.title) || !text(document.summary) || !text(document.purpose) ||
    !(document.operationStatusLabel === null || text(document.operationStatusLabel)) ||
    !Number.isInteger(document.sortOrder) || document.sortOrder < 0 || document.sortOrder > 9999 ||
    !validDate(document.createdAt) || !validDate(document.updatedAt) || document.updatedAt < document.createdAt ||
    document.publicationStatus !== "published" || document.approvalStatus !== "approved" ||
    !validDate(document.publishedAt) || document.publishedAt < document.createdAt ||
    document.publishedAt > document.updatedAt || document.publishedAt > options.now ||
    !(document.deletedAt === undefined || document.deletedAt === null) ||
    !(document.coverGalleryItemId === undefined || document.coverGalleryItemId === null || document.coverGalleryItemId instanceof ObjectId) ||
    validAttachment(document) === false
  ) return false;
  return !options.requireBody ||
    Array.isArray(document.body) && document.body.length > 0 && document.body.every(text);
}

const attachment = (document: WithId<Document>) => {
  const value = validAttachment(document);
  return value ? { href: `/api/programs/${encodeURIComponent(document.slug)}/attachment`, label: value.label,
    originalFileName: value.originalFileName, byteSize: value.byteSize } : null;
};
const image = (cover?: PublicGalleryCoverReference | null) => cover ?
  { src: cover.mediaUrl, altText: cover.altText, width: cover.width, height: cover.height } : null;
function summary(document: WithId<Document>, cover?: PublicGalleryCoverReference | null): PublicProgramSummary {
  return { id: document._id.toHexString(), slug: document.slug, category: document.category, title: document.title,
    summary: document.summary, purpose: document.purpose, operationStatusLabel: document.operationStatusLabel,
    sortOrder: document.sortOrder, publishedAt: document.publishedAt.toISOString(), updatedAt: document.updatedAt.toISOString(),
    coverImage: image(cover), attachment: attachment(document) };
}
function publicFilter(now: Date): Filter<MongoProgramDocument> { return { publicationStatus: "published", approvalStatus: "approved",
  publishedAt: { $ne: null, $lte: now }, $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] }; }
const projection = { slug: 1, category: 1, title: 1, summary: 1, purpose: 1, operationStatusLabel: 1, sortOrder: 1,
  publicationStatus: 1, approvalStatus: 1, publishedAt: 1, createdAt: 1, updatedAt: 1, deletedAt: 1,
  coverGalleryItemId: 1, attachment: 1 } as const;

export class MongoProgramRepository implements ProgramRepository {
  async listPublished(options?: { limit?: number }): Promise<readonly PublicProgramSummary[]> {
    const now = new Date();
    const documents = await (await getMongoDatabase()).collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME)
      .find(publicFilter(now), { projection }).sort({ sortOrder: 1, publishedAt: -1, _id: -1 })
      .limit(normalizePublicProgramLimit(options?.limit)).toArray();
    const valid = documents.filter((document) => isValidPublishedProgramDocument(document, { requireBody: false, now }));
    const ids = valid.flatMap((document) => document.coverGalleryItemId instanceof ObjectId ? [document.coverGalleryItemId] : []);
    const covers = await findPublicGalleryCoversByIds(ids);
    return documents.flatMap((document) => {
      if (!isValidPublishedProgramDocument(document, { requireBody: false, now })) {
        console.error("공개 프로그램 문서 검증에 실패했습니다.", { documentId: document._id instanceof ObjectId ? document._id.toHexString() : "unknown" });
        return [];
      }
      return [summary(document, document.coverGalleryItemId instanceof ObjectId ? covers.get(document.coverGalleryItemId.toHexString()) : null)];
    });
  }
  async findPublishedBySlug(slug: string): Promise<PublicProgram | null> {
    if (!isValidProgramSlug(slug)) return null;
    const now = new Date();
    const document = await (await getMongoDatabase()).collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME)
      .findOne({ ...publicFilter(now), slug }, { projection: { ...projection, body: 1 } });
    if (!document || !isValidPublishedProgramDocument(document, { requireBody: true, now })) return null;
    const cover = document.coverGalleryItemId instanceof ObjectId ? await findPublicGalleryCoverById(document.coverGalleryItemId) : null;
    return { ...summary(document, cover), body: document.body };
  }
}

export async function findPublishedProgramAttachmentBySlug(slug: string) {
  if (!isValidProgramSlug(slug)) return null;
  const now = new Date();
  const document = await (await getMongoDatabase()).collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME)
    .findOne({ ...publicFilter(now), slug });
  if (!document || !isValidPublishedProgramDocument(document, { requireBody: true, now })) return null;
  const value = validAttachment(document);
  return value ? { programId: document._id.toHexString(), bucket: value.bucket, objectPath: value.objectPath,
    originalFileName: value.originalFileName } : null;
}
