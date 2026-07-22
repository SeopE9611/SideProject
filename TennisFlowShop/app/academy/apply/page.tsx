import { ArrowLeft, Calendar, CheckCircle2, Clock, MapPin, Users, Wallet } from "lucide-react";
import { ObjectId, type Db, type Document } from "mongodb";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import AcademyApplyClient from "@/app/academy/apply/_components/AcademyApplyClient";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, PublicSurface, ResultState, SummaryCard } from "@/components/public";
import { Button } from "@/components/ui/button";
import { getAcademyScheduleDisplay } from "@/lib/academy-display";
import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import { getDb } from "@/lib/mongodb";
import {
  getAcademyClassLessonTypeLabel,
  getAcademyClassLevelLabel,
  getAcademyClassStatusLabel,
  isAcademyClassLessonType,
  isAcademyClassLevel,
  type AcademyActiveApplicationSummary,
  type AcademyApplicantProfile,
  type AcademyClassLessonType,
  type AcademyClassLevel,
  type PublicAcademyClass,
} from "@/lib/types/academy";

export const metadata: Metadata = {
  title: "레슨 신청하기 | 도깨비테니스 아카데미",
  description: "도깨비테니스 아카데미 레슨 신청 페이지",
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

function serializePublicClass(doc: Document, enrolledCount?: number): PublicAcademyClass {
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
    instructorName: typeof doc.instructorName === "string" ? doc.instructorName : null,
    location: typeof doc.location === "string" ? doc.location : null,
    scheduleText: typeof doc.scheduleText === "string" ? doc.scheduleText : null,
    capacity: typeof doc.capacity === "number" ? doc.capacity : null,
    enrolledCount: typeof enrolledCount === "number" ? enrolledCount : 0,
    price: typeof doc.price === "number" ? doc.price : null,
    status,
    statusLabel: getAcademyClassStatusLabel(status),
    createdAt: serializeValue(doc.createdAt),
    updatedAt: serializeValue(doc.updatedAt),
  };
}

function serializeClassId(value: unknown): string {
  const serialized = serializeValue(value);
  return typeof serialized === "string" ? serialized : "";
}

async function getConfirmedCountsByClassId(db: Db, classes: Document[]) {
  const classIdStrings = classes.map((item) => serializeClassId(item._id)).filter(Boolean);
  const countsByClassId = new Map<string, number>();
  for (const classId of classIdStrings) {
    countsByClassId.set(classId, 0);
  }

  if (classIdStrings.length === 0) return countsByClassId;

  const objectIds = classIdStrings
    .filter((classId) => ObjectId.isValid(classId))
    .map((classId) => new ObjectId(classId));
  const classIdMatchers: unknown[] = [...classIdStrings, ...objectIds];

  const applications = await db
    .collection("academy_lesson_applications")
    .find(
      {
        adminDeletedAt: { $exists: false },
        status: "confirmed",
        $or: [
          { classId: { $in: classIdMatchers } },
          { "classSnapshot.classId": { $in: classIdStrings } },
        ],
      },
      { projection: { classId: 1, "classSnapshot.classId": 1 } },
    )
    .toArray();

  for (const application of applications) {
    const matchedClassIds = new Set<string>();
    if (application.classId) matchedClassIds.add(serializeClassId(application.classId));
    const snapshotClassId =
      application.classSnapshot &&
      typeof application.classSnapshot === "object" &&
      "classId" in application.classSnapshot
        ? serializeClassId((application.classSnapshot as { classId?: unknown }).classId)
        : "";
    if (snapshotClassId) matchedClassIds.add(snapshotClassId);

    for (const classId of matchedClassIds) {
      if (!countsByClassId.has(classId)) continue;
      countsByClassId.set(classId, (countsByClassId.get(classId) ?? 0) + 1);
    }
  }

  return countsByClassId;
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

    if (!doc) return null;

    const confirmedCountsByClassId = await getConfirmedCountsByClassId(db, [doc]);
    return serializePublicClass(doc, confirmedCountsByClassId.get(serializeClassId(doc._id)));
  } catch (error) {
    console.error("[academy/apply] failed to load selected class", error);
    return null;
  }
}

const ACTIVE_APPLICATION_STATUSES = ["submitted", "reviewing", "contacted", "confirmed"] as const;

function serializeActiveApplication(doc: Document): AcademyActiveApplicationSummary {
  const classSnapshot =
    doc.classSnapshot && typeof doc.classSnapshot === "object"
      ? (doc.classSnapshot as { name?: unknown })
      : null;

  return {
    id: serializeValue(doc._id) ?? "",
    classId: typeof doc.classId === "string" ? doc.classId : null,
    className:
      typeof classSnapshot?.name === "string"
        ? classSnapshot.name
        : typeof doc.className === "string"
          ? doc.className
          : null,
    preferredDays: Array.isArray(doc.preferredDays)
      ? doc.preferredDays.filter((day): day is string => typeof day === "string")
      : [],
    status:
      doc.status === "reviewing" || doc.status === "contacted" || doc.status === "confirmed"
        ? doc.status
        : "submitted",
  };
}

async function getApplicantProfile(userId: string): Promise<AcademyApplicantProfile> {
  if (!ObjectId.isValid(userId)) {
    return { name: "", phone: "", email: "" };
  }

  try {
    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) }, { projection: { name: 1, phone: 1, email: 1 } });

    return {
      name: typeof user?.name === "string" ? user.name : "",
      phone: typeof user?.phone === "string" ? user.phone : "",
      email: typeof user?.email === "string" ? user.email : "",
    };
  } catch (error) {
    console.error("[academy/apply] failed to load applicant profile", error);
    return { name: "", phone: "", email: "" };
  }
}

async function getActiveApplications(userId: string): Promise<AcademyActiveApplicationSummary[]> {
  try {
    const db = await getDb();
    const docs = await db
      .collection("academy_lesson_applications")
      .find({
        userId,
        status: { $in: [...ACTIVE_APPLICATION_STATUSES] },
      })
      .project({
        _id: 1,
        classId: 1,
        classSnapshot: 1,
        preferredDays: 1,
        status: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    return docs.map(serializeActiveApplication);
  } catch (error) {
    console.error("[academy/apply] failed to load active applications", error);
    return [];
  }
}

const notices = [
  "신청 접수 후 상담을 통해 등록 가능 여부와 결제 방법을 안내드립니다.",
  "수업 일정과 수강료는 상담 후 최종 확인됩니다.",
  "결제는 신청 단계에서 진행되지 않으며, 등록 확정 후 현장에서 안내됩니다.",
];

function formatClassPrice(price: number | null) {
  if (typeof price === "number" && price > 0) {
    return `${price.toLocaleString("ko-KR")}원`;
  }
  return "상담 후 안내";
}

function formatClassCapacity(enrolledCount: number, capacity: number | null) {
  const enrolledLabel = enrolledCount.toLocaleString("ko-KR");
  if (typeof capacity === "number" && capacity > 0) {
    return `등록 확정 ${enrolledLabel}/${capacity.toLocaleString("ko-KR")}명`;
  }
  return `등록 확정 ${enrolledLabel}명 · 정원 미정`;
}

export default async function AcademyApplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ classId?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawClassId = resolvedSearchParams?.classId;
  const classId = Array.isArray(rawClassId) ? rawClassId[0] : rawClassId;
  const currentPath = `/academy/apply${classId ? `?classId=${encodeURIComponent(classId)}` : ""}`;
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }

  const [selectedClass, initialApplicantInfo, activeApplications] = await Promise.all([
    getPublicAcademyClassById(classId ?? null),
    getApplicantProfile(userId),
    getActiveApplications(userId),
  ]);
  const duplicateApplication = selectedClass
    ? activeApplications.find((application) => application.classId === selectedClass._id)
    : null;
  const selectedClassSchedule = selectedClass
    ? getAcademyScheduleDisplay(selectedClass.scheduleText)
    : null;
  const classSelectionBlocked = !classId || !selectedClass || selectedClass.status === "closed";

  return (
    <main className="min-h-screen bg-background">
      <PublicPageHero
        eyebrow="도깨비테니스 아카데미"
        title="아카데미 신청서"
        description="신청서를 남겨주시면 도깨비테니스에서 일정과 수강 방식을 확인한 뒤 상담을 도와드립니다."
        variant="feature"
        className="bg-brand-highlight-muted/30"
        actions={
          <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
            <Link href="/academy">
              <ArrowLeft className="h-4 w-4" />
              아카데미로 돌아가기
            </Link>
          </Button>
        }
      />

      {/* Main Content */}
      <SiteContainer className="py-8 md:py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Notice Card */}
          <SummaryCard
            variant="feature"
            eyebrow="Step 1 · Before you apply"
            title="신청 전 안내사항"
            description="신청 전 아래 내용을 확인해 주세요."
            contentClassName="pt-0"
          >
            <ul className="space-y-2">
              {notices.map((notice, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-ui-body-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                  <span>{notice}</span>
                </li>
              ))}
            </ul>
          </SummaryCard>

          {/* Duplicate Application Warning */}
          {classSelectionBlocked ? (
            <ResultState
              status="warning"
              title={
                !classId
                  ? "클래스를 먼저 선택해 주세요"
                  : selectedClass?.status === "closed"
                    ? "모집이 마감된 클래스입니다"
                    : "신청할 수 없는 클래스입니다"
              }
              description={
                !classId
                  ? "아카데미 신청은 모집 중인 클래스를 선택한 뒤에만 진행할 수 있습니다."
                  : selectedClass?.status === "closed"
                    ? "이 클래스는 현재 모집이 마감되었습니다. 문의하기를 통해 다음 모집 일정을 확인해 주세요."
                    : "신청할 수 없는 클래스입니다. 모집 중인 클래스를 다시 선택해 주세요."
              }
              actions={
                <>
                  <Button asChild>
                    <Link href="/academy">아카데미로 돌아가기</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/board/qna/write?category=academy">문의하기</Link>
                  </Button>
                </>
              }
            />
          ) : duplicateApplication ? (
            <ResultState
              status="warning"
              title="이미 신청한 클래스입니다"
              description="기존 신청 내역에서 진행 상태를 확인해 주세요. 같은 클래스는 진행 중인 신청이 있을 때 중복 신청할 수 없습니다."
              actions={
                <>
                  <Button asChild>
                    <a href={`/mypage/academy-applications/${duplicateApplication.id}`}>
                      신청 내역 보기
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="/academy">아카데미로 돌아가기</a>
                  </Button>
                </>
              }
            />
          ) : (
            <>
              {/* Selected Class Info */}
              {selectedClass && (
                <PublicSurface
                  variant="feature"
                  padding="none"
                  className={
                    selectedClass.status === "closed"
                      ? "overflow-hidden border-warning/30 bg-muted/30"
                      : "overflow-hidden"
                  }
                >
                  {/* Class Header */}
                  <div className="border-b border-border bg-muted/30 px-5 py-4 md:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-ui-label font-medium ${selectedClass.status === "closed" ? "bg-muted text-muted-foreground" : "bg-success/10 text-success"}`}
                      >
                        {selectedClass.status === "closed" ? (
                          <Clock className="h-3 w-3" aria-hidden />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" aria-hidden />
                        )}
                        {selectedClass.statusLabel}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-ui-label font-medium text-muted-foreground">
                        {selectedClass.lessonTypeLabel}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-ui-label font-medium text-muted-foreground">
                        {selectedClass.levelLabel}
                      </span>
                    </div>
                  </div>

                  {/* Class Content */}
                  <div className="p-5 md:p-6">
                    <div className="mb-4">
                      <p className="mb-1 text-ui-label font-medium uppercase tracking-wider text-muted-foreground">
                        선택한 클래스
                      </p>
                      <h3 className="font-ui-bold text-ui-section-title text-foreground">
                        {selectedClass.name}
                      </h3>
                      {selectedClass.description && (
                        <p className="mt-2 whitespace-pre-line break-keep break-words text-ui-body-sm leading-relaxed text-muted-foreground">
                          {selectedClass.description}
                        </p>
                      )}
                    </div>

                    {/* Class Details Grid */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                        <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0">
                          <p className="shrink-0 whitespace-nowrap break-keep text-ui-label text-muted-foreground">
                            정원
                          </p>
                          <p className="min-w-0 whitespace-nowrap break-keep text-ui-body-sm font-medium text-foreground tabular-nums">
                            {formatClassCapacity(
                              selectedClass.enrolledCount,
                              selectedClass.capacity,
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0">
                          <p className="shrink-0 whitespace-nowrap break-keep text-ui-label text-muted-foreground">
                            장소
                          </p>
                          <p className="min-w-0 whitespace-normal break-keep break-words text-ui-body-sm font-medium text-foreground">
                            {selectedClass.location || "상담 후 안내"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3">
                        <Calendar
                          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <div className="min-w-0 space-y-0.5 whitespace-normal break-keep break-words">
                          <p className="shrink-0 whitespace-nowrap break-keep text-ui-label text-muted-foreground">
                            일정
                          </p>
                          <p className="text-ui-body-sm font-semibold text-foreground">
                            {selectedClassSchedule?.daysText}
                          </p>
                          {selectedClassSchedule?.timeText && (
                            <p className="text-ui-body-sm font-medium text-muted-foreground">
                              {selectedClassSchedule.timeText}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                        <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0">
                          <p className="shrink-0 whitespace-nowrap break-keep text-ui-label text-muted-foreground">
                            수강료
                          </p>
                          <p className="min-w-0 whitespace-nowrap break-keep text-ui-body-sm font-medium text-foreground tabular-nums">
                            {formatClassPrice(selectedClass.price)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Closed Class Notice */}
                    {selectedClass.status === "closed" && (
                      <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
                        <p className="mb-3 text-ui-body-sm leading-relaxed text-muted-foreground">
                          이 클래스는 현재 모집이 마감되었습니다. 문의하기를 통해 다음 모집 일정을
                          확인해 주세요.
                        </p>
                        <Button asChild size="sm">
                          <Link href="/board/qna/write?category=academy">문의하기</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </PublicSurface>
              )}

              {/* Application Form */}
              <AcademyApplyClient
                requestedClassId={classId ?? null}
                selectedClass={selectedClass}
                initialApplicantInfo={initialApplicantInfo}
                activeApplications={activeApplications}
              />
            </>
          )}
        </div>
      </SiteContainer>
    </main>
  );
}
