import { ObjectId, type Document, type Filter } from "mongodb";
import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import clientPromise from "@/lib/mongodb";
import {
  ACADEMY_CURRENT_LEVELS,
  ACADEMY_LESSON_TYPES,
  ACADEMY_PREFERRED_DAY_OPTIONS,
  getAcademyApplicationStatusLabel,
  getAcademyCurrentLevelLabel,
  getAcademyLessonTypeLabel,
  isAcademyApplicationStatus,
  type AcademyApplicationEditableFields,
  type AcademyClassSnapshot,
  type AcademyCurrentLevel,
  type AcademyLessonApplication,
  type AcademyLessonApplicationHistoryItem,
  type AcademyLessonApplicationStatus,
  type AcademyLessonType,
} from "@/lib/types/academy";

const COLLECTION_NAME = "academy_lesson_applications";

type AcademyLessonApplicationDoc = Omit<
  AcademyLessonApplication,
  "_id" | "userId" | "classId" | "createdAt" | "updatedAt" | "history"
> & {
  _id?: ObjectId;
  userId: string | ObjectId;
  classId?: string | ObjectId | null;
  history?: AcademyLessonApplicationHistoryItem[];
  adminDeletedAt?: string | Date;
  adminDeletedBy?: string;
  customerDeletedAt?: string | Date;
  customerDeletedBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type CustomerEditableFieldKey = keyof AcademyApplicationEditableFields;

const CUSTOMER_EDITABLE_STATUSES = new Set<AcademyLessonApplicationStatus>([
  "submitted",
  "reviewing",
]);
const LESSON_TYPES = new Set<AcademyLessonType>(ACADEMY_LESSON_TYPES);
const CURRENT_LEVELS = new Set<AcademyCurrentLevel>(ACADEMY_CURRENT_LEVELS);
const VALID_DAYS = new Set<string>(ACADEMY_PREFERRED_DAY_OPTIONS);

function optionalTrimString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function errorResponse(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

function serializeObjectId(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof ObjectId) return value.toHexString();
  if (typeof value === "object" && "toHexString" in value) {
    const maybeObjectId = value as { toHexString?: () => string };
    if (typeof maybeObjectId.toHexString === "function") {
      return maybeObjectId.toHexString();
    }
  }
  return typeof value === "string" ? value : String(value);
}

function serializeClassSnapshot(value: unknown): AcademyClassSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Document;

  return {
    classId:
      typeof record.classId === "string"
        ? record.classId
        : (serializeObjectId(record.classId) ?? ""),
    name: typeof record.name === "string" ? record.name : "",
    description: typeof record.description === "string" ? record.description : null,
    lessonType:
      typeof record.lessonType === "string"
        ? (record.lessonType as AcademyClassSnapshot["lessonType"])
        : null,
    lessonTypeLabel: typeof record.lessonTypeLabel === "string" ? record.lessonTypeLabel : null,
    level:
      typeof record.level === "string" ? (record.level as AcademyClassSnapshot["level"]) : null,
    levelLabel: typeof record.levelLabel === "string" ? record.levelLabel : null,
    instructorName: typeof record.instructorName === "string" ? record.instructorName : null,
    location: typeof record.location === "string" ? record.location : null,
    scheduleText: typeof record.scheduleText === "string" ? record.scheduleText : null,
    capacity: typeof record.capacity === "number" ? record.capacity : null,
    price: typeof record.price === "number" ? record.price : null,
    status:
      typeof record.status === "string" ? (record.status as AcademyClassSnapshot["status"]) : null,
    statusLabel: typeof record.statusLabel === "string" ? record.statusLabel : null,
  };
}

function toISOStringMaybe(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function serializeApplication(doc: Document) {
  const rawStatus = typeof doc.status === "string" ? doc.status : "submitted";
  const status: AcademyLessonApplicationStatus = isAcademyApplicationStatus(rawStatus)
    ? rawStatus
    : "submitted";
  const desiredLessonType =
    typeof doc.desiredLessonType === "string" ? doc.desiredLessonType : null;
  const currentLevel = typeof doc.currentLevel === "string" ? doc.currentLevel : null;

  return {
    _id: String(doc._id),
    kind: "academy_lesson" as const,
    type: "아카데미 클래스 신청",
    status,
    statusLabel: getAcademyApplicationStatusLabel(status),
    applicantName: typeof doc.applicantName === "string" ? doc.applicantName : "",
    phone: typeof doc.phone === "string" ? doc.phone : "",
    email: typeof doc.email === "string" ? doc.email : null,
    desiredLessonType,
    desiredLessonTypeLabel: getAcademyLessonTypeLabel(desiredLessonType),
    currentLevel,
    currentLevelLabel: getAcademyCurrentLevelLabel(currentLevel),
    preferredDays: toStringArray(doc.preferredDays),
    preferredTimeText: typeof doc.preferredTimeText === "string" ? doc.preferredTimeText : null,
    lessonGoal: typeof doc.lessonGoal === "string" ? doc.lessonGoal : null,
    requestMemo: typeof doc.requestMemo === "string" ? doc.requestMemo : null,
    customerMessage:
      typeof doc.customerMessage === "string" && doc.customerMessage.trim()
        ? doc.customerMessage
        : null,
    classId: serializeObjectId(doc.classId),
    classSnapshot: serializeClassSnapshot(doc.classSnapshot),
    cancelledAt: toISOStringMaybe(doc.cancelledAt),
    cancelledBy:
      doc.cancelledBy === "customer" || doc.cancelledBy === "admin" ? doc.cancelledBy : null,
    cancelReason: typeof doc.cancelReason === "string" ? doc.cancelReason : null,
    cancelReasonLabel: typeof doc.cancelReasonLabel === "string" ? doc.cancelReasonLabel : null,
    cancelReasonDetail: typeof doc.cancelReasonDetail === "string" ? doc.cancelReasonDetail : null,
    createdAt: toISOStringMaybe(doc.createdAt),
    updatedAt: toISOStringMaybe(doc.updatedAt),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "신청 내역을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const userObjectId = new ObjectId(userId);
  const client = await clientPromise;
  const db = client.db();
  const item = await db.collection(COLLECTION_NAME).findOne(
    {
      _id: new ObjectId(id),
      userId: { $in: [userObjectId, userId] },
      adminDeletedAt: { $exists: false },
      customerDeletedAt: { $exists: false },
    },
    {
      projection: {
        _id: 1,
        applicantName: 1,
        phone: 1,
        email: 1,
        desiredLessonType: 1,
        currentLevel: 1,
        preferredDays: 1,
        preferredTimeText: 1,
        lessonGoal: 1,
        requestMemo: 1,
        status: 1,
        customerMessage: 1,
        classId: 1,
        classSnapshot: 1,
        cancelledAt: 1,
        cancelledBy: 1,
        cancelReason: 1,
        cancelReasonLabel: 1,
        cancelReasonDetail: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  );

  if (!item) {
    return NextResponse.json(
      { success: false, message: "신청 내역을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, item: serializeApplication(item) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId || !ObjectId.isValid(userId)) {
    return errorResponse("로그인이 필요합니다.", 401);
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return errorResponse("신청 내역을 찾을 수 없습니다.", 404);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("요청 본문을 확인해 주세요.");
  }
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const desiredLessonType = payload.desiredLessonType;
  const currentLevel = payload.currentLevel;
  if (
    typeof desiredLessonType !== "string" ||
    !LESSON_TYPES.has(desiredLessonType as AcademyLessonType)
  ) {
    return errorResponse("희망 레슨 유형을 선택해 주세요.");
  }
  if (
    typeof currentLevel !== "string" ||
    !CURRENT_LEVELS.has(currentLevel as AcademyCurrentLevel)
  ) {
    return errorResponse("현재 실력을 선택해 주세요.");
  }
  if (!Array.isArray(payload.preferredDays)) {
    return errorResponse("희망 요일을 선택해 주세요.");
  }
  const preferredDays = Array.from(
    new Set(
      payload.preferredDays
        .filter((day): day is string => typeof day === "string")
        .map((day) => day.trim())
        .filter((day) => VALID_DAYS.has(day)),
    ),
  );
  if (preferredDays.length === 0) {
    return errorResponse("희망 요일을 1개 이상 선택해 주세요.");
  }

  const updateFields: AcademyApplicationEditableFields = {
    desiredLessonType: desiredLessonType as AcademyLessonType,
    currentLevel: currentLevel as AcademyCurrentLevel,
    preferredDays,
    preferredTimeText: optionalTrimString(payload.preferredTimeText, 100),
    lessonGoal: optionalTrimString(payload.lessonGoal, 500),
    requestMemo: optionalTrimString(payload.requestMemo, 1000),
  };

  const userObjectId = new ObjectId(userId);
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection<AcademyLessonApplicationDoc>(COLLECTION_NAME);
  const filter: Filter<AcademyLessonApplicationDoc> = {
    _id: new ObjectId(id),
    userId: { $in: [userObjectId, userId] },
    adminDeletedAt: { $exists: false },
    customerDeletedAt: { $exists: false },
  };
  const item = await collection.findOne(filter);
  if (!item) {
    return errorResponse("신청 내역을 찾을 수 없습니다.", 404);
  }
  if (!CUSTOMER_EDITABLE_STATUSES.has(item.status)) {
    return errorResponse("현재 상태에서는 신청 정보를 수정할 수 없습니다.", 409, {
      code: "ACADEMY_APPLICATION_EDIT_FORBIDDEN",
    });
  }

  const changedFields = (Object.keys(updateFields) as CustomerEditableFieldKey[]).filter((key) => {
    const value = updateFields[key];
    const currentValue = item[key];

    return Array.isArray(value)
      ? !arraysEqual(toStringArray(currentValue), value)
      : (currentValue ?? null) !== value;
  });

  if (changedFields.length === 0) {
    return NextResponse.json({ success: true, item: serializeApplication(item) });
  }

  const now = new Date().toISOString();
  const historyEntry: AcademyLessonApplicationHistoryItem = {
    status: item.status,
    date: now,
    description: "고객이 아카데미 신청 정보를 수정했습니다.",
    actorId: userId,
    actorName: "고객",
    changedFields,
  };
  const result = await collection.findOneAndUpdate(
    filter,
    {
      $set: { ...updateFields, updatedAt: now },
      $push: {
        history: historyEntry,
      },
    },
    { returnDocument: "after" },
  );

  if (!result) {
    return errorResponse("신청 내역을 찾을 수 없습니다.", 404);
  }

  return NextResponse.json({ success: true, item: serializeApplication(result) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "신청 내역을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const userObjectId = new ObjectId(userId);
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection<AcademyLessonApplicationDoc>(COLLECTION_NAME);
  const filter: Filter<AcademyLessonApplicationDoc> = {
    _id: new ObjectId(id),
    userId: { $in: [userObjectId, userId] },
    adminDeletedAt: { $exists: false },
    customerDeletedAt: { $exists: false },
  };
  const item = await collection.findOne(filter, { projection: { status: 1 } });

  if (!item) {
    return NextResponse.json(
      { success: false, message: "신청 내역을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (item.status !== "cancelled") {
    return NextResponse.json(
      { success: false, message: "취소된 신청만 삭제할 수 있습니다." },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const deleteUpdate: Document = {
    $set: {
      customerDeletedAt: now,
      customerDeletedBy: "customer",
      updatedAt: now,
    },
    $push: {
      history: {
        status: "cancelled",
        date: now,
        description: "고객이 마이페이지에서 취소 신청 기록을 삭제했습니다.",
        actorId: userId,
        actorName: "customer",
      },
    },
  };

  const result = await collection.findOneAndUpdate(filter, deleteUpdate, {
    returnDocument: "after",
  });

  if (!result) {
    return NextResponse.json(
      { success: false, message: "신청 내역을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "신청 기록이 삭제되었습니다.",
  });
}
