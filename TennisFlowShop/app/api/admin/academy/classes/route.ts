import { NextResponse } from "next/server";
import { ObjectId, type Db, type Document, type Filter } from "mongodb";

import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { requireAdmin } from "@/lib/admin.guard";
import {
  isAcademyClassLevel,
  isAcademyClassLessonType,
  isAcademyApplicationStatus,
  isAcademyClassStatus,
  type AcademyClassStatus,
} from "@/lib/types/academy";

const COLLECTION_NAME = "academy_classes";
const APPLICATION_COLLECTION_NAME = "academy_lesson_applications";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type ApplicationStats = {
  total: number;
  submitted: number;
  reviewing: number;
  contacted: number;
  confirmed: number;
  cancelled: number;
};

function createEmptyApplicationStats(): ApplicationStats {
  return {
    total: 0,
    submitted: 0,
    reviewing: 0,
    contacted: 0,
    confirmed: 0,
    cancelled: 0,
  };
}

type ClassPayload = {
  name: string;
  description: string | null;
  level: string;
  lessonType: string;
  instructorName: string | null;
  location: string | null;
  scheduleText: string | null;
  capacity: number | null;
  price: number | null;
  status: string;
};

function parseIntParam(
  value: string | null,
  options: { defaultValue: number; min: number; max: number },
) {
  const parsed = Number(value);
  const base = Number.isFinite(parsed) ? parsed : options.defaultValue;
  return Math.min(options.max, Math.max(options.min, Math.trunc(base)));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function serializeClass(doc: Document, applicationStats = createEmptyApplicationStats()) {
  return {
    _id: String(serializeValue(doc._id)),
    name: typeof doc.name === "string" ? doc.name : "",
    description: typeof doc.description === "string" ? doc.description : null,
    level: typeof doc.level === "string" ? doc.level : "all",
    lessonType: typeof doc.lessonType === "string" ? doc.lessonType : "group",
    instructorName:
      typeof doc.instructorName === "string" ? doc.instructorName : null,
    location: typeof doc.location === "string" ? doc.location : null,
    scheduleText: typeof doc.scheduleText === "string" ? doc.scheduleText : null,
    capacity: typeof doc.capacity === "number" ? doc.capacity : null,
    enrolledCount:
      typeof doc.enrolledCount === "number" ? doc.enrolledCount : 0,
    price: typeof doc.price === "number" ? doc.price : null,
    status: typeof doc.status === "string" ? doc.status : "draft",
    createdAt: serializeValue(doc.createdAt) ?? null,
    updatedAt: serializeValue(doc.updatedAt) ?? null,
    applicationCount: applicationStats.total,
    confirmedCount: applicationStats.confirmed,
    submittedCount: applicationStats.submitted,
    reviewingCount: applicationStats.reviewing,
    contactedCount: applicationStats.contacted,
    cancelledCount: applicationStats.cancelled,
    applicationStats,
  };
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function parseOptionalNonNegativeNumber(
  value: unknown,
  fieldLabel: string,
): { value: number | null } | { error: string } {
  if (value === null || value === undefined || value === "") return { value: null };
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return { error: `${fieldLabel}은 0 이상의 숫자로 입력해 주세요.` };
  }
  return { value: Math.trunc(numeric) };
}

function validateClassPayload(payload: Record<string, unknown>):
  | { ok: true; value: ClassPayload }
  | { ok: false; message: string } {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) return { ok: false, message: "클래스명을 입력해 주세요." };
  if (name.length > 80) {
    return { ok: false, message: "클래스명은 80자 이하로 입력해 주세요." };
  }

  const description = normalizeOptionalText(payload.description, 1000);
  if (typeof payload.description === "string" && payload.description.trim().length > 1000) {
    return { ok: false, message: "설명은 1000자 이하로 입력해 주세요." };
  }

  const level = payload.level ?? "all";
  if (!isAcademyClassLevel(level)) {
    return { ok: false, message: "허용되지 않은 레벨입니다." };
  }

  const lessonType = payload.lessonType ?? "group";
  if (!isAcademyClassLessonType(lessonType)) {
    return { ok: false, message: "허용되지 않은 수업 유형입니다." };
  }

  const instructorName = normalizeOptionalText(payload.instructorName, 50);
  if (
    typeof payload.instructorName === "string" &&
    payload.instructorName.trim().length > 50
  ) {
    return { ok: false, message: "강사명은 50자 이하로 입력해 주세요." };
  }

  const location = normalizeOptionalText(payload.location, 100);
  if (typeof payload.location === "string" && payload.location.trim().length > 100) {
    return { ok: false, message: "장소는 100자 이하로 입력해 주세요." };
  }

  const scheduleText = normalizeOptionalText(payload.scheduleText, 200);
  if (
    typeof payload.scheduleText === "string" &&
    payload.scheduleText.trim().length > 200
  ) {
    return { ok: false, message: "일정 안내는 200자 이하로 입력해 주세요." };
  }

  const capacityResult = parseOptionalNonNegativeNumber(payload.capacity, "정원");
  if ("error" in capacityResult) return { ok: false, message: capacityResult.error };

  const priceResult = parseOptionalNonNegativeNumber(payload.price, "가격");
  if ("error" in priceResult) return { ok: false, message: priceResult.error };

  const status = payload.status ?? "draft";
  if (!isAcademyClassStatus(status)) {
    return { ok: false, message: "허용되지 않은 상태입니다." };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      level,
      lessonType,
      instructorName,
      location,
      scheduleText,
      capacity: capacityResult.value,
      price: priceResult.value,
      status,
    },
  };
}

async function getApplicationStatsByClassId(
  db: Db,
  classes: Document[],
) {
  const classIdStrings = classes
    .map((item) => String(serializeValue(item._id)))
    .filter(Boolean);
  const statsByClassId = new Map<string, ApplicationStats>();
  for (const classId of classIdStrings) {
    statsByClassId.set(classId, createEmptyApplicationStats());
  }

  if (classIdStrings.length === 0) return statsByClassId;

  const objectIds = classIdStrings
    .filter((classId) => ObjectId.isValid(classId))
    .map((classId) => new ObjectId(classId));

  const classIdMatchers: unknown[] = [...classIdStrings, ...objectIds];
  const applications = await db
    .collection(APPLICATION_COLLECTION_NAME)
    .find(
      {
        $or: [
          { classId: { $in: classIdMatchers } },
          { "classSnapshot.classId": { $in: classIdStrings } },
        ],
      },
      {
        projection: {
          classId: 1,
          "classSnapshot.classId": 1,
          status: 1,
        },
      },
    )
    .toArray();

  for (const application of applications) {
    const matchedClassIds = new Set<string>();
    if (application.classId) {
      matchedClassIds.add(String(serializeValue(application.classId)));
    }
    const snapshotClassId =
      application.classSnapshot &&
      typeof application.classSnapshot === "object" &&
      "classId" in application.classSnapshot
        ? String(
            serializeValue(
              (application.classSnapshot as { classId?: unknown }).classId,
            ) ?? "",
          )
        : "";
    if (snapshotClassId) matchedClassIds.add(snapshotClassId);

    for (const classId of matchedClassIds) {
      const stats = statsByClassId.get(classId);
      if (!stats) continue;
      stats.total += 1;
      if (isAcademyApplicationStatus(application.status)) {
        stats[application.status] += 1;
      }
    }
  }

  return statsByClassId;
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const page = parseIntParam(url.searchParams.get("page"), {
    defaultValue: 1,
    min: 1,
    max: 10_000,
  });
  const limit = parseIntParam(url.searchParams.get("limit"), {
    defaultValue: DEFAULT_LIMIT,
    min: 1,
    max: MAX_LIMIT,
  });
  const statusParam = url.searchParams.get("status");
  const keyword = (url.searchParams.get("keyword") ?? "").trim();
  const sort = url.searchParams.get("sort") ?? "latest";

  const filter: Filter<Document> = {};
  if (statusParam && statusParam !== "all") {
    if (!isAcademyClassStatus(statusParam)) {
      return NextResponse.json(
        { success: false, message: "허용되지 않은 상태입니다." },
        { status: 400 },
      );
    }
    filter.status = statusParam;
  }

  if (keyword) {
    const regex = { $regex: escapeRegex(keyword), $options: "i" };
    filter.$or = [
      { name: regex },
      { description: regex },
      { instructorName: regex },
      { location: regex },
      { scheduleText: regex },
    ];
  }

  const sortSpec =
    sort === "oldest" ? ({ createdAt: 1 } as const) : ({ createdAt: -1 } as const);
  const collection = guard.db.collection(COLLECTION_NAME);

  const [itemsRaw, total, countRows] = await Promise.all([
    collection
      .find(filter)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
    collection
      .aggregate<{ _id: AcademyClassStatus; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const counts: Record<AcademyClassStatus | "all", number> = {
    all: 0,
    draft: 0,
    visible: 0,
    hidden: 0,
    closed: 0,
  };
  for (const row of countRows) {
    if (isAcademyClassStatus(row._id)) {
      counts[row._id] = row.count;
      counts.all += row.count;
    }
  }

  const statsByClassId = await getApplicationStatsByClassId(guard.db, itemsRaw);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    success: true,
    items: itemsRaw.map((item) =>
      serializeClass(
        item,
        statsByClassId.get(String(serializeValue(item._id))) ??
          createEmptyApplicationStats(),
      ),
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    counts,
  });
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const body = (await req.json().catch(() => null)) as unknown;
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const validation = validateClassPayload(payload);
  if (!validation.ok) {
    return NextResponse.json(
      { success: false, message: validation.message },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const doc = {
    ...validation.value,
    enrolledCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const collection = guard.db.collection(COLLECTION_NAME);
  const result = await collection.insertOne(doc);
  const inserted = await collection.findOne({ _id: result.insertedId });

  return NextResponse.json({
    success: true,
    item: serializeClass(inserted ?? { _id: result.insertedId, ...doc }),
  });
}

