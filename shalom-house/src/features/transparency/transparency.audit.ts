import type { MongoTransparencyDocument } from "./transparency.mongo-schema";
export const transparencyAuditActions = ["draft_created", "draft_updated", "review_requested", "review_approved", "review_rejected", "published", "unpublished", "archived"] as const;
export type TransparencyAuditAction = (typeof transparencyAuditActions)[number];
export type TransparencyAuditSnapshot = ReturnType<typeof createTransparencyAuditSnapshot>;
export function createTransparencyAuditSnapshot(document: MongoTransparencyDocument) {
  return {
    slug: document.slug,
    title: document.title,
    category: document.category,
    periodLabel: document.periodLabel,
    summary: document.summary,
    documentDate: document.documentDate,
    privacyReviewStatus: document.privacyReviewStatus,
    finalDocumentStatus: document.finalDocumentStatus,
    publicationStatus: document.publicationStatus,
    approvalStatus: document.approvalStatus,
    publishedAt: document.publishedAt,
    archivedAt: document.archivedAt,
    file: {
      mimeType: document.file.mimeType,
      byteSize: document.file.byteSize,
      sha256: document.file.sha256,
    },
  };
}
