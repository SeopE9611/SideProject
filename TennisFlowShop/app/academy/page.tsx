import SiteContainer from "@/components/layout/SiteContainer";
import { EmptyState } from "@/components/public/EmptyState";
import { PublicPageHero } from "@/components/public/PublicPageHero";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  type AcademyClassLessonType,
  type AcademyClassLevel,
  type PublicAcademyClass,
} from "@/lib/types/academy";
import {
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  MessageCircle,
  Phone,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { ObjectId, type Db, type Document } from "mongodb";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "도깨비테니스 아카데미",
};

const PUBLIC_CLASS_STATUSES = ["visible", "closed"] as const;

function normalizeClassStatus(value: unknown): PublicAcademyClass["status"] {
  return value === "closed" ? "closed" : "visible";
}

function normalizeClassLevel(value: unknown): AcademyClassLevel {
  return isAcademyClassLevel(value) ? value : "all";
}

function normalizeClassLessonType(value: unknown): AcademyClassLessonType {
  return isAcademyClassLessonType(value) ? value : "group";
}

function serializeDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function serializeObjectId(value: unknown): string {
  if (value && typeof value === "object" && "toHexString" in value) {
    const maybeObjectId = value as { toHexString?: () => string };
    if (typeof maybeObjectId.toHexString === "function") {
      return maybeObjectId.toHexString();
    }
  }
  return typeof value === "string" ? value : "";
}

function serializeAcademyClass(doc: Document, enrolledCount?: number): PublicAcademyClass {
  const status = normalizeClassStatus(doc.status);
  const level = normalizeClassLevel(doc.level);
  const lessonType = normalizeClassLessonType(doc.lessonType);

  return {
    _id: serializeObjectId(doc._id),
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
    createdAt: serializeDate(doc.createdAt),
    updatedAt: serializeDate(doc.updatedAt),
  };
}

const ACTIVE_APPLICATION_STATUSES = ["submitted", "reviewing", "contacted", "confirmed"] as const;

function serializeActiveApplication(doc: Document): AcademyActiveApplicationSummary {
  const classSnapshot =
    doc.classSnapshot && typeof doc.classSnapshot === "object"
      ? (doc.classSnapshot as { name?: unknown })
      : null;

  return {
    id: serializeObjectId(doc._id),
    classId: typeof doc.classId === "string" ? doc.classId : null,
    className: typeof classSnapshot?.name === "string" ? classSnapshot.name : null,
    preferredDays: Array.isArray(doc.preferredDays)
      ? doc.preferredDays.filter((day): day is string => typeof day === "string")
      : [],
    status:
      doc.status === "reviewing" || doc.status === "contacted" || doc.status === "confirmed"
        ? doc.status
        : "submitted",
  };
}

async function getMyActiveAcademyApplications(
  userId: string | null,
): Promise<AcademyActiveApplicationSummary[]> {
  if (!userId) return [];

  try {
    const db = await getDb();
    const docs = await db
      .collection("academy_lesson_applications")
      .find({
        userId,
        classId: { $type: "string", $ne: "" },
        status: { $in: [...ACTIVE_APPLICATION_STATUSES] },
      })
      .project({
        _id: 1,
        classId: 1,
        classSnapshot: 1,
        preferredDays: 1,
        status: 1,
      })
      .toArray();

    return docs.map(serializeActiveApplication);
  } catch (error) {
    console.error("[academy/page] failed to load active applications", error);
    return [];
  }
}

async function getConfirmedCountsByClassId(db: Db, classes: Document[]) {
  const classIdStrings = classes.map((item) => serializeObjectId(item._id)).filter(Boolean);
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
    if (application.classId) matchedClassIds.add(serializeObjectId(application.classId));
    const snapshotClassId =
      application.classSnapshot &&
      typeof application.classSnapshot === "object" &&
      "classId" in application.classSnapshot
        ? serializeObjectId((application.classSnapshot as { classId?: unknown }).classId)
        : "";
    if (snapshotClassId) matchedClassIds.add(snapshotClassId);

    for (const classId of matchedClassIds) {
      if (!countsByClassId.has(classId)) continue;
      countsByClassId.set(classId, (countsByClassId.get(classId) ?? 0) + 1);
    }
  }

  return countsByClassId;
}

async function getPublicAcademyClasses(): Promise<PublicAcademyClass[]> {
  try {
    const db = await getDb();
    const docs = await db
      .collection("academy_classes")
      .find({ status: { $in: [...PUBLIC_CLASS_STATUSES] } })
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

    const confirmedCountsByClassId = await getConfirmedCountsByClassId(db, docs);

    return docs.map((doc) =>
      serializeAcademyClass(doc, confirmedCountsByClassId.get(serializeObjectId(doc._id))),
    );
  } catch (error) {
    console.error("[academy/page] failed to load public classes", error);
    return [];
  }
}

function formatClassCapacity(enrolledCount: number, capacity: number | null) {
  const enrolledLabel = enrolledCount.toLocaleString("ko-KR");
  if (typeof capacity === "number" && capacity > 0) {
    return `등록 확정 ${enrolledLabel}/${capacity.toLocaleString("ko-KR")}명`;
  }
  return `등록 확정 ${enrolledLabel}명 · 정원 미정`;
}

function formatClassPrice(price: number | null) {
  if (typeof price === "number" && price > 0) {
    return `월 ${price.toLocaleString("ko-KR")}원`;
  }
  return "상담 후 안내";
}

const lessonPrograms = [
  {
    category: "평일 레슨",
    description: "주중 일정에 맞춰 꾸준히 기본기와 랠리 감각을 쌓는 과정입니다.",
    badge: "평일",
    icon: Calendar,
    items: [
      { title: "2인 레슨", detail: "주 1회 · 월 4회", price: "120,000원" },
      { title: "2인 레슨", detail: "주 2회 · 월 8회", price: "170,000원" },
      { title: "개인레슨", detail: "주 1회 · 월 4회", price: "160,000원" },
      { title: "개인레슨", detail: "주 2회 · 월 8회", price: "250,000원" },
    ],
  },
  {
    category: "주말 레슨",
    description: "평일 시간이 어려운 수강생을 위한 주말 집중 레슨입니다.",
    badge: "주말",
    icon: Clock,
    items: [
      { title: "1인 레슨", detail: "주 1회 · 월 4회", price: "180,000원" },
      { title: "2인 레슨", detail: "주 1회 · 월 4회", price: "140,000원" },
    ],
  },
  {
    category: "쿠폰 레슨",
    description: "정기 일정이 어렵거나 필요한 횟수만 선택하고 싶은 분께 적합합니다.",
    badge: "쿠폰",
    icon: Wallet,
    items: [
      { title: "1인 쿠폰", detail: "4회 이용", price: "180,000원" },
      { title: "1인 쿠폰", detail: "8회 이용", price: "280,000원" },
    ],
  },
];

const academyContacts = [
  { role: "원장", name: "이성우 (2관)", phone: "010-3784-3493" },
  { role: "코치", name: "김재민 (1관)", phone: "010-5218-5248" },
];

const faqs = [
  {
    question: "테니스를 처음 배워도 가능한가요?",
    answer: "가능합니다. 입문자는 그립, 준비 자세, 기본 스윙처럼 꼭 필요한 기초부터 안내합니다.",
  },
  {
    question: "라켓이 없어도 상담할 수 있나요?",
    answer:
      "네. 보유 장비가 없어도 문의할 수 있으며, 필요한 준비물은 상담 과정에서 함께 안내합니다.",
  },
  {
    question: "개인 레슨과 그룹 레슨은 어떻게 다른가요?",
    answer:
      "개인 레슨은 맞춤 피드백에 집중하고, 그룹 레슨은 가격 부담이 없이 시작할수 있으며 파트너와 함께 랠리하며 함께 성장하는 프로그램 입니다.",
  },
  {
    question: "수강료는 어디서 확인하나요?",
    answer:
      "아카데미 홈의 기준 수강료를 먼저 확인할 수 있으며, 수강료는 레슨 유형과 일정에 따라 상담 후 최종 확인될 수 있습니다.",
  },
];

export const dynamic = "force-dynamic";

export default async function AcademyPage() {
  const userId = await getCurrentUserId();
  const [academyClasses, activeApplications] = await Promise.all([
    getPublicAcademyClasses(),
    getMyActiveAcademyApplications(userId),
  ]);
  const activeApplicationByClassId = new Map(
    activeApplications
      .filter((application) => application.classId)
      .map((application) => [application.classId, application]),
  );
  const hasVisibleClasses = academyClasses.some(
    (academyClass) => academyClass.status === "visible",
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <PublicPageHero
        eyebrow="Dokebi Tennis Academy"
        title="도깨비테니스 아카데미"
        description={
          <p className="break-keep leading-relaxed">
            입문자부터 실전 플레이어까지, 목표와 레벨에 맞춘 레슨 방향을 상담하고 신청할 수 있는
            아카데미 안내 페이지입니다.
          </p>
        }
        variant="feature"
        className="bg-brand-highlight-muted/30"
        actions={
          <>
            <Button
              asChild={hasVisibleClasses}
              size="lg"
              variant="highlight"
              wrap="responsive"
              className="w-full bp-sm:w-auto"
              disabled={!hasVisibleClasses}
            >
              {hasVisibleClasses ? (
                <Link href="#academy-classes">
                  <GraduationCap className="mr-2 h-5 w-5" />
                  모집 클래스 보기
                </Link>
              ) : (
                <>
                  <GraduationCap className="mr-2 h-5 w-5" />
                  모집 중인 레슨 없음
                </>
              )}
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              wrap="responsive"
              className="w-full bp-sm:w-auto"
            >
              <Link href="/board/qna/write?category=academy">
                <MessageCircle className="mr-2 h-5 w-5" />
                문의하기
              </Link>
            </Button>
          </>
        }
      ></PublicPageHero>

      <SiteContainer variant="default" className="space-y-12 py-10 md:space-y-16 md:py-14">
        {/* Lesson Programs Section */}
        <section className="space-y-6" aria-labelledby="lesson-fees-heading">
          <SectionHeader
            eyebrow="Lesson Program"
            title={<span id="lesson-fees-heading">레슨 프로그램 & 기준 수강료</span>}
            variant="brand"
            description={
              <p className="break-keep leading-relaxed">
                레슨 유형과 횟수별 기준 수강료를 카드형 안내로 정리했습니다. 수강료는 레슨 유형과
                일정에 따라 상담 후 최종 확인될 수 있습니다.
              </p>
            }
          />

          <div className="grid gap-4 bp-lg:grid-cols-3">
            {lessonPrograms.map((program) => {
              const IconComponent = program.icon;
              return (
                <PublicSurface
                  key={program.category}
                  variant="feature"
                  className="flex h-full min-w-0 flex-col gap-5"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-border bg-muted/40 text-muted-foreground">
                        <IconComponent className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 space-y-1.5">
                        <h3 className="break-keep text-ui-card-title-lg font-semibold text-foreground">
                          {program.category}
                        </h3>
                        <p className="break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                          {program.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 break-keep">
                      {program.badge}
                    </Badge>
                  </div>
                  <div className="mt-auto divide-y divide-border/80 border-t border-border">
                    {program.items.map((item) => (
                      <div
                        key={`${program.category}-${item.title}-${item.detail}`}
                        className="flex min-w-0 flex-col gap-2 py-4 first:pt-4 last:pb-0 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="break-keep font-semibold text-foreground">{item.title}</p>
                          <p className="break-keep break-words text-ui-body-sm leading-relaxed text-muted-foreground">
                            {item.detail}
                          </p>
                        </div>
                        <p className="shrink-0 whitespace-nowrap tabular-nums text-ui-card-title-lg font-semibold text-foreground">
                          {item.price}
                        </p>
                      </div>
                    ))}
                  </div>
                </PublicSurface>
              );
            })}
          </div>
        </section>

        {/* Contact Section */}
        <section className="space-y-6" aria-labelledby="academy-contact-heading">
          <SectionHeader
            eyebrow="Contact"
            title={<span id="academy-contact-heading">상담 문의</span>}
            variant="brand"
            description={
              <p className="break-keep leading-relaxed">
                레슨 유형, 시간표, 수강 시작 가능일이 궁금하다면 담당자에게 문의해 주세요. 상담 후
                등록이 확정되면 첫 방문 시 현장에서 결제를 안내합니다.
              </p>
            }
          />

          <PublicSurface variant="feature" padding="none" className="overflow-hidden">
            <div className="grid divide-y divide-border bp-lg:grid-cols-2 bp-lg:divide-x bp-lg:divide-y-0">
              {academyContacts.map((contact) => (
                <div
                  key={contact.phone}
                  className="flex min-w-0 flex-col gap-4 p-5 bp-sm:flex-row bp-sm:items-center bp-sm:p-6"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-border bg-muted/40 text-muted-foreground">
                    <User className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="break-keep text-ui-card-title-lg font-semibold leading-tight text-foreground">
                        {contact.name}
                      </h3>
                      <Badge variant="outline">{contact.role}</Badge>
                    </div>
                    <a
                      href={`tel:${contact.phone.replaceAll("-", "")}`}
                      className="inline-flex max-w-full min-w-0 items-center gap-2 whitespace-nowrap text-ui-body font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="tabular-nums">{contact.phone}</span>
                    </a>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    wrap="responsive"
                    className="w-full shrink-0 bp-sm:w-auto"
                  >
                    <Link href={`tel:${contact.phone.replaceAll("-", "")}`}>전화하기</Link>
                  </Button>
                </div>
              ))}
            </div>
          </PublicSurface>
        </section>

        {/* Classes Section */}
        <section id="academy-classes" className="scroll-mt-[calc(var(--header-h)+1rem)] space-y-6">
          <SectionHeader
            eyebrow="Classes"
            title="현재 모집 중인 클래스"
            variant="brand"
            description={
              <p className="break-keep leading-relaxed">
                목적과 경험에 맞춰 상담 후 적합한 수업 방향을 안내합니다. 선택한 클래스는 상담 신청
                기준으로 사용됩니다.
              </p>
            }
          />

          {academyClasses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {academyClasses.map((academyClass) => {
                const isClosed = academyClass.status === "closed";
                const existingApplication = activeApplicationByClassId.get(academyClass._id);
                const applyHref = `/academy/apply?classId=${academyClass._id}`;
                const loginHref = `/login?next=${encodeURIComponent(applyHref)}`;
                const scheduleDisplay = getAcademyScheduleDisplay(academyClass.scheduleText);

                return (
                  <PublicSurface
                    key={academyClass._id}
                    variant="feature"
                    className={`flex h-full min-w-0 flex-col gap-4 ${isClosed ? "border-warning/30 bg-muted/40" : ""}`}
                  >
                    <div className="space-y-4">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge variant={isClosed ? "secondary" : "highlight"}>
                          {academyClass.statusLabel}
                        </Badge>
                        <Badge variant="outline" className="break-keep">
                          {academyClass.lessonTypeLabel}
                        </Badge>
                        <Badge variant="outline" className="break-keep">
                          {academyClass.levelLabel}
                        </Badge>
                      </div>
                      <h3 className="text-balance break-keep text-ui-section-title font-semibold leading-tight text-foreground">
                        {academyClass.name}
                      </h3>
                    </div>
                    <div className="flex flex-1 flex-col gap-4">
                      <p className="whitespace-pre-line break-words text-ui-body-sm leading-relaxed text-muted-foreground">
                        {academyClass.description ||
                          "도깨비테니스에서 레벨과 목표에 맞춰 안내하는 아카데미 클래스입니다."}
                      </p>

                      <dl className="divide-y divide-border/80 border-y border-border">
                        <div className="grid min-w-0 grid-cols-[1rem_3rem_minmax(0,1fr)] gap-3 py-3 text-ui-body-sm">
                          <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <dt className="shrink-0 whitespace-nowrap break-keep font-medium text-foreground">
                            강사
                          </dt>
                          <dd className="min-w-0 whitespace-normal break-keep break-words text-muted-foreground">
                            {academyClass.instructorName || "상담 후 안내"}
                          </dd>
                        </div>
                        <div className="grid min-w-0 grid-cols-[1rem_3rem_minmax(0,1fr)] gap-3 py-3 text-ui-body-sm">
                          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <dt className="shrink-0 whitespace-nowrap break-keep font-medium text-foreground">
                            장소
                          </dt>
                          <dd className="min-w-0 whitespace-normal break-keep break-words text-muted-foreground">
                            {academyClass.location || "상담 후 안내"}
                          </dd>
                        </div>
                        <div className="grid min-w-0 grid-cols-[1rem_3rem_minmax(0,1fr)] items-start gap-3 py-3 text-ui-body-sm">
                          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <dt className="shrink-0 whitespace-nowrap break-keep font-medium text-foreground">
                            일정
                          </dt>
                          <dd className="min-w-0 space-y-1 whitespace-normal break-keep break-words leading-relaxed">
                            <p className="text-ui-body-sm font-semibold text-foreground">
                              {scheduleDisplay.daysText}
                            </p>
                            {scheduleDisplay.timeText && (
                              <p className="text-ui-body-sm text-muted-foreground">
                                {scheduleDisplay.timeText}
                              </p>
                            )}
                          </dd>
                        </div>
                        <div className="grid min-w-0 grid-cols-[1rem_3rem_minmax(0,1fr)] gap-3 py-3 text-ui-body-sm">
                          <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <dt className="shrink-0 whitespace-nowrap break-keep font-medium text-foreground">
                            정원
                          </dt>
                          <dd className="min-w-0 whitespace-normal break-keep break-words text-foreground tabular-nums">
                            {formatClassCapacity(academyClass.enrolledCount, academyClass.capacity)}
                          </dd>
                        </div>
                        <div className="grid min-w-0 grid-cols-[1rem_3rem_minmax(0,1fr)] gap-3 py-3 text-ui-body-sm">
                          <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <dt className="shrink-0 whitespace-nowrap break-keep font-medium text-foreground">
                            가격
                          </dt>
                          <dd className="min-w-0 whitespace-normal break-keep break-words font-semibold text-foreground">
                            {formatClassPrice(academyClass.price)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-auto flex flex-col gap-2 pt-2">
                        {existingApplication ? (
                          <Button
                            asChild
                            variant="outline"
                            wrap="responsive"
                            className="w-full"
                          >
                            <Link href={`/mypage/academy-applications/${existingApplication.id}`}>
                              <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
                              신청 완료
                            </Link>
                          </Button>
                        ) : isClosed ? (
                          <div className="flex flex-col gap-2 bp-sm:flex-row">
                            <Button disabled variant="secondary" className="flex-1">
                              모집 마감
                            </Button>
                            <Button
                              asChild
                              variant="outline"
                              wrap="responsive"
                              className="flex-1"
                            >
                              <Link href="/board/qna/write?category=academy">문의하기</Link>
                            </Button>
                          </div>
                        ) : (
                          <Button asChild wrap="responsive" className="w-full">
                            <Link href={userId ? applyHref : loginHref}>
                              {userId ? "레슨 신청하기" : "로그인 후 신청"}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </PublicSurface>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<GraduationCap className="h-8 w-8" />}
              title="현재 모집 중인 클래스가 없습니다"
              description="새로운 클래스가 열리면 안내해 드리겠습니다."
              action={
                <Button asChild variant="outline">
                  <Link href="/board/qna/write?category=academy">문의하기</Link>
                </Button>
              }
              className="rounded-2xl bg-card shadow-sm"
            />
          )}
        </section>

        {/* FAQ Section */}
        <section className="space-y-6" aria-labelledby="academy-faq-heading">
          <SectionHeader
            eyebrow="FAQ"
            title={<span id="academy-faq-heading">자주 묻는 질문</span>}
            description="레슨 문의 전 자주 확인하는 내용을 정리했습니다."
          />

          <PublicSurface padding="none" className="overflow-hidden">
            <Accordion type="single" className="divide-y divide-border">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.question}
                  value={faq.question}
                  className="border-0 px-5 bp-sm:px-6"
                >
                  <AccordionTrigger
                    value={faq.question}
                    className="text-left text-ui-body font-semibold leading-relaxed text-foreground"
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent
                    value={faq.question}
                    className="break-keep pb-4 text-ui-body-sm leading-relaxed text-muted-foreground"
                  >
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </PublicSurface>
        </section>

        {/* CTA Section */}
        <PublicSurface variant="muted" padding="lg" className="text-center">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-control border border-border bg-card text-muted-foreground">
              <MessageCircle className="h-7 w-7" aria-hidden />
            </div>
            <h2 className="text-balance text-ui-section-title font-semibold tracking-tight text-foreground md:text-ui-page-title lg:text-ui-page-title-lg">
              나에게 맞는 레슨이 궁금하다면 문의해 주세요
            </h2>
            <p className="text-pretty text-ui-body-sm leading-relaxed text-muted-foreground bp-sm:text-ui-body-lg">
              도깨비테니스 아카데미가 레벨, 목표, 가능한 일정을 확인해 상담을 도와드리고, 등록 확정 후 현장에서 결제를 안내해드립니다.
            </p>
            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <Button asChild size="lg" wrap="responsive" className="w-full sm:w-auto">
                <Link href="/board/qna/write?category=academy">문의글 작성하기</Link>
              </Button>
              <Button
                asChild={hasVisibleClasses}
                variant="outline"
                size="lg"
                wrap="responsive"
                className="w-full sm:w-auto"
                disabled={!hasVisibleClasses}
              >
                {hasVisibleClasses ? (
                  <Link href="#academy-classes">모집 클래스 보기</Link>
                ) : (
                  "모집 중인 레슨 없음"
                )}
              </Button>
            </div>
          </div>
        </PublicSurface>
      </SiteContainer>
    </main>
  );
}
