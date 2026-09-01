import { MongoServerError, ObjectId, type ClientSession, type Db, type Filter, type WithId } from "mongodb";

import type { AdminPrincipal } from "@/features/admin-auth/admin-auth.types";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";

import { insertNewsAuditEvent } from "./news.audit-repository";
import {
  createNewsAuditSnapshot,
  getDraftChangedFields,
  type NewsAuditAction,
  type NewsAuditChangedField,
} from "./news.audit";
import { NEWS_COLLECTION_NAME, type MongoNewsPostDocument } from "./news.mongo-schema";
import type { MongoNewsAttachment } from "./news.mongo-schema";
import { GALLERY_ITEM_COLLECTION_NAME, type MongoGalleryItemDocument } from "@/features/gallery/gallery.mongo-schema";
import { findPublicGalleryCoverById } from "@/features/gallery/gallery.repository";
import { isValidStoredGalleryItem } from "@/features/gallery/gallery.mongo-repository";
import type {
  AdminNewsPublicationAction,
  AdminNewsReviewDecision,
  ValidatedAdminNewsDraft,
} from "./news.admin-validation";
import { ADMIN_NEWS_MAXIMUM_PAGE, ADMIN_NEWS_PAGE_SIZE } from "./news.pagination";
import { isValidStoredNewsAttachment, isValidStoredNewsMedia } from "./news.media-validation";
import {
  isNewsApprovalStatus,
  isNewsCategory,
  isNewsPublicationStatus,
  isValidNewsSlug,
  type NewsApprovalStatus,
  type NewsCategory,
  type NewsPublicationStatus,
} from "./news.types";

export type AdminNewsListItem = {
  id: string;
  slug: string;
  category: NewsCategory;
  title: string;
  summary: string;
  publicationStatus: NewsPublicationStatus;
  approvalStatus: NewsApprovalStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isPubliclyVisible: boolean;
};

export type AdminNewsDetail = AdminNewsListItem & {
  body: readonly string[];
  isEditable: boolean;
  canRequestReview: boolean;
  canDirectPublish: boolean;
  canDecideReview: boolean;
  canPublish: boolean;
  canManagePublicationState: boolean;
  coverGalleryItemId: string | null;
  attachment: MongoNewsAttachment | null;
};

export type AdminNewsListFilters = {
  category?: NewsCategory;
  publicationStatus?: NewsPublicationStatus;
  approvalStatus?: NewsApprovalStatus;
};

export type AdminNewsListResult = {
  items: readonly AdminNewsListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type CreateAdminNewsDraftResult =
  { ok: true; id: string; slug: string } | { ok: false; reason: "slug_conflict" };

export type UpdateAdminNewsDraftResult =
  | { ok: true; id: string; slug: string; updatedAt: string }
  | {
      ok: false;
      reason: "slug_conflict" | "not_found" | "not_editable" | "edit_conflict";
    };

export type RequestAdminNewsReviewResult =
  | { ok: true; id: string; updatedAt: string }
  | {
      ok: false;
      reason: "not_found" | "not_requestable" | "edit_conflict";
    };

export type DecideAdminNewsReviewResult =
  | {
      ok: true;
      id: string;
      decision: AdminNewsReviewDecision;
      updatedAt: string;
    }
  | {
      ok: false;
      reason: "not_found" | "not_decidable" | "edit_conflict";
    };

export type DirectPublishAdminNewsResult =
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

export type PublishAdminNewsResult =
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

export type ChangeAdminNewsPublicationStateResult =
  | {
      ok: true;
      id: string;
      slug: string;
      action: AdminNewsPublicationAction;
      publicationStatus: "review" | "archived";
      publishedAt: string | null;
      updatedAt: string;
    }
  | {
      ok: false;
      reason: "not_found" | "not_manageable" | "edit_conflict";
    };

type NewsAdminTransactionContext = {
  database: Db;
  session: ClientSession;
};

async function runNewsAdminTransaction<T>(work: (context: NewsAdminTransactionContext) => Promise<T>): Promise<T> {
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

export async function createAdminNewsDraft(
  input: ValidatedAdminNewsDraft,
  actor: AdminPrincipal,
  now: Date = new Date(),
): Promise<CreateAdminNewsDraftResult> {
  const newsPostId = new ObjectId();
  const eventId = new ObjectId();
  const document: MongoNewsPostDocument = {
    _id: newsPostId,
    slug: input.slug,
    category: input.category,
    title: input.title,
    summary: input.summary,
    body: Array.from(input.body),
    publicationStatus: "draft",
    approvalStatus: "pending",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  try {
    return await runNewsAdminTransaction(async ({ database, session }) => {
      await database.collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME).insertOne(document, { session });
      await insertNewsAuditEvent({
        database,
        session,
        eventId,
        newsPostId,
        action: "draft_created",
        actor,
        occurredAt: now,
        fromVersionAt: null,
        toVersionAt: now,
        before: null,
        after: createNewsAuditSnapshot(document),
        changedFields: [
          "slug",
          "category",
          "title",
          "summary",
          "body",
          "publicationStatus",
          "approvalStatus",
          "publishedAt",
        ],
      });
      return { ok: true, id: newsPostId.toString(), slug: input.slug };
    });
  } catch (error) {
    if (isNewsSlugConflict(error)) {
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

function createNextUpdatedAt(expectedUpdatedAt: Date, now: Date): Date {
  return new Date(Math.max(now.getTime(), expectedUpdatedAt.getTime() + 1));
}

function isNewsSlugConflict(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000 && error.keyPattern?.slug === 1;
}

function isEditableDraftState(
  publicationStatus: NewsPublicationStatus,
  approvalStatus: NewsApprovalStatus,
  publishedAt: Date | null,
): boolean {
  return (
    publicationStatus === "draft" &&
    (approvalStatus === "pending" || approvalStatus === "rejected") &&
    publishedAt === null
  );
}

function isPendingReviewState(
  publicationStatus: NewsPublicationStatus,
  approvalStatus: NewsApprovalStatus,
  publishedAt: Date | null,
): boolean {
  return publicationStatus === "review" && approvalStatus === "pending" && publishedAt === null;
}

function isApprovedReviewState(
  publicationStatus: NewsPublicationStatus,
  approvalStatus: NewsApprovalStatus,
  publishedAt: Date | null,
): boolean {
  return publicationStatus === "review" && approvalStatus === "approved" && publishedAt === null;
}

function isPublishedApprovedState(
  publicationStatus: NewsPublicationStatus,
  approvalStatus: NewsApprovalStatus,
  publishedAt: Date | null,
): boolean {
  return publicationStatus === "published" && approvalStatus === "approved" && publishedAt !== null;
}

function isPubliclyVisible(
  document: Pick<MongoNewsPostDocument, "publicationStatus" | "approvalStatus" | "publishedAt">,
  now: Date,
): boolean {
  return (
    document.publicationStatus === "published" &&
    document.approvalStatus === "approved" &&
    document.publishedAt !== null &&
    document.publishedAt <= now
  );
}

function toAdminNewsListItem(document: WithId<MongoNewsPostDocument>, now: Date): AdminNewsListItem | null {
  if (
    !isValidNewsSlug(document.slug) ||
    !isNewsCategory(document.category) ||
    !isNewsPublicationStatus(document.publicationStatus) ||
    !isNewsApprovalStatus(document.approvalStatus) ||
    !isNonEmptyString(document.title) ||
    !isNonEmptyString(document.summary) ||
    !isValidDate(document.createdAt) ||
    !isValidDate(document.updatedAt) ||
    (document.publishedAt !== null && !isValidDate(document.publishedAt))
  ) {
    return null;
  }

  return {
    id: document._id.toString(),
    slug: document.slug,
    category: document.category,
    title: document.title,
    summary: document.summary,
    publicationStatus: document.publicationStatus,
    approvalStatus: document.approvalStatus,
    publishedAt: document.publishedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    isPubliclyVisible: isPubliclyVisible(document, now),
  };
}

export function isValidAdminNewsId(value: unknown): value is string {
  if (typeof value !== "string" || !/^[a-fA-F0-9]{24}$/.test(value)) {
    return false;
  }

  return ObjectId.isValid(value) && new ObjectId(value).toHexString() === value.toLowerCase();
}

export async function findAdminNewsPostById(id: string, now: Date = new Date()): Promise<AdminNewsDetail | null> {
  if (!isValidAdminNewsId(id)) return null;

  const database = await getMongoDatabase();
  const document = await database.collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME).findOne(
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
        body: 1,
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
  const listItem = toAdminNewsListItem(document, now);
  if (!listItem || !Array.isArray(document.body) || !document.body.every(isNonEmptyString) ||
      !isValidStoredNewsMedia(document)) {
    console.error("관리자 뉴스 상세 문서 검증 실패", {
      documentId: document._id.toString(),
    });
    return null;
  }

  return {
    ...listItem,
    body: document.body,
    isEditable: isEditableDraftState(document.publicationStatus, document.approvalStatus, document.publishedAt),
    canDirectPublish: isEditableDraftState(document.publicationStatus, document.approvalStatus, document.publishedAt),
    canRequestReview: isEditableDraftState(document.publicationStatus, document.approvalStatus, document.publishedAt),
    canDecideReview: isPendingReviewState(document.publicationStatus, document.approvalStatus, document.publishedAt),
    canPublish: isApprovedReviewState(document.publicationStatus, document.approvalStatus, document.publishedAt),
    canManagePublicationState: isPublishedApprovedState(
      document.publicationStatus,
      document.approvalStatus,
      document.publishedAt,
    ),
    coverGalleryItemId: document.coverGalleryItemId?.toHexString() ?? null,
    attachment: document.attachment ?? null,
  };
}

type NewsChange = {
  before: MongoNewsPostDocument;
  after: MongoNewsPostDocument;
};

async function changeNewsAndInsertAudit(input: {
  database: Db;
  session: ClientSession;
  newsPostId: ObjectId;
  eventId: ObjectId;
  actor: AdminPrincipal;
  action: NewsAuditAction;
  toVersionAt: Date;
  filter: Filter<MongoNewsPostDocument>;
  set: Partial<MongoNewsPostDocument>;
  changedFields:
    readonly NewsAuditChangedField[] | ((before: MongoNewsPostDocument) => readonly NewsAuditChangedField[]);
}): Promise<NewsChange | null> {
  const collection = input.database.collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME);
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
  const after: MongoNewsPostDocument = {
    _id: before._id,
    slug: input.set.slug ?? before.slug,
    category: input.set.category ?? before.category,
    title: input.set.title ?? before.title,
    summary: input.set.summary ?? before.summary,
    body: input.set.body ?? before.body,
    publicationStatus: input.set.publicationStatus ?? before.publicationStatus,
    approvalStatus: input.set.approvalStatus ?? before.approvalStatus,
    publishedAt: input.set.publishedAt === undefined ? before.publishedAt : input.set.publishedAt,
    createdAt: before.createdAt,
    updatedAt: input.toVersionAt,
    deletedAt: before.deletedAt,
    coverGalleryItemId: input.set.coverGalleryItemId === undefined ? before.coverGalleryItemId : input.set.coverGalleryItemId,
    attachment: input.set.attachment === undefined ? before.attachment : input.set.attachment,
  };
  await insertNewsAuditEvent({
    database: input.database,
    session: input.session,
    eventId: input.eventId,
    newsPostId: input.newsPostId,
    action: input.action,
    actor: input.actor,
    occurredAt: input.toVersionAt,
    fromVersionAt: before.updatedAt,
    toVersionAt: input.toVersionAt,
    before: createNewsAuditSnapshot(before),
    after: createNewsAuditSnapshot(after),
    changedFields: typeof input.changedFields === "function" ? input.changedFields(before) : input.changedFields,
  });
  return { before, after };
}

const activeDocumentFilter = {
  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};

export async function changeAdminNewsPublicationState(input: {
  id: string;
  action: AdminNewsPublicationAction;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<ChangeAdminNewsPublicationStateResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };
  const newsPostId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const nextUpdatedAt = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  return runNewsAdminTransaction(async ({ database, session }) => {
    const change = await changeNewsAndInsertAudit({
      database,
      session,
      newsPostId,
      eventId,
      actor: input.actor,
      action: input.action === "unpublish" ? "unpublished" : "archived",
      toVersionAt: nextUpdatedAt,
      filter: {
        _id: newsPostId,
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
    if (change)
      return {
        ok: true,
        id: input.id,
        slug: change.after.slug,
        action: input.action,
        publicationStatus: change.after.publicationStatus as "review" | "archived",
        publishedAt: change.after.publishedAt?.toISOString() ?? null,
        updatedAt: nextUpdatedAt.toISOString(),
      };
    const current = await database.collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME).findOne(
      { _id: newsPostId },
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
    if (!isPublishedApprovedState(current.publicationStatus, current.approvalStatus, current.publishedAt))
      return { ok: false, reason: "not_manageable" };
    return { ok: false, reason: "edit_conflict" };
  });
}

export async function directPublishAdminNewsPost(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<DirectPublishAdminNewsResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };
  const newsPostId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const transitionAt = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  return runNewsAdminTransaction(async ({ database, session }) => {
    const change = await changeNewsAndInsertAudit({
      database,
      session,
      newsPostId,
      eventId,
      actor: input.actor,
      action: "direct_published",
      toVersionAt: transitionAt,
      filter: {
        _id: newsPostId,
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
      .collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME)
      .findOne({ _id: newsPostId }, { session });
    if (!current || current.deletedAt != null) return { ok: false, reason: "not_found" };
    if (!isEditableDraftState(current.publicationStatus, current.approvalStatus, current.publishedAt))
      return { ok: false, reason: "not_direct_publishable" };
    if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
      return { ok: false, reason: "edit_conflict" };
    return { ok: false, reason: "edit_conflict" };
  });
}

export async function publishAdminNews(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<PublishAdminNewsResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };
  const newsPostId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const publicationTime = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  return runNewsAdminTransaction(async ({ database, session }) => {
    const change = await changeNewsAndInsertAudit({
      database,
      session,
      newsPostId,
      eventId,
      actor: input.actor,
      action: "published",
      toVersionAt: publicationTime,
      filter: {
        _id: newsPostId,
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
    if (change)
      return {
        ok: true,
        id: input.id,
        slug: change.after.slug,
        publishedAt: publicationTime.toISOString(),
        updatedAt: publicationTime.toISOString(),
      };
    const current = await database
      .collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME)
      .findOne({ _id: newsPostId }, { session });
    if (!current || current.deletedAt != null) return { ok: false, reason: "not_found" };
    if (!isApprovedReviewState(current.publicationStatus, current.approvalStatus, current.publishedAt))
      return { ok: false, reason: "not_publishable" };
    return { ok: false, reason: "edit_conflict" };
  });
}

export async function updateAdminNewsDraft(input: {
  id: string;
  draft: ValidatedAdminNewsDraft;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<UpdateAdminNewsDraftResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };
  const newsPostId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const nextUpdatedAt = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  try {
    return await runNewsAdminTransaction(async ({ database, session }) => {
      const change = await changeNewsAndInsertAudit({
        database,
        session,
        newsPostId,
        eventId,
        actor: input.actor,
        action: "draft_updated",
        toVersionAt: nextUpdatedAt,
        filter: {
          _id: newsPostId,
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
          body: Array.from(input.draft.body),
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
        .collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME)
        .findOne({ _id: newsPostId }, { session });
      if (!current || current.deletedAt != null) return { ok: false, reason: "not_found" };
      if (!isEditableDraftState(current.publicationStatus, current.approvalStatus, current.publishedAt))
        return { ok: false, reason: "not_editable" };
      return { ok: false, reason: "edit_conflict" };
    });
  } catch (error) {
    if (isNewsSlugConflict(error)) return { ok: false, reason: "slug_conflict" };
    throw error;
  }
}

export async function requestAdminNewsReview(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<RequestAdminNewsReviewResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };
  const newsPostId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const nextUpdatedAt = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  return runNewsAdminTransaction(async ({ database, session }) => {
    const change = await changeNewsAndInsertAudit({
      database,
      session,
      newsPostId,
      eventId,
      actor: input.actor,
      action: "review_requested",
      toVersionAt: nextUpdatedAt,
      filter: {
        _id: newsPostId,
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
      .collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME)
      .findOne({ _id: newsPostId }, { session });
    if (!current || current.deletedAt != null) return { ok: false, reason: "not_found" };
    if (!isEditableDraftState(current.publicationStatus, current.approvalStatus, current.publishedAt))
      return { ok: false, reason: "not_requestable" };
    return { ok: false, reason: "edit_conflict" };
  });
}

export async function decideAdminNewsReview(input: {
  id: string;
  decision: AdminNewsReviewDecision;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<DecideAdminNewsReviewResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };
  const newsPostId = new ObjectId(input.id);
  const eventId = new ObjectId();
  const nextUpdatedAt = createNextUpdatedAt(input.expectedUpdatedAt, input.now ?? new Date());
  return runNewsAdminTransaction(async ({ database, session }) => {
    const approved = input.decision === "approve";
    const change = await changeNewsAndInsertAudit({
      database,
      session,
      newsPostId,
      eventId,
      actor: input.actor,
      action: approved ? "review_approved" : "review_rejected",
      toVersionAt: nextUpdatedAt,
      filter: {
        _id: newsPostId,
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
      .collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME)
      .findOne({ _id: newsPostId }, { session });
    if (!current || current.deletedAt != null) return { ok: false, reason: "not_found" };
    if (!isPendingReviewState(current.publicationStatus, current.approvalStatus, current.publishedAt))
      return { ok: false, reason: "not_decidable" };
    return { ok: false, reason: "edit_conflict" };
  });
}

export async function listAdminNewsPosts(input: {
  page: number;
  filters: AdminNewsListFilters;
  now?: Date;
}): Promise<AdminNewsListResult> {
  const now = input.now ?? new Date();
  const requestedPage = Math.min(ADMIN_NEWS_MAXIMUM_PAGE, Math.max(1, Math.trunc(input.page)));
  const filter: Filter<MongoNewsPostDocument> = { deletedAt: null };

  if (input.filters.category) filter.category = input.filters.category;
  if (input.filters.publicationStatus) {
    filter.publicationStatus = input.filters.publicationStatus;
  }
  if (input.filters.approvalStatus) {
    filter.approvalStatus = input.filters.approvalStatus;
  }

  const database = await getMongoDatabase();
  const collection = database.collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME);
  const totalItems = await collection.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalItems / ADMIN_NEWS_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const documents = await collection
    .find(filter, {
      projection: {
        slug: 1,
        category: 1,
        title: 1,
        summary: 1,
        publicationStatus: 1,
        approvalStatus: 1,
        publishedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        coverGalleryItemId: 1,
        attachment: 1,
      },
    })
    .sort({ updatedAt: -1, _id: -1 })
    .skip((page - 1) * ADMIN_NEWS_PAGE_SIZE)
    .limit(ADMIN_NEWS_PAGE_SIZE)
    .toArray();

  const items = documents.flatMap((document) => {
    const item = toAdminNewsListItem(document, now);
    if (!item || !isValidStoredNewsMedia(document)) {
      console.error("관리자 뉴스 문서 검증 실패", {
        documentId: document._id.toString(),
      });
      return [];
    }
    return [item];
  });

  return {
    items,
    page,
    pageSize: ADMIN_NEWS_PAGE_SIZE,
    totalItems,
    totalPages,
  };
}

export type AdminNewsTrashResult =
  | { ok: true; id: string; updatedAt: string }
  | {
      ok: false;
      reason: "not_found" | "not_deletable" | "not_restorable" | "edit_conflict" | "slug_conflict";
    };

async function changeAdminNewsTrashState(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  restore: boolean;
}): Promise<AdminNewsTrashResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };
  const newsPostId = new ObjectId(input.id);
  try {
    return await runNewsAdminTransaction(async ({ database, session }) => {
      const collection = database.collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME);
      const current = await collection.findOne({ _id: newsPostId }, { session });
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
            _id: { $ne: newsPostId },
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          },
          { session, projection: { _id: 1 } },
        );
        if (duplicate) return { ok: false, reason: "slug_conflict" } as const;
      }
      const transitionAt = createNextUpdatedAt(input.expectedUpdatedAt, new Date());
      const after = await collection.findOneAndUpdate(
        {
          _id: newsPostId,
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
      await insertNewsAuditEvent({
        database,
        session,
        eventId: new ObjectId(),
        newsPostId,
        action: input.restore ? "restored" : "soft_deleted",
        actor: input.actor,
        occurredAt: transitionAt,
        fromVersionAt: current.updatedAt,
        toVersionAt: transitionAt,
        before: createNewsAuditSnapshot(current),
        after: createNewsAuditSnapshot(after),
        changedFields: ["deletedAt", "publicationStatus", "approvalStatus", "publishedAt"],
      });
      return {
        ok: true,
        id: input.id,
        updatedAt: transitionAt.toISOString(),
      } as const;
    });
  } catch (error) {
    if (isNewsSlugConflict(error)) return { ok: false, reason: "slug_conflict" };
    throw error;
  }
}
export const softDeleteAdminNews = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) =>
  changeAdminNewsTrashState({ ...input, restore: false });
export const restoreAdminNews = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) =>
  changeAdminNewsTrashState({ ...input, restore: true });

export type AdminNewsMediaResult =
  | { ok: true; id: string; updatedAt: string; previousAttachment?: MongoNewsAttachment | null }
  | { ok: false; reason: "not_found" | "invalid_document" | "not_editable" | "edit_conflict" | "invalid_gallery_item" | "gallery_item_not_public" };

async function changeAdminNewsMedia(input: {
  id: string; expectedUpdatedAt: Date; actor: AdminPrincipal;
  set: Pick<MongoNewsPostDocument, "coverGalleryItemId"> | Pick<MongoNewsPostDocument, "attachment">;
  changedField: "coverImage" | "attachment";
}): Promise<AdminNewsMediaResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };
  const newsPostId = new ObjectId(input.id);
  const transitionAt = createNextUpdatedAt(input.expectedUpdatedAt, new Date());
  return runNewsAdminTransaction(async ({ database, session }) => {
    const collection = database.collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME);
    const current = await collection.findOne({ _id: newsPostId, ...activeDocumentFilter }, { session });
    if (!current) return { ok: false, reason: "not_found" };
    if (!toAdminNewsListItem(current, transitionAt) || !Array.isArray(current.body) ||
        !current.body.every(isNonEmptyString) || !isValidStoredNewsMedia(current))
      return { ok: false, reason: "invalid_document" };
    if ("attachment" in input.set && input.set.attachment !== null &&
        !isValidStoredNewsAttachment(input.set.attachment, transitionAt))
      return { ok: false, reason: "invalid_document" };
    if (!isEditableDraftState(current.publicationStatus, current.approvalStatus, current.publishedAt))
      return { ok: false, reason: "not_editable" };
    const change = await changeNewsAndInsertAudit({ database, session, newsPostId, eventId: new ObjectId(),
      actor: input.actor, action: "draft_updated", toVersionAt: transitionAt,
      filter: { _id: newsPostId, ...activeDocumentFilter, updatedAt: input.expectedUpdatedAt },
      set: { ...input.set, updatedAt: transitionAt }, changedFields: [input.changedField] });
    if (!change) return { ok: false, reason: "edit_conflict" };
    return { ok: true, id: input.id, updatedAt: transitionAt.toISOString(),
      previousAttachment: current.attachment ?? null };
  });
}

export async function setAdminNewsCoverImage(input: { id: string; galleryItemId: string; expectedUpdatedAt: Date; actor: AdminPrincipal }): Promise<AdminNewsMediaResult> {
  if (!ObjectId.isValid(input.galleryItemId) || new ObjectId(input.galleryItemId).toHexString() !== input.galleryItemId)
    return { ok: false, reason: "invalid_gallery_item" };
  const galleryId = new ObjectId(input.galleryItemId);
  const raw = await (await getMongoDatabase()).collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME)
    .findOne({ _id: galleryId });
  if (!raw) return { ok: false, reason: "invalid_gallery_item" };
  if (!isValidStoredGalleryItem(raw)) return { ok: false, reason: "invalid_gallery_item" };
  if (!(await findPublicGalleryCoverById(galleryId))) return { ok: false, reason: "gallery_item_not_public" };
  return changeAdminNewsMedia({ ...input, set: { coverGalleryItemId: galleryId }, changedField: "coverImage" });
}
export const removeAdminNewsCoverImage = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) =>
  changeAdminNewsMedia({ ...input, set: { coverGalleryItemId: null }, changedField: "coverImage" });
export const setAdminNewsAttachment = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal; attachment: MongoNewsAttachment }) =>
  changeAdminNewsMedia({ ...input, set: { attachment: input.attachment }, changedField: "attachment" });
export const removeAdminNewsAttachment = (input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal }) =>
  changeAdminNewsMedia({ ...input, set: { attachment: null }, changedField: "attachment" });
