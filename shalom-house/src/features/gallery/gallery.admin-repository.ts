import "server-only";
import { MongoServerError, ObjectId, type Filter } from "mongodb";
import type { AdminPrincipal } from "../admin-auth/admin-auth.types";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";
import type { ValidatedAdminGalleryDraft } from "./gallery.admin-validation";
import { createGalleryAuditSnapshot } from "./gallery.audit";
import { insertGalleryAuditEvent } from "./gallery.audit-repository";
import {
  GALLERY_ITEM_COLLECTION_NAME,
  type MongoGalleryItemDocument,
} from "./gallery.mongo-schema";
import {
  removePrivateGalleryImage,
  uploadPrivateGalleryImage,
} from "./gallery.storage";
import {
  isGalleryConsentStatus,
  isGalleryPublicationStatus,
  isGallerySubjectPresence,
  type GalleryConsentStatus,
  type GalleryPublicationStatus,
  type GallerySubjectPresence,
} from "./gallery.types";
const PAGE_SIZE = 20;
export const isValidAdminGalleryItemId = (id: unknown): id is string =>
  typeof id === "string" &&
  ObjectId.isValid(id) &&
  new ObjectId(id).toHexString() === id.toLowerCase();
export const normalizeAdminGalleryPage = (v: unknown) =>
  typeof v === "string" && /^\d+$/.test(v)
    ? Math.min(10000, Math.max(1, Number(v)))
    : 1;
const nextDate = (expected: Date) =>
  new Date(Math.max(Date.now(), expected.getTime() + 1));
function metadata(d: ValidatedAdminGalleryDraft) {
  return {
    slug: d.slug,
    title: d.title,
    category: d.category,
    description: d.description,
    altText: d.altText,
    activityDate: d.activityDate,
    subjectPresence: d.subjectPresence,
    consentStatus: d.consentStatus,
    consentCheckedOn: d.consentCheckedOn,
    consentReferenceCode: d.consentReferenceCode,
    displayStartOn: d.displayStartOn,
    displayEndOn: d.displayEndOn,
  };
}
async function transaction<T>(
  work: (
    db: Awaited<ReturnType<typeof getMongoDatabase>>,
    session: ReturnType<
      Awaited<ReturnType<typeof getMongoClient>>["startSession"]
    >,
  ) => Promise<T>,
) {
  const client = await getMongoClient(),
    db = await getMongoDatabase(),
    session = client.startSession();
  try {
    return await session.withTransaction(() => work(db, session), {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
  } finally {
    await session.endSession();
  }
}
function conflict(e: unknown): "slug_conflict" | "image_duplicate" | null {
  if (!(e instanceof MongoServerError) || e.code !== 11000) return null;
  return e.keyPattern?.slug === 1
    ? "slug_conflict"
    : e.keyPattern?.["media.sha256"] === 1
      ? "image_duplicate"
      : null;
}
export async function createAdminGalleryDraft(input: {
  draft: ValidatedAdminGalleryDraft;
  image: {
    buffer: Buffer;
    width: number;
    height: number;
    byteSize: number;
    sha256: string;
  };
  originalFileName: string;
  actor: AdminPrincipal;
}) {
  const id = new ObjectId(),
    now = new Date(),
    objectPath = `shalom-house/gallery/${id.toHexString()}/image.webp`;
  let uploaded: { bucket: string; objectPath: string } | null = null;
  try {
    uploaded = await uploadPrivateGalleryImage(objectPath, input.image.buffer);
    const document: MongoGalleryItemDocument = {
      _id: id,
      ...metadata(input.draft),
      media: {
        ...uploaded,
        mimeType: "image/webp",
        byteSize: input.image.byteSize,
        width: input.image.width,
        height: input.image.height,
        sha256: input.image.sha256,
        originalFileName: input.originalFileName,
      },
      publicationStatus: "draft",
      approvalStatus: "pending",
      publishedAt: null,
      consentWithdrawnAt: null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      deletedAt: null,
    };
    await transaction(async (db, session) => {
      await db
        .collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME)
        .insertOne(document, { session });
      await insertGalleryAuditEvent({
        database: db,
        session,
        galleryItemId: id,
        action: "draft_created",
        actor: input.actor,
        occurredAt: now,
        fromVersionAt: null,
        toVersionAt: now,
        before: null,
        after: createGalleryAuditSnapshot(document),
        changedFields: [
          "slug",
          "title",
          "category",
          "description",
          "altText",
          "activityDate",
          "subjectPresence",
          "consentStatus",
          "consentCheckedOn",
          "consentReferenceCode",
          "displayStartOn",
          "displayEndOn",
          "media",
          "publicationStatus",
          "approvalStatus",
        ],
      });
    });
    return { ok: true as const, id: id.toHexString() };
  } catch (error) {
    if (uploaded) {
      try {
        await removePrivateGalleryImage(uploaded.bucket, uploaded.objectPath);
      } catch (cleanup) {
        console.error("활동사진 보상 삭제 실패", {
          galleryItemId: id.toHexString(),
          objectPath,
          errorName: cleanup instanceof Error ? cleanup.name : "UnknownError",
        });
      }
    }
    const reason = conflict(error);
    if (reason) return { ok: false as const, reason };
    throw error;
  }
}
function serialize(d: MongoGalleryItemDocument) {
  return {
    id: d._id.toHexString(),
    ...d,
    _id: undefined,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    publishedAt: d.publishedAt?.toISOString() ?? null,
    consentWithdrawnAt: d.consentWithdrawnAt?.toISOString() ?? null,
    archivedAt: d.archivedAt?.toISOString() ?? null,
  };
}
export async function findAdminGalleryItemById(id: string) {
  if (!isValidAdminGalleryItemId(id)) return null;
  const d = await (await getMongoDatabase())
    .collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id), deletedAt: { $in: [null, undefined] } });
  return d ? serialize(d) : null;
}
export async function listAdminGalleryItems(input: {
  page: number;
  subjectPresence?: GallerySubjectPresence;
  consentStatus?: GalleryConsentStatus;
  publicationStatus?: GalleryPublicationStatus;
}) {
  const db = await getMongoDatabase(),
    filter: Filter<MongoGalleryItemDocument> = {
      deletedAt: { $in: [null, undefined] },
    };
  if (isGallerySubjectPresence(input.subjectPresence))
    filter.subjectPresence = input.subjectPresence;
  if (isGalleryConsentStatus(input.consentStatus))
    filter.consentStatus = input.consentStatus;
  if (isGalleryPublicationStatus(input.publicationStatus))
    filter.publicationStatus = input.publicationStatus;
  const c = db.collection<MongoGalleryItemDocument>(
      GALLERY_ITEM_COLLECTION_NAME,
    ),
    totalItems = await c.countDocuments(filter),
    totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE)),
    page = Math.min(input.page, totalPages),
    docs = await c
      .find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray();
  return { items: docs.map(serialize), page, totalPages, totalItems };
}
export async function updateAdminGalleryDraft(input: {
  id: string;
  draft: ValidatedAdminGalleryDraft;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
}) {
  if (!isValidAdminGalleryItemId(input.id))
    return { ok: false as const, reason: "not_found" as const };
  const id = new ObjectId(input.id),
    nextUpdatedAt = nextDate(input.expectedUpdatedAt);
  try {
    return await transaction(async (db, session) => {
      const c = db.collection<MongoGalleryItemDocument>(
          GALLERY_ITEM_COLLECTION_NAME,
        ),
        before = await c.findOne(
          { _id: id, deletedAt: { $in: [null, undefined] } },
          { session },
        );
      if (!before) return { ok: false as const, reason: "not_found" as const };
      if (
        before.publicationStatus !== "draft" ||
        !(["pending", "rejected"] as string[]).includes(
          before.approvalStatus,
        ) ||
        before.publishedAt !== null ||
        before.archivedAt !== null
      )
        return { ok: false as const, reason: "not_editable" as const };
      const result = await c.findOneAndUpdate(
        { _id: id, updatedAt: input.expectedUpdatedAt },
        { $set: { ...metadata(input.draft), updatedAt: nextUpdatedAt } },
        { returnDocument: "after", session },
      );
      if (!result)
        return { ok: false as const, reason: "edit_conflict" as const };
      await insertGalleryAuditEvent({
        database: db,
        session,
        galleryItemId: id,
        action: "draft_updated",
        actor: input.actor,
        occurredAt: nextUpdatedAt,
        fromVersionAt: before.updatedAt,
        toVersionAt: nextUpdatedAt,
        before: createGalleryAuditSnapshot(before),
        after: createGalleryAuditSnapshot(result),
        changedFields: Object.keys(metadata(input.draft)).filter(
          (k) =>
            before[k as keyof MongoGalleryItemDocument] !==
            input.draft[k as keyof ValidatedAdminGalleryDraft],
        ),
      });
      return {
        ok: true as const,
        id: input.id,
        updatedAt: nextUpdatedAt.toISOString(),
      };
    });
  } catch (e) {
    if (conflict(e) === "slug_conflict")
      return { ok: false as const, reason: "slug_conflict" as const };
    throw e;
  }
}
export async function archiveAdminGalleryDraft(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
}) {
  if (!isValidAdminGalleryItemId(input.id))
    return { ok: false as const, reason: "not_found" as const };
  const id = new ObjectId(input.id),
    now = nextDate(input.expectedUpdatedAt);
  return transaction(async (db, session) => {
    const c = db.collection<MongoGalleryItemDocument>(
        GALLERY_ITEM_COLLECTION_NAME,
      ),
      before = await c.findOne(
        { _id: id, deletedAt: { $in: [null, undefined] } },
        { session },
      );
    if (!before) return { ok: false as const, reason: "not_found" as const };
    if (
      before.publicationStatus !== "draft" ||
      before.publishedAt !== null ||
      before.archivedAt !== null
    )
      return { ok: false as const, reason: "not_archivable" as const };
    const after = await c.findOneAndUpdate(
      { _id: id, updatedAt: input.expectedUpdatedAt },
      {
        $set: {
          publicationStatus: "archived",
          archivedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after", session },
    );
    if (!after) return { ok: false as const, reason: "edit_conflict" as const };
    await insertGalleryAuditEvent({
      database: db,
      session,
      galleryItemId: id,
      action: "archived",
      actor: input.actor,
      occurredAt: now,
      fromVersionAt: before.updatedAt,
      toVersionAt: now,
      before: createGalleryAuditSnapshot(before),
      after: createGalleryAuditSnapshot(after),
      changedFields: ["publicationStatus", "archivedAt"],
    });
    return { ok: true as const, id: input.id, updatedAt: now.toISOString() };
  });
}
