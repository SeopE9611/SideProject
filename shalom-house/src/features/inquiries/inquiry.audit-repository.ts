import type { ClientSession, Db, ObjectId } from "mongodb";
import type { InquiryAuditDocument } from "./inquiry.audit";
export async function listInquiryAuditEvents(db: Db, inquiryId: ObjectId) { return db.collection<InquiryAuditDocument>("inquiry_audit_events").find({ inquiryId }).sort({ occurredAt: -1, _id: -1 }).limit(50).toArray(); }
export async function insertInquiryAuditEvent(db: Db, document: InquiryAuditDocument, session: ClientSession) { await db.collection<InquiryAuditDocument>("inquiry_audit_events").insertOne(document, { session }); }
