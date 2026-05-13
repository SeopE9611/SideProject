import { NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";

import { getDb } from "@/lib/mongodb";
import {
  getAcademyClassLessonTypeLabel,
  getAcademyClassLevelLabel,
  getAcademyClassStatusLabel,
  isAcademyClassLessonType,
  isAcademyClassLevel,
  type AcademyClassLessonType,
  type AcademyClassLevel,
  type AcademyClassStatus,
  type PublicAcademyClass,
} from "@/lib/types/academy";

const COLLECTION_NAME = "academy_classes";
const PUBLIC_STATUSES = [
  "visible",
  "closed",
] as const satisfies readonly AcademyClassStatus[];

function serializeValue(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toHexString" in value) {
    const maybeObjectId = value as { toHexString?: () => string };
    if (typeof maybeObjectId.toHexString === "function") {
      return maybeObjectId.toHexString();
    }
  }
  return null;
}

function normalizeStatus(value: unknown): PublicAcademyClass["status"] {
  return value === "closed" ? "closed" : "visible";
}

function normalizeLevel(value: unknown): AcademyClassLevel {
  return isAcademyClassLevel(value) ? value : "all";
}

function normalizeLessonType(value: unknown): AcademyClassLessonType {
  return isAcademyClassLessonType(value) ? value : "group";
}

function serializePublicClass(doc: Document): PublicAcademyClass {
  const status = normalizeStatus(doc.status);
  const level = normalizeLevel(doc.level);
  const lessonType = normalizeLessonType(doc.lessonType);

  return {
    _id: serializeValue(doc._id) ?? "",
    name: typeof doc.name === "string" ? doc.name : "",
    description: typeof doc.description === "string" ? doc.description : null,
    level,
    levelLabel: getAcademyClassLevelLabel(level),
    lessonType,
    lessonTypeLabel: getAcademyClassLessonTypeLabel(lessonType),
    instructorName:
      typeof doc.instructorName === "string" ? doc.instructorName : null,
    location: typeof doc.location === "string" ? doc.location : null,
    scheduleText:
      typeof doc.scheduleText === "string" ? doc.scheduleText : null,
    capacity: typeof doc.capacity === "number" ? doc.capacity : null,
    enrolledCount:
      typeof doc.enrolledCount === "number" ? doc.enrolledCount : 0,
    price: typeof doc.price === "number" ? doc.price : null,
    status,
    statusLabel: getAcademyClassStatusLabel(status),
    createdAt: serializeValue(doc.createdAt),
    updatedAt: serializeValue(doc.updatedAt),
  };
}

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");

    if (classId) {
      if (!ObjectId.isValid(classId)) {
        return NextResponse.json(
          { success: false, message: "클래스 정보를 찾을 수 없습니다." },
          { status: 404 },
        );
      }

      const item = await db.collection(COLLECTION_NAME).findOne(
        { _id: new ObjectId(classId), status: { $in: [...PUBLIC_STATUSES] } },
        {
          projection: {
            _id: 1,
            name: 1,
            description: 1,
            level: 1,
            lessonType: 1,
            instructorName: 1,
            location: 1,
            scheduleText: 1,
            capacity: 1,
            enrolledCount: 1,
            price: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      );

      if (!item) {
        return NextResponse.json(
          { success: false, message: "클래스 정보를 찾을 수 없습니다." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        item: serializePublicClass(item),
      });
    }

    const items = await db
      .collection(COLLECTION_NAME)
      .find({ status: { $in: [...PUBLIC_STATUSES] } })
      .sort({ createdAt: -1 })
      .project({
        _id: 1,
        name: 1,
        description: 1,
        level: 1,
        lessonType: 1,
        instructorName: 1,
        location: 1,
        scheduleText: 1,
        capacity: 1,
        enrolledCount: 1,
        price: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .toArray();

    return NextResponse.json({
      success: true,
      items: items.map(serializePublicClass),
    });
  } catch (error) {
    console.error("[academy/classes] failed to load public classes", error);
    return NextResponse.json(
      {
        success: false,
        message: "아카데미 클래스 목록을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
