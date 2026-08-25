import type { Filter, WithId } from "mongodb";

import { getMongoDatabase } from "@/lib/mongodb";

import {
  NEWS_COLLECTION_NAME,
  type MongoNewsPostDocument,
} from "./news.mongo-schema";
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

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
    isPubliclyVisible:
      document.publicationStatus === "published" &&
      document.approvalStatus === "approved" &&
      document.publishedAt !== null &&
      document.publishedAt <= now,
  };
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
