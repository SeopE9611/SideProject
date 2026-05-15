import { NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";

import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import { getDb } from "@/lib/mongodb";
import {
  getAcademyClassLessonTypeLabel,
  getAcademyClassLevelLabel,
  getAcademyClassStatusLabel,
  isAcademyClassLessonType,
  isAcademyClassLevel,
  type AcademyClassLessonType,
  type AcademyClassLevel,
  type AcademyClassSnapshot,
  type AcademyCurrentLevel,
  type AcademyLessonApplication,
  type AcademyLessonType,
  type AcademyLessonApplicationStatus,
} from "@/lib/types/academy";

const COLLECTION_NAME = "academy_lesson_applications";
const CLASS_COLLECTION_NAME = "academy_classes";
const ACTIVE_APPLICATION_STATUSES: AcademyLessonApplicationStatus[] = [
  "submitted",
  "reviewing",
  "contacted",
  "confirmed",
];

const LESSON_TYPES = new Set<AcademyLessonType>([
  "group",
  "private",
  "junior",
  "adult",
  "onePoint",
  "consultation",
]);

const CURRENT_LEVELS = new Set<AcademyCurrentLevel>([
  "new",
  "beginner",
  "intermediate",
  "advanced",
  "unknown",
]);

const VALID_DAYS = new Set(["월", "화", "수", "목", "금", "토", "일"]);

function serializeObjectId(value: unknown): string {
  if (value && typeof value === "object" && "toHexString" in value) {
    const maybeObjectId = value as { toHexString?: () => string };
    if (typeof maybeObjectId.toHexString === "function") {
      return maybeObjectId.toHexString();
    }
  }
  return typeof value === "string" ? value : "";
}

function normalizeClassLevel(value: unknown): AcademyClassLevel | null {
  return isAcademyClassLevel(value) ? value : null;
}

function normalizeClassLessonType(
  value: unknown,
): AcademyClassLessonType | null {
  return isAcademyClassLessonType(value) ? value : null;
}

function createClassSnapshot(doc: Document): AcademyClassSnapshot {
  const classId = serializeObjectId(doc._id);
  const level = normalizeClassLevel(doc.level);
  const lessonType = normalizeClassLessonType(doc.lessonType);
  const status = doc.status === "closed" ? "closed" : "visible";

  return {
    classId,
    name: typeof doc.name === "string" ? doc.name : "",
    description: typeof doc.description === "string" ? doc.description : null,
    level,
    levelLabel: level ? getAcademyClassLevelLabel(level) : null,
    lessonType,
    lessonTypeLabel: lessonType
      ? getAcademyClassLessonTypeLabel(lessonType)
      : null,
    instructorName:
      typeof doc.instructorName === "string" ? doc.instructorName : null,
    location: typeof doc.location === "string" ? doc.location : null,
    scheduleText:
      typeof doc.scheduleText === "string" ? doc.scheduleText : null,
    capacity: typeof doc.capacity === "number" ? doc.capacity : null,
    price: typeof doc.price === "number" ? doc.price : null,
    status,
    statusLabel: getAcademyClassStatusLabel(status),
  };
}

function trimString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function optionalTrimString(value: unknown, maxLength: number) {
  const trimmed = trimString(value, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function toErrorResponse(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

function getClassName(doc: Document) {
  const snapshot =
    doc.classSnapshot && typeof doc.classSnapshot === "object"
      ? (doc.classSnapshot as { name?: unknown })
      : null;
  return typeof snapshot?.name === "string" ? snapshot.name : null;
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return toErrorResponse("요청 본문을 확인해 주세요.");
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const userId = await getCurrentUserId();
  if (!userId) {
    return toErrorResponse("로그인 후 레슨 신청을 진행해 주세요.", 401);
  }

  const desiredLessonType = payload.desiredLessonType;
  const currentLevel = payload.currentLevel;
  const preferredTimeText = optionalTrimString(payload.preferredTimeText, 100);
  const lessonGoal = optionalTrimString(payload.lessonGoal, 500);
  const requestMemo = optionalTrimString(payload.requestMemo, 1000);
  const requestedClassId = optionalTrimString(payload.classId, 64);

  if (
    typeof desiredLessonType !== "string" ||
    !LESSON_TYPES.has(desiredLessonType as AcademyLessonType)
  ) {
    return toErrorResponse("희망 레슨 유형을 선택해 주세요.");
  }

  if (
    typeof currentLevel !== "string" ||
    !CURRENT_LEVELS.has(currentLevel as AcademyCurrentLevel)
  ) {
    return toErrorResponse("현재 실력을 선택해 주세요.");
  }

  if (!Array.isArray(payload.preferredDays)) {
    return toErrorResponse("희망 요일을 선택해 주세요.");
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
    return toErrorResponse("희망 요일을 1개 이상 선택해 주세요.");
  }

  let classId: string | null = null;
  let classSnapshot: AcademyClassSnapshot | null = null;

  const db = await getDb();

  if (!ObjectId.isValid(userId)) {
    return toErrorResponse("로그인 정보를 확인해 주세요.", 401);
  }

  const user = await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { name: 1, phone: 1, email: 1 } },
  );

  const applicantName = trimString(user?.name, 50);
  const phone = trimString(user?.phone, 30);
  const email = optionalTrimString(user?.email, 100);

  if (!applicantName || !phone) {
    return toErrorResponse("회원정보의 이름과 연락처를 먼저 등록해 주세요.");
  }

  if (requestedClassId) {
    if (!ObjectId.isValid(requestedClassId)) {
      return toErrorResponse("신청할 수 없는 클래스입니다.");
    }

    const selectedClass = await db.collection(CLASS_COLLECTION_NAME).findOne(
      { _id: new ObjectId(requestedClassId), status: "visible" },
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
          price: 1,
          status: 1,
        },
      },
    );

    if (!selectedClass) {
      return toErrorResponse("신청할 수 없는 클래스입니다.");
    }

    classId = requestedClassId;
    classSnapshot = createClassSnapshot(selectedClass);
  }

  const activeApplications = await db
    .collection(COLLECTION_NAME)
    .find({
      userId,
      status: { $in: ACTIVE_APPLICATION_STATUSES },
    })
    .project({ _id: 1, classId: 1, classSnapshot: 1, preferredDays: 1 })
    .sort({ createdAt: -1 })
    .toArray();

  if (classId) {
    const duplicateApplication = activeApplications.find(
      (application) => application.classId === classId,
    );

    if (duplicateApplication) {
      return toErrorResponse(
        "이미 신청한 클래스입니다. 기존 신청 내역을 확인해 주세요.",
        409,
        {
          code: "ACADEMY_DUPLICATE_CLASS",
          existingApplicationId: serializeObjectId(duplicateApplication._id),
        },
      );
    }
  }

  const dayConflict = activeApplications.find((application) => {
    if (classId && application.classId === classId) return false;
    const existingDays = Array.isArray(application.preferredDays)
      ? application.preferredDays.filter(
          (day): day is string => typeof day === "string",
        )
      : [];
    return existingDays.some((day) => preferredDays.includes(day));
  });

  if (dayConflict) {
    const existingDays = Array.isArray(dayConflict.preferredDays)
      ? dayConflict.preferredDays.filter(
          (day): day is string => typeof day === "string",
        )
      : [];
    const overlapDays = existingDays.filter((day) => preferredDays.includes(day));

    return toErrorResponse(
      "이미 신청한 클래스와 희망 요일이 겹칩니다.",
      409,
      {
        code: "ACADEMY_DAY_CONFLICT",
        conflict: {
          applicationId: serializeObjectId(dayConflict._id),
          className: getClassName(dayConflict),
          existingDays,
          overlapDays,
        },
      },
    );
  }

  const now = new Date().toISOString();

  const application: Omit<AcademyLessonApplication, "_id"> = {
    userId,
    classId,
    classSnapshot,
    applicantName,
    phone,
    email,
    desiredLessonType: desiredLessonType as AcademyLessonType,
    currentLevel: currentLevel as AcademyCurrentLevel,
    preferredDays,
    preferredTimeText,
    lessonGoal,
    requestMemo,
    status: "submitted",
    adminMemo: null,
    customerMessage: null,
    history: [
      {
        status: "submitted",
        date: now,
        description: "레슨 신청이 접수되었습니다.",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  try {
    const result = await db.collection(COLLECTION_NAME).insertOne(application);
    const applicationId = result.insertedId.toString();

    return NextResponse.json(
      {
        success: true,
        applicationId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[academy applications] create failed", error);
    return toErrorResponse("레슨 신청 접수 중 오류가 발생했습니다.", 500);
  }
}
