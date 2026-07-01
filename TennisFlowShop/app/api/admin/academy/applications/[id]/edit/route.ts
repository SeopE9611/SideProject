import { NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";

import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import {
  ACADEMY_CURRENT_LEVELS,
  ACADEMY_LESSON_TYPES,
  ACADEMY_PREFERRED_DAY_OPTIONS,
  type AcademyCurrentLevel,
  type AcademyLessonType,
} from "@/lib/types/academy";
import { requireAdmin } from "@/lib/admin.guard";

const COLLECTION_NAME = "academy_lesson_applications";

const LESSON_TYPES = new Set<AcademyLessonType>(ACADEMY_LESSON_TYPES);
const CURRENT_LEVELS = new Set<AcademyCurrentLevel>(ACADEMY_CURRENT_LEVELS);
const VALID_DAYS = new Set<string>(ACADEMY_PREFERRED_DAY_OPTIONS);

function trimString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function optionalTrimString(value: unknown, maxLength: number) {
  const trimmed = trimString(value, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function errorResponse(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

function normalizeEmail(value: unknown) {
  const email = optionalTrimString(value, 100);
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

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
    description: typeof record.description === "string" ? record.description : null,
    level: typeof record.level === "string" ? record.level : null,
    levelLabel: typeof record.levelLabel === "string" ? record.levelLabel : null,
    lessonType: typeof record.lessonType === "string" ? record.lessonType : null,
    lessonTypeLabel: typeof record.lessonTypeLabel === "string" ? record.lessonTypeLabel : null,
    instructorName: typeof record.instructorName === "string" ? record.instructorName : null,
    location: typeof record.location === "string" ? record.location : null,
    scheduleText: typeof record.scheduleText === "string" ? record.scheduleText : null,
    capacity: typeof record.capacity === "number" ? record.capacity : null,
    price: typeof record.price === "number" ? record.price : null,
    status: typeof record.status === "string" ? record.status : null,
    statusLabel: typeof record.statusLabel === "string" ? record.statusLabel : null,
  };
}

function serializeHistory(history: unknown) {
  if (!Array.isArray(history)) return [];
  return history.map((item) => {
    const record = item && typeof item === "object" ? (item as Document) : {};
    return {
      status: typeof record.status === "string" ? record.status : "submitted",
      date: typeof record.date === "string" ? record.date : serializeValue(record.date),
      description: typeof record.description === "string" ? record.description : "",
      actorId: record.actorId ? String(serializeValue(record.actorId)) : undefined,
      actorName: typeof record.actorName === "string" ? record.actorName : undefined,
    };
  });
}

function serializeApplication(doc: Document) {
  return {
    _id: String(serializeValue(doc._id)),
    applicantName: typeof doc.applicantName === "string" ? doc.applicantName : "",
    phone: typeof doc.phone === "string" ? doc.phone : "",
    email: typeof doc.email === "string" ? doc.email : null,
    desiredLessonType: typeof doc.desiredLessonType === "string" ? doc.desiredLessonType : "",
    currentLevel: typeof doc.currentLevel === "string" ? doc.currentLevel : "",
    preferredDays: Array.isArray(doc.preferredDays) ? doc.preferredDays : [],
    preferredTimeText: typeof doc.preferredTimeText === "string" ? doc.preferredTimeText : null,
    lessonGoal: typeof doc.lessonGoal === "string" ? doc.lessonGoal : null,
    requestMemo: typeof doc.requestMemo === "string" ? doc.requestMemo : null,
    status: typeof doc.status === "string" ? doc.status : "submitted",
    adminMemo: typeof doc.adminMemo === "string" ? doc.adminMemo : null,
    customerMessage: typeof doc.customerMessage === "string" ? doc.customerMessage : null,
    cancelReason: typeof doc.cancelReason === "string" ? doc.cancelReason : null,
    cancelReasonLabel: typeof doc.cancelReasonLabel === "string" ? doc.cancelReasonLabel : null,
    cancelReasonDetail: typeof doc.cancelReasonDetail === "string" ? doc.cancelReasonDetail : null,
    cancelledAt: serializeValue(doc.cancelledAt) ?? null,
    cancelledBy:
      doc.cancelledBy === "customer" || doc.cancelledBy === "admin" ? doc.cancelledBy : null,
    history: serializeHistory(doc.history),
    createdAt: serializeValue(doc.createdAt) ?? null,
    updatedAt: serializeValue(doc.updatedAt) ?? null,
    userId: doc.userId ? String(serializeValue(doc.userId)) : null,
    classId: doc.classId ? String(serializeValue(doc.classId)) : null,
    classSnapshot: serializeClassSnapshot(doc.classSnapshot),
  };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return errorResponse("유효하지 않은 신청 ID입니다.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("요청 본문을 확인해 주세요.");
  }
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const applicantName = trimString(payload.applicantName, 50);
  const phone = trimString(payload.phone, 30);
  const email = normalizeEmail(payload.email);
  const desiredLessonType = payload.desiredLessonType;
  const currentLevel = payload.currentLevel;
  if (!applicantName) return errorResponse("신청자명을 입력해 주세요.");
  if (!phone) return errorResponse("연락처를 입력해 주세요.");
  if (email === undefined) return errorResponse("이메일 형식을 확인해 주세요.");
  if (typeof desiredLessonType !== "string" || !LESSON_TYPES.has(desiredLessonType as AcademyLessonType)) {
    return errorResponse("희망 레슨 유형을 선택해 주세요.");
  }
  if (typeof currentLevel !== "string" || !CURRENT_LEVELS.has(currentLevel as AcademyCurrentLevel)) {
    return errorResponse("현재 실력을 선택해 주세요.");
  }
  if (!Array.isArray(payload.preferredDays)) return errorResponse("희망 요일을 선택해 주세요.");
  const preferredDays = Array.from(
    new Set(
      payload.preferredDays
        .filter((day): day is string => typeof day === "string")
        .map((day) => day.trim())
        .filter((day) => VALID_DAYS.has(day)),
    ),
  );
  if (preferredDays.length === 0) return errorResponse("희망 요일을 1개 이상 선택해 주세요.");

  const updateFields = {
    applicantName,
    phone,
    email,
    desiredLessonType,
    currentLevel,
    preferredDays,
    preferredTimeText: optionalTrimString(payload.preferredTimeText, 100),
    lessonGoal: optionalTrimString(payload.lessonGoal, 500),
    requestMemo: optionalTrimString(payload.requestMemo, 1000),
  };

  const collection = guard.db.collection(COLLECTION_NAME);
  const filter = { _id: new ObjectId(id), adminDeletedAt: { $exists: false } };
  const item = await collection.findOne(filter);
  if (!item) return errorResponse("신청 내역을 찾을 수 없습니다.", 404);
  if (item.status === "cancelled") {
    return errorResponse("취소된 신청은 수정할 수 없습니다.", 409, {
      code: "ACADEMY_APPLICATION_CANCELLED",
    });
  }

  const changedFields = Object.entries(updateFields)
    .filter(([key, value]) =>
      Array.isArray(value) ? !arraysEqual(toStringArray(item[key]), value) : (item[key] ?? null) !== value,
    )
    .map(([key]) => key);

  if (changedFields.length === 0) {
    return NextResponse.json({ success: true, item: serializeApplication(item) });
  }

  const now = new Date().toISOString();
  const result = await collection.findOneAndUpdate(
    filter,
    {
      $set: { ...updateFields, updatedAt: now },
      $push: {
        history: {
          status: item.status,
          date: now,
          description: "관리자가 아카데미 신청 정보를 수정했습니다.",
          actorId: guard.admin._id.toHexString(),
          actorName: guard.admin.name ?? guard.admin.email ?? "관리자",
          changedFields,
        },
      },
    },
    { returnDocument: "after" },
  );

  if (!result) return errorResponse("신청 내역을 찾을 수 없습니다.", 404);
  return NextResponse.json({ success: true, item: serializeApplication(result) });
}
