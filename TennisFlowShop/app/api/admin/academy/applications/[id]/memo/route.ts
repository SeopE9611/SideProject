import { NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";

import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
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
    history: serializeHistory(doc.history),
    createdAt: serializeValue(doc.createdAt) ?? null,
    updatedAt: serializeValue(doc.updatedAt) ?? null,
    userId: doc.userId ? String(serializeValue(doc.userId)) : null,
    classId: doc.classId ? String(serializeValue(doc.classId)) : null,
    classSnapshot: serializeClassSnapshot(doc.classSnapshot),
  };
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "유효하지 않은 신청 ID입니다." },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  if (
    typeof payload.adminMemo === "string" &&
    payload.adminMemo.length > 2000
  ) {
    return NextResponse.json(
      { success: false, message: "관리자 메모는 2000자 이하로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (
    typeof payload.customerMessage === "string" &&
    payload.customerMessage.length > 1000
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "고객 안내 메시지는 1000자 이하로 입력해 주세요.",
      },
      { status: 400 },
    );
  }

  const adminMemo = normalizeOptionalText(payload.adminMemo, 2000);
  const customerMessage = normalizeOptionalText(payload.customerMessage, 1000);

  const collection = guard.db.collection(COLLECTION_NAME);
  const _id = new ObjectId(id);
  const current = await collection.findOne(
    { _id },
    { projection: { adminMemo: 1, customerMessage: 1, status: 1 } },
  );

  if (!current) {
    return NextResponse.json(
      { success: false, message: "신청 내역을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const currentAdminMemo =
    typeof current.adminMemo === "string" ? current.adminMemo : null;
  const currentCustomerMessage =
    typeof current.customerMessage === "string"
      ? current.customerMessage
      : null;
  const adminMemoChanged = currentAdminMemo !== adminMemo;
  const customerMessageChanged = currentCustomerMessage !== customerMessage;

  const now = new Date().toISOString();
  const update: Document = {
    $set: {
      adminMemo,
      customerMessage,
      updatedAt: now,
    },
  };

  const historyItems = [];
  if (adminMemoChanged) {
    historyItems.push({
      status: typeof current.status === "string" ? current.status : "submitted",
      date: now,
      description: "관리자 메모가 수정되었습니다.",
      actorId: guard.admin._id.toHexString(),
      actorName: guard.admin.name ?? guard.admin.email ?? "관리자",
    });
  }
  if (customerMessageChanged) {
    historyItems.push({
      status: typeof current.status === "string" ? current.status : "submitted",
      date: now,
      description: "고객 안내 메시지가 수정되었습니다.",
      actorId: guard.admin._id.toHexString(),
      actorName: guard.admin.name ?? guard.admin.email ?? "관리자",
    });
  }
  if (historyItems.length > 0) {
    update.$push = { history: { $each: historyItems } };
  }

  const updated = await collection.findOneAndUpdate({ _id }, update, {
    returnDocument: "after",
  });

  if (!updated) {
    return NextResponse.json(
      { success: false, message: "신청 내역을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    item: serializeApplication(updated),
  });
}
