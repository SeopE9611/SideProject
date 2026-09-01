import "server-only";
import { MongoServerError, ObjectId, type Filter } from "mongodb";
import type { AdminPrincipal } from "../admin-auth/admin-auth.types";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";
import type { ValidatedAdminTransparencyDraft } from "./transparency.admin-validation";
import { createTransparencyAuditSnapshot } from "./transparency.audit";
import { insertTransparencyAuditEvent } from "./transparency.audit-repository";
import { TRANSPARENCY_DOCUMENT_COLLECTION_NAME, type MongoTransparencyDocument } from "./transparency.mongo-schema";
import { removePrivateTransparencyDocument, uploadPrivateTransparencyDocument } from "./transparency.storage";
import {
  isTransparencyReadyForPublication,
  type TransparencyCategory,
  type TransparencyFinalDocumentStatus,
  type TransparencyPrivacyReviewStatus,
  type TransparencyPublicationStatus,
} from "./transparency.types";
const PAGE_SIZE = 20;
export const isValidAdminTransparencyDocumentId = (id: unknown): id is string =>
  typeof id === "string" && /^[a-f0-9]{24}$/.test(id) && ObjectId.isValid(id);
export const normalizeAdminTransparencyPage = (value: unknown) =>
  typeof value === "string" && /^\d+$/.test(value) ? Math.min(10000, Math.max(1, Number(value))) : 1;
const nextDate = (expected: Date) => new Date(Math.max(Date.now(), expected.getTime() + 1));
const metadata = (draft: ValidatedAdminTransparencyDraft) => ({ ...draft });
async function transaction<T>(
  work: (
    db: Awaited<ReturnType<typeof getMongoDatabase>>,
    session: ReturnType<Awaited<ReturnType<typeof getMongoClient>>["startSession"]>,
  ) => Promise<T>,
) {
  const client = await getMongoClient();
  const database = await getMongoDatabase();
  const session = client.startSession();
  try {
    return await session.withTransaction(() => work(database, session), {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
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
  ...document,
  _id: undefined,
  id: document._id.toHexString(),
  createdAt: document.createdAt.toISOString(),
  updatedAt: document.updatedAt.toISOString(),
  publishedAt: document.publishedAt?.toISOString() ?? null,
  archivedAt: document.archivedAt?.toISOString() ?? null,
});
export async function createAdminTransparencyDraft(input: {
  draft: ValidatedAdminTransparencyDraft;
  pdf: { buffer: Buffer; byteSize: number; sha256: string };
  originalFileName: string;
  actor: AdminPrincipal;
}) {
  const id = new ObjectId();
  const now = new Date();
  const objectPath = `shalom-house/transparency/${id.toHexString()}/document.pdf`;
  let uploaded: { bucket: string; objectPath: string } | null = null;
  try {
    uploaded = await uploadPrivateTransparencyDocument(objectPath, input.pdf.buffer);
    const document: MongoTransparencyDocument = {
      _id: id,
      ...metadata(input.draft),
      file: {
        ...uploaded,
        mimeType: "application/pdf",
        byteSize: input.pdf.byteSize,
        sha256: input.pdf.sha256,
        originalFileName: input.originalFileName,
      },
      publicationStatus: "draft",
      approvalStatus: "pending",
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      deletedAt: null,
    };
    await transaction(async (database, session) => {
      await database
        .collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME)
        .insertOne(document, { session });
      await insertTransparencyAuditEvent({
        database,
        session,
        documentId: id,
        action: "draft_created",
        actor: input.actor,
        occurredAt: now,
        fromVersionAt: null,
        toVersionAt: now,
        before: null,
        after: createTransparencyAuditSnapshot(document),
        changedFields: [
          "slug",
          "title",
          "category",
          "periodLabel",
          "summary",
          "documentDate",
          "privacyReviewStatus",
          "finalDocumentStatus",
          "file",
          "publicationStatus",
          "approvalStatus",
        ],
      });
    });
    return { ok: true as const, id: id.toHexString() };
  } catch (error) {
    if (uploaded)
      try {
        await removePrivateTransparencyDocument(uploaded.bucket, uploaded.objectPath);
      } catch (cleanup) {
        console.error("자료공개 PDF 보상 삭제 실패", {
          documentId: id.toHexString(),
          errorName: cleanup instanceof Error ? cleanup.name : "UnknownError",
        });
      }
    const reason = conflict(error);
    if (reason) return { ok: false as const, reason };
    throw error;
  }
}
export async function findAdminTransparencyDocumentById(id: string) {
  if (!isValidAdminTransparencyDocumentId(id)) return null;
  const document = await (
    await getMongoDatabase()
  )
    .collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id), deletedAt: null });
  if (!document) return null;
  const requestable = isRequestable(document);
  const now = new Date();
  const isPubliclyVisible =
    isManageable(document) &&
    document.publishedAt!.getTime() <= now.getTime() &&
    isTransparencyReadyForPublication(document);
  const publicVisibilityReason = isPubliclyVisible
    ? null
    : document.privacyReviewStatus !== "confirmed"
      ? "개인정보 검토 미완료"
      : document.finalDocumentStatus !== "final"
        ? "최종본 미확정"
        : document.approvalStatus === "rejected"
          ? "반려됨"
          : document.approvalStatus === "pending" && document.publicationStatus === "review"
            ? "승인 대기"
            : document.publicationStatus === "draft"
              ? "초안 작성 중"
              : document.publicationStatus === "review" && document.approvalStatus === "approved"
                ? "게시 중단됨"
                : "현재 공개되지 않음";
  return {
    ...serialize(document),
    isEditable: requestable,
    isArchivable:
      document.publicationStatus === "draft" && document.publishedAt === null && document.archivedAt === null,
    canRequestReview: requestable && isTransparencyReadyForPublication(document),
    canDecideReview: isDecidable(document),
    canPublish: isPublishable(document) && isTransparencyReadyForPublication(document),
    canManagePublicationState: isManageable(document),
    isPubliclyVisible,
    publicVisibilityReason,
  };
}
export async function listAdminTransparencyDocuments(input: {
  page: number;
  category?: TransparencyCategory;
  privacyReviewStatus?: TransparencyPrivacyReviewStatus;
  finalDocumentStatus?: TransparencyFinalDocumentStatus;
  publicationStatus?: TransparencyPublicationStatus;
}) {
  const filter: Filter<MongoTransparencyDocument> = { deletedAt: null };
  if (input.category) filter.category = input.category;
  if (input.privacyReviewStatus) filter.privacyReviewStatus = input.privacyReviewStatus;
  if (input.finalDocumentStatus) filter.finalDocumentStatus = input.finalDocumentStatus;
  if (input.publicationStatus) filter.publicationStatus = input.publicationStatus;
  const collection = (await getMongoDatabase()).collection<MongoTransparencyDocument>(
    TRANSPARENCY_DOCUMENT_COLLECTION_NAME,
  );
  const [documents, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((input.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
    collection.countDocuments(filter),
  ]);
  return {
    items: documents.map(serialize),
    page: input.page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
export async function updateAdminTransparencyDraft(input: {
  id: string;
  draft: ValidatedAdminTransparencyDraft;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
}) {
  return transaction(async (database, session) => {
    const collection = database.collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME);
    const before = await collection.findOne({ _id: new ObjectId(input.id), deletedAt: null }, { session });
    if (!before) return { ok: false as const, reason: "not_found" as const };
    if (!(
      before.publicationStatus === "draft" &&
      (before.approvalStatus === "pending" || before.approvalStatus === "rejected") &&
      before.publishedAt === null &&
      before.archivedAt === null
    ))
      return { ok: false as const, reason: "not_editable" as const };
    const updatedAt = nextDate(input.expectedUpdatedAt);
    try {
      const result = await collection.findOneAndUpdate(
        { _id: before._id, updatedAt: input.expectedUpdatedAt },
        { $set: { ...metadata(input.draft), updatedAt } },
        { session, returnDocument: "after" },
      );
      if (!result) return { ok: false as const, reason: "edit_conflict" as const };
      await insertTransparencyAuditEvent({
        database,
        session,
        documentId: before._id,
        action: "draft_updated",
        actor: input.actor,
        occurredAt: updatedAt,
        fromVersionAt: before.updatedAt,
        toVersionAt: updatedAt,
        before: createTransparencyAuditSnapshot(before),
        after: createTransparencyAuditSnapshot(result),
        changedFields: Object.keys(metadata(input.draft)),
      });
      return { ok: true as const };
    } catch (error) {
      const reason = conflict(error);
      if (reason) return { ok: false as const, reason };
      throw error;
    }
  });
}
export async function archiveAdminTransparencyDraft(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
}) {
  return transaction(async (database, session) => {
    const collection = database.collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME);
    const before = await collection.findOne({ _id: new ObjectId(input.id), deletedAt: null }, { session });
    if (!before) return { ok: false as const, reason: "not_found" as const };
    if (!(before.publicationStatus === "draft" && before.publishedAt === null && before.archivedAt === null))
      return { ok: false as const, reason: "not_archivable" as const };
    const updatedAt = nextDate(input.expectedUpdatedAt);
    const result = await collection.findOneAndUpdate(
      { _id: before._id, updatedAt: input.expectedUpdatedAt },
      {
        $set: {
          publicationStatus: "archived",
          archivedAt: updatedAt,
          updatedAt,
        },
      },
      { session, returnDocument: "after" },
    );
    if (!result) return { ok: false as const, reason: "edit_conflict" as const };
    await insertTransparencyAuditEvent({
      database,
      session,
      documentId: before._id,
      action: "archived",
      actor: input.actor,
      occurredAt: updatedAt,
      fromVersionAt: before.updatedAt,
      toVersionAt: updatedAt,
      before: createTransparencyAuditSnapshot(before),
      after: createTransparencyAuditSnapshot(result),
      changedFields: ["publicationStatus", "archivedAt"],
    });
    return { ok: true as const };
  });
}

const isValidDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());
const isRequestable = (document: MongoTransparencyDocument) =>
  document.publicationStatus === "draft" &&
  (document.approvalStatus === "pending" || document.approvalStatus === "rejected") &&
  document.publishedAt === null &&
  document.archivedAt === null &&
  document.deletedAt === null;
const isDecidable = (document: MongoTransparencyDocument) =>
  document.publicationStatus === "review" &&
  document.approvalStatus === "pending" &&
  document.publishedAt === null &&
  document.archivedAt === null &&
  document.deletedAt === null;
const isPublishable = (document: MongoTransparencyDocument) =>
  document.publicationStatus === "review" &&
  document.approvalStatus === "approved" &&
  document.publishedAt === null &&
  document.archivedAt === null &&
  document.deletedAt === null;
const isManageable = (document: MongoTransparencyDocument) =>
  document.publicationStatus === "published" &&
  document.approvalStatus === "approved" &&
  isValidDate(document.publishedAt) &&
  document.archivedAt === null &&
  document.deletedAt === null;
type TransitionReason = "not_requestable" | "not_decidable" | "not_publishable" | "not_manageable";
async function transitionDocument(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  predicate: (document: MongoTransparencyDocument) => boolean;
  stateReason: TransitionReason;
  readinessReason?: "not_ready_for_review" | "not_ready_for_publication";
  action: "review_requested" | "review_approved" | "review_rejected" | "published" | "unpublished";
  filter: Filter<MongoTransparencyDocument>;
  set: (nextUpdatedAt: Date) => Partial<MongoTransparencyDocument>;
  changedFields: string[];
}) {
  return transaction(async (database, session) => {
    const collection = database.collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME);
    const id = new ObjectId(input.id);
    const before = await collection.findOne({ _id: id, deletedAt: null }, { session });
    if (!before) return { ok: false as const, reason: "not_found" as const };
    if (!input.predicate(before)) return { ok: false as const, reason: input.stateReason };
    if (input.readinessReason && !isTransparencyReadyForPublication(before))
      return { ok: false as const, reason: input.readinessReason };
    const nextUpdatedAt = nextDate(input.expectedUpdatedAt);
    const result = await collection.findOneAndUpdate(
      { _id: id, ...input.filter, updatedAt: input.expectedUpdatedAt },
      { $set: input.set(nextUpdatedAt) },
      { session, returnDocument: "after" },
    );
    if (!result) {
      const current = await collection.findOne({ _id: id, deletedAt: null }, { session });
      if (!current) return { ok: false as const, reason: "not_found" as const };
      if (!input.predicate(current)) return { ok: false as const, reason: input.stateReason };
      if (input.readinessReason && !isTransparencyReadyForPublication(current))
        return { ok: false as const, reason: input.readinessReason };
      if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
        return { ok: false as const, reason: "edit_conflict" as const };
      return { ok: false as const, reason: "edit_conflict" as const };
    }
    await insertTransparencyAuditEvent({
      database,
      session,
      documentId: id,
      action: input.action,
      actor: input.actor,
      occurredAt: nextUpdatedAt,
      fromVersionAt: before.updatedAt,
      toVersionAt: nextUpdatedAt,
      before: createTransparencyAuditSnapshot(before),
      after: createTransparencyAuditSnapshot(result),
      changedFields: input.changedFields,
    });
    return { ok: true as const };
  });
}
export function requestAdminTransparencyReview(input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) {
  return transitionDocument({
    ...input,
    predicate: isRequestable,
    stateReason: "not_requestable",
    readinessReason: "not_ready_for_review",
    action: "review_requested",
    filter: {
      publicationStatus: "draft",
      approvalStatus: { $in: ["pending", "rejected"] },
      publishedAt: null,
      archivedAt: null,
      deletedAt: null,
      privacyReviewStatus: "confirmed",
      finalDocumentStatus: "final",
    },
    set: (updatedAt) => ({
      publicationStatus: "review",
      approvalStatus: "pending",
      updatedAt,
    }),
    changedFields: ["publicationStatus", "approvalStatus"],
  });
}
export function decideAdminTransparencyReview(input: {
  id: string;
  expectedUpdatedAt: Date;
  decision: "approve" | "reject";
  actor: AdminPrincipal;
}) {
  return transitionDocument({
    ...input,
    predicate: isDecidable,
    stateReason: "not_decidable",
    action: input.decision === "approve" ? "review_approved" : "review_rejected",
    filter: {
      publicationStatus: "review",
      approvalStatus: "pending",
      publishedAt: null,
      archivedAt: null,
      deletedAt: null,
    },
    set: (updatedAt) =>
      input.decision === "approve"
        ? { approvalStatus: "approved", updatedAt }
        : { publicationStatus: "draft", approvalStatus: "rejected", updatedAt },
    changedFields: input.decision === "approve" ? ["approvalStatus"] : ["publicationStatus", "approvalStatus"],
  });
}
export function publishAdminTransparencyDocument(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
}) {
  return transitionDocument({
    ...input,
    predicate: isPublishable,
    stateReason: "not_publishable",
    readinessReason: "not_ready_for_publication",
    action: "published",
    filter: {
      publicationStatus: "review",
      approvalStatus: "approved",
      publishedAt: null,
      archivedAt: null,
      deletedAt: null,
      privacyReviewStatus: "confirmed",
      finalDocumentStatus: "final",
    },
    set: (now) => ({
      publicationStatus: "published",
      publishedAt: now,
      updatedAt: now,
    }),
    changedFields: ["publicationStatus", "publishedAt"],
  });
}
export function changeAdminTransparencyPublicationState(input: {
  id: string;
  expectedUpdatedAt: Date;
  action: "unpublish";
  actor: AdminPrincipal;
}) {
  return transitionDocument({
    ...input,
    predicate: isManageable,
    stateReason: "not_manageable",
    action: "unpublished",
    filter: {
      publicationStatus: "published",
      approvalStatus: "approved",
      publishedAt: { $type: "date" },
      archivedAt: null,
      deletedAt: null,
    },
    set: (updatedAt) => ({
      publicationStatus: "review",
      publishedAt: null,
      updatedAt,
    }),
    changedFields: ["publicationStatus", "publishedAt"],
  });
}

export type AdminTransparencyTrashResult =
  | { ok: true; id: string; updatedAt: string }
  | {
      ok: false;
      reason:
        "not_found" | "not_deletable" | "not_restorable" | "edit_conflict" | "slug_conflict" | "document_duplicate";
    };
async function changeAdminTransparencyTrashState(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  restore: boolean;
}): Promise<AdminTransparencyTrashResult> {
  if (!isValidAdminTransparencyDocumentId(input.id)) return { ok: false, reason: "not_found" };
  const id = new ObjectId(input.id);
  try {
    return await transaction(async (database, session) => {
      const collection = database.collection<MongoTransparencyDocument>(TRANSPARENCY_DOCUMENT_COLLECTION_NAME),
        current = await collection.findOne({ _id: id }, { session });
      if (!current) return { ok: false, reason: "not_found" } as const;
      const deleted = current.deletedAt instanceof Date && !Number.isNaN(current.deletedAt.getTime());
      if (input.restore ? !deleted : deleted)
        return {
          ok: false,
          reason: input.restore ? "not_restorable" : "not_deletable",
        } as const;
      if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
        return { ok: false, reason: "edit_conflict" } as const;
      if (input.restore) {
        const duplicate = await collection.findOne(
          {
            _id: { $ne: id },
            deletedAt: null,
            $or: [{ slug: current.slug }, { "file.sha256": current.file.sha256 }],
          },
          { session, projection: { slug: 1, "file.sha256": 1 } },
        );
        if (duplicate?.slug === current.slug) return { ok: false, reason: "slug_conflict" } as const;
        if (duplicate) return { ok: false, reason: "document_duplicate" } as const;
      }
      const transitionAt = nextDate(input.expectedUpdatedAt);
      const after = await collection.findOneAndUpdate(
        {
          _id: id,
          updatedAt: input.expectedUpdatedAt,
          deletedAt: input.restore ? { $type: "date" } : null,
        },
        {
          $set: {
            deletedAt: input.restore ? null : transitionAt,
            archivedAt: input.restore ? null : transitionAt,
            publicationStatus: input.restore ? "draft" : "archived",
            approvalStatus: "pending",
            publishedAt: null,
            updatedAt: transitionAt,
          },
        },
        { session, returnDocument: "after" },
      );
      if (!after) return { ok: false, reason: "edit_conflict" } as const;
      await insertTransparencyAuditEvent({
        database,
        session,
        documentId: id,
        action: input.restore ? "restored" : "soft_deleted",
        actor: input.actor,
        occurredAt: transitionAt,
        fromVersionAt: current.updatedAt,
        toVersionAt: transitionAt,
        before: createTransparencyAuditSnapshot(current),
        after: createTransparencyAuditSnapshot(after),
        changedFields: ["deletedAt", "archivedAt", "publicationStatus", "approvalStatus", "publishedAt"],
      });
      return {
        ok: true,
        id: input.id,
        updatedAt: transitionAt.toISOString(),
      } as const;
    });
  } catch (error) {
    const reason = conflict(error);
    if (reason === "slug_conflict") return { ok: false, reason };
    if (reason === "document_duplicate") return { ok: false, reason };
    throw error;
  }
}
export const softDeleteAdminTransparencyDocument = (input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
}) => changeAdminTransparencyTrashState({ ...input, restore: false });
export const restoreAdminTransparencyDocument = (input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
}) => changeAdminTransparencyTrashState({ ...input, restore: true });
