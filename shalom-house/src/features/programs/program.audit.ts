import type { ObjectId } from "mongodb";
import type { AdminRole } from "../admin-auth/admin-auth.types";
import type { ValidatedAdminProgramDraft } from "./program.admin-validation";
import type { MongoProgramDocument } from "./program.mongo-schema";
import type { ProgramApprovalStatus, ProgramPublicationStatus } from "./program.types";
export const programAuditActions = ["draft_created", "draft_updated", "review_requested", "review_approved", "review_rejected", "published",
  "direct_published", "unpublished", "archived", "soft_deleted", "restored"] as const;
export type ProgramAuditAction = (typeof programAuditActions)[number];
export const programAuditChangedFields = ["slug", "category", "title", "summary", "purpose", "body", "operationStatusLabel", "sortOrder", "publicationStatus", "approvalStatus", "publishedAt", "deletedAt"] as const;
export type ProgramAuditChangedField = (typeof programAuditChangedFields)[number];
export type ProgramAuditSnapshot = { slug: string; category: string; title: string; summary: string; purpose: string; body: string[]; operationStatusLabel: string | null; sortOrder: number; publicationStatus: ProgramPublicationStatus; approvalStatus: ProgramApprovalStatus; publishedAt: Date | null; deletedAt: Date | null };
export type ProgramAuditActor = { adminId: ObjectId; displayName: string; role: AdminRole };
export function createProgramAuditSnapshot(document: MongoProgramDocument): ProgramAuditSnapshot { return { slug: document.slug, category: document.category, title: document.title, summary: document.summary, purpose: document.purpose, body: document.body, operationStatusLabel: document.operationStatusLabel, sortOrder: document.sortOrder, publicationStatus: document.publicationStatus, approvalStatus: document.approvalStatus, publishedAt: document.publishedAt, deletedAt: document.deletedAt ?? null }; }
export function getDraftChangedFields(before: MongoProgramDocument, after: ValidatedAdminProgramDraft): ProgramAuditChangedField[] { const fields: ProgramAuditChangedField[] = []; for (const key of ["slug", "category", "title", "summary", "purpose", "operationStatusLabel", "sortOrder"] as const) if (before[key] !== after[key]) fields.push(key); if (before.body.length !== after.body.length || before.body.some((p,i) => p !== after.body[i])) fields.push("body"); return fields; }
