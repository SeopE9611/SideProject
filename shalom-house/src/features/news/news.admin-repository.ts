import {
  MongoServerError,
  ObjectId,
  type Filter,
  type WithId,
} from "mongodb";

import { getMongoDatabase } from "@/lib/mongodb";

import {
  NEWS_COLLECTION_NAME,
  type MongoNewsPostDocument,
} from "./news.mongo-schema";
import type {
  AdminNewsPublicationAction,
  AdminNewsReviewDecision,
  ValidatedAdminNewsDraft,
} from "./news.admin-validation";
import {
  ADMIN_NEWS_MAXIMUM_PAGE,
  ADMIN_NEWS_PAGE_SIZE,
} from "./news.pagination";
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
  canDecideReview: boolean;
  canPublish: boolean;
  canManagePublicationState: boolean;
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
  | { ok: true; id: string; slug: string }
  | { ok: false; reason: "slug_conflict" };

export type UpdateAdminNewsDraftResult =
  | { ok: true; id: string; slug: string; updatedAt: string }
  | {
      ok: false;
      reason:
        | "slug_conflict"
        | "not_found"
        | "not_editable"
        | "edit_conflict";
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

type MongoNewsPostInsertDocument = Omit<MongoNewsPostDocument, "_id">;

export async function createAdminNewsDraft(
  input: ValidatedAdminNewsDraft,
  now: Date = new Date(),
): Promise<CreateAdminNewsDraftResult> {
  const document: MongoNewsPostInsertDocument = {
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
  const database = await getMongoDatabase();

  try {
    const result = await database
      .collection<MongoNewsPostInsertDocument>(NEWS_COLLECTION_NAME)
      .insertOne(document);
    return { ok: true, id: result.insertedId.toString(), slug: input.slug };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
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
  return new Date(
    Math.max(now.getTime(), expectedUpdatedAt.getTime() + 1),
  );
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
  return (
    publicationStatus === "review" &&
    approvalStatus === "pending" &&
    publishedAt === null
  );
}

function isApprovedReviewState(
  publicationStatus: NewsPublicationStatus,
  approvalStatus: NewsApprovalStatus,
  publishedAt: Date | null,
): boolean {
  return (
    publicationStatus === "review" &&
    approvalStatus === "approved" &&
    publishedAt === null
  );
}

function isPublishedApprovedState(
  publicationStatus: NewsPublicationStatus,
  approvalStatus: NewsApprovalStatus,
  publishedAt: Date | null,
): boolean {
  return (
    publicationStatus === "published" &&
    approvalStatus === "approved" &&
    publishedAt !== null
  );
}

function isPubliclyVisible(
  document: Pick<
    MongoNewsPostDocument,
    "publicationStatus" | "approvalStatus" | "publishedAt"
  >,
  now: Date,
): boolean {
  return (
    document.publicationStatus === "published" &&
    document.approvalStatus === "approved" &&
    document.publishedAt !== null &&
    document.publishedAt <= now
  );
}

function toAdminNewsListItem(
  document: WithId<MongoNewsPostDocument>,
  now: Date,
): AdminNewsListItem | null {
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

  return (
    ObjectId.isValid(value) &&
    new ObjectId(value).toHexString() === value.toLowerCase()
  );
}

export async function findAdminNewsPostById(
  id: string,
  now: Date = new Date(),
): Promise<AdminNewsDetail | null> {
  if (!isValidAdminNewsId(id)) return null;

  const database = await getMongoDatabase();
  const document = await database
    .collection<MongoNewsPostDocument>(NEWS_COLLECTION_NAME)
    .findOne(
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
        },
      },
    );

  if (!document) return null;
  const listItem = toAdminNewsListItem(document, now);
  if (
    !listItem ||
    !Array.isArray(document.body) ||
    !document.body.every(isNonEmptyString)
  ) {
    console.error("관리자 뉴스 상세 문서 검증 실패", {
      documentId: document._id.toString(),
    });
    return null;
  }

  return {
    ...listItem,
    body: document.body,
    isEditable: isEditableDraftState(
      document.publicationStatus,
      document.approvalStatus,
      document.publishedAt,
    ),
    canRequestReview: isEditableDraftState(
      document.publicationStatus,
      document.approvalStatus,
      document.publishedAt,
    ),
    canDecideReview: isPendingReviewState(
      document.publicationStatus,
      document.approvalStatus,
      document.publishedAt,
    ),
    canPublish: isApprovedReviewState(
      document.publicationStatus,
      document.approvalStatus,
      document.publishedAt,
    ),
    canManagePublicationState: isPublishedApprovedState(
      document.publicationStatus,
      document.approvalStatus,
      document.publishedAt,
    ),
  };
}

export async function changeAdminNewsPublicationState(input: {
  id: string;
  action: AdminNewsPublicationAction;
  expectedUpdatedAt: Date;
  now?: Date;
}): Promise<ChangeAdminNewsPublicationStateResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };

  const nextUpdatedAt = createNextUpdatedAt(
    input.expectedUpdatedAt,
    input.now ?? new Date(),
  );
  const database = await getMongoDatabase();
  const collection = database.collection<MongoNewsPostDocument>(
    NEWS_COLLECTION_NAME,
  );
  const updatedDocument = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(input.id),
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      publicationStatus: "published",
      approvalStatus: "approved",
      publishedAt: { $ne: null },
      updatedAt: input.expectedUpdatedAt,
    },
    input.action === "unpublish"
      ? {
          $set: {
            publicationStatus: "review",
            publishedAt: null,
            updatedAt: nextUpdatedAt,
          },
        }
      : {
          $set: {
            publicationStatus: "archived",
            updatedAt: nextUpdatedAt,
          },
        },
    { returnDocument: "after", includeResultMetadata: false },
  );

  if (updatedDocument) {
    const validPublishedAt =
      input.action === "unpublish"
        ? updatedDocument.publishedAt === null
        : isValidDate(updatedDocument.publishedAt);
    if (
      !isValidNewsSlug(updatedDocument.slug) ||
      !isValidDate(updatedDocument.updatedAt) ||
      !validPublishedAt ||
      updatedDocument.publicationStatus !==
        (input.action === "unpublish" ? "review" : "archived")
    ) {
      throw new Error("게시 상태 변경 결과 문서가 유효하지 않습니다.");
    }
    return {
      ok: true,
      id: updatedDocument._id.toString(),
      slug: updatedDocument.slug,
      action: input.action,
      publicationStatus: updatedDocument.publicationStatus,
      publishedAt: updatedDocument.publishedAt?.toISOString() ?? null,
      updatedAt: updatedDocument.updatedAt.toISOString(),
    };
  }

  const current = await collection.findOne(
    { _id: new ObjectId(input.id) },
    {
      projection: {
        publicationStatus: 1,
        approvalStatus: 1,
        publishedAt: 1,
        updatedAt: 1,
        deletedAt: 1,
      },
    },
  );
  if (!current || current.deletedAt != null) {
    return { ok: false, reason: "not_found" };
  }
  if (
    !isPublishedApprovedState(
      current.publicationStatus,
      current.approvalStatus,
      current.publishedAt,
    )
  ) {
    return { ok: false, reason: "not_manageable" };
  }
  if (
    !isValidDate(current.updatedAt) ||
    current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()
  ) {
    return { ok: false, reason: "edit_conflict" };
  }
  return { ok: false, reason: "edit_conflict" };
}

export async function publishAdminNews(input: {
  id: string;
  expectedUpdatedAt: Date;
  now?: Date;
}): Promise<PublishAdminNewsResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };

  const publicationTime = createNextUpdatedAt(
    input.expectedUpdatedAt,
    input.now ?? new Date(),
  );
  const database = await getMongoDatabase();
  const collection = database.collection<MongoNewsPostDocument>(
    NEWS_COLLECTION_NAME,
  );
  const updatedDocument = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(input.id),
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      publicationStatus: "review",
      approvalStatus: "approved",
      publishedAt: null,
      updatedAt: input.expectedUpdatedAt,
    },
    {
      $set: {
        publicationStatus: "published",
        publishedAt: publicationTime,
        updatedAt: publicationTime,
      },
    },
    { returnDocument: "after", includeResultMetadata: false },
  );

  if (updatedDocument) {
    return {
      ok: true,
      id: updatedDocument._id.toString(),
      slug: updatedDocument.slug,
      publishedAt: updatedDocument.publishedAt!.toISOString(),
      updatedAt: updatedDocument.updatedAt.toISOString(),
    };
  }

  const current = await collection.findOne(
    { _id: new ObjectId(input.id) },
    {
      projection: {
        slug: 1,
        publicationStatus: 1,
        approvalStatus: 1,
        publishedAt: 1,
        updatedAt: 1,
        deletedAt: 1,
      },
    },
  );
  if (!current || current.deletedAt != null) {
    return { ok: false, reason: "not_found" };
  }
  if (
    !isApprovedReviewState(
      current.publicationStatus,
      current.approvalStatus,
      current.publishedAt,
    )
  ) {
    return { ok: false, reason: "not_publishable" };
  }
  if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
    return { ok: false, reason: "edit_conflict" };
  }

  return { ok: false, reason: "edit_conflict" };
}

export async function updateAdminNewsDraft(input: {
  id: string;
  draft: ValidatedAdminNewsDraft;
  expectedUpdatedAt: Date;
  now?: Date;
}): Promise<UpdateAdminNewsDraftResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };

  const nextUpdatedAt = createNextUpdatedAt(
    input.expectedUpdatedAt,
    input.now ?? new Date(),
  );
  const database = await getMongoDatabase();
  const collection = database.collection<MongoNewsPostDocument>(
    NEWS_COLLECTION_NAME,
  );
  let updatedDocument: WithId<MongoNewsPostDocument> | null;

  try {
    updatedDocument = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(input.id),
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        publicationStatus: "draft",
        approvalStatus: { $in: ["pending", "rejected"] },
        publishedAt: null,
        updatedAt: input.expectedUpdatedAt,
      },
      {
        $set: {
          slug: input.draft.slug,
          category: input.draft.category,
          title: input.draft.title,
          summary: input.draft.summary,
          body: Array.from(input.draft.body),
          updatedAt: nextUpdatedAt,
        },
      },
      { returnDocument: "after", includeResultMetadata: false },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return { ok: false, reason: "slug_conflict" };
    }
    throw error;
  }

  if (updatedDocument) {
    return {
      ok: true,
      id: updatedDocument._id.toString(),
      slug: updatedDocument.slug,
      updatedAt: updatedDocument.updatedAt.toISOString(),
    };
  }

  const current = await collection.findOne(
    { _id: new ObjectId(input.id) },
    {
      projection: {
        publicationStatus: 1,
        approvalStatus: 1,
        publishedAt: 1,
        updatedAt: 1,
        deletedAt: 1,
      },
    },
  );
  if (!current || current.deletedAt != null) {
    return { ok: false, reason: "not_found" };
  }
  if (
    !isEditableDraftState(
      current.publicationStatus,
      current.approvalStatus,
      current.publishedAt,
    )
  ) {
    return { ok: false, reason: "not_editable" };
  }

  return { ok: false, reason: "edit_conflict" };
}

export async function requestAdminNewsReview(input: {
  id: string;
  expectedUpdatedAt: Date;
  now?: Date;
}): Promise<RequestAdminNewsReviewResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };

  const nextUpdatedAt = createNextUpdatedAt(
    input.expectedUpdatedAt,
    input.now ?? new Date(),
  );
  const database = await getMongoDatabase();
  const collection = database.collection<MongoNewsPostDocument>(
    NEWS_COLLECTION_NAME,
  );
  const updatedDocument = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(input.id),
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      publicationStatus: "draft",
      approvalStatus: { $in: ["pending", "rejected"] },
      publishedAt: null,
      updatedAt: input.expectedUpdatedAt,
    },
    {
      $set: {
        publicationStatus: "review",
        approvalStatus: "pending",
        updatedAt: nextUpdatedAt,
      },
    },
    { returnDocument: "after", includeResultMetadata: false },
  );

  if (updatedDocument) {
    return {
      ok: true,
      id: updatedDocument._id.toString(),
      updatedAt: updatedDocument.updatedAt.toISOString(),
    };
  }

  const current = await collection.findOne(
    { _id: new ObjectId(input.id) },
    {
      projection: {
        publicationStatus: 1,
        approvalStatus: 1,
        publishedAt: 1,
        updatedAt: 1,
        deletedAt: 1,
      },
    },
  );
  if (!current || current.deletedAt != null) {
    return { ok: false, reason: "not_found" };
  }
  if (
    !isEditableDraftState(
      current.publicationStatus,
      current.approvalStatus,
      current.publishedAt,
    )
  ) {
    return { ok: false, reason: "not_requestable" };
  }
  if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
    return { ok: false, reason: "edit_conflict" };
  }

  return { ok: false, reason: "edit_conflict" };
}

export async function decideAdminNewsReview(input: {
  id: string;
  decision: AdminNewsReviewDecision;
  expectedUpdatedAt: Date;
  now?: Date;
}): Promise<DecideAdminNewsReviewResult> {
  if (!isValidAdminNewsId(input.id)) return { ok: false, reason: "not_found" };

  const nextUpdatedAt = createNextUpdatedAt(
    input.expectedUpdatedAt,
    input.now ?? new Date(),
  );
  const database = await getMongoDatabase();
  const collection = database.collection<MongoNewsPostDocument>(
    NEWS_COLLECTION_NAME,
  );
  const updatedDocument = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(input.id),
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      publicationStatus: "review",
      approvalStatus: "pending",
      publishedAt: null,
      updatedAt: input.expectedUpdatedAt,
    },
    input.decision === "approve"
      ? {
          $set: {
            publicationStatus: "review",
            approvalStatus: "approved",
            updatedAt: nextUpdatedAt,
          },
        }
      : {
          $set: {
            publicationStatus: "draft",
            approvalStatus: "rejected",
            updatedAt: nextUpdatedAt,
          },
        },
    { returnDocument: "after", includeResultMetadata: false },
  );

  if (updatedDocument) {
    return {
      ok: true,
      id: updatedDocument._id.toString(),
      decision: input.decision,
      updatedAt: updatedDocument.updatedAt.toISOString(),
    };
  }

  const current = await collection.findOne(
    { _id: new ObjectId(input.id) },
    {
      projection: {
        publicationStatus: 1,
        approvalStatus: 1,
        publishedAt: 1,
        updatedAt: 1,
        deletedAt: 1,
      },
    },
  );
  if (!current || current.deletedAt != null) {
    return { ok: false, reason: "not_found" };
  }
  if (
    !isPendingReviewState(
      current.publicationStatus,
      current.approvalStatus,
      current.publishedAt,
    )
  ) {
    return { ok: false, reason: "not_decidable" };
  }
  if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
    return { ok: false, reason: "edit_conflict" };
  }

  return { ok: false, reason: "edit_conflict" };
}

export async function listAdminNewsPosts(input: {
  page: number;
  filters: AdminNewsListFilters;
  now?: Date;
}): Promise<AdminNewsListResult> {
  const now = input.now ?? new Date();
  const requestedPage = Math.min(
    ADMIN_NEWS_MAXIMUM_PAGE,
    Math.max(1, Math.trunc(input.page)),
  );
  const filter: Filter<MongoNewsPostDocument> = { deletedAt: null };

  if (input.filters.category) filter.category = input.filters.category;
  if (input.filters.publicationStatus) {
    filter.publicationStatus = input.filters.publicationStatus;
  }
  if (input.filters.approvalStatus) {
    filter.approvalStatus = input.filters.approvalStatus;
  }

  const database = await getMongoDatabase();
  const collection = database.collection<MongoNewsPostDocument>(
    NEWS_COLLECTION_NAME,
  );
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
      },
    })
    .sort({ updatedAt: -1, _id: -1 })
    .skip((page - 1) * ADMIN_NEWS_PAGE_SIZE)
    .limit(ADMIN_NEWS_PAGE_SIZE)
    .toArray();

  const items = documents.flatMap((document) => {
    const item = toAdminNewsListItem(document, now);
    if (!item) {
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
