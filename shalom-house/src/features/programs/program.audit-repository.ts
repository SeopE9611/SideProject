import { getMongoDatabase } from "@/lib/mongodb";
import type { AdminAuditHistoryItem } from "../admin-audit/admin-audit.types";
import { ObjectId, type ClientSession, type Db } from "mongodb";
import { isAdminRole, type AdminPrincipal } from "../admin-auth/admin-auth.types";
import { programAuditActions, programAuditChangedFields, type ProgramAuditAction, type ProgramAuditActor, type ProgramAuditChangedField, type ProgramAuditSnapshot } from "./program.audit";
import { isProgramApprovalStatus, isProgramPublicationStatus, isValidProgramSlug } from "./program.types";
export const PROGRAM_AUDIT_COLLECTION_NAME = "program_audit_events";
export type MongoProgramAuditEventDocument = { _id: ObjectId; schemaVersion: 1; programId: ObjectId; action: ProgramAuditAction; actor: ProgramAuditActor; occurredAt: Date; fromVersionAt: Date | null; toVersionAt: Date; before: ProgramAuditSnapshot | null; after: ProgramAuditSnapshot; changedFields: ProgramAuditChangedField[] };
const validDate = (v: unknown): v is Date => v instanceof Date && !Number.isNaN(v.getTime());
function validSnapshot(v: ProgramAuditSnapshot): boolean { return isValidProgramSlug(v.slug) && v.category.trim().length > 0 && v.title.trim().length > 0 && v.summary.trim().length > 0 && v.purpose.trim().length > 0 && Array.isArray(v.body) && v.body.length > 0 && (v.operationStatusLabel === null || v.operationStatusLabel.trim().length > 0) && Number.isInteger(v.sortOrder) && isProgramPublicationStatus(v.publicationStatus) && isProgramApprovalStatus(v.approvalStatus) && (v.publishedAt === null || validDate(v.publishedAt)); }
function actor(value: AdminPrincipal): ProgramAuditActor { if (!ObjectId.isValid(value.id) || new ObjectId(value.id).toHexString() !== value.id.toLowerCase() || !value.displayName.trim() || !isAdminRole(value.role)) throw new Error("감사 이벤트 관리자 정보가 유효하지 않습니다."); return { adminId: new ObjectId(value.id), displayName: value.displayName, role: value.role }; }
export async function insertProgramAuditEvent(input: { database: Db; session: ClientSession; eventId: ObjectId; programId: ObjectId; action: ProgramAuditAction; actor: AdminPrincipal; occurredAt: Date; fromVersionAt: Date | null; toVersionAt: Date; before: ProgramAuditSnapshot | null; after: ProgramAuditSnapshot; changedFields: readonly ProgramAuditChangedField[] }): Promise<void> { const changedFields = Array.from(input.changedFields); if (!programAuditActions.includes(input.action) || !validDate(input.occurredAt) || (input.fromVersionAt !== null && !validDate(input.fromVersionAt)) || !validDate(input.toVersionAt) || (input.before !== null && !validSnapshot(input.before)) || !validSnapshot(input.after) || changedFields.some(f => !programAuditChangedFields.includes(f)) || new Set(changedFields).size !== changedFields.length) throw new Error("감사 이벤트 데이터가 유효하지 않습니다."); await input.database.collection<MongoProgramAuditEventDocument>(PROGRAM_AUDIT_COLLECTION_NAME).insertOne({ _id: input.eventId, schemaVersion: 1, programId: input.programId, action: input.action, actor: actor(input.actor), occurredAt: input.occurredAt, fromVersionAt: input.fromVersionAt, toVersionAt: input.toVersionAt, before: input.before, after: input.after, changedFields }, { session: input.session }); }


const adminAuditActionLabels: Record<string, string> = { draft_created: "초안 생성", draft_updated: "초안 수정", review_requested: "검토 요청", review_approved: "승인", review_rejected: "반려", published: "게시", direct_published: "바로 게시", unpublished: "게시 중단", archived: "보관", soft_deleted: "삭제", restored: "복구", consent_withdrawn: "공개 동의 철회" };
const adminAuditFieldLabels: Record<string, string> = { slug: "주소 식별자", category: "분류", title: "제목", summary: "요약", purpose: "목적", body: "본문", operationStatusLabel: "운영 상태", sortOrder: "표시 순서", deletedAt: "삭제일", publicationStatus: "게시 상태", approvalStatus: "승인 상태", publishedAt: "게시일" };

type AdminAuditProjection = {
  _id?: unknown; action?: unknown; actor?: { displayName?: unknown };
  occurredAt?: unknown; changedFields?: unknown; programId?: unknown;
};

export async function listAdminProgramAuditHistory(input: { contentId: string; limit?: number }): Promise<AdminAuditHistoryItem[]> {
  if (!/^[a-fA-F0-9]{24}$/.test(input.contentId) || !ObjectId.isValid(input.contentId)) return [];
  const contentId = new ObjectId(input.contentId);
  if (contentId.toHexString() !== input.contentId.toLowerCase()) return [];
  const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 50)));
  const documents = await (await getMongoDatabase())
    .collection<AdminAuditProjection>(PROGRAM_AUDIT_COLLECTION_NAME)
    .find({ programId: contentId }, { projection: { _id: 1, action: 1, "actor.displayName": 1, occurredAt: 1, changedFields: 1, programId: 1 } })
    .sort({ occurredAt: -1, _id: -1 })
    .limit(limit)
    .toArray();
  return documents.flatMap((event) => {
    const valid = event._id instanceof ObjectId && event.occurredAt instanceof Date && !Number.isNaN(event.occurredAt.getTime())
      && typeof event.action === "string" && programAuditActions.includes(event.action as never)
      && typeof event.actor?.displayName === "string" && event.actor.displayName.trim().length > 0
      && Array.isArray(event.changedFields) && event.changedFields.every((field) => typeof field === "string");
    if (!valid) {
      console.error("관리자 감사 이벤트 검증에 실패했습니다.", { auditEventId: event._id instanceof ObjectId ? event._id.toHexString() : "unknown", domain: "programs", errorName: "InvalidAuditEvent" });
      return [];
    }
    return [{ id: event._id.toHexString(), actionLabel: adminAuditActionLabels[event.action as string] ?? "기타 변경", actorDisplayName: (event.actor!.displayName as string).trim(), occurredAt: (event.occurredAt as Date).toISOString(), changedFieldLabels: (event.changedFields as string[]).map((field) => adminAuditFieldLabels[field]).filter((label): label is string => Boolean(label)) }];
  });
}
