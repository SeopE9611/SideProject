import { NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";

import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { requireAdmin } from "@/lib/admin.guard";
import {
  getAcademyApplicationStatusLabel,
  isAcademyApplicationStatus,
  type AcademyLessonApplicationStatus,
} from "@/lib/types/academy";

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

function serializeHistory(history: unknown) {
  if (!Array.isArray(history)) return [];
  return history.map((item) => {
    const record = item && typeof item === "object" ? (item as Document) : {};
    return {
      status: typeof record.status === "string" ? record.status : "submitted",
      date: typeof record.date === "string" ? record.date : serializeValue(record.date),
      description:
        typeof record.description === "string" ? record.description : "",
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
  const current = await collection.findOne(
    { _id },
    { projection: { status: 1 } },
  );

  if (!current) {
    return NextResponse.json(
      { success: false, message: "신청 내역을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const now = new Date().toISOString();
  const update: Document = { $set: { status, updatedAt: now } };

  if (current.status !== status) {
    const description = `${getStatusHistoryDescription(status)}${
      reason ? ` 사유: ${reason}` : ""
    }`;
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

  return NextResponse.json({ success: true, item: serializeApplication(updated) });
}
