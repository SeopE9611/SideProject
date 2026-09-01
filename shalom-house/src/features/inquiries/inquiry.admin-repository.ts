import { ObjectId } from "mongodb";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";
import type { AdminPrincipal } from "@/features/admin-auth/admin-auth.types";
import { insertInquiryAuditEvent, listInquiryAuditEvents } from "./inquiry.audit-repository";
import type { InquiryDocument, InquiryKind, InquiryStatus } from "./inquiry.types";
import {
  inquiryPrivacyConsentVersion,
  inquiryRetentionDays,
  inquiryStatuses,
  isInquiryKind,
  isInquiryReference,
  isInquiryStatus,
  isValidInquiryDate,
} from "./inquiry.types";
const allowed: Record<InquiryStatus, InquiryStatus[]> = {
  received: ["in_review", "completed"],
  in_review: ["contacted", "completed"],
  contacted: ["in_review", "completed"],
  completed: ["in_review", "archived"],
  archived: ["in_review"],
};
export function canTransitionInquiryStatus(from: InquiryStatus, to: InquiryStatus) {
  return from === to || allowed[from].includes(to);
}
const visible = (now: Date) => ({ $or: [{ deleteAfter: null }, { deleteAfter: { $gt: now } }] });
function isValidStoredInquiryDocument(value: unknown): value is InquiryDocument {
  if (typeof value !== "object" || value === null) return false;
  const document = value as Partial<InquiryDocument>;
  if (
    !(document._id instanceof ObjectId) ||
    !isInquiryReference(document.reference) ||
    !isInquiryKind(document.kind) ||
    !isInquiryStatus(document.status) ||
    typeof document.name !== "string" ||
    document.name.trim().length < 1 ||
    document.name.trim().length > 80 ||
    typeof document.phone !== "string" ||
    typeof document.email !== "string" ||
    (!document.phone.trim() && !document.email.trim()) ||
    typeof document.message !== "string" ||
    document.message.length < 10 ||
    document.message.length > 2000 ||
    typeof document.internalNote !== "string" ||
    document.internalNote.length > 2000 ||
    document.privacyConsentVersion !== inquiryPrivacyConsentVersion ||
    !isValidInquiryDate(document.createdAt) ||
    !isValidInquiryDate(document.updatedAt) ||
    !isValidInquiryDate(document.privacyConsentedAt) ||
    document.updatedAt.getTime() < document.createdAt.getTime() ||
    document.privacyConsentedAt.getTime() !== document.createdAt.getTime()
  )
    return false;
  if (document.status === "received" || document.status === "in_review" || document.status === "contacted")
    return document.completedAt === null && document.archivedAt === null && document.deleteAfter === null;
  if (
    !isValidInquiryDate(document.completedAt) ||
    !isValidInquiryDate(document.deleteAfter) ||
    document.deleteAfter.getTime() <= document.completedAt.getTime()
  )
    return false;
  if (document.status === "completed") return document.archivedAt === null;
  return isValidInquiryDate(document.archivedAt) && document.archivedAt.getTime() >= document.completedAt.getTime();
}
function toCanonicalObjectId(value: string): ObjectId | null {
  if (!/^[0-9a-fA-F]{24}$/.test(value)) return null;
  const id = new ObjectId(value);
  return id.toHexString() === value.toLowerCase() ? id : null;
}
export async function listAdminInquiries(input: {
  status?: InquiryStatus;
  kind?: InquiryKind;
  page: number;
  pageSize: 20;
}) {
  const db = await getMongoDatabase();
  const filter = {
    ...visible(new Date()),
    ...(input.status ? { status: input.status } : {}),
    ...(input.kind ? { kind: input.kind } : {}),
  };
  const documents = await db
    .collection<InquiryDocument>("inquiries")
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .toArray();
  const validDocuments = documents.filter(isValidStoredInquiryDocument);
  const total = validDocuments.length;
  const items = validDocuments.slice((input.page - 1) * input.pageSize, input.page * input.pageSize);
  return {
    total,
    items: items.map((d) => ({
      id: d._id.toHexString(),
      reference: d.reference,
      kind: d.kind,
      status: d.status,
      name: d.name,
      contactChannels: d.phone && d.email ? "전화·이메일" : d.phone ? "전화" : "이메일",
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
  };
}
export async function getAdminInquiryCounts() {
  const db = await getMongoDatabase();
  const documents = await db.collection<InquiryDocument>("inquiries").find(visible(new Date())).toArray();
  const validDocuments = documents.filter(isValidStoredInquiryDocument);
  const result = Object.fromEntries(inquiryStatuses.map((status) => [status, 0])) as Record<InquiryStatus, number>;
  for (const document of validDocuments) result[document.status] += 1;
  return { ...result, total: validDocuments.length };
}
export async function getAdminInquiry(id: string) {
  const objectId = toCanonicalObjectId(id);
  if (!objectId) return null;
  const db = await getMongoDatabase();
  const document = await db.collection<InquiryDocument>("inquiries").findOne({ _id: objectId, ...visible(new Date()) });
  if (!isValidStoredInquiryDocument(document)) return null;
  const audit = await listInquiryAuditEvents(db, document._id);
  return {
    ...document,
    id: objectId.toHexString(),
    _id: undefined,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    privacyConsentedAt: document.privacyConsentedAt.toISOString(),
    completedAt: document.completedAt?.toISOString() ?? null,
    archivedAt: document.archivedAt?.toISOString() ?? null,
    deleteAfter: document.deleteAfter?.toISOString() ?? null,
    audit,
  };
}
export type UpdateResult =
  { ok: true } | { ok: false; reason: "not_found" | "invalid_document" | "edit_conflict" | "invalid_transition" };
export async function updateAdminInquiry(input: {
  id: string;
  expectedUpdatedAt: Date;
  status: InquiryStatus;
  internalNote: string;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<UpdateResult> {
  const objectId = toCanonicalObjectId(input.id);
  if (!objectId) return { ok: false, reason: "not_found" };
  const client = await getMongoClient();
  const db = await getMongoDatabase();
  const session = client.startSession();
  try {
    return await session.withTransaction(
      async () => {
        const existing = await db
          .collection<InquiryDocument>("inquiries")
          .findOne({ _id: objectId, ...visible(input.now ?? new Date()) }, { session });
        if (!existing) return { ok: false, reason: "not_found" };
        if (!isValidStoredInquiryDocument(existing)) return { ok: false, reason: "invalid_document" };
        if (existing.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
          return { ok: false, reason: "edit_conflict" };
        if (!canTransitionInquiryStatus(existing.status, input.status))
          return { ok: false, reason: "invalid_transition" };
        const at = new Date(Math.max((input.now ?? new Date()).getTime(), input.expectedUpdatedAt.getTime() + 1));
        let completedAt = existing.completedAt,
          archivedAt = existing.archivedAt,
          deleteAfter = existing.deleteAfter;
        if (input.status === "completed" && existing.status !== "completed") {
          completedAt = at;
          archivedAt = null;
          deleteAfter = new Date(at.getTime() + inquiryRetentionDays * 86400000);
        } else if (
          input.status === "in_review" &&
          (existing.status === "completed" || existing.status === "archived")
        ) {
          completedAt = null;
          archivedAt = null;
          deleteAfter = null;
        } else if (existing.status === "completed" && input.status === "archived") archivedAt = at;
        const changedFields = [
          ...(existing.status !== input.status ? ["status" as const] : []),
          ...(existing.internalNote !== input.internalNote ? ["internalNote" as const] : []),
        ];
        const updated = await db
          .collection<InquiryDocument>("inquiries")
          .updateOne(
            { _id: objectId, updatedAt: input.expectedUpdatedAt, ...visible(at) },
            {
              $set: {
                status: input.status,
                internalNote: input.internalNote,
                updatedAt: at,
                completedAt,
                archivedAt,
                deleteAfter,
              },
            },
            { session },
          );
        if (!updated.matchedCount) return { ok: false, reason: "edit_conflict" };
        await db
          .collection("inquiry_audit_events")
          .updateMany({ inquiryId: objectId }, { $set: { deleteAfter } }, { session });
        await insertInquiryAuditEvent(
          db,
          {
            _id: new ObjectId(),
            inquiryId: objectId,
            action: "updated",
            actor: {
              adminId: new ObjectId(input.actor.id),
              displayName: input.actor.displayName,
              role: input.actor.role,
            },
            occurredAt: at,
            fromVersionAt: existing.updatedAt,
            toVersionAt: at,
            fromStatus: existing.status,
            toStatus: input.status,
            changedFields,
            deleteAfter,
          },
          session,
        );
        return { ok: true };
      },
      { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
    );
  } finally {
    await session.endSession();
  }
}
