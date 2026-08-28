import { ObjectId, type ClientSession, type Db } from "mongodb";

import type { AdminPrincipal } from "../admin-auth/admin-auth.types";
import {
  newsAuditActions,
  newsAuditChangedFields,
  type NewsAuditAction,
  type NewsAuditActor,
  type NewsAuditChangedField,
  type NewsAuditSnapshot,
} from "./news.audit";
import {
  isNewsApprovalStatus,
  isNewsCategory,
  isNewsPublicationStatus,
  isValidNewsSlug,
} from "./news.types";

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

function isValidSnapshot(value: NewsAuditSnapshot): boolean {
  return (
    isValidNewsSlug(value.slug) &&
    isNewsCategory(value.category) &&
    value.title.trim().length > 0 &&
    isNewsPublicationStatus(value.publicationStatus) &&
    isNewsApprovalStatus(value.approvalStatus) &&
    (value.publishedAt === null || isValidDate(value.publishedAt))
  );
}

function createActor(actor: AdminPrincipal): NewsAuditActor {
  if (
    !/^[a-fA-F0-9]{24}$/.test(actor.id) ||
    !ObjectId.isValid(actor.id) ||
    new ObjectId(actor.id).toHexString() !== actor.id.toLowerCase() ||
    actor.displayName.trim().length === 0 ||
    actor.role !== "admin"
  ) {
    throw new Error("감사 이벤트 관리자 정보가 유효하지 않습니다.");
  }
  return {
    adminId: new ObjectId(actor.id),
    displayName: actor.displayName,
    role: actor.role,
  };
}

export async function insertNewsAuditEvent(
  input: InsertNewsAuditEventInput,
): Promise<void> {
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
