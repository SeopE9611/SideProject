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
  isGalleryConsentReadyForPublication,
  isGalleryPubliclyVisible,
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
  if (!d) return null;
  const editable = d.publicationStatus === "draft" && (d.approvalStatus === "pending" || d.approvalStatus === "rejected") && d.publishedAt === null && d.archivedAt === null;
  return { ...serialize(d), isEditable: editable, canRequestReview: editable, canDecideReview: d.publicationStatus === "review" && d.approvalStatus === "pending" && d.publishedAt === null && d.archivedAt === null, canPublish: d.publicationStatus === "review" && d.approvalStatus === "approved" && d.publishedAt === null && d.archivedAt === null && isGalleryConsentReadyForPublication(d), canManagePublicationState: d.publicationStatus === "published" && d.approvalStatus === "approved" && d.publishedAt !== null && d.archivedAt === null, canWithdrawConsent: d.subjectPresence === "identifiable" && d.consentStatus === "confirmed" && Boolean(d.consentCheckedOn) && Boolean(d.consentReferenceCode) && d.consentWithdrawnAt === null && d.archivedAt === null, isPubliclyVisible: isGalleryPubliclyVisible(d) };
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

type TransitionInput = { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal };
type TransitionSpec = { action: import("./gallery.audit").GalleryAuditAction; stateFilter: Filter<MongoGalleryItemDocument>; set: Partial<MongoGalleryItemDocument>; changedFields: string[]; invalid: "not_requestable"|"not_decidable"|"not_publishable"|"not_manageable"|"consent_not_withdrawable" };
async function galleryTransition(input: TransitionInput, make: (now: Date) => TransitionSpec) {
  if (!isValidAdminGalleryItemId(input.id)) return { ok: false as const, reason: "not_found" as const };
  const id = new ObjectId(input.id), now = nextDate(input.expectedUpdatedAt), spec = make(now);
  return transaction(async (db, session) => {
    const collection = db.collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME);
    const before = await collection.findOneAndUpdate({ _id: id, deletedAt: { $in: [null, undefined] }, archivedAt: null, updatedAt: input.expectedUpdatedAt, ...spec.stateFilter }, { $set: { ...spec.set, updatedAt: now } }, { returnDocument: "before", session });
    if (before) {
      const after = { ...before, ...spec.set, updatedAt: now } as MongoGalleryItemDocument;
      await insertGalleryAuditEvent({ database: db, session, galleryItemId: id, action: spec.action, actor: input.actor, occurredAt: now, fromVersionAt: before.updatedAt, toVersionAt: now, before: createGalleryAuditSnapshot(before), after: createGalleryAuditSnapshot(after), changedFields: spec.changedFields });
      return { ok: true as const, id: input.id, updatedAt: now.toISOString(), slug: after.slug };
    }
    const current = await collection.findOne({ _id: id, deletedAt: { $in: [null, undefined] } }, { session });
    if (!current) return { ok: false as const, reason: "not_found" as const };
    const stateMatches = Object.entries(spec.stateFilter).every(([key, wanted]) => { const actual = current[key as keyof MongoGalleryItemDocument]; return wanted && typeof wanted === "object" && "$in" in wanted ? (wanted.$in as unknown[]).includes(actual) : wanted && typeof wanted === "object" && "$ne" in wanted ? actual !== wanted.$ne : actual === wanted; });
    return { ok: false as const, reason: stateMatches ? "edit_conflict" as const : spec.invalid };
  });
}
export const requestAdminGalleryReview = (input: TransitionInput) => galleryTransition(input, () => ({ action: "review_requested", stateFilter: { publicationStatus: "draft", approvalStatus: { $in: ["pending", "rejected"] }, publishedAt: null }, set: { publicationStatus: "review", approvalStatus: "pending" }, changedFields: ["publicationStatus", "approvalStatus"], invalid: "not_requestable" }));
export const decideAdminGalleryReview = (input: TransitionInput & { decision: "approve"|"reject" }) => galleryTransition(input, () => input.decision === "approve" ? ({ action: "review_approved", stateFilter: { publicationStatus: "review", approvalStatus: "pending", publishedAt: null }, set: { approvalStatus: "approved" }, changedFields: ["approvalStatus"], invalid: "not_decidable" }) : ({ action: "review_rejected", stateFilter: { publicationStatus: "review", approvalStatus: "pending", publishedAt: null }, set: { publicationStatus: "draft", approvalStatus: "rejected" }, changedFields: ["publicationStatus", "approvalStatus"], invalid: "not_decidable" }));
export async function publishAdminGalleryItem(input: TransitionInput) {
  const item = await findAdminGalleryItemById(input.id);
  if (item && item.publicationStatus === "review" && item.approvalStatus === "approved" && !isGalleryConsentReadyForPublication({ ...item, consentWithdrawnAt: item.consentWithdrawnAt ? new Date(item.consentWithdrawnAt) : null })) return { ok: false as const, reason: "consent_not_ready" as const };
  return galleryTransition(input, now => ({ action: "published", stateFilter: { publicationStatus: "review", approvalStatus: "approved", publishedAt: null, consentWithdrawnAt: null, $or: [{ subjectPresence:{ $in:["none","non_identifiable"] }, consentStatus:"not_required", consentCheckedOn:null, consentReferenceCode:null }, { subjectPresence:"identifiable", consentStatus:"confirmed", consentCheckedOn:{ $ne:null }, consentReferenceCode:{ $ne:null } }] }, set: { publicationStatus: "published", publishedAt: now }, changedFields: ["publicationStatus", "publishedAt"], invalid: "not_publishable" }));
}
export const changeAdminGalleryPublicationState = (input: TransitionInput & { action: "unpublish" }) => galleryTransition(input, () => ({ action: "unpublished", stateFilter: { publicationStatus: "published", approvalStatus: "approved", publishedAt: { $ne: null } }, set: { publicationStatus: "review", publishedAt: null }, changedFields: ["publicationStatus", "publishedAt"], invalid: "not_manageable" }));
export async function withdrawAdminGalleryConsent(input: TransitionInput) {
  if (!isValidAdminGalleryItemId(input.id)) return { ok: false as const, reason: "not_found" as const };
  const id = new ObjectId(input.id), now = nextDate(input.expectedUpdatedAt);
  return transaction(async (db, session) => {
    const c = db.collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME);
    const current = await c.findOne({ _id:id, deletedAt:{ $in:[null,undefined] } }, { session });
    if (!current) return { ok:false as const, reason:"not_found" as const };
    const withdrawable = current.subjectPresence === "identifiable" && current.consentStatus === "confirmed" && Boolean(current.consentCheckedOn) && Boolean(current.consentReferenceCode) && current.consentWithdrawnAt === null && current.archivedAt === null;
    if (!withdrawable) return { ok:false as const, reason:"consent_not_withdrawable" as const };
    const published = current.publicationStatus === "published";
    const set: Partial<MongoGalleryItemDocument> = { consentStatus:"withdrawn", consentWithdrawnAt:now, updatedAt:now, ...(published ? { publicationStatus:"review", publishedAt:null } : {}) };
    const before = await c.findOneAndUpdate({ _id:id, deletedAt:{ $in:[null,undefined] }, archivedAt:null, subjectPresence:"identifiable", consentStatus:"confirmed", consentCheckedOn:current.consentCheckedOn, consentReferenceCode:current.consentReferenceCode, consentWithdrawnAt:null, publicationStatus:current.publicationStatus, approvalStatus:current.approvalStatus, publishedAt:current.publishedAt, updatedAt:input.expectedUpdatedAt }, { $set:set }, { returnDocument:"before", session });
    if (!before) return { ok:false as const, reason:"edit_conflict" as const };
    const after = { ...before, ...set } as MongoGalleryItemDocument;
    await insertGalleryAuditEvent({ database:db, session, galleryItemId:id, action:"consent_withdrawn", actor:input.actor, occurredAt:now, fromVersionAt:before.updatedAt, toVersionAt:now, before:createGalleryAuditSnapshot(before), after:createGalleryAuditSnapshot(after), changedFields:["consentStatus","consentWithdrawnAt",...(published ? ["publicationStatus","publishedAt"] : [])] });
    return { ok:true as const, id:input.id, slug:after.slug, updatedAt:now.toISOString() };
  });
}
