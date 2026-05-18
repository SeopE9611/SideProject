import { AlertCircle, ArrowLeft, Calendar, CheckCircle2, Clock, Info, MapPin, Users, Wallet } from "lucide-react";
import { ObjectId, type Document } from "mongodb";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import AcademyApplyClient from "@/app/academy/apply/_components/AcademyApplyClient";
import { Button } from "@/components/ui/button";
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
    instructorName: typeof doc.instructorName === "string" ? doc.instructorName : null,
    location: typeof doc.location === "string" ? doc.location : null,
    scheduleText: typeof doc.scheduleText === "string" ? doc.scheduleText : null,
    capacity: typeof doc.capacity === "number" ? doc.capacity : null,
    enrolledCount: typeof doc.enrolledCount === "number" ? doc.enrolledCount : 0,
    price: typeof doc.price === "number" ? doc.price : null,
    status,
    statusLabel: getAcademyClassStatusLabel(status),
    createdAt: serializeValue(doc.createdAt),
    updatedAt: serializeValue(doc.updatedAt),
  };
}

async function getPublicAcademyClassById(classId: string | null): Promise<PublicAcademyClass | null> {
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

const ACTIVE_APPLICATION_STATUSES = ["submitted", "reviewing", "contacted", "confirmed"] as const;

function serializeActiveApplication(doc: Document): AcademyActiveApplicationSummary {
  const classSnapshot = doc.classSnapshot && typeof doc.classSnapshot === "object" ? (doc.classSnapshot as { name?: unknown }) : null;

  return {
    id: serializeValue(doc._id) ?? "",
    classId: typeof doc.classId === "string" ? doc.classId : null,
    className: typeof classSnapshot?.name === "string" ? classSnapshot.name : typeof doc.className === "string" ? doc.className : null,
    preferredDays: Array.isArray(doc.preferredDays) ? doc.preferredDays.filter((day): day is string => typeof day === "string") : [],
    status: doc.status === "reviewing" || doc.status === "contacted" || doc.status === "confirmed" ? doc.status : "submitted",
  };
}

async function getApplicantProfile(userId: string): Promise<AcademyApplicantProfile> {
  if (!ObjectId.isValid(userId)) {
    return { name: "", phone: "", email: "" };
  }

  try {
    const db = await getDb();
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) }, { projection: { name: 1, phone: 1, email: 1 } });

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

const notices = ["신청 접수 후 상담을 통해 등록 가능 여부와 결제 방법을 안내드립니다.", "수업 일정과 수강료는 상담 후 최종 확인됩니다.", "결제는 신청 단계에서 진행되지 않으며, 등록 확정 후 현장에서 안내됩니다."];

function formatClassPrice(price: number | null) {
  if (typeof price === "number" && price > 0) {
    return `${price.toLocaleString("ko-KR")}원`;
  }
  return "상담 후 안내";
}

function formatClassCapacity(capacity: number | null) {
  if (typeof capacity === "number" && capacity > 0) {
    return `${capacity}��`;
  }
  return "상담 후 안내";
}

export default async function AcademyApplyPage({ searchParams }: { searchParams?: Promise<{ classId?: string | string[] }> }) {
  const resolvedSearchParams = await searchParams;
  const rawClassId = resolvedSearchParams?.classId;
  const classId = Array.isArray(rawClassId) ? rawClassId[0] : rawClassId;
  const currentPath = `/academy/apply${classId ? `?classId=${encodeURIComponent(classId)}` : ""}`;
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }

  const [selectedClass, initialApplicantInfo, activeApplications] = await Promise.all([getPublicAcademyClassById(classId ?? null), getApplicantProfile(userId), getActiveApplications(userId)]);
  const duplicateApplication = selectedClass ? activeApplications.find((application) => application.classId === selectedClass._id) : null;

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-background to-muted/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-success/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-5xl px-6 py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Link href="/academy">
                <ArrowLeft className="h-4 w-4" />
                아카데미로 돌아가기
              </Link>
            </Button>
          </nav>

          <div className="flex flex-col gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              도깨비테니스 아카데미
            </div>

            <h1 className="text-balance font-brand text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-4xl">레슨 신청하기</h1>

            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">신청서를 남겨주시면 도깨비테니스에서 일정과 수강 방식을 확인한 뒤 상담을 도와드립니다.</p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div className="space-y-8">
          {/* Notice Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-xl bg-info/10 p-2.5">
                <Info className="h-5 w-5 text-info" />
              </div>
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">신청 전 안내사항</h2>
                <ul className="space-y-2">
                  {notices.map((notice, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                      <span>{notice}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Duplicate Application Warning */}
          {duplicateApplication ? (
            <div className="rounded-2xl border border-warning/40 bg-warning/5 p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
                <div className="shrink-0 rounded-xl bg-warning/10 p-3">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">이미 신청한 클래스입니다</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">기존 신청 내역에서 진행 상태를 확인해 주세요. 같은 클래스는 진행 중인 신청이 있을 때 중복 신청할 수 없습니다.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild>
                      <a href={`/mypage/academy-applications/${duplicateApplication.id}`}>신청 내역 보기</a>
                    </Button>
                    <Button asChild variant="outline">
                      <a href="/academy">아카데미로 돌아가기</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Selected Class Info */}
              {selectedClass && (
                <div className={`rounded-2xl border ${selectedClass.status === "closed" ? "border-muted bg-muted/30" : "border-border/60 bg-card"} overflow-hidden`}>
                  {/* Class Header */}
                  <div className="border-b border-border/40 bg-muted/30 px-5 py-4 md:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${selectedClass.status === "closed" ? "bg-muted text-muted-foreground" : "bg-success/10 text-success"}`}>
                        {selectedClass.status === "closed" ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                        {selectedClass.statusLabel}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">{selectedClass.lessonTypeLabel}</span>
                      <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">{selectedClass.levelLabel}</span>
                    </div>
                  </div>

                  {/* Class Content */}
                  <div className="p-5 md:p-6">
                    <div className="mb-4">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">선택한 클래스</p>
                      <h3 className="text-xl font-semibold text-foreground">{selectedClass.name}</h3>
                      {selectedClass.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedClass.description}</p>}
                    </div>

                    {/* Class Details Grid */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">정원</p>
                          <p className="text-sm font-medium text-foreground">{formatClassCapacity(selectedClass.capacity)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">장소</p>
                          <p className="text-sm font-medium text-foreground">{selectedClass.location || "상담 후 안내"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">일정</p>
                          <p className="text-sm font-medium text-foreground">{selectedClass.scheduleText || "상담 후 조율"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">수강료</p>
                          <p className="text-sm font-medium text-foreground">{formatClassPrice(selectedClass.price)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Closed Class Notice */}
                    {selectedClass.status === "closed" && (
                      <div className="mt-4 rounded-xl border border-border bg-background p-4">
                        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">이 클래스는 현재 모집이 마감되었습니다. 문의하기를 통해 다음 모집 일정을 확인해 주세요.</p>
                        <Button asChild size="sm">
                          <Link href="/board/qna/write?category=academy">문의하기</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Invalid Class Warning */}
              {classId && !selectedClass && (
                <div className="rounded-2xl border border-warning/40 bg-warning/5 p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 rounded-xl bg-warning/10 p-2.5">
                      <AlertCircle className="h-5 w-5 text-warning" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-foreground">클래스 정보를 찾을 수 없습니다</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">선택한 클래스 정보를 찾을 수 없어 일반 레슨 신청으로 접수됩니다. 특정 클래스를 신청하려면 아카데미 페이지에서 모집 중인 클래스를 다시 선택해 주세요.</p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/academy">클래스 다시 선택하기</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Application Form */}
              <AcademyApplyClient requestedClassId={classId ?? null} selectedClass={selectedClass} initialApplicantInfo={initialApplicantInfo} activeApplications={activeApplications} />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
