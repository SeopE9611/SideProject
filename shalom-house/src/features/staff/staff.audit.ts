import type { ObjectId } from "mongodb";
import type { AdminRole } from "@/features/admin-auth/admin-auth.types";
import type { StaffProfileDocument } from "./staff.types";
export const staffAuditActions = ["created", "updated"] as const;
export type StaffAuditAction = (typeof staffAuditActions)[number];
export const staffAuditChangedFields = [
  "role",
  "responsibility",
  "name",
  "nameDisclosure",
  "publicationStatus",
  "displayOrder",
] as const;
export type StaffAuditChangedField = (typeof staffAuditChangedFields)[number];
export type StaffAuditSnapshot = Omit<StaffProfileDocument, "_id" | "createdAt" | "updatedAt">;
export type StaffAuditActor = {
  adminId: ObjectId;
  displayName: string;
  role: AdminRole;
};
export const createStaffAuditSnapshot = (document: StaffProfileDocument): StaffAuditSnapshot => ({
  role: document.role,
  responsibility: document.responsibility,
  name: document.name,
  showName: document.showName,
  nameDisclosureConfirmed: document.nameDisclosureConfirmed,
  nameDisclosureReference: document.nameDisclosureReference,
  nameDisclosureConfirmedAt: document.nameDisclosureConfirmedAt,
  publicationStatus: document.publicationStatus,
  displayOrder: document.displayOrder,
  publishedAt: document.publishedAt,
  archivedAt: document.archivedAt,
});
export function getStaffChangedFields(
  before: StaffProfileDocument,
  after: StaffProfileDocument,
): StaffAuditChangedField[] {
  const fields: StaffAuditChangedField[] = [];
  if (before.role !== after.role) fields.push("role");
  if (before.responsibility !== after.responsibility) fields.push("responsibility");
  if (before.name !== after.name) fields.push("name");
  const beforeDisclosureAt = before.nameDisclosureConfirmedAt?.getTime() ?? null;
  const afterDisclosureAt = after.nameDisclosureConfirmedAt?.getTime() ?? null;
  if (
    before.showName !== after.showName ||
    before.nameDisclosureConfirmed !== after.nameDisclosureConfirmed ||
    before.nameDisclosureReference !== after.nameDisclosureReference ||
    beforeDisclosureAt !== afterDisclosureAt
  )
    fields.push("nameDisclosure");
  if (before.publicationStatus !== after.publicationStatus) fields.push("publicationStatus");
  if (before.displayOrder !== after.displayOrder) fields.push("displayOrder");
  return fields;
}
