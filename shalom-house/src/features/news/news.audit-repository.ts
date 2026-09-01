import { getMongoDatabase } from "@/lib/mongodb";
import type { AdminAuditHistoryItem } from "../admin-audit/admin-audit.types";
import { ObjectId, type ClientSession, type Db } from "mongodb";

import { isAdminRole, type AdminPrincipal } from "../admin-auth/admin-auth.types";
import {
  newsAuditActions,
  newsAuditChangedFields,
  type NewsAuditAction,
  type NewsAuditActor,
  type NewsAuditChangedField,
  type NewsAuditSnapshot,
} from "./news.audit";
import { isNewsApprovalStatus, isNewsCategory, isNewsPublicationStatus, isValidNewsSlug } from "./news.types";
import { ADMIN_NEWS_ATTACHMENT_MAX_BYTES, isValidNewsAttachmentLabel, normalizeNewsAttachmentFileName } from "./news.media-validation";

export const NEWS_AUDIT_COLLECTION_NAME = "news_audit_events";

export type MongoNewsAuditEventDocument = {
  _id: ObjectId;
  schemaVersion: 1;
  newsPostId: ObjectId;
  action: NewsAuditAction;
  actor: NewsAuditActor;
  occurredAt: Date;
  fromVersionAt: Date | null;
  toVersionAt: Date;
  before: NewsAuditSnapshot | null;
  after: NewsAuditSnapshot;
  changedFields: NewsAuditChangedField[];
};

export type InsertNewsAuditEventInput = {
  database: Db;
  session: ClientSession;
  eventId: ObjectId;
  newsPostId: ObjectId;
  action: NewsAuditAction;
  actor: AdminPrincipal;
  occurredAt: Date;
  fromVersionAt: Date | null;
  toVersionAt: Date;
  before: NewsAuditSnapshot | null;
  after: NewsAuditSnapshot;
  changedFields: readonly NewsAuditChangedField[];
};

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isValidSnapshot(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  const cover = snapshot.coverGalleryItemId;
  const attachment = snapshot.attachment;
  const validCover = cover === undefined || cover === null ||
    typeof cover === "string" && /^[a-f0-9]{24}$/.test(cover) && ObjectId.isValid(cover);
  const validAttachment = attachment === undefined || attachment === null || (() => {
    if (!attachment || typeof attachment !== "object") return false;
    const item = attachment as Record<string, unknown>;
    return Object.keys(item).length === 5 &&
      ["present", "originalFileName", "label", "byteSize", "contentType"].every((key) => key in item) &&
      item.present === true && typeof item.originalFileName === "string" &&
      normalizeNewsAttachmentFileName(item.originalFileName) === item.originalFileName &&
      isValidNewsAttachmentLabel(item.label) && Number.isSafeInteger(item.byteSize) &&
      Number(item.byteSize) >= 1 && Number(item.byteSize) <= ADMIN_NEWS_ATTACHMENT_MAX_BYTES &&
      item.contentType === "application/pdf";
  })();
  return (
    isValidNewsSlug(snapshot.slug) && isNewsCategory(snapshot.category) &&
    typeof snapshot.title === "string" && snapshot.title.trim().length > 0 &&
    isNewsPublicationStatus(snapshot.publicationStatus) && isNewsApprovalStatus(snapshot.approvalStatus) &&
    (snapshot.publishedAt === null || isValidDate(snapshot.publishedAt)) &&
    (snapshot.deletedAt === null || isValidDate(snapshot.deletedAt)) && validCover && validAttachment
  );
}

function createActor(actor: AdminPrincipal): NewsAuditActor {
  if (
    !/^[a-fA-F0-9]{24}$/.test(actor.id) ||
    !ObjectId.isValid(actor.id) ||
    new ObjectId(actor.id).toHexString() !== actor.id.toLowerCase() ||
    actor.displayName.trim().length === 0 ||
    !isAdminRole(actor.role)
  ) {
    throw new Error("감사 이벤트 관리자 정보가 유효하지 않습니다.");
  }
  return {
    adminId: new ObjectId(actor.id),
    displayName: actor.displayName,
    role: actor.role,
  };
}

export async function insertNewsAuditEvent(input: InsertNewsAuditEventInput): Promise<void> {
  const changedFields = Array.from(input.changedFields);
  if (
    !(input.eventId instanceof ObjectId) ||
    !(input.newsPostId instanceof ObjectId) ||
    !newsAuditActions.includes(input.action) ||
    !isValidDate(input.occurredAt) ||
    (input.fromVersionAt !== null && !isValidDate(input.fromVersionAt)) ||
    !isValidDate(input.toVersionAt) ||
    input.occurredAt.getTime() !== input.toVersionAt.getTime() ||
    (input.before !== null && !isValidSnapshot(input.before)) ||
    !isValidSnapshot(input.after) ||
    changedFields.some((field) => !newsAuditChangedFields.includes(field)) ||
    new Set(changedFields).size !== changedFields.length
  ) {
    throw new Error("감사 이벤트 데이터가 유효하지 않습니다.");
  }

  const document: MongoNewsAuditEventDocument = {
    _id: input.eventId,
    schemaVersion: 1,
    newsPostId: input.newsPostId,
    action: input.action,
    actor: createActor(input.actor),
    occurredAt: input.occurredAt,
    fromVersionAt: input.fromVersionAt,
    toVersionAt: input.toVersionAt,
    before: input.before,
    after: input.after,
    changedFields,
  };
  await input.database
    .collection<MongoNewsAuditEventDocument>(NEWS_AUDIT_COLLECTION_NAME)
    .insertOne(document, { session: input.session });
}

const adminAuditActionLabels: Record<string, string> = {
  draft_created: "초안 생성",
  draft_updated: "초안 수정",
  review_requested: "검토 요청",
  review_approved: "승인",
  review_rejected: "반려",
  published: "게시",
  direct_published: "바로 게시",
  unpublished: "게시 중단",
  archived: "보관",
  soft_deleted: "삭제",
  restored: "복구",
  consent_withdrawn: "공개 동의 철회",
};
const adminAuditFieldLabels: Record<string, string> = {
  slug: "주소 식별자",
  category: "분류",
  title: "제목",
  summary: "요약",
  body: "본문",
  deletedAt: "삭제일",
  coverImage: "대표 활동사진",
  attachment: "PDF 첨부파일",
  publicationStatus: "게시 상태",
  approvalStatus: "승인 상태",
  publishedAt: "게시일",
};

type AdminAuditProjection = {
  _id?: unknown;
  action?: unknown;
  actor?: { displayName?: unknown };
  occurredAt?: unknown;
  changedFields?: unknown;
  newsPostId?: unknown;
  schemaVersion?: unknown;
  fromVersionAt?: unknown;
  toVersionAt?: unknown;
  before?: unknown;
  after?: unknown;
};

export async function listAdminNewsAuditHistory(input: {
  contentId: string;
  limit?: number;
}): Promise<AdminAuditHistoryItem[]> {
  if (!/^[a-fA-F0-9]{24}$/.test(input.contentId) || !ObjectId.isValid(input.contentId)) return [];
  const contentId = new ObjectId(input.contentId);
  if (contentId.toHexString() !== input.contentId.toLowerCase()) return [];
  const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 50)));
  const documents = await (
    await getMongoDatabase()
  )
    .collection<AdminAuditProjection>(NEWS_AUDIT_COLLECTION_NAME)
    .find(
      { newsPostId: contentId },
      {
        projection: {
          _id: 1,
          action: 1,
          "actor.displayName": 1,
          occurredAt: 1,
          changedFields: 1,
          newsPostId: 1,
          schemaVersion: 1,
          fromVersionAt: 1,
          toVersionAt: 1,
          before: 1,
          after: 1,
        },
      },
    )
    .sort({ occurredAt: -1, _id: -1 })
    .limit(limit)
    .toArray();
  return documents.flatMap((event) => {
    const valid =
      event._id instanceof ObjectId &&
      event.newsPostId instanceof ObjectId &&
      event.schemaVersion === 1 &&
      event.occurredAt instanceof Date &&
      !Number.isNaN(event.occurredAt.getTime()) &&
      typeof event.action === "string" &&
      newsAuditActions.includes(event.action as never) &&
      typeof event.actor?.displayName === "string" &&
      event.actor.displayName.trim().length > 0 &&
      (event.fromVersionAt === null || isValidDate(event.fromVersionAt)) &&
      isValidDate(event.toVersionAt) &&
      (event.occurredAt as Date).getTime() === (event.toVersionAt as Date).getTime() &&
      (event.before === null || isValidSnapshot(event.before)) && isValidSnapshot(event.after) &&
      Array.isArray(event.changedFields) &&
      event.changedFields.every((field) => typeof field === "string" && newsAuditChangedFields.includes(field as never)) &&
      new Set(event.changedFields).size === event.changedFields.length;
    if (!valid) {
      console.error("관리자 감사 이벤트 검증에 실패했습니다.", {
        auditEventId: event._id instanceof ObjectId ? event._id.toHexString() : "unknown",
        domain: "news",
        errorName: "InvalidAuditEvent",
      });
      return [];
    }
    return [
      {
        id: event._id.toHexString(),
        actionLabel: adminAuditActionLabels[event.action as string] ?? "기타 변경",
        actorDisplayName: (event.actor!.displayName as string).trim(),
        occurredAt: (event.occurredAt as Date).toISOString(),
        changedFieldLabels: (event.changedFields as string[])
          .map((field) => adminAuditFieldLabels[field])
          .filter((label): label is string => Boolean(label)),
      },
    ];
  });
}
