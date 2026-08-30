import { ObjectId, type ClientSession, type Db } from "mongodb";
import type { AdminPrincipal } from "../admin-auth/admin-auth.types";
import type { TransparencyAuditAction, TransparencyAuditSnapshot } from "./transparency.audit";
export const TRANSPARENCY_AUDIT_COLLECTION_NAME = "transparency_audit_events";
export async function insertTransparencyAuditEvent(input: {
  database: Db;
  session: ClientSession;
  documentId: ObjectId;
  action: TransparencyAuditAction;
  actor: AdminPrincipal;
  occurredAt: Date;
  fromVersionAt: Date | null;
  toVersionAt: Date;
  before: TransparencyAuditSnapshot | null;
  after: TransparencyAuditSnapshot;
  changedFields: string[];
}) {
  if (!ObjectId.isValid(input.actor.id)) throw new Error("감사 이벤트 관리자 정보가 유효하지 않습니다.");
  await input.database.collection(TRANSPARENCY_AUDIT_COLLECTION_NAME).insertOne({
    _id: new ObjectId(), schemaVersion: 1, transparencyDocumentId: input.documentId,
    action: input.action,
    actor: { adminId: new ObjectId(input.actor.id), displayName: input.actor.displayName, role: "admin" },
    occurredAt: input.occurredAt, fromVersionAt: input.fromVersionAt, toVersionAt: input.toVersionAt,
    before: input.before, after: input.after, changedFields: input.changedFields,
  }, { session: input.session });
}
