import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";

import { requireAdmin } from "@/lib/admin.guard";
import type { AcademyLessonApplicationStatus } from "@/lib/types/academy";
import { isAcademyApplicationStatus } from "@/lib/types/academy";

const COLLECTION_NAME = "academy_lesson_applications";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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

function serializeClassSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Document;
  return {
    classId:
      typeof record.classId === "string"
        ? record.classId
        : String(serializeValue(record.classId) ?? ""),
    name: typeof record.name === "string" ? record.name : "",
    levelLabel:
      typeof record.levelLabel === "string" ? record.levelLabel : null,
    lessonTypeLabel:
      typeof record.lessonTypeLabel === "string"
        ? record.lessonTypeLabel
        : null,
    scheduleText:
      typeof record.scheduleText === "string" ? record.scheduleText : null,
  };
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
    status: typeof doc.status === "string" ? doc.status : "submitted",
    createdAt: serializeValue(doc.createdAt) ?? null,
    updatedAt: serializeValue(doc.updatedAt) ?? null,
    userId: doc.userId ? String(serializeValue(doc.userId)) : null,
    classId: doc.classId ? String(serializeValue(doc.classId)) : null,
    classSnapshot: serializeClassSnapshot(doc.classSnapshot),
  };
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
    if (!isAcademyApplicationStatus(statusParam)) {
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
      { applicantName: regex },
      { phone: regex },
      { email: regex },
      { requestMemo: regex },
      { lessonGoal: regex },
      { "classSnapshot.name": regex },
    ];
  }

  const sortSpec = sort === "oldest" ? ({ createdAt: 1 } as const) : ({ createdAt: -1 } as const);
  const collection = guard.db.collection(COLLECTION_NAME);

  const [itemsRaw, total, countRows] = await Promise.all([
    collection
      .find(filter, {
        projection: {
          _id: 1,
          applicantName: 1,
          phone: 1,
          email: 1,
          desiredLessonType: 1,
          currentLevel: 1,
          preferredDays: 1,
          preferredTimeText: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: 1,
          classId: 1,
          classSnapshot: 1,
        },
      })
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
    collection
      .aggregate<{ _id: AcademyLessonApplicationStatus; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const counts: Record<AcademyLessonApplicationStatus | "all", number> = {
    all: 0,
    submitted: 0,
    reviewing: 0,
    contacted: 0,
    confirmed: 0,
    cancelled: 0,
  };
  for (const row of countRows) {
    if (isAcademyApplicationStatus(row._id)) {
      counts[row._id] = row.count;
      counts.all += row.count;
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    success: true,
    items: itemsRaw.map(serializeApplication),
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
