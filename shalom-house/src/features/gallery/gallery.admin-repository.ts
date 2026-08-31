import "server-only";
import { MongoServerError, ObjectId, type Filter } from "mongodb";
import type { AdminPrincipal } from "../admin-auth/admin-auth.types";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";
import type { ValidatedAdminGalleryDraft } from "./gallery.admin-validation";
import {
  createGalleryAuditSnapshot,
  type GalleryAuditAction,
} from "./gallery.audit";
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
  isGalleryConsentWithdrawable,
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
  return {
    ...serialize(d),
    isEditable: editable,
    isArchivable: d.publicationStatus === "draft" && d.publishedAt === null && d.archivedAt === null && d.deletedAt == null,
    canRequestReview: editable,
    canDecideReview:
      d.publicationStatus === "review" &&
      d.approvalStatus === "pending" &&
      d.publishedAt === null &&
      d.archivedAt === null,
    canPublish:
      d.publicationStatus === "review" &&
      d.approvalStatus === "approved" &&
      d.publishedAt === null &&
      d.archivedAt === null &&
      isGalleryConsentReadyForPublication(d),
    canManagePublicationState:
      d.publicationStatus === "published" &&
      d.approvalStatus === "approved" &&
      d.publishedAt instanceof Date &&
      !Number.isNaN(d.publishedAt.getTime()) &&
      d.archivedAt === null,
    canWithdrawConsent: isGalleryConsentWithdrawable(d),
    isPubliclyVisible: isGalleryPubliclyVisible(d),
  };
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

type TransitionInput = {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
};

type TransitionSpec = {
  action: GalleryAuditAction;
  stateFilter: Filter<MongoGalleryItemDocument>;
  isEligible: (document: MongoGalleryItemDocument) => boolean;
  set: Partial<MongoGalleryItemDocument>;
  changedFields: readonly string[];
  invalid:
    | "not_requestable"
    | "not_decidable"
    | "not_publishable"
    | "not_manageable";
};

async function galleryTransition(
  input: TransitionInput,
  make: (now: Date) => TransitionSpec,
) {
  if (!isValidAdminGalleryItemId(input.id)) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const id = new ObjectId(input.id);
  const now = nextDate(input.expectedUpdatedAt);
  const spec = make(now);

  return transaction(async (db, session) => {
    const collection = db.collection<MongoGalleryItemDocument>(
      GALLERY_ITEM_COLLECTION_NAME,
    );
    const before = await collection.findOneAndUpdate(
      {
        _id: id,
        deletedAt: { $in: [null, undefined] },
        archivedAt: null,
        updatedAt: input.expectedUpdatedAt,
        ...spec.stateFilter,
      },
      { $set: { ...spec.set, updatedAt: now } },
      { returnDocument: "before", session },
    );

    if (before) {
      const after = {
        ...before,
        ...spec.set,
        updatedAt: now,
      } as MongoGalleryItemDocument;
      await insertGalleryAuditEvent({
        database: db,
        session,
        galleryItemId: id,
        action: spec.action,
        actor: input.actor,
        occurredAt: now,
        fromVersionAt: before.updatedAt,
        toVersionAt: now,
        before: createGalleryAuditSnapshot(before),
        after: createGalleryAuditSnapshot(after),
        changedFields: [...spec.changedFields],
      });
      return {
        ok: true as const,
        id: input.id,
        updatedAt: now.toISOString(),
        slug: after.slug,
      };
    }

    const current = await collection.findOne(
      { _id: id, deletedAt: { $in: [null, undefined] } },
      { session },
    );
    if (!current) {
      return { ok: false as const, reason: "not_found" as const };
    }
    if (!spec.isEligible(current)) {
      return { ok: false as const, reason: spec.invalid };
    }

    const versionMatches =
      current.updatedAt.getTime() === input.expectedUpdatedAt.getTime();
    return {
      ok: false as const,
      reason: "edit_conflict" as const,
      versionMatches,
    };
  });
}

const isReviewRequestable = (document: MongoGalleryItemDocument) =>
  document.publicationStatus === "draft" &&
  (document.approvalStatus === "pending" ||
    document.approvalStatus === "rejected") &&
  document.publishedAt === null &&
  document.archivedAt === null;

const isReviewDecidable = (document: MongoGalleryItemDocument) =>
  document.publicationStatus === "review" &&
  document.approvalStatus === "pending" &&
  document.publishedAt === null &&
  document.archivedAt === null;

const isPublishableState = (document: MongoGalleryItemDocument) =>
  document.publicationStatus === "review" &&
  document.approvalStatus === "approved" &&
  document.publishedAt === null &&
  document.archivedAt === null;

const isPublicationManageable = (document: MongoGalleryItemDocument) =>
  document.publicationStatus === "published" &&
  document.approvalStatus === "approved" &&
  document.publishedAt instanceof Date &&
  !Number.isNaN(document.publishedAt.getTime()) &&
  document.archivedAt === null;

export const requestAdminGalleryReview = (input: TransitionInput) =>
  galleryTransition(input, () => ({
    action: "review_requested",
    stateFilter: {
      publicationStatus: "draft",
      approvalStatus: { $in: ["pending", "rejected"] },
      publishedAt: null,
    },
    isEligible: isReviewRequestable,
    set: {
      publicationStatus: "review",
      approvalStatus: "pending",
    },
    changedFields: ["publicationStatus", "approvalStatus"],
    invalid: "not_requestable",
  }));

export const decideAdminGalleryReview = (
  input: TransitionInput & { decision: "approve" | "reject" },
) =>
  galleryTransition(input, () => ({
    action: input.decision === "approve" ? "review_approved" : "review_rejected",
    stateFilter: {
      publicationStatus: "review",
      approvalStatus: "pending",
      publishedAt: null,
    },
    isEligible: isReviewDecidable,
    set:
      input.decision === "approve"
        ? { approvalStatus: "approved" }
        : { publicationStatus: "draft", approvalStatus: "rejected" },
    changedFields:
      input.decision === "approve"
        ? ["approvalStatus"]
        : ["publicationStatus", "approvalStatus"],
    invalid: "not_decidable",
  }));

export async function publishAdminGalleryItem(input: TransitionInput) {
  if (!isValidAdminGalleryItemId(input.id)) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const id = new ObjectId(input.id);
  const now = nextDate(input.expectedUpdatedAt);
  return transaction(async (db, session) => {
    const collection = db.collection<MongoGalleryItemDocument>(
      GALLERY_ITEM_COLLECTION_NAME,
    );
    const before = await collection.findOne(
      { _id: id, deletedAt: { $in: [null, undefined] } },
      { session },
    );
    if (!before) {
      return { ok: false as const, reason: "not_found" as const };
    }
    if (!isPublishableState(before)) {
      return { ok: false as const, reason: "not_publishable" as const };
    }
    if (!isGalleryConsentReadyForPublication(before)) {
      return { ok: false as const, reason: "consent_not_ready" as const };
    }

    const updated = await collection.findOneAndUpdate(
      {
        _id: id,
        deletedAt: { $in: [null, undefined] },
        archivedAt: null,
        publicationStatus: "review",
        approvalStatus: "approved",
        publishedAt: null,
        updatedAt: input.expectedUpdatedAt,
      },
      {
        $set: {
          publicationStatus: "published",
          publishedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after", session },
    );
    if (!updated) {
      return { ok: false as const, reason: "edit_conflict" as const };
    }

    await insertGalleryAuditEvent({
      database: db,
      session,
      galleryItemId: id,
      action: "published",
      actor: input.actor,
      occurredAt: now,
      fromVersionAt: before.updatedAt,
      toVersionAt: now,
      before: createGalleryAuditSnapshot(before),
      after: createGalleryAuditSnapshot(updated),
      changedFields: ["publicationStatus", "publishedAt"],
    });
    return {
      ok: true as const,
      id: input.id,
      updatedAt: now.toISOString(),
      slug: updated.slug,
    };
  });
}

export const changeAdminGalleryPublicationState = (
  input: TransitionInput & { action: "unpublish" },
) =>
  galleryTransition(input, () => ({
    action: "unpublished",
    stateFilter: {
      publicationStatus: "published",
      approvalStatus: "approved",
      publishedAt: { $type: "date" },
    },
    isEligible: isPublicationManageable,
    set: {
      publicationStatus: "review",
      publishedAt: null,
    },
    changedFields: ["publicationStatus", "publishedAt"],
    invalid: "not_manageable",
  }));

export async function withdrawAdminGalleryConsent(input: TransitionInput) {
  if (!isValidAdminGalleryItemId(input.id)) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const id = new ObjectId(input.id);
  const now = nextDate(input.expectedUpdatedAt);
  return transaction(async (db, session) => {
    const collection = db.collection<MongoGalleryItemDocument>(
      GALLERY_ITEM_COLLECTION_NAME,
    );
    const current = await collection.findOne(
      { _id: id, deletedAt: { $in: [null, undefined] } },
      { session },
    );
    if (!current) {
      return { ok: false as const, reason: "not_found" as const };
    }
    if (!isGalleryConsentWithdrawable(current)) {
      return {
        ok: false as const,
        reason: "consent_not_withdrawable" as const,
      };
    }

    const published = current.publicationStatus === "published";
    const set: Partial<MongoGalleryItemDocument> = {
      consentStatus: "withdrawn",
      consentWithdrawnAt: now,
      updatedAt: now,
      ...(published
        ? { publicationStatus: "review", publishedAt: null }
        : {}),
    };
    const before = await collection.findOneAndUpdate(
      {
        _id: id,
        deletedAt: { $in: [null, undefined] },
        archivedAt: null,
        subjectPresence: "identifiable",
        consentStatus: "confirmed",
        consentCheckedOn: current.consentCheckedOn,
        consentReferenceCode: current.consentReferenceCode,
        consentWithdrawnAt: null,
        publicationStatus: current.publicationStatus,
        approvalStatus: current.approvalStatus,
        publishedAt: current.publishedAt,
        updatedAt: input.expectedUpdatedAt,
      },
      { $set: set },
      { returnDocument: "before", session },
    );
    if (!before) {
      return { ok: false as const, reason: "edit_conflict" as const };
    }

    const after = { ...before, ...set } as MongoGalleryItemDocument;
    await insertGalleryAuditEvent({
      database: db,
      session,
      galleryItemId: id,
      action: "consent_withdrawn",
      actor: input.actor,
      occurredAt: now,
      fromVersionAt: before.updatedAt,
      toVersionAt: now,
      before: createGalleryAuditSnapshot(before),
      after: createGalleryAuditSnapshot(after),
      changedFields: [
        "consentStatus",
        "consentWithdrawnAt",
        ...(published ? ["publicationStatus", "publishedAt"] : []),
      ],
    });
    return {
      ok: true as const,
      id: input.id,
      slug: after.slug,
      updatedAt: now.toISOString(),
    };
  });
}

export type AdminGalleryTrashResult = { ok: true; id: string; updatedAt: string } | { ok: false; reason: "not_found" | "not_deletable" | "not_restorable" | "edit_conflict" | "slug_conflict" };
async function changeAdminGalleryTrashState(input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal; restore: boolean }): Promise<AdminGalleryTrashResult> {
  if (!isValidAdminGalleryItemId(input.id)) return { ok: false, reason: "not_found" };
  const id = new ObjectId(input.id);
  try { return await transaction(async (database, session) => {
    const collection = database.collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME);
    const current = await collection.findOne({ _id: id }, { session });
    if (!current) return { ok: false, reason: "not_found" } as const;
    const deleted = current.deletedAt instanceof Date && !Number.isNaN(current.deletedAt.getTime());
    if (input.restore ? !deleted : deleted) return { ok: false, reason: input.restore ? "not_restorable" : "not_deletable" } as const;
    if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) return { ok: false, reason: "edit_conflict" } as const;
    if (input.restore && await collection.findOne({ slug: current.slug, _id: { $ne: id }, deletedAt: { $in: [null, undefined] } }, { session, projection: { _id: 1 } })) return { ok: false, reason: "slug_conflict" } as const;
    const now = new Date(), updatedAt = new Date(Math.max(now.getTime(), input.expectedUpdatedAt.getTime() + 1));
    const after = await collection.findOneAndUpdate({ _id: id, updatedAt: input.expectedUpdatedAt, ...(input.restore ? { deletedAt: { $type: "date" } } : { deletedAt: { $in: [null, undefined] } }) }, { $set: { deletedAt: input.restore ? null : now, archivedAt: input.restore ? null : now, publicationStatus: input.restore ? "draft" : "archived", approvalStatus: "pending", publishedAt: null, updatedAt } }, { session, returnDocument: "after" });
    if (!after) return { ok: false, reason: "edit_conflict" } as const;
    await insertGalleryAuditEvent({ database, session, galleryItemId: id, action: input.restore ? "restored" : "soft_deleted", actor: input.actor, occurredAt: now, fromVersionAt: current.updatedAt, toVersionAt: updatedAt, before: createGalleryAuditSnapshot(current), after: createGalleryAuditSnapshot(after), changedFields: ["deletedAt", "archivedAt", "publicationStatus", "approvalStatus", "publishedAt"] });
    return { ok: true, id: input.id, updatedAt: updatedAt.toISOString() } as const;
  }); } catch (error) { if (conflict(error) === "slug_conflict") return { ok: false, reason: "slug_conflict" }; throw error; }
}
export const softDeleteAdminGalleryItem = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) => changeAdminGalleryTrashState({ ...input, restore: false });
export const restoreAdminGalleryItem = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) => changeAdminGalleryTrashState({ ...input, restore: true });
