import "server-only";
import { MongoServerError, ObjectId, type Filter } from "mongodb";
import type { AdminPrincipal } from "../admin-auth/admin-auth.types";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";
import type { ValidatedAdminTransparencyDraft } from "./transparency.admin-validation";
import { createTransparencyAuditSnapshot } from "./transparency.audit";
import { insertTransparencyAuditEvent } from "./transparency.audit-repository";
import { TRANSPARENCY_DOCUMENT_COLLECTION_NAME, type MongoTransparencyDocument } from "./transparency.mongo-schema";
import { removePrivateTransparencyDocument, uploadPrivateTransparencyDocument } from "./transparency.storage";
import type { TransparencyCategory, TransparencyFinalDocumentStatus, TransparencyPrivacyReviewStatus, TransparencyPublicationStatus } from "./transparency.types";
const PAGE_SIZE = 20;
export const isValidAdminTransparencyDocumentId = (id: unknown): id is string => typeof id === "string" && /^[a-f0-9]{24}$/.test(id) && ObjectId.isValid(id);
export const normalizeAdminTransparencyPage = (value: unknown) => typeof value === "string" && /^\d+$/.test(value) ? Math.min(10000, Math.max(1, Number(value))) : 1;
const nextDate = (expected: Date) => new Date(Math.max(Date.now(), expected.getTime() + 1));
const metadata = (draft: ValidatedAdminTransparencyDraft) => ({ ...draft });
async function transaction<T>(work: (db: Awaited<ReturnType<typeof getMongoDatabase>>, session: ReturnType<Awaited<ReturnType<typeof getMongoClient>>["startSession"]>) => Promise<T>) {
  const client = await getMongoClient();
  const database = await getMongoDatabase();
  const session = client.startSession();
  try {
    return await session.withTransaction(() => work(database, session), { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
  } finally {
    await session.endSession();
  }
}
function conflict(error: unknown): "slug_conflict" | "document_duplicate" | null {
  if (!(error instanceof MongoServerError) || error.code !== 11000) return null;
  if (error.keyPattern?.slug === 1) return "slug_conflict";
  if (error.keyPattern?.["file.sha256"] === 1) return "document_duplicate";
  return null;
}
const serialize = (document: MongoTransparencyDocument) => ({
  ...document, _id: undefined, id: document._id.toHexString(), createdAt: document.createdAt.toISOString(),
  updatedAt: document.updatedAt.toISOString(), publishedAt: document.publishedAt?.toISOString() ?? null,
  archivedAt: document.archivedAt?.toISOString() ?? null,
});
export async function createAdminTransparencyDraft(input: { draft: ValidatedAdminTransparencyDraft; pdf: { buffer: Buffer; byteSize: number; sha256: string }; originalFileName: string; actor: AdminPrincipal }) {
  const id = new ObjectId();
  const now = new Date();
  const objectPath = `shalom-house/transparency/${id.toHexString()}/document.pdf`;
  let uploaded: { bucket: string; objectPath: string } | null = null;
  try {
    uploaded = await uploadPrivateTransparencyDocument(objectPath, input.pdf.buffer);
    const document: MongoTransparencyDocument = {
      _id: id, ...metadata(input.draft), file: { ...uploaded, mimeType: "application/pdf", byteSize: input.pdf.byteSize, sha256: input.pdf.sha256, originalFileName: input.originalFileName },
      publicationStatus: "draft", approvalStatus: "pending", publishedAt: null, createdAt: now, updatedAt: now, archivedAt: null, deletedAt: null,
    };
    await transaction(async (database, session) => {
      await database.collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME).insertOne(document, { session });
      await insertTransparencyAuditEvent({ database, session, documentId: id, action: "draft_created", actor: input.actor, occurredAt: now, fromVersionAt: null, toVersionAt: now, before: null, after: createTransparencyAuditSnapshot(document), changedFields: ["slug", "title", "category", "periodLabel", "summary", "documentDate", "privacyReviewStatus", "finalDocumentStatus", "file", "publicationStatus", "approvalStatus"] });
    });
    return { ok: true as const, id: id.toHexString() };
  } catch (error) {
    if (uploaded) try { await removePrivateTransparencyDocument(uploaded.bucket, uploaded.objectPath); } catch (cleanup) { console.error("자료공개 PDF 보상 삭제 실패", { documentId: id.toHexString(), errorName: cleanup instanceof Error ? cleanup.name : "UnknownError" }); }
    const reason = conflict(error);
    if (reason) return { ok: false as const, reason };
    throw error;
  }
}
export async function findAdminTransparencyDocumentById(id: string) {
  if (!isValidAdminTransparencyDocumentId(id)) return null;
  const document = await (await getMongoDatabase()).collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME).findOne({ _id: new ObjectId(id), deletedAt: null });
  if (!document) return null;
  return { ...serialize(document), isEditable: document.publicationStatus === "draft" && (document.approvalStatus === "pending" || document.approvalStatus === "rejected") && document.publishedAt === null && document.archivedAt === null, isArchivable: document.publicationStatus === "draft" && document.publishedAt === null && document.archivedAt === null };
}
export async function listAdminTransparencyDocuments(input: { page: number; category?: TransparencyCategory; privacyReviewStatus?: TransparencyPrivacyReviewStatus; finalDocumentStatus?: TransparencyFinalDocumentStatus; publicationStatus?: TransparencyPublicationStatus }) {
  const filter: Filter<MongoTransparencyDocument> = { deletedAt: null };
  if (input.category) filter.category = input.category;
  if (input.privacyReviewStatus) filter.privacyReviewStatus = input.privacyReviewStatus;
  if (input.finalDocumentStatus) filter.finalDocumentStatus = input.finalDocumentStatus;
  if (input.publicationStatus) filter.publicationStatus = input.publicationStatus;
  const collection = (await getMongoDatabase()).collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME);
  const [documents, total] = await Promise.all([collection.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((input.page - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray(), collection.countDocuments(filter)]);
  return { items: documents.map(serialize), page: input.page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
export async function updateAdminTransparencyDraft(input: { id: string; draft: ValidatedAdminTransparencyDraft; expectedUpdatedAt: Date; actor: AdminPrincipal }) {
  return transaction(async (database, session) => {
    const collection = database.collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME);
    const before = await collection.findOne({ _id: new ObjectId(input.id), deletedAt: null }, { session });
    if (!before) return { ok: false as const, reason: "not_found" as const };
    if (!(before.publicationStatus === "draft" && (before.approvalStatus === "pending" || before.approvalStatus === "rejected") && before.publishedAt === null && before.archivedAt === null)) return { ok: false as const, reason: "not_editable" as const };
    const updatedAt = nextDate(input.expectedUpdatedAt);
    try {
      const result = await collection.findOneAndUpdate({ _id: before._id, updatedAt: input.expectedUpdatedAt }, { $set: { ...metadata(input.draft), updatedAt } }, { session, returnDocument: "after" });
      if (!result) return { ok: false as const, reason: "edit_conflict" as const };
      await insertTransparencyAuditEvent({ database, session, documentId: before._id, action: "draft_updated", actor: input.actor, occurredAt: updatedAt, fromVersionAt: before.updatedAt, toVersionAt: updatedAt, before: createTransparencyAuditSnapshot(before), after: createTransparencyAuditSnapshot(result), changedFields: Object.keys(metadata(input.draft)) });
      return { ok: true as const };
    } catch (error) { const reason = conflict(error); if (reason) return { ok: false as const, reason }; throw error; }
  });
}
export async function archiveAdminTransparencyDraft(input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) {
  return transaction(async (database, session) => {
    const collection = database.collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME);
    const before = await collection.findOne({ _id: new ObjectId(input.id), deletedAt: null }, { session });
    if (!before) return { ok: false as const, reason: "not_found" as const };
    if (!(before.publicationStatus === "draft" && before.publishedAt === null && before.archivedAt === null)) return { ok: false as const, reason: "not_archivable" as const };
    const updatedAt = nextDate(input.expectedUpdatedAt);
    const result = await collection.findOneAndUpdate({ _id: before._id, updatedAt: input.expectedUpdatedAt }, { $set: { publicationStatus: "archived", archivedAt: updatedAt, updatedAt } }, { session, returnDocument: "after" });
    if (!result) return { ok: false as const, reason: "edit_conflict" as const };
    await insertTransparencyAuditEvent({ database, session, documentId: before._id, action: "archived", actor: input.actor, occurredAt: updatedAt, fromVersionAt: before.updatedAt, toVersionAt: updatedAt, before: createTransparencyAuditSnapshot(before), after: createTransparencyAuditSnapshot(result), changedFields: ["publicationStatus", "archivedAt"] });
    return { ok: true as const };
  });
}
