import { ObjectId, type ClientSession, type Db } from "mongodb";
import { getMongoDatabase } from "@/lib/mongodb";
import type { AdminPrincipal } from "@/features/admin-auth/admin-auth.types";
import type { AdminAuditHistoryItem } from "@/features/admin-audit/admin-audit.types";
import { facilitySpaceAuditActions, facilitySpaceAuditChangedFields, type FacilitySpaceAuditAction, type FacilitySpaceAuditActor, type FacilitySpaceAuditChangedField, type FacilitySpaceAuditSnapshot } from "./facility-space.audit";
import { isValidFacilitySpaceDate } from "./facility-space.types";
export const FACILITY_SPACE_AUDIT_COLLECTION_NAME = "facility_space_audit_events";
export type FacilitySpaceAuditEventDocument = { _id: ObjectId; facilitySpaceId: ObjectId; action: FacilitySpaceAuditAction; actor: FacilitySpaceAuditActor; occurredAt: Date; fromVersionAt: Date | null; toVersionAt: Date; before: FacilitySpaceAuditSnapshot | null; after: FacilitySpaceAuditSnapshot; changedFields: FacilitySpaceAuditChangedField[] };
export async function insertFacilitySpaceAuditEvent(input: { database: Db; session: ClientSession; eventId: ObjectId; facilitySpaceId: ObjectId; action: FacilitySpaceAuditAction; actor: AdminPrincipal; occurredAt: Date; fromVersionAt: Date | null; toVersionAt: Date; before: FacilitySpaceAuditSnapshot | null; after: FacilitySpaceAuditSnapshot; changedFields: readonly FacilitySpaceAuditChangedField[] }) {
  const document: FacilitySpaceAuditEventDocument = {
    _id: input.eventId,
    facilitySpaceId: input.facilitySpaceId,
    action: input.action,
    actor: { adminId: new ObjectId(input.actor.id), displayName: input.actor.displayName, role: input.actor.role },
    occurredAt: input.occurredAt,
    fromVersionAt: input.fromVersionAt,
    toVersionAt: input.toVersionAt,
    before: input.before,
    after: input.after,
    changedFields: [...input.changedFields],
  };
  await input.database.collection<FacilitySpaceAuditEventDocument>(FACILITY_SPACE_AUDIT_COLLECTION_NAME).insertOne(document, { session: input.session });
}
const actionLabels = { created: "생활공간 생성", updated: "생활공간 수정" };
const fieldLabels: Record<FacilitySpaceAuditChangedField, string> = { title: "공간명", description: "공간 설명", publicationStatus: "공개 상태", displayOrder: "표시 순서" };
export async function listAdminFacilitySpaceAuditHistory(facilitySpaceId: string): Promise<AdminAuditHistoryItem[]> {
  if (!ObjectId.isValid(facilitySpaceId)) return [];
  const documents = await (await getMongoDatabase()).collection<FacilitySpaceAuditEventDocument>(FACILITY_SPACE_AUDIT_COLLECTION_NAME).find({ facilitySpaceId: new ObjectId(facilitySpaceId) }, { projection: { action: 1, "actor.displayName": 1, occurredAt: 1, changedFields: 1 } }).sort({ occurredAt: -1, _id: -1 }).limit(50).toArray();
  return documents.flatMap((event) => event._id instanceof ObjectId && isValidFacilitySpaceDate(event.occurredAt) && facilitySpaceAuditActions.includes(event.action) && typeof event.actor?.displayName === "string" && event.actor.displayName.trim() !== "" && Array.isArray(event.changedFields) && event.changedFields.every((field) => facilitySpaceAuditChangedFields.includes(field)) ? [{ id: event._id.toHexString(), actionLabel: actionLabels[event.action], actorDisplayName: event.actor.displayName, occurredAt: event.occurredAt.toISOString(), changedFieldLabels: event.changedFields.map((field) => fieldLabels[field]) }] : []);
}
