import { ObjectId, type ClientSession, type Db } from "mongodb";
import type { AdminPrincipal } from "../admin-auth/admin-auth.types";
import type { GalleryAuditAction, GalleryAuditSnapshot } from "./gallery.audit";
export const GALLERY_AUDIT_COLLECTION_NAME = "gallery_audit_events";
type Event = {
  _id: ObjectId;
  schemaVersion: 1;
  galleryItemId: ObjectId;
  action: GalleryAuditAction;
  actor: { adminId: ObjectId; displayName: string; role: "admin" };
  occurredAt: Date;
  fromVersionAt: Date | null;
  toVersionAt: Date;
  before: GalleryAuditSnapshot | null;
  after: GalleryAuditSnapshot;
  changedFields: string[];
};
export async function insertGalleryAuditEvent(input: {
  database: Db;
  session: ClientSession;
  galleryItemId: ObjectId;
  action: GalleryAuditAction;
  actor: AdminPrincipal;
  occurredAt: Date;
  fromVersionAt: Date | null;
  toVersionAt: Date;
  before: GalleryAuditSnapshot | null;
  after: GalleryAuditSnapshot;
  changedFields: string[];
}) {
  if (!ObjectId.isValid(input.actor.id))
    throw new Error("감사 이벤트 관리자 정보가 유효하지 않습니다.");
  await input.database
    .collection<Event>(GALLERY_AUDIT_COLLECTION_NAME)
    .insertOne(
      {
        _id: new ObjectId(),
        schemaVersion: 1,
        galleryItemId: input.galleryItemId,
        action: input.action,
        actor: {
          adminId: new ObjectId(input.actor.id),
          displayName: input.actor.displayName,
          role: "admin",
        },
        occurredAt: input.occurredAt,
        fromVersionAt: input.fromVersionAt,
        toVersionAt: input.toVersionAt,
        before: input.before,
        after: input.after,
        changedFields: input.changedFields,
      },
      { session: input.session },
    );
}
