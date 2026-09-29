import type { ObjectId } from "mongodb";
import type { AdminRole } from "@/features/admin-auth/admin-auth.types";
import type { FacilitySpaceDocument } from "./facility-space.types";
export const facilitySpaceAuditActions = ["created", "updated"] as const;
export type FacilitySpaceAuditAction = (typeof facilitySpaceAuditActions)[number];
export const facilitySpaceAuditChangedFields = ["title", "description", "publicationStatus", "displayOrder", "media"] as const;
export type FacilitySpaceAuditChangedField = (typeof facilitySpaceAuditChangedFields)[number];
export type FacilitySpaceAuditSnapshot = Omit<FacilitySpaceDocument, "_id" | "createdAt" | "updatedAt" | "media"> & {
  media?: null | { present: true; mimeType: "image/webp"; byteSize: number; width: number; height: number; altText: string };
};
export type FacilitySpaceAuditActor = { adminId: ObjectId; displayName: string; role: AdminRole };
export const createFacilitySpaceAuditSnapshot = (document: FacilitySpaceDocument): FacilitySpaceAuditSnapshot => ({
  title: document.title,
  description: document.description,
  publicationStatus: document.publicationStatus,
  displayOrder: document.displayOrder,
  publishedAt: document.publishedAt,
  archivedAt: document.archivedAt,
  media: document.media
    ? { present: true, mimeType: document.media.mimeType, byteSize: document.media.byteSize, width: document.media.width,
        height: document.media.height, altText: document.media.altText }
    : null,
});
export function getFacilitySpaceChangedFields(
  before: FacilitySpaceDocument,
  after: FacilitySpaceDocument,
): FacilitySpaceAuditChangedField[] {
  return facilitySpaceAuditChangedFields.filter((field) => field === "media"
    ? JSON.stringify(before.media ?? null) !== JSON.stringify(after.media ?? null)
    : before[field] !== after[field]);
}
