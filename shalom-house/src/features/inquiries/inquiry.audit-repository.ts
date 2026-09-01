import { ObjectId, type ClientSession, type Db } from "mongodb";
import type { InquiryAuditChangedField, InquiryAuditDocument } from "./inquiry.audit";
import { isInquiryStatus, isValidInquiryDate, type InquiryStatus } from "./inquiry.types";
export type AdminInquiryAuditEvent = {
  action: "updated";
  displayName: string;
  occurredAt: string;
  fromStatus: InquiryStatus;
  toStatus: InquiryStatus;
  changedFields: InquiryAuditChangedField[];
};
const changedFields = new Set<InquiryAuditChangedField>(["status", "internalNote"]);
function isValidAuditEvent(
  value: unknown,
): value is Pick<
  InquiryAuditDocument,
  | "_id"
  | "action"
  | "actor"
  | "occurredAt"
  | "fromVersionAt"
  | "toVersionAt"
  | "fromStatus"
  | "toStatus"
  | "changedFields"
> {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<InquiryAuditDocument>;
  return (
    event._id instanceof ObjectId &&
    event.action === "updated" &&
    typeof event.actor?.displayName === "string" &&
    event.actor.displayName.trim().length > 0 &&
    isValidInquiryDate(event.occurredAt) &&
    isValidInquiryDate(event.fromVersionAt) &&
    isValidInquiryDate(event.toVersionAt) &&
    event.toVersionAt.getTime() === event.occurredAt.getTime() &&
    isInquiryStatus(event.fromStatus) &&
    isInquiryStatus(event.toStatus) &&
    Array.isArray(event.changedFields) &&
    event.changedFields.every((field) => changedFields.has(field))
  );
}
export async function listInquiryAuditEvents(db: Db, inquiryId: ObjectId): Promise<AdminInquiryAuditEvent[]> {
  const events = await db
    .collection("inquiry_audit_events")
    .find(
      { inquiryId },
      {
        projection: {
          _id: 1,
          action: 1,
          "actor.displayName": 1,
          occurredAt: 1,
          fromVersionAt: 1,
          toVersionAt: 1,
          fromStatus: 1,
          toStatus: 1,
          changedFields: 1,
        },
      },
    )
    .sort({ occurredAt: -1, _id: -1 })
    .limit(50)
    .toArray();
  return events
    .filter(isValidAuditEvent)
    .map((event) => ({
      action: event.action,
      displayName: event.actor.displayName,
      occurredAt: event.occurredAt.toISOString(),
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      changedFields: event.changedFields,
    }));
}
export async function insertInquiryAuditEvent(db: Db, document: InquiryAuditDocument, session: ClientSession) {
  await db.collection<InquiryAuditDocument>("inquiry_audit_events").insertOne(document, { session });
}
