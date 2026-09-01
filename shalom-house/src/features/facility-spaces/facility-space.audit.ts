import type { ObjectId } from "mongodb";
import type { AdminRole } from "@/features/admin-auth/admin-auth.types";
import type { FacilitySpaceDocument } from "./facility-space.types";
export const facilitySpaceAuditActions = ["created", "updated"] as const;
export type FacilitySpaceAuditAction = (typeof facilitySpaceAuditActions)[number];
export const facilitySpaceAuditChangedFields = ["title", "description", "publicationStatus", "displayOrder"] as const;
export type FacilitySpaceAuditChangedField = (typeof facilitySpaceAuditChangedFields)[number];
export type FacilitySpaceAuditSnapshot = Omit<FacilitySpaceDocument, "_id" | "createdAt" | "updatedAt">;
export type FacilitySpaceAuditActor = { adminId: ObjectId; displayName: string; role: AdminRole };
export const createFacilitySpaceAuditSnapshot = (document: FacilitySpaceDocument): FacilitySpaceAuditSnapshot => ({
  title: document.title,
  description: document.description,
  publicationStatus: document.publicationStatus,
  displayOrder: document.displayOrder,
  publishedAt: document.publishedAt,
  archivedAt: document.archivedAt,
});
export function getFacilitySpaceChangedFields(
  before: FacilitySpaceDocument,
  after: FacilitySpaceDocument,
): FacilitySpaceAuditChangedField[] {
  return facilitySpaceAuditChangedFields.filter((field) => before[field] !== after[field]);
}
