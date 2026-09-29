import { NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";

import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import {
  ACADEMY_CLASS_FULL_ERROR,
  acquireAcademyApplicationLock,
  acquireAcademyClassCapacityLocks,
  getAcademyApplicationClassId,
  getAcademyClass,
  isAcademyClassAtCapacity,
  reconcileAcademyClassCapacity,
} from "@/lib/academy/adminAcademyCapacity";
import { requireAdmin } from "@/lib/admin.guard";
import {
  getAcademyClassLessonTypeLabel,
  getAcademyClassLevelLabel,
  getAcademyClassStatusLabel,
  isAcademyClassLessonType,
  isAcademyClassLevel,
  isAcademyClassStatus,
  type AcademyClassSnapshot,
  type AcademyLessonApplication,
} from "@/lib/types/academy";

const COLLECTION_NAME = "academy_lesson_applications";
const CLASS_COLLECTION_NAME = "academy_classes";
const CLASS_AUTO_CLOSED_MESSAGE =
  "등록 확정 인원이 정원에 도달하여 클래스가 모집 마감 처리되었습니다.";

type AcademyLessonApplicationDoc = Omit<AcademyLessonApplication, "_id" | "classId"> & {
  _id?: ObjectId;
  classId?: string | ObjectId | null;
  adminDeletedAt?: string | Date;
};

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

function trimString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function createClassSnapshot(doc: Document): AcademyClassSnapshot {
  const classId = String(serializeValue(doc._id));
  const level = isAcademyClassLevel(doc.level) ? doc.level : null;
  const lessonType = isAcademyClassLessonType(doc.lessonType) ? doc.lessonType : null;
  const status = isAcademyClassStatus(doc.status) ? doc.status : null;
  return {
    classId,
    name: typeof doc.name === "string" ? doc.name : "",
    description: typeof doc.description === "string" ? doc.description : null,
    level,
    levelLabel: level ? getAcademyClassLevelLabel(level) : null,
    lessonType,
    lessonTypeLabel: lessonType ? getAcademyClassLessonTypeLabel(lessonType) : null,
    instructorName: typeof doc.instructorName === "string" ? doc.instructorName : null,
    location: typeof doc.location === "string" ? doc.location : null,
    scheduleText: typeof doc.scheduleText === "string" ? doc.scheduleText : null,
    capacity: typeof doc.capacity === "number" ? doc.capacity : null,
    price: typeof doc.price === "number" ? doc.price : null,
    status,
    statusLabel: status ? getAcademyClassStatusLabel(status) : null,
  };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const classId = trimString(payload.classId, 100);
  const reason = trimString(payload.reason, 500);
  if (!ObjectId.isValid(classId)) {
    return NextResponse.json(
      { success: false, message: "유효하지 않은 클래스 ID입니다." },
      { status: 400 },
    );
  }

  const _id = new ObjectId(id);
  const collection = guard.db.collection<AcademyLessonApplicationDoc>(COLLECTION_NAME);
  const releaseApplicationLock = await acquireAcademyApplicationLock(guard.db, id);
  if (!releaseApplicationLock) {
    return NextResponse.json(
      { success: false, message: "신청 변경 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요." },
      { status: 409 },
    );
  }

  try {
    const current = await collection.findOne({ _id, adminDeletedAt: { $exists: false } });
    if (!current) {
      return NextResponse.json(
        { success: false, message: "신청 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    if (current.status === "cancelled") {
      return NextResponse.json(
        { success: false, message: "취소된 신청은 클래스에 연결할 수 없습니다." },
        { status: 409 },
      );
    }

    const currentClassId = getAcademyApplicationClassId(current);
    if (currentClassId === classId) {
      return NextResponse.json({
        success: true,
        message: "이미 연결된 클래스입니다.",
        item: serializeApplication(current),
        classAutoClosed: false,
        classAutoClosedMessage: null,
        classAutoClosedConfirmedCount: null,
        classAutoClosedCapacity: null,
      });
    }

    const releaseClassLocks = await acquireAcademyClassCapacityLocks(guard.db, [
      currentClassId,
      classId,
    ]);
    if (!releaseClassLocks) {
      return NextResponse.json(
        {
          success: false,
          message: "클래스 정원 변경 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 409 },
      );
    }

    try {
      const academyClass = await getAcademyClass(guard.db, classId);
      if (!academyClass) {
        return NextResponse.json(
          { success: false, message: "클래스를 찾을 수 없습니다." },
          { status: 404 },
        );
      }
      if (academyClass.status !== "visible" && academyClass.status !== "closed") {
        return NextResponse.json(
          { success: false, message: "모집 중 또는 모집 마감 클래스만 연결할 수 있습니다." },
          { status: 400 },
        );
      }
      if (
        current.status === "confirmed" &&
        (await isAcademyClassAtCapacity(guard.db, academyClass, _id))
      ) {
        return NextResponse.json(ACADEMY_CLASS_FULL_ERROR, { status: 409 });
      }

      const now = new Date().toISOString();
      const classSnapshot = createClassSnapshot(academyClass);
      const oldClassName =
        current.classSnapshot && typeof current.classSnapshot.name === "string"
          ? current.classSnapshot.name
          : currentClassId || "클래스 미연결";
      const baseDescription = currentClassId
        ? `관리자가 신청 클래스를 변경했습니다: ${oldClassName} → ${classSnapshot.name}`
        : `관리자가 신청을 클래스에 연결했습니다: ${classSnapshot.name}`;
      const updated = await collection.findOneAndUpdate(
        { _id, adminDeletedAt: { $exists: false } },
        {
          $set: { classId, classSnapshot, updatedAt: now },
          $push: {
            history: {
              status: current.status,
              date: now,
              description: `${baseDescription}${reason ? ` 사유: ${reason}` : ""}`,
              actorId: guard.admin._id.toHexString(),
              actorName: guard.admin.name ?? guard.admin.email ?? "관리자",
            },
          },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, message: "신청 내역을 찾을 수 없습니다." },
          { status: 404 },
        );
      }

      let classAutoClosed = false;
      let classAutoClosedConfirmedCount: number | null = null;
      let classAutoClosedCapacity: number | null = null;
      if (updated.status === "confirmed") {
        const result = await reconcileAcademyClassCapacity(guard.db, academyClass);
        classAutoClosed = result.classAutoClosed;
        classAutoClosedConfirmedCount = result.confirmedCount;
        classAutoClosedCapacity = result.capacity;

        if (currentClassId) {
          const oldClass = await getAcademyClass(guard.db, currentClassId);
          if (oldClass) await reconcileAcademyClassCapacity(guard.db, oldClass);
        }
      }

      return NextResponse.json({
        success: true,
        item: serializeApplication(updated),
        classAutoClosed,
        classAutoClosedMessage: classAutoClosed ? CLASS_AUTO_CLOSED_MESSAGE : null,
        classAutoClosedConfirmedCount,
        classAutoClosedCapacity,
      });
    } finally {
      await releaseClassLocks();
    }
  } finally {
    await releaseApplicationLock();
  }
}
