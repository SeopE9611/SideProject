import type { Metadata } from "next";
import { ObjectId, type Document } from "mongodb";

import AcademyApplyClient from "@/app/academy/apply/_components/AcademyApplyClient";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/lib/mongodb";
import {
  getAcademyClassLessonTypeLabel,
  getAcademyClassLevelLabel,
  getAcademyClassStatusLabel,
  isAcademyClassLessonType,
  isAcademyClassLevel,
  type AcademyClassLessonType,
  type AcademyClassLevel,
  type PublicAcademyClass,
} from "@/lib/types/academy";

export const metadata: Metadata = {
  title: "레슨 신청하기 | 도깨비테니스 아카데미",
};

const PUBLIC_CLASS_STATUSES = ["visible", "closed"] as const;

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

async function getPublicAcademyClassById(
  classId: string | null,
): Promise<PublicAcademyClass | null> {
  if (!classId || !ObjectId.isValid(classId)) return null;

  try {
    const db = await getDb();
    const doc = await db.collection("academy_classes").findOne(
      {
        _id: new ObjectId(classId),
        status: { $in: [...PUBLIC_CLASS_STATUSES] },
      },
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

    return doc ? serializePublicClass(doc) : null;
  } catch (error) {
    console.error("[academy/apply] failed to load selected class", error);
    return null;
  }
}

const notices = [
  "신청 접수 후 운영자가 확인합니다.",
  "수업 일정/비용은 상담 후 확정됩니다.",
  "아직 결제는 진행되지 않습니다.",
];

export default async function AcademyApplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ classId?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawClassId = resolvedSearchParams?.classId;
  const classId = Array.isArray(rawClassId) ? rawClassId[0] : rawClassId;
  const selectedClass = await getPublicAcademyClassById(classId ?? null);
  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-6 md:py-14">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-success">
            도깨비테니스 아카데미
          </p>
          <h1 className="break-keep text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            레슨 신청하기
          </h1>
          <p className="break-keep text-base leading-7 text-muted-foreground md:text-lg">
            신청서를 남겨주시면 도깨비테니스에서 확인 후 상담을 도와드립니다.
          </p>
        </section>

        <Card className="border-border bg-card">
          <CardContent className="p-5 md:p-6">
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              {notices.map((notice) => (
                <li key={notice} className="flex gap-2 break-keep">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{notice}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <AcademyApplyClient
          requestedClassId={classId ?? null}
          selectedClass={selectedClass}
        />
      </div>
    </main>
  );
}
