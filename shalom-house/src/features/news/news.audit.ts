import type { ObjectId } from "mongodb";

import type { AdminRole } from "../admin-auth/admin-auth.types";
import type { ValidatedAdminNewsDraft } from "./news.admin-validation";
import type { MongoNewsPostDocument } from "./news.mongo-schema";
import type {
  NewsApprovalStatus,
  NewsCategory,
  NewsPublicationStatus,
} from "./news.types";

export const newsAuditActions = [
  "draft_created",
  "draft_updated",
  "review_requested",
  "review_approved",
  "review_rejected",
  "published",
  "direct_published",
  "unpublished",
  "archived",
  "soft_deleted",
  "restored",
] as const;

export type NewsAuditAction = (typeof newsAuditActions)[number];

export const newsAuditChangedFields = [
  "slug",
  "category",
  "title",
  "summary",
  "body",
  "publicationStatus",
  "approvalStatus",
  "publishedAt",
  "deletedAt",
] as const;

export type NewsAuditChangedField = (typeof newsAuditChangedFields)[number];

export type NewsAuditSnapshot = {
  slug: string;
  category: NewsCategory;
  title: string;
  publicationStatus: NewsPublicationStatus;
  approvalStatus: NewsApprovalStatus;
  publishedAt: Date | null;
  deletedAt: Date | null;
};

export type NewsAuditActor = {
  adminId: ObjectId;
  displayName: string;
  role: AdminRole;
};

export function createNewsAuditSnapshot(
  document: Pick<
    MongoNewsPostDocument,
    | "slug"
    | "category"
    | "title"
    | "publicationStatus"
    | "approvalStatus"
    | "publishedAt"
    | "deletedAt"
  >,
): NewsAuditSnapshot {
  return {
    slug: document.slug,
    category: document.category,
    title: document.title,
    publicationStatus: document.publicationStatus,
    approvalStatus: document.approvalStatus,
    publishedAt: document.publishedAt,
    deletedAt: document.deletedAt ?? null,
  };
}

export function getDraftChangedFields(
  before: Pick<
    MongoNewsPostDocument,
    "slug" | "category" | "title" | "summary" | "body"
  >,
  after: ValidatedAdminNewsDraft,
): NewsAuditChangedField[] {
  const changedFields: NewsAuditChangedField[] = [];
  if (before.slug !== after.slug) changedFields.push("slug");
  if (before.category !== after.category) changedFields.push("category");
  if (before.title !== after.title) changedFields.push("title");
  if (before.summary !== after.summary) changedFields.push("summary");
  if (
    before.body.length !== after.body.length ||
    before.body.some((paragraph, index) => paragraph !== after.body[index])
  ) {
    changedFields.push("body");
  }
  return changedFields;
}
