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
import { createUserNotification } from "@/lib/notifications/user-notification.service";
import {
  getAcademyApplicationStatusLabel,
  isAcademyApplicationStatus,
  type AcademyLessonApplicationStatus,
} from "@/lib/types/academy";

const COLLECTION_NAME = "academy_lesson_applications";
const CLASS_COLLECTION_NAME = "academy_classes";
const CLASS_AUTO_CLOSED_MESSAGE =
  "등록 확정 인원이 정원에 도달하여 클래스가 모집 마감 처리되었습니다.";

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

function getStatusHistoryDescription(status: AcademyLessonApplicationStatus) {
  if (status === "reviewing") return "상태가 검토 중으로 변경되었습니다.";
  if (status === "contacted") return "상담 완료 상태로 변경되었습니다.";
  if (status === "confirmed") return "등록 확정 상태로 변경되었습니다.";
  if (status === "cancelled") return "신청이 취소 처리되었습니다.";
  return `${getAcademyApplicationStatusLabel(status)} 상태로 변경되었습니다.`;
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
  const status = payload.status;
  const reason = trimString(payload.reason, 500);

  if (!isAcademyApplicationStatus(status)) {
    return NextResponse.json(
      { success: false, message: "허용되지 않은 상태입니다." },
      { status: 400 },
    );
  }

  const collection = guard.db.collection(COLLECTION_NAME);
  const _id = new ObjectId(id);
  const releaseApplicationLock = await acquireAcademyApplicationLock(guard.db, id);
  if (!releaseApplicationLock) {
    return NextResponse.json(
      { success: false, message: "신청 변경 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요." },
      { status: 409 },
    );
  }

  try {
    const current = await collection.findOne({ _id });
    if (!current) {
      return NextResponse.json(
        { success: false, message: "신청 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const classId = getAcademyApplicationClassId(current);
    const releaseLocks = await acquireAcademyClassCapacityLocks(guard.db, classId ? [classId] : []);
    if (!releaseLocks) {
      return NextResponse.json(
        {
          success: false,
          message: "클래스 정원 변경 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 409 },
      );
    }

    try {
      const academyClass = classId ? await getAcademyClass(guard.db, classId) : null;
      if (
        current.status !== "confirmed" &&
        status === "confirmed" &&
        academyClass &&
        (await isAcademyClassAtCapacity(guard.db, academyClass, _id))
      ) {
        return NextResponse.json(ACADEMY_CLASS_FULL_ERROR, { status: 409 });
      }

      const now = new Date().toISOString();
      const update: Document = { $set: { status, updatedAt: now } };
      if (current.status !== status) {
        const description = `${getStatusHistoryDescription(status)}${reason ? ` 사유: ${reason}` : ""}`;
        update.$push = {
          history: {
            status,
            date: now,
            description,
            actorId: guard.admin._id.toHexString(),
            actorName: guard.admin.name ?? guard.admin.email ?? "관리자",
          },
        };
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

      let classAutoClosed = false;
      let classAutoClosedConfirmedCount: number | null = null;
      let classAutoClosedCapacity: number | null = null;

      if (current.status !== status && updated.userId) {
        try {
          const titleByStatus: Record<string, string> = {
            reviewing: "레슨 신청이 검토 중으로 변경되었습니다.",
            contacted: "레슨 상담이 완료되었습니다.",
            confirmed: "레슨 등록이 확정되었습니다.",
            cancelled: "레슨 신청이 취소 처리되었습니다.",
          };
          const className =
            typeof updated.classSnapshot?.name === "string" ? updated.classSnapshot.name : "";
          await createUserNotification(guard.db, {
            userId: updated.userId,
            type: "academy_status",
            title: titleByStatus[status] ?? "레슨 신청 상태가 변경되었습니다.",
            body: className ? `${className} 신청 상태가 변경되었습니다.` : undefined,
            href: "/mypage",
            source: { collection: "academy_lesson_applications", id: _id, kind: "status" },
            dedupeKey: `academy:${_id.toString()}:status:${status}`,
          });
        } catch (error) {
          console.error("[admin academy application status] create notification failed", error);
        }
      }

      if (academyClass && (status === "confirmed" || current.status === "confirmed")) {
        try {
          const result = await reconcileAcademyClassCapacity(guard.db, academyClass);
          classAutoClosed = result.classAutoClosed;
          classAutoClosedConfirmedCount = result.confirmedCount;
          classAutoClosedCapacity = result.capacity;
        } catch (error) {
          console.error(
            "[admin academy application status] class capacity reconcile failed",
            error,
          );
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
      await releaseLocks();
    }
  } finally {
    await releaseApplicationLock();
  }
}
