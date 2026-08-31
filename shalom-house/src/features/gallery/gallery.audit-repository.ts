import { getMongoDatabase } from "@/lib/mongodb";
import type { AdminAuditHistoryItem } from "../admin-audit/admin-audit.types";
import { ObjectId, type ClientSession, type Db } from "mongodb";
import type { AdminPrincipal } from "../admin-auth/admin-auth.types";
import { galleryAuditActions, type GalleryAuditAction, type GalleryAuditSnapshot } from "./gallery.audit";
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


const adminAuditActionLabels: Record<string, string> = { draft_created: "초안 생성", draft_updated: "초안 수정", review_requested: "검토 요청", review_approved: "승인", review_rejected: "반려", published: "게시", unpublished: "게시 중단", archived: "보관", consent_withdrawn: "공개 동의 철회" };
const adminAuditFieldLabels: Record<string, string> = { slug: "주소 식별자", title: "제목", category: "분류", description: "설명", altText: "대체 텍스트", activityDate: "활동일", subjectPresence: "인물 포함 여부", consentStatus: "공개 동의 상태", consentCheckedOn: "동의 확인일", displayStartOn: "표시 시작일", displayEndOn: "표시 종료일", media: "이미지", publicationStatus: "게시 상태", approvalStatus: "승인 상태", publishedAt: "게시일", consentWithdrawnAt: "동의 철회일", archivedAt: "보관일" };

type AdminAuditProjection = {
  _id?: unknown; action?: unknown; actor?: { displayName?: unknown };
  occurredAt?: unknown; changedFields?: unknown; galleryItemId?: unknown;
};

export async function listAdminGalleryAuditHistory(input: { contentId: string; limit?: number }): Promise<AdminAuditHistoryItem[]> {
  if (!/^[a-fA-F0-9]{24}$/.test(input.contentId) || !ObjectId.isValid(input.contentId)) return [];
  const contentId = new ObjectId(input.contentId);
  if (contentId.toHexString() !== input.contentId.toLowerCase()) return [];
  const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 50)));
  const documents = await (await getMongoDatabase())
    .collection<AdminAuditProjection>(GALLERY_AUDIT_COLLECTION_NAME)
    .find({ galleryItemId: contentId }, { projection: { _id: 1, action: 1, "actor.displayName": 1, occurredAt: 1, changedFields: 1, galleryItemId: 1 } })
    .sort({ occurredAt: -1, _id: -1 })
    .limit(limit)
    .toArray();
  return documents.flatMap((event) => {
    const valid = event._id instanceof ObjectId && event.occurredAt instanceof Date && !Number.isNaN(event.occurredAt.getTime())
      && typeof event.action === "string" && galleryAuditActions.includes(event.action as never)
      && typeof event.actor?.displayName === "string" && event.actor.displayName.trim().length > 0
      && Array.isArray(event.changedFields) && event.changedFields.every((field) => typeof field === "string");
    if (!valid) {
      console.error("관리자 감사 이벤트 검증에 실패했습니다.", { auditEventId: event._id instanceof ObjectId ? event._id.toHexString() : "unknown", domain: "gallery", errorName: "InvalidAuditEvent" });
      return [];
    }
    return [{ id: event._id.toHexString(), actionLabel: adminAuditActionLabels[event.action as string] ?? "기타 변경", actorDisplayName: (event.actor!.displayName as string).trim(), occurredAt: (event.occurredAt as Date).toISOString(), changedFieldLabels: (event.changedFields as string[]).map((field) => adminAuditFieldLabels[field]).filter((label): label is string => Boolean(label)) }];
  });
}
