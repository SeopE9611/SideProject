import { NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";

import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import clientPromise from "@/lib/mongodb";
import {
  getAcademyApplicationStatusLabel,
  getAcademyCurrentLevelLabel,
  getAcademyLessonTypeLabel,
  isAcademyApplicationStatus,
  type AcademyClassSnapshot,
  type AcademyLessonApplicationStatus,
} from "@/lib/types/academy";

const COLLECTION_NAME = "academy_lesson_applications";
const CUSTOMER_CANCEL_DESCRIPTION =
  "고객이 마이페이지에서 아카데미 신청을 취소했습니다.";

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
    description:
      typeof record.description === "string" ? record.description : null,
    lessonType:
      typeof record.lessonType === "string"
        ? (record.lessonType as AcademyClassSnapshot["lessonType"])
        : null,
    lessonTypeLabel:
      typeof record.lessonTypeLabel === "string"
        ? record.lessonTypeLabel
        : null,
    level:
      typeof record.level === "string"
        ? (record.level as AcademyClassSnapshot["level"])
        : null,
    levelLabel:
      typeof record.levelLabel === "string" ? record.levelLabel : null,
    instructorName:
      typeof record.instructorName === "string" ? record.instructorName : null,
    location: typeof record.location === "string" ? record.location : null,
    scheduleText:
      typeof record.scheduleText === "string" ? record.scheduleText : null,
    capacity: typeof record.capacity === "number" ? record.capacity : null,
    price: typeof record.price === "number" ? record.price : null,
    status:
      typeof record.status === "string"
        ? (record.status as AcademyClassSnapshot["status"])
        : null,
    statusLabel:
      typeof record.statusLabel === "string" ? record.statusLabel : null,
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
  const status: AcademyLessonApplicationStatus = isAcademyApplicationStatus(
    rawStatus,
  )
    ? rawStatus
    : "submitted";
  const desiredLessonType =
    typeof doc.desiredLessonType === "string" ? doc.desiredLessonType : null;
  const currentLevel =
    typeof doc.currentLevel === "string" ? doc.currentLevel : null;

  return {
    _id: String(doc._id),
    kind: "academy_lesson" as const,
    type: "아카데미 클래스 신청",
    status,
    statusLabel: getAcademyApplicationStatusLabel(status),
    applicantName:
      typeof doc.applicantName === "string" ? doc.applicantName : "",
    phone: typeof doc.phone === "string" ? doc.phone : "",
    email: typeof doc.email === "string" ? doc.email : null,
    desiredLessonType,
    desiredLessonTypeLabel: getAcademyLessonTypeLabel(desiredLessonType),
    currentLevel,
    currentLevelLabel: getAcademyCurrentLevelLabel(currentLevel),
    preferredDays: toStringArray(doc.preferredDays),
    preferredTimeText:
      typeof doc.preferredTimeText === "string" ? doc.preferredTimeText : null,
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
      doc.cancelledBy === "customer" || doc.cancelledBy === "admin"
        ? doc.cancelledBy
        : null,
    createdAt: toISOStringMaybe(doc.createdAt),
    updatedAt: toISOStringMaybe(doc.updatedAt),
  };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "신청 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const _id = new ObjectId(id);
    const userObjectId = new ObjectId(userId);
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(COLLECTION_NAME);
    const current = await collection.findOne({ _id });

    if (!current) {
      return NextResponse.json(
        { success: false, message: "신청 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const applicationUserId = serializeObjectId(current.userId);
    if (!applicationUserId || applicationUserId !== userId) {
      return NextResponse.json(
        { success: false, message: "신청 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (current.status === "cancelled") {
      return NextResponse.json({
        success: true,
        item: serializeApplication(current),
        message: "이미 취소된 신청입니다.",
      });
    }

    if (!isAcademyApplicationStatus(current.status)) {
      return NextResponse.json(
        { success: false, message: "신청 취소가 가능한 상태가 아닙니다." },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const cancelUpdate: Document = {
      $set: {
        status: "cancelled",
        updatedAt: now,
        cancelledAt: now,
        cancelledBy: "customer",
      },
      $push: {
        history: {
          status: "cancelled",
          date: now,
          description: CUSTOMER_CANCEL_DESCRIPTION,
          actorName: "고객",
        },
      },
    };

    const updated = await collection.findOneAndUpdate(
      {
        _id,
        userId: { $in: [userObjectId, userId] },
        status: { $ne: "cancelled" },
      },
      cancelUpdate,
      { returnDocument: "after" },
    );

    if (!updated) {
      const latest = await collection.findOne({ _id });
      if (latest?.status === "cancelled") {
        return NextResponse.json({
          success: true,
          item: serializeApplication(latest),
          message: "이미 취소된 신청입니다.",
        });
      }

      return NextResponse.json(
        { success: false, message: "신청 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      item: serializeApplication(updated),
      message: "아카데미 신청이 취소되었습니다.",
    });
  } catch (error) {
    console.error("academy application cancel error:", error);
    return NextResponse.json(
      { success: false, message: "신청 취소 중 문제가 발생했습니다." },
      { status: 500 },
    );
  }
}
