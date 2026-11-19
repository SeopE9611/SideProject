import { createHash } from "node:crypto";
import { parseNewsBodyDocument, sameNewsDocument } from "./news.rich-text";
import type { ObjectId } from "mongodb";

import type { AdminRole } from "../admin-auth/admin-auth.types";
import type { ValidatedAdminNewsDraft } from "./news.admin-validation";
import type { MongoNewsPostDocument } from "./news.mongo-schema";
import type { NewsApprovalStatus, NewsCategory, NewsPublicationStatus } from "./news.types";

export const newsAuditActions = [
  "draft_created",
  "draft_updated",
  "content_updated",
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
  "bodyDocument",
  "publicationStatus",
  "approvalStatus",
  "publishedAt",
  "deletedAt",
  "coverImage",
  "attachment",
] as const;

export type NewsAuditChangedField = (typeof newsAuditChangedFields)[number];

export type NewsAuditSnapshot = {
  bodyDocumentHash?: string;
  slug: string;
  category: NewsCategory;
  title: string;
  publicationStatus: NewsPublicationStatus;
  approvalStatus: NewsApprovalStatus;
  publishedAt: Date | null;
  deletedAt: Date | null;
  coverGalleryItemId: string | null;
  attachment: null | { present: true; originalFileName: string; label: string; byteSize: number; contentType: "application/pdf" };
};

export type NewsAuditActor = {
  adminId: ObjectId;
  displayName: string;
  role: AdminRole;
};

export function createNewsAuditSnapshot(
  document: Pick<
    MongoNewsPostDocument,
    "slug" | "category" | "title" | "publicationStatus" | "approvalStatus" | "publishedAt" | "deletedAt" | "coverGalleryItemId" | "attachment" | "bodyDocument"
  >,
): NewsAuditSnapshot {
  const rich = document.bodyDocument === undefined ? null : parseNewsBodyDocument(document.bodyDocument);
  return {
    ...(rich ? { bodyDocumentHash: createHash("sha256").update(JSON.stringify(rich)).digest("hex") } : {}),
    slug: document.slug,
    category: document.category,
    title: document.title,
    publicationStatus: document.publicationStatus,
    approvalStatus: document.approvalStatus,
    publishedAt: document.publishedAt,
    deletedAt: document.deletedAt ?? null,
    coverGalleryItemId: document.coverGalleryItemId?.toHexString() ?? null,
    attachment: document.attachment ? { present: true, originalFileName: document.attachment.originalFileName,
      label: document.attachment.label, byteSize: document.attachment.byteSize, contentType: document.attachment.contentType } : null,
  };
}

export function getDraftChangedFields(
  before: Pick<MongoNewsPostDocument, "slug" | "category" | "title" | "summary" | "body" | "bodyDocument">,
  after: ValidatedAdminNewsDraft,
): NewsAuditChangedField[] {
  const changedFields: NewsAuditChangedField[] = [];
  const beforeDocument = before.bodyDocument === undefined ? undefined : parseNewsBodyDocument(before.bodyDocument) ?? undefined;
  if (!sameNewsDocument(beforeDocument, after.bodyDocument)) changedFields.push("bodyDocument");
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
