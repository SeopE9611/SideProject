import { MongoServerError, ObjectId, type ClientSession, type Db, type Filter, type WithId } from "mongodb";

import type { AdminPrincipal } from "@/features/admin-auth/admin-auth.types";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";

import { insertProgramAuditEvent } from "./program.audit-repository";
import {
  createProgramAuditSnapshot,
  getDraftChangedFields,
  type ProgramAuditAction,
  type ProgramAuditChangedField,
} from "./program.audit";
import { PROGRAM_COLLECTION_NAME, type MongoProgramAttachment, type MongoProgramDocument } from "./program.mongo-schema";
import { GALLERY_ITEM_COLLECTION_NAME, type MongoGalleryItemDocument } from "@/features/gallery/gallery.mongo-schema";
import { findPublicGalleryCoverById } from "@/features/gallery/gallery.repository";
import { isValidStoredGalleryItem } from "@/features/gallery/gallery.mongo-repository";
import { isValidStoredProgramAttachment, isValidStoredProgramMedia } from "./program.media-validation";
import {
  ADMIN_PROGRAM_SORT_ORDER_MAX,
  ADMIN_PROGRAM_SORT_ORDER_MIN,
  type AdminProgramPublicationAction,
  type AdminProgramReviewDecision,
  type ValidatedAdminProgramDraft,
} from "./program.admin-validation";
import {
  isProgramApprovalStatus,
  isProgramPublicationStatus,
  isValidProgramSlug,
  type ProgramApprovalStatus,
  type ProgramPublicationStatus,
} from "./program.types";

const ADMIN_PROGRAM_PAGE_SIZE = 20;
const ADMIN_PROGRAM_MAXIMUM_PAGE = 10_000;

export type AdminProgramListItem = {
  id: string;
  slug: string;
  category: string;
  title: string;
  summary: string;
  operationStatusLabel: string | null;
  sortOrder: number;
  publicationStatus: ProgramPublicationStatus;
  approvalStatus: ProgramApprovalStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isPubliclyVisible: boolean;
};

export type AdminProgramDetail = AdminProgramListItem & {
  purpose: string;
  body: readonly string[];
  isEditable: boolean;
  canRequestReview: boolean;
  canDirectPublish: boolean;
  canDecideReview: boolean;
  canPublish: boolean;
  canManagePublicationState: boolean;
  coverGalleryItemId: string | null;
  attachment: MongoProgramAttachment | null;
};

export type AdminProgramListFilters = {
  category?: string;
  publicationStatus?: ProgramPublicationStatus;
  approvalStatus?: ProgramApprovalStatus;
};

export type AdminProgramListResult = {
  items: readonly AdminProgramListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type CreateAdminProgramDraftResult =
  { ok: true; id: string; slug: string } | { ok: false; reason: "slug_conflict" };

export type UpdateAdminProgramDraftResult =
  | { ok: true; id: string; slug: string; updatedAt: string }
  | {
      ok: false;
      reason: "slug_conflict" | "not_found" | "not_editable" | "edit_conflict";
    };

export type RequestAdminProgramReviewResult =
  | { ok: true; id: string; updatedAt: string }
  | {
      ok: false;
      reason: "not_found" | "not_requestable" | "edit_conflict";
    };

export type DecideAdminProgramReviewResult =
  | {
      ok: true;
      id: string;
      decision: AdminProgramReviewDecision;
      updatedAt: string;
    }
  | {
      ok: false;
      reason: "not_found" | "not_decidable" | "edit_conflict";
    };

export type DirectPublishAdminProgramResult =
  | {
      ok: true;
      id: string;
      slug: string;
      publishedAt: string;
      updatedAt: string;
    }
  | {
      ok: false;
      reason: "not_found" | "not_direct_publishable" | "edit_conflict";
    };

export type PublishAdminProgramResult =
  | {
      ok: true;
      id: string;
      slug: string;
      publishedAt: string;
      updatedAt: string;
    }
  | {
      ok: false;
      reason: "not_found" | "not_publishable" | "edit_conflict";
    };

export type ChangeAdminProgramPublicationStateResult =
  | {
      ok: true;
      id: string;
      slug: string;
      action: AdminProgramPublicationAction;
      publicationStatus: "review" | "archived";
      publishedAt: string | null;
      updatedAt: string;
    }
  | {
      ok: false;
      reason: "not_found" | "not_manageable" | "edit_conflict";
    };

type ProgramAdminTransactionContext = {
  database: Db;
  session: ClientSession;
};

async function runProgramAdminTransaction<T>(
  work: (context: ProgramAdminTransactionContext) => Promise<T>,
): Promise<T> {
  const client = await getMongoClient();
  const database = await getMongoDatabase();
  const session = client.startSession();
  try {
    return await session.withTransaction(() => work({ database, session }), {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
  } finally {
    await session.endSession();
  }
}

export async function createAdminProgramDraft(
  input: ValidatedAdminProgramDraft,
  actor: AdminPrincipal,
  now: Date = new Date(),
): Promise<CreateAdminProgramDraftResult> {
  const programId = new ObjectId();
  const eventId = new ObjectId();
  const document: MongoProgramDocument = {
    _id: programId,
    slug: input.slug,
    category: input.category,
    title: input.title,
    summary: input.summary,
    purpose: input.purpose,
    body: Array.from(input.body),
    operationStatusLabel: input.operationStatusLabel,
    sortOrder: input.sortOrder,
    publicationStatus: "draft",
    approvalStatus: "pending",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    coverGalleryItemId: null,
    attachment: null,
  };

  try {
    return await runProgramAdminTransaction(async ({ database, session }) => {
      await database.collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME).insertOne(document, { session });
      await insertProgramAuditEvent({
        database,
        session,
        eventId,
        programId,
        action: "draft_created",
        actor,
        occurredAt: now,
        fromVersionAt: null,
        toVersionAt: now,
        before: null,
        after: createProgramAuditSnapshot(document),
        changedFields: [
          "slug",
          "category",
          "title",
          "summary",
          "purpose",
          "body",
          "operationStatusLabel",
          "sortOrder",
          "publicationStatus",
          "approvalStatus",
          "publishedAt",
        ],
      });
      return { ok: true, id: programId.toString(), slug: input.slug };
    });
  } catch (error) {
    if (isProgramSlugConflict(error)) {
      return { ok: false, reason: "slug_conflict" };
    }
    throw error;
  }
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidOperationStatusLabel(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value);
}

function createNextUpdatedAt(expectedUpdatedAt: Date, now: Date): Date {
  return new Date(Math.max(now.getTime(), expectedUpdatedAt.getTime() + 1));
}

function isProgramSlugConflict(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000 && error.keyPattern?.slug === 1;
}

function isEditableDraftState(
  publicationStatus: ProgramPublicationStatus,
  approvalStatus: ProgramApprovalStatus,
  publishedAt: Date | null,
): boolean {
  return (
    publicationStatus === "draft" &&
    (approvalStatus === "pending" || approvalStatus === "rejected") &&
    publishedAt === null
  );
}

function isPendingReviewState(
  publicationStatus: ProgramPublicationStatus,
  approvalStatus: ProgramApprovalStatus,
  publishedAt: Date | null,
): boolean {
  return publicationStatus === "review" && approvalStatus === "pending" && publishedAt === null;
}

function isApprovedReviewState(
  publicationStatus: ProgramPublicationStatus,
  approvalStatus: ProgramApprovalStatus,
  publishedAt: Date | null,
): boolean {
  return publicationStatus === "review" && approvalStatus === "approved" && publishedAt === null;
}

function isPublishedApprovedState(
  publicationStatus: ProgramPublicationStatus,
  approvalStatus: ProgramApprovalStatus,
  publishedAt: Date | null,
): boolean {
  return publicationStatus === "published" && approvalStatus === "approved" && publishedAt !== null;
}

function isPubliclyVisible(
  document: Pick<MongoProgramDocument, "publicationStatus" | "approvalStatus" | "publishedAt">,
  now: Date,
): boolean {
  return (
    document.publicationStatus === "published" &&
    document.approvalStatus === "approved" &&
    document.publishedAt !== null &&
    document.publishedAt <= now
  );
}

function hasValidActiveProgramState(document: Pick<MongoProgramDocument,
  "publicationStatus" | "approvalStatus" | "publishedAt" | "createdAt" | "updatedAt">): boolean {
  const publishedAt = document.publishedAt;
  const validPublishedAt = isValidDate(publishedAt) && publishedAt >= document.createdAt && publishedAt <= document.updatedAt;
  if (document.publicationStatus === "draft")
    return (document.approvalStatus === "pending" || document.approvalStatus === "rejected") && publishedAt === null;
  if (document.publicationStatus === "review")
    return (document.approvalStatus === "pending" || document.approvalStatus === "approved") && publishedAt === null;
  if (document.publicationStatus === "published" || document.publicationStatus === "archived")
    return document.approvalStatus === "approved" && validPublishedAt;
  return false;
}

function toAdminProgramListItem(document: WithId<MongoProgramDocument>, now: Date): AdminProgramListItem | null {
  if (
    !isValidProgramSlug(document.slug) ||
    !(typeof document.category === "string" && document.category.trim().length > 0) ||
    !isProgramPublicationStatus(document.publicationStatus) ||
    !isProgramApprovalStatus(document.approvalStatus) ||
    !isNonEmptyString(document.title) ||
    !isNonEmptyString(document.summary) ||
    !isValidOperationStatusLabel(document.operationStatusLabel) ||
    !Number.isInteger(document.sortOrder) ||
    document.sortOrder < ADMIN_PROGRAM_SORT_ORDER_MIN ||
    document.sortOrder > ADMIN_PROGRAM_SORT_ORDER_MAX ||
    !isValidDate(document.createdAt) ||
    !isValidDate(document.updatedAt) ||
    document.updatedAt < document.createdAt ||
    !hasValidActiveProgramState(document)
  ) {
    return null;
  }

  return {
    id: document._id.toString(),
    slug: document.slug,
    category: document.category,
    title: document.title,
    summary: document.summary,
    operationStatusLabel: document.operationStatusLabel,
    sortOrder: document.sortOrder,
    publicationStatus: document.publicationStatus,
    approvalStatus: document.approvalStatus,
    publishedAt: document.publishedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    isPubliclyVisible: isPubliclyVisible(document, now),
  };
}

function isValidActiveProgramDocument(document: WithId<MongoProgramDocument>): boolean {
  return document._id instanceof ObjectId &&
    (document.deletedAt === undefined || document.deletedAt === null) &&
    toAdminProgramListItem(document, new Date()) !== null &&
    isNonEmptyString(document.purpose) &&
    Array.isArray(document.body) &&
    document.body.length > 0 &&
    document.body.every(isNonEmptyString) &&
    isValidStoredProgramMedia(document);
}

export function isValidAdminProgramId(value: unknown): value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/.test(value)) {
    return false;
  }

  return ObjectId.isValid(value) && new ObjectId(value).toHexString() === value;
}

export type AdminProgramMediaTargetResult =
  | { ok: true; editable: boolean }
  | { ok: false; reason: "not_found" | "invalid_document" };

export async function inspectAdminProgramMediaTarget(id: string): Promise<AdminProgramMediaTargetResult> {
  if (!isValidAdminProgramId(id) || id !== id.toLowerCase()) return { ok: false, reason: "not_found" };
  const document = await (await getMongoDatabase()).collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id), ...activeDocumentFilter });
  if (!document) return { ok: false, reason: "not_found" };
  if (!isValidActiveProgramDocument(document)) return { ok: false, reason: "invalid_document" };
  return { ok: true, editable: isEditableDraftState(document.publicationStatus, document.approvalStatus, document.publishedAt) };
}

export async function findAdminProgramPostById(id: string, now: Date = new Date()): Promise<AdminProgramDetail | null> {
  if (!isValidAdminProgramId(id)) return null;

  const database = await getMongoDatabase();
  const document = await database.collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME).findOne(
    {
      _id: new ObjectId(id),
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    },
    {
      projection: {
        slug: 1,
        category: 1,
        title: 1,
        summary: 1,
        purpose: 1,
        body: 1,
        operationStatusLabel: 1,
        sortOrder: 1,
        publicationStatus: 1,
        approvalStatus: 1,
        publishedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        coverGalleryItemId: 1,
        attachment: 1,
      },
    },
  );

  if (!document) return null;
  const listItem = toAdminProgramListItem(document, now);
  if (
    !listItem || !isValidActiveProgramDocument(document)
  ) {
    console.error("관리자 프로그램 상세 문서 검증 실패", {
      documentId: document._id.toString(),
    });
    return null;
  }

  return {
    ...listItem,
    purpose: document.purpose,
    body: document.body,
    isEditable: isEditableDraftState(document.publicationStatus, document.approvalStatus, document.publishedAt),
    canDirectPublish: isEditableDraftState(document.publicationStatus, document.approvalStatus, document.publishedAt),
    canRequestReview: isEditableDraftState(document.publicationStatus, document.approvalStatus, document.publishedAt),
    canDecideReview: isPendingReviewState(document.publicationStatus, document.approvalStatus, document.publishedAt),
    canPublish: isApprovedReviewState(document.publicationStatus, document.approvalStatus, document.publishedAt),
    coverGalleryItemId: document.coverGalleryItemId?.toHexString() ?? null,
    attachment: document.attachment ?? null,
    canManagePublicationState: isPublishedApprovedState(
      document.publicationStatus,
      document.approvalStatus,
      document.publishedAt,
    ),
  };
}

type ProgramChange = {
  before: MongoProgramDocument;
  after: MongoProgramDocument;
};

async function changeProgramAndInsertAudit(input: {
  database: Db;
  session: ClientSession;
  programId: ObjectId;
  eventId: ObjectId;
  actor: AdminPrincipal;
  action: ProgramAuditAction;
  toVersionAt: Date;
  filter: Filter<MongoProgramDocument>;
  set: Partial<MongoProgramDocument>;
  changedFields:
    readonly ProgramAuditChangedField[] | ((before: MongoProgramDocument) => readonly ProgramAuditChangedField[]);
}): Promise<ProgramChange | null> {
  const collection = input.database.collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME);
  const before = await collection.findOneAndUpdate(
    input.filter,
    { $set: input.set },
    {
      session: input.session,
      returnDocument: "before",
      includeResultMetadata: false,
    },
  );
  if (!before) return null;
  const after: MongoProgramDocument = {
    _id: before._id,
    slug: input.set.slug ?? before.slug,
    category: input.set.category ?? before.category,
    title: input.set.title ?? before.title,
    summary: input.set.summary ?? before.summary,
    purpose: input.set.purpose ?? before.purpose,
    body: input.set.body ?? before.body,
    operationStatusLabel:
      input.set.operationStatusLabel === undefined ? before.operationStatusLabel : input.set.operationStatusLabel,
    sortOrder: input.set.sortOrder ?? before.sortOrder,
    publicationStatus: input.set.publicationStatus ?? before.publicationStatus,
    approvalStatus: input.set.approvalStatus ?? before.approvalStatus,
    publishedAt: input.set.publishedAt === undefined ? before.publishedAt : input.set.publishedAt,
    createdAt: before.createdAt,
    updatedAt: input.toVersionAt,
    deletedAt: before.deletedAt,
    coverGalleryItemId: input.set.coverGalleryItemId === undefined ? before.coverGalleryItemId : input.set.coverGalleryItemId,
    attachment: input.set.attachment === undefined ? before.attachment : input.set.attachment,
  };
  await insertProgramAuditEvent({
    database: input.database,
    session: input.session,
    eventId: input.eventId,
    programId: input.programId,
    action: input.action,
    actor: input.actor,
    occurredAt: input.toVersionAt,
    fromVersionAt: before.updatedAt,
    toVersionAt: input.toVersionAt,
    before: createProgramAuditSnapshot(before),
    after: createProgramAuditSnapshot(after),
    changedFields: typeof input.changedFields === "function" ? input.changedFields(before) : input.changedFields,
  });
  return { before, after };
}

const activeDocumentFilter = {
  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};

export async function changeAdminProgramPublicationState(input: {
  id: string;
  action: AdminProgramPublicationAction;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<ChangeAdminProgramPublicationStateResult> {
  if (!isValidAdminProgramId(input.id)) return { ok: false, reason: "not_found" };
  const programId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const nextUpdatedAt = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  return runProgramAdminTransaction(async ({ database, session }) => {
    const change = await changeProgramAndInsertAudit({
      database,
      session,
      programId,
      eventId,
      actor: input.actor,
      action: input.action === "unpublish" ? "unpublished" : "archived",
      toVersionAt: nextUpdatedAt,
      filter: {
        _id: programId,
        ...activeDocumentFilter,
        publicationStatus: "published",
        approvalStatus: "approved",
        publishedAt: { $ne: null },
        updatedAt: input.expectedUpdatedAt,
      },
      set:
        input.action === "unpublish"
          ? {
              publicationStatus: "review",
              publishedAt: null,
              updatedAt: nextUpdatedAt,
            }
          : { publicationStatus: "archived", updatedAt: nextUpdatedAt },
      changedFields: input.action === "unpublish" ? ["publicationStatus", "publishedAt"] : ["publicationStatus"],
    });
    if (change) {
      return {
        ok: true,
        id: input.id,
        slug: change.after.slug,
        action: input.action,
        publicationStatus: change.after.publicationStatus as "review" | "archived",
        publishedAt: change.after.publishedAt?.toISOString() ?? null,
        updatedAt: nextUpdatedAt.toISOString(),
      };
    }
    const current = await database.collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME).findOne(
      { _id: programId },
      {
        session,
        projection: {
          publicationStatus: 1,
          approvalStatus: 1,
          publishedAt: 1,
          updatedAt: 1,
          deletedAt: 1,
        },
      },
    );
    if (!current || current.deletedAt != null) return { ok: false, reason: "not_found" };
    if (!isPublishedApprovedState(current.publicationStatus, current.approvalStatus, current.publishedAt)) {
      return { ok: false, reason: "not_manageable" };
    }
    return { ok: false, reason: "edit_conflict" };
  });
}

export async function directPublishAdminProgramPost(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<DirectPublishAdminProgramResult> {
  if (!isValidAdminProgramId(input.id)) return { ok: false, reason: "not_found" };
  const programId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const transitionAt = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  return runProgramAdminTransaction(async ({ database, session }) => {
    const change = await changeProgramAndInsertAudit({
      database,
      session,
      programId,
      eventId,
      actor: input.actor,
      action: "direct_published",
      toVersionAt: transitionAt,
      filter: {
        _id: programId,
        ...activeDocumentFilter,
        publicationStatus: "draft",
        approvalStatus: { $in: ["pending", "rejected"] },
        publishedAt: null,
        updatedAt: input.expectedUpdatedAt,
      },
      set: {
        publicationStatus: "published",
        approvalStatus: "approved",
        publishedAt: transitionAt,
        updatedAt: transitionAt,
      },
      changedFields: ["publicationStatus", "approvalStatus", "publishedAt"],
    });
    if (change)
      return {
        ok: true,
        id: input.id,
        slug: change.after.slug,
        publishedAt: transitionAt.toISOString(),
        updatedAt: transitionAt.toISOString(),
      };
    const current = await database
      .collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME)
      .findOne({ _id: programId }, { session });
    if (!current || current.deletedAt != null) return { ok: false, reason: "not_found" };
    if (!isEditableDraftState(current.publicationStatus, current.approvalStatus, current.publishedAt))
      return { ok: false, reason: "not_direct_publishable" };
    if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
      return { ok: false, reason: "edit_conflict" };
    return { ok: false, reason: "edit_conflict" };
  });
}

export async function publishAdminProgram(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<PublishAdminProgramResult> {
  if (!isValidAdminProgramId(input.id)) return { ok: false, reason: "not_found" };
  const programId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const publicationTime = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  return runProgramAdminTransaction(async ({ database, session }) => {
    const change = await changeProgramAndInsertAudit({
      database,
      session,
      programId,
      eventId,
      actor: input.actor,
      action: "published",
      toVersionAt: publicationTime,
      filter: {
        _id: programId,
        ...activeDocumentFilter,
        publicationStatus: "review",
        approvalStatus: "approved",
        publishedAt: null,
        updatedAt: input.expectedUpdatedAt,
      },
      set: {
        publicationStatus: "published",
        publishedAt: publicationTime,
        updatedAt: publicationTime,
      },
      changedFields: ["publicationStatus", "publishedAt"],
    });
    if (change) {
      return {
        ok: true,
        id: input.id,
        slug: change.after.slug,
        publishedAt: publicationTime.toISOString(),
        updatedAt: publicationTime.toISOString(),
      };
    }
    const current = await database
      .collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME)
      .findOne({ _id: programId }, { session });
    if (!current || current.deletedAt != null) return { ok: false, reason: "not_found" };
    if (!isApprovedReviewState(current.publicationStatus, current.approvalStatus, current.publishedAt))
      return { ok: false, reason: "not_publishable" };
    return { ok: false, reason: "edit_conflict" };
  });
}

export async function updateAdminProgramDraft(input: {
  id: string;
  draft: ValidatedAdminProgramDraft;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<UpdateAdminProgramDraftResult> {
  if (!isValidAdminProgramId(input.id)) return { ok: false, reason: "not_found" };
  const programId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const nextUpdatedAt = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  try {
    return await runProgramAdminTransaction(async ({ database, session }) => {
      const change = await changeProgramAndInsertAudit({
        database,
        session,
        programId,
        eventId,
        actor: input.actor,
        action: "draft_updated",
        toVersionAt: nextUpdatedAt,
        filter: {
          _id: programId,
          ...activeDocumentFilter,
          publicationStatus: "draft",
          approvalStatus: { $in: ["pending", "rejected"] },
          publishedAt: null,
          updatedAt: input.expectedUpdatedAt,
        },
        set: {
          slug: input.draft.slug,
          category: input.draft.category,
          title: input.draft.title,
          summary: input.draft.summary,
          purpose: input.draft.purpose,
          body: Array.from(input.draft.body),
          operationStatusLabel: input.draft.operationStatusLabel,
          sortOrder: input.draft.sortOrder,
          updatedAt: nextUpdatedAt,
        },
        changedFields: (before) => getDraftChangedFields(before, input.draft),
      });
      if (change)
        return {
          ok: true,
          id: input.id,
          slug: change.after.slug,
          updatedAt: nextUpdatedAt.toISOString(),
        };
      const current = await database
        .collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME)
        .findOne({ _id: programId }, { session });
      if (!current || current.deletedAt != null) return { ok: false, reason: "not_found" };
      if (!isEditableDraftState(current.publicationStatus, current.approvalStatus, current.publishedAt))
        return { ok: false, reason: "not_editable" };
      return { ok: false, reason: "edit_conflict" };
    });
  } catch (error) {
    if (isProgramSlugConflict(error)) return { ok: false, reason: "slug_conflict" };
    throw error;
  }
}

export async function requestAdminProgramReview(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<RequestAdminProgramReviewResult> {
  if (!isValidAdminProgramId(input.id)) return { ok: false, reason: "not_found" };
  const programId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const nextUpdatedAt = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  return runProgramAdminTransaction(async ({ database, session }) => {
    const change = await changeProgramAndInsertAudit({
      database,
      session,
      programId,
      eventId,
      actor: input.actor,
      action: "review_requested",
      toVersionAt: nextUpdatedAt,
      filter: {
        _id: programId,
        ...activeDocumentFilter,
        publicationStatus: "draft",
        approvalStatus: { $in: ["pending", "rejected"] },
        publishedAt: null,
        updatedAt: input.expectedUpdatedAt,
      },
      set: {
        publicationStatus: "review",
        approvalStatus: "pending",
        updatedAt: nextUpdatedAt,
      },
      changedFields: (before) =>
        before.approvalStatus === "rejected" ? ["publicationStatus", "approvalStatus"] : ["publicationStatus"],
    });
    if (change) return { ok: true, id: input.id, updatedAt: nextUpdatedAt.toISOString() };
    const current = await database
      .collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME)
      .findOne({ _id: programId }, { session });
    if (!current || current.deletedAt != null) return { ok: false, reason: "not_found" };
    if (!isEditableDraftState(current.publicationStatus, current.approvalStatus, current.publishedAt))
      return { ok: false, reason: "not_requestable" };
    return { ok: false, reason: "edit_conflict" };
  });
}

export async function decideAdminProgramReview(input: {
  id: string;
  decision: AdminProgramReviewDecision;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<DecideAdminProgramReviewResult> {
  if (!isValidAdminProgramId(input.id)) return { ok: false, reason: "not_found" };
  const programId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const nextUpdatedAt = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  return runProgramAdminTransaction(async ({ database, session }) => {
    const approved = input.decision === "approve";
    const change = await changeProgramAndInsertAudit({
      database,
      session,
      programId,
      eventId,
      actor: input.actor,
      action: approved ? "review_approved" : "review_rejected",
      toVersionAt: nextUpdatedAt,
      filter: {
        _id: programId,
        ...activeDocumentFilter,
        publicationStatus: "review",
        approvalStatus: "pending",
        publishedAt: null,
        updatedAt: input.expectedUpdatedAt,
      },
      set: approved
        ? {
            publicationStatus: "review",
            approvalStatus: "approved",
            updatedAt: nextUpdatedAt,
          }
        : {
            publicationStatus: "draft",
            approvalStatus: "rejected",
            updatedAt: nextUpdatedAt,
          },
      changedFields: approved ? ["approvalStatus"] : ["publicationStatus", "approvalStatus"],
    });
    if (change)
      return {
        ok: true,
        id: input.id,
        decision: input.decision,
        updatedAt: nextUpdatedAt.toISOString(),
      };
    const current = await database
      .collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME)
      .findOne({ _id: programId }, { session });
    if (!current || current.deletedAt != null) return { ok: false, reason: "not_found" };
    if (!isPendingReviewState(current.publicationStatus, current.approvalStatus, current.publishedAt))
      return { ok: false, reason: "not_decidable" };
    return { ok: false, reason: "edit_conflict" };
  });
}

export async function listAdminProgramPosts(input: {
  page: number;
  filters: AdminProgramListFilters;
  now?: Date;
}): Promise<AdminProgramListResult> {
  const now = input.now ?? new Date();
  const requestedPage = Math.min(ADMIN_PROGRAM_MAXIMUM_PAGE, Math.max(1, Math.trunc(input.page)));
  const filter: Filter<MongoProgramDocument> = { deletedAt: null };

  if (input.filters.category) filter.category = input.filters.category;
  if (input.filters.publicationStatus) {
    filter.publicationStatus = input.filters.publicationStatus;
  }
  if (input.filters.approvalStatus) {
    filter.approvalStatus = input.filters.approvalStatus;
  }

  const database = await getMongoDatabase();
  const collection = database.collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME);
  const totalItems = await collection.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalItems / ADMIN_PROGRAM_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const documents = await collection
    .find(filter, {
      projection: {
        slug: 1,
        category: 1,
        title: 1,
        summary: 1,
        operationStatusLabel: 1,
        sortOrder: 1,
        publicationStatus: 1,
        approvalStatus: 1,
        publishedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    })
    .sort({ updatedAt: -1, _id: -1 })
    .skip((page - 1) * ADMIN_PROGRAM_PAGE_SIZE)
    .limit(ADMIN_PROGRAM_PAGE_SIZE)
    .toArray();

  const items = documents.flatMap((document) => {
    const item = toAdminProgramListItem(document, now);
    if (!item) {
      console.error("관리자 프로그램 문서 검증 실패", {
        documentId: document._id.toString(),
      });
      return [];
    }
    return [item];
  });

  return {
    items,
    page,
    pageSize: ADMIN_PROGRAM_PAGE_SIZE,
    totalItems,
    totalPages,
  };
}
export function normalizeAdminProgramPage(value: unknown): number {
  return typeof value === "string" && /^[0-9]+$/.test(value)
    ? Math.min(ADMIN_PROGRAM_MAXIMUM_PAGE, Math.max(1, Number(value)))
    : 1;
}

export const listAdminPrograms = listAdminProgramPosts;

export const findAdminProgramById = findAdminProgramPostById;

export type AdminProgramTrashResult =
  | { ok: true; id: string; updatedAt: string }
  | {
      ok: false;
      reason: "not_found" | "not_deletable" | "not_restorable" | "edit_conflict" | "slug_conflict";
    };

async function changeAdminProgramTrashState(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  restore: boolean;
}): Promise<AdminProgramTrashResult> {
  if (!isValidAdminProgramId(input.id)) return { ok: false, reason: "not_found" };
  const programId = new ObjectId(input.id);
  try {
    return await runProgramAdminTransaction(async ({ database, session }) => {
      const collection = database.collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME);
      const current = await collection.findOne({ _id: programId }, { session });
      if (!current) return { ok: false, reason: "not_found" } as const;
      const deleted = isValidDate(current.deletedAt);
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
            slug: current.slug,
            _id: { $ne: programId },
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          },
          { session, projection: { _id: 1 } },
        );
        if (duplicate) return { ok: false, reason: "slug_conflict" } as const;
      }
      const transitionAt = createNextUpdatedAt(input.expectedUpdatedAt, new Date());
      const after = await collection.findOneAndUpdate(
        {
          _id: programId,
          updatedAt: input.expectedUpdatedAt,
          ...(input.restore
            ? { deletedAt: { $type: "date" } }
            : {
                $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
              }),
        },
        {
          $set: {
            deletedAt: input.restore ? null : transitionAt,
            publicationStatus: input.restore ? "draft" : "archived",
            approvalStatus: "pending",
            publishedAt: null,
            updatedAt: transitionAt,
          },
        },
        { session, returnDocument: "after" },
      );
      if (!after) return { ok: false, reason: "edit_conflict" } as const;
      await insertProgramAuditEvent({
        database,
        session,
        eventId: new ObjectId(),
        programId,
        action: input.restore ? "restored" : "soft_deleted",
        actor: input.actor,
        occurredAt: transitionAt,
        fromVersionAt: current.updatedAt,
        toVersionAt: transitionAt,
        before: createProgramAuditSnapshot(current),
        after: createProgramAuditSnapshot(after),
        changedFields: ["deletedAt", "publicationStatus", "approvalStatus", "publishedAt"],
      });
      return {
        ok: true,
        id: input.id,
        updatedAt: transitionAt.toISOString(),
      } as const;
    });
  } catch (error) {
    if (isProgramSlugConflict(error)) return { ok: false, reason: "slug_conflict" };
    throw error;
  }
}
export const softDeleteAdminProgram = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) =>
  changeAdminProgramTrashState({ ...input, restore: false });
export const restoreAdminProgram = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) =>
  changeAdminProgramTrashState({ ...input, restore: true });

export type AdminProgramMediaResult =
  | { ok: true; id: string; updatedAt: string; previousAttachment?: MongoProgramAttachment | null }
  | { ok: false; reason: "not_found" | "invalid_document" | "not_editable" | "edit_conflict" | "invalid_gallery_item" | "gallery_item_not_public" };

async function changeAdminProgramMedia(input: {
  id: string; expectedUpdatedAt: Date; actor: AdminPrincipal;
  set: Pick<MongoProgramDocument, "coverGalleryItemId"> | Pick<MongoProgramDocument, "attachment">;
  changedField: "coverImage" | "attachment";
}): Promise<AdminProgramMediaResult> {
  if (!isValidAdminProgramId(input.id)) return { ok: false, reason: "not_found" };
  const programId = new ObjectId(input.id);
  const attachmentStoredAt = "attachment" in input.set ? input.set.attachment?.storedAt.getTime() ?? 0 : 0;
  const transitionAt = new Date(Math.max(new Date().getTime(), input.expectedUpdatedAt.getTime() + 1, attachmentStoredAt));
  return runProgramAdminTransaction(async ({ database, session }) => {
    const collection = database.collection<MongoProgramDocument>(PROGRAM_COLLECTION_NAME);
    const current = await collection.findOne({ _id: programId, ...activeDocumentFilter }, { session });
    if (!current) return { ok: false, reason: "not_found" };
    if (!isValidActiveProgramDocument(current))
      return { ok: false, reason: "invalid_document" };
    if ("attachment" in input.set && input.set.attachment !== null &&
        !isValidStoredProgramAttachment(input.set.attachment, transitionAt, programId.toHexString()))
      return { ok: false, reason: "invalid_document" };
    if (!isEditableDraftState(current.publicationStatus, current.approvalStatus, current.publishedAt))
      return { ok: false, reason: "not_editable" };
    const change = await changeProgramAndInsertAudit({ database, session, programId, eventId: new ObjectId(),
      actor: input.actor, action: "draft_updated", toVersionAt: transitionAt,
      filter: { _id: programId, ...activeDocumentFilter, updatedAt: input.expectedUpdatedAt },
      set: { ...input.set, updatedAt: transitionAt }, changedFields: [input.changedField] });
    if (!change) return { ok: false, reason: "edit_conflict" };
    return { ok: true, id: input.id, updatedAt: transitionAt.toISOString(),
      previousAttachment: current.attachment ?? null };
  });
}

export async function setAdminProgramCoverImage(input: { id: string; galleryItemId: string; expectedUpdatedAt: Date; actor: AdminPrincipal }): Promise<AdminProgramMediaResult> {
  if (!ObjectId.isValid(input.galleryItemId) || new ObjectId(input.galleryItemId).toHexString() !== input.galleryItemId)
    return { ok: false, reason: "invalid_gallery_item" };
  const galleryId = new ObjectId(input.galleryItemId);
  const raw = await (await getMongoDatabase()).collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME)
    .findOne({ _id: galleryId });
  if (!raw) return { ok: false, reason: "invalid_gallery_item" };
  if (!isValidStoredGalleryItem(raw)) return { ok: false, reason: "invalid_gallery_item" };
  if (!(await findPublicGalleryCoverById(galleryId))) return { ok: false, reason: "gallery_item_not_public" };
  return changeAdminProgramMedia({ ...input, set: { coverGalleryItemId: galleryId }, changedField: "coverImage" });
}
export const removeAdminProgramCoverImage = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) =>
  changeAdminProgramMedia({ ...input, set: { coverGalleryItemId: null }, changedField: "coverImage" });
export const setAdminProgramAttachment = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal; attachment: MongoProgramAttachment }) =>
  changeAdminProgramMedia({ ...input, set: { attachment: input.attachment }, changedField: "attachment" });
export const removeAdminProgramAttachment = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) =>
  changeAdminProgramMedia({ ...input, set: { attachment: null }, changedField: "attachment" });
