import { NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";

import { requireAdmin } from "@/lib/admin.guard";

const COLLECTION_NAME = "academy_lesson_applications";

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toHexString" in value) {
    const maybeObjectId = value as { toHexString?: () => string };
    if (typeof maybeObjectId.toHexString === "function") {
      return maybeObjectId.toHexString();
    }
  }
  return value;
}

function serializeClassSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Document;
  return {
    classId:
      typeof record.classId === "string"
        ? record.classId
        : String(serializeValue(record.classId) ?? ""),
    name: typeof record.name === "string" ? record.name : "",
    description:
      typeof record.description === "string" ? record.description : null,
    level: typeof record.level === "string" ? record.level : null,
    levelLabel:
      typeof record.levelLabel === "string" ? record.levelLabel : null,
    lessonType:
      typeof record.lessonType === "string" ? record.lessonType : null,
    lessonTypeLabel:
      typeof record.lessonTypeLabel === "string"
        ? record.lessonTypeLabel
        : null,
    instructorName:
      typeof record.instructorName === "string" ? record.instructorName : null,
    location: typeof record.location === "string" ? record.location : null,
    scheduleText:
      typeof record.scheduleText === "string" ? record.scheduleText : null,
    capacity: typeof record.capacity === "number" ? record.capacity : null,
    price: typeof record.price === "number" ? record.price : null,
    status: typeof record.status === "string" ? record.status : null,
    statusLabel:
      typeof record.statusLabel === "string" ? record.statusLabel : null,
  };
}

function serializeHistory(history: unknown) {
  if (!Array.isArray(history)) return [];
  return history.map((item) => {
    const record = item && typeof item === "object" ? (item as Document) : {};
    return {
      status: typeof record.status === "string" ? record.status : "submitted",
      date:
        typeof record.date === "string"
          ? record.date
          : serializeValue(record.date),
      description:
        typeof record.description === "string" ? record.description : "",
      actorId: record.actorId
        ? String(serializeValue(record.actorId))
        : undefined,
      actorName:
        typeof record.actorName === "string" ? record.actorName : undefined,
    };
  });
}

function serializeApplication(doc: Document) {
  return {
    _id: String(serializeValue(doc._id)),
    applicantName:
      typeof doc.applicantName === "string" ? doc.applicantName : "",
    phone: typeof doc.phone === "string" ? doc.phone : "",
    email: typeof doc.email === "string" ? doc.email : null,
    desiredLessonType:
      typeof doc.desiredLessonType === "string" ? doc.desiredLessonType : "",
    currentLevel: typeof doc.currentLevel === "string" ? doc.currentLevel : "",
    preferredDays: Array.isArray(doc.preferredDays) ? doc.preferredDays : [],
    preferredTimeText:
      typeof doc.preferredTimeText === "string" ? doc.preferredTimeText : null,
    lessonGoal: typeof doc.lessonGoal === "string" ? doc.lessonGoal : null,
    requestMemo: typeof doc.requestMemo === "string" ? doc.requestMemo : null,
    status: typeof doc.status === "string" ? doc.status : "submitted",
    adminMemo: typeof doc.adminMemo === "string" ? doc.adminMemo : null,
    customerMessage:
      typeof doc.customerMessage === "string" ? doc.customerMessage : null,
    cancelReason:
      typeof doc.cancelReason === "string" ? doc.cancelReason : null,
    cancelReasonLabel:
      typeof doc.cancelReasonLabel === "string" ? doc.cancelReasonLabel : null,
    cancelReasonDetail:
      typeof doc.cancelReasonDetail === "string"
        ? doc.cancelReasonDetail
        : null,
    cancelledAt: serializeValue(doc.cancelledAt) ?? null,
    cancelledBy:
      doc.cancelledBy === "customer" || doc.cancelledBy === "admin"
        ? doc.cancelledBy
        : null,
    history: serializeHistory(doc.history),
    createdAt: serializeValue(doc.createdAt) ?? null,
    updatedAt: serializeValue(doc.updatedAt) ?? null,
    userId: doc.userId ? String(serializeValue(doc.userId)) : null,
    classId: doc.classId ? String(serializeValue(doc.classId)) : null,
    classSnapshot: serializeClassSnapshot(doc.classSnapshot),
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "유효하지 않은 신청 ID입니다." },
      { status: 400 },
    );
  }

  const item = await guard.db
    .collection(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id) });

  if (!item) {
    return NextResponse.json(
      { success: false, message: "신청 내역을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, item: serializeApplication(item) });
}
