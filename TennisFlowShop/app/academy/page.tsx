import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { Document } from "mongodb";
import type { Metadata } from "next";
import Image from "next/image";
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

function serializeAcademyClass(doc: Document): PublicAcademyClass {
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
    enrolledCount: typeof doc.enrolledCount === "number" ? doc.enrolledCount : 0,
    price: typeof doc.price === "number" ? doc.price : null,
    status,
    statusLabel: getAcademyClassStatusLabel(status),
    createdAt: serializeDate(doc.createdAt),
    updatedAt: serializeDate(doc.updatedAt),
  };
}

const ACTIVE_APPLICATION_STATUSES = ["submitted", "reviewing", "contacted", "confirmed"] as const;

function serializeActiveApplication(doc: Document): AcademyActiveApplicationSummary {
  const classSnapshot = doc.classSnapshot && typeof doc.classSnapshot === "object" ? (doc.classSnapshot as { name?: unknown }) : null;

  return {
    id: serializeObjectId(doc._id),
    classId: typeof doc.classId === "string" ? doc.classId : null,
    className: typeof classSnapshot?.name === "string" ? classSnapshot.name : null,
    preferredDays: Array.isArray(doc.preferredDays) ? doc.preferredDays.filter((day): day is string => typeof day === "string") : [],
    status: doc.status === "reviewing" || doc.status === "contacted" || doc.status === "confirmed" ? doc.status : "submitted",
  };
}

async function getMyActiveAcademyApplications(userId: string | null): Promise<AcademyActiveApplicationSummary[]> {
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

    return docs.map(serializeAcademyClass);
  } catch (error) {
    console.error("[academy/page] failed to load public classes", error);
    return [];
  }
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
    items: [
      { title: "1인 레슨", detail: "주 1회 · 월 4회", price: "180,000원" },
      { title: "2인 레슨", detail: "주 1회 · 월 4회", price: "140,000원" },
    ],
  },
  {
    category: "쿠폰 레슨",
    description: "정기 일정이 어렵거나 필요한 횟수만 선택하고 싶은 분께 적합합니다.",
    badge: "쿠폰",
    items: [
      { title: "1인 쿠폰", detail: "4회 이용", price: "180,000원" },
      { title: "1인 쿠폰", detail: "8회 이용", price: "280,000원" },
    ],
  },
];

const academyContacts = [
  { role: "원장", name: "이성우", phone: "010-3784-3493" },
  { role: "코치", name: "김재민", phone: "010-5218-5248" },
];

const faqs = [
  {
    question: "테니스를 처음 배워도 가능한가요?",
    answer: "가능합니다. 입문자는 그립, 준비 자세, 기본 스윙처럼 꼭 필요한 기초부터 안내합니다.",
  },
  {
    question: "라켓이 없어도 상담할 수 있나요?",
    answer: "네. 보유 장비가 없어도 문의할 수 있으며, 필요한 준비물은 상담 과정에서 함께 안내합니다.",
  },
  {
    question: "개인 레슨과 그룹 레슨은 어떻게 다른가요?",
    answer: "개인 레슨은 맞춤 피드백에 집중하고, 그룹 레슨은 함께 랠리하며 수업 분위기를 만들기 좋습니다.",
  },
  {
    question: "수강료는 어디서 확인하나요?",
    answer: "아카데미 홈의 기준 수강료를 먼저 확인할 수 있으며, 수강료는 레슨 유형과 일정에 따라 상담 후 최종 확인될 수 있습니다. 등록이 확정되면 현장에서 결제를 안내해드립니다.",
  },
];

export const dynamic = "force-dynamic";

export default async function AcademyPage() {
  const userId = await getCurrentUserId();
  const [academyClasses, activeApplications] = await Promise.all([getPublicAcademyClasses(), getMyActiveAcademyApplications(userId)]);
  const activeApplicationByClassId = new Map(activeApplications.filter((application) => application.classId).map((application) => [application.classId, application]));

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-6xl space-y-9 md:space-y-11">
        <section className="overflow-hidden rounded-3xl border border-border bg-card px-5 py-8 shadow-sm md:px-9 md:py-11">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,430px)] lg:items-center">
            {/* 왼쪽: 기존 아카데미 소개/CTA 영역 */}
            <div className="max-w-3xl space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-success">도깨비테니스 레슨 안내</p>
                <h1 className="break-keep text-3xl font-bold tracking-tight text-foreground md:text-5xl">도깨비테니스 아카데미</h1>
                <p className="max-w-2xl break-keep text-base leading-7 text-foreground/80 md:text-lg md:leading-8">
                  아카데미는 스트링·라켓 장비 서비스와 별도의 레슨 신청 흐름입니다. 입문자부터 실전 플레이어까지, 목표와 레벨에 맞춘 수업 방향을 상담하며 함께 찾아보세요.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href={userId ? "/academy/apply" : `/login?next=${encodeURIComponent("/academy/apply")}`}>{userId ? "레슨 신청하기" : "로그인 후 신청"}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link href="/board/qna/write?category=academy">문의하기</Link>
                </Button>
              </div>
            </div>

            {/* 오른쪽: 아카데미 히어로 이미지 */}
            <div className="relative hidden overflow-hidden rounded-3xl border border-border bg-muted/20 shadow-sm lg:block">
              <Image src="/brand/academy-hero-tennis-court.png" alt="도깨비테니스 아카데미 레슨 장면" width={1122} height={1402} priority sizes="(min-width: 1024px) 430px, 100vw" className="h-[420px] w-full object-cover object-center" />
            </div>
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="lesson-fees-heading">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-success">Lesson Program</p>
            <h2 id="lesson-fees-heading" className="break-keep text-2xl font-semibold text-foreground">
              레슨 프로그램 & 기준 수강료
            </h2>
            <p className="break-keep text-sm leading-6 text-muted-foreground">레슨 유형과 횟수별 기준 수강료를 카드형 안내로 정리했습니다. 수강료는 레슨 유형과 일정에 따라 상담 후 최종 확인될 수 있습니다.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {lessonPrograms.map((program) => (
              <Card key={program.category} variant="interactive" className="flex h-full flex-col overflow-hidden border-border bg-card">
                <CardHeader variant="section" className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="break-keep text-lg">{program.category}</CardTitle>
                    <Badge variant="success">{program.badge}</Badge>
                  </div>
                  <CardDescription className="break-keep leading-6">{program.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 p-4 md:p-5">
                  {program.items.map((item) => (
                    <div key={`${program.category}-${item.title}-${item.detail}`} className="rounded-xl border border-border bg-background/70 p-4 transition-[border-color,background-color] duration-200 hover:border-success/35 hover:bg-card">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="break-keep text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="break-keep text-sm text-muted-foreground">{item.detail}</p>
                        </div>
                        <p className="shrink-0 whitespace-nowrap text-left text-base font-bold text-success sm:text-right">{item.price}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="academy-contact-heading">
          <div className="space-y-2">
            <h2 id="academy-contact-heading" className="break-keep text-2xl font-semibold text-foreground">
              상담 문의
            </h2>
            <p className="break-keep text-sm leading-6 text-muted-foreground">레슨 유형, 시간표, 수강 시작 가능일이 궁금하다면 담당자에게 문의해 주세요. 상담 후 등록이 확정되면 첫 방문 시 현장에서 결제를 안내합니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {academyContacts.map((contact) => (
              <Card key={contact.phone} variant="interactive" className="flex h-full border-border bg-card">
                <CardContent className="flex w-full flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
                  <div className="space-y-2">
                    <Badge variant="outline">{contact.role}</Badge>
                    <div>
                      <h3 className="break-keep text-lg font-semibold text-foreground">
                        {contact.role} {contact.name}
                      </h3>
                      <a href={`tel:${contact.phone.replaceAll("-", "")}`} className="mt-1 inline-flex text-base font-semibold text-success underline-offset-4 hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <Link href={`tel:${contact.phone.replaceAll("-", "")}`}>전화하기</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="break-keep text-2xl font-semibold text-foreground">현재 모집 중인 클래스</h2>
            <p className="break-keep text-sm leading-6 text-muted-foreground">목적과 경험에 맞춰 상담 후 적합한 수업 방향을 안내합니다. 선택한 클래스는 상담 신청 기준으로 사용됩니다.</p>
          </div>
          {academyClasses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {academyClasses.map((academyClass) => {
                const isClosed = academyClass.status === "closed";
                const existingApplication = activeApplicationByClassId.get(academyClass._id);
                const applyHref = `/academy/apply?classId=${academyClass._id}`;
                const loginHref = `/login?next=${encodeURIComponent(applyHref)}`;

                return (
                  <Card key={academyClass._id} className="flex h-full flex-col border-border bg-card shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-md">
                    <CardHeader className="space-y-3 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={isClosed ? "secondary" : "success"}>{academyClass.statusLabel}</Badge>
                        <Badge variant="outline">{academyClass.lessonTypeLabel}</Badge>
                        <Badge variant="outline">{academyClass.levelLabel}</Badge>
                      </div>
                      <CardTitle className="break-keep text-lg leading-7">{academyClass.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                      <p className="break-keep text-sm leading-6 text-muted-foreground">{academyClass.description || "도깨비테니스에서 레벨과 목표에 맞춰 안내하는 아카데미 클래스입니다."}</p>
                      <dl className="space-y-2.5 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                        <div className="flex gap-2">
                          <dt className="shrink-0 font-medium text-foreground">강사</dt>
                          <dd className="break-keep break-words">{academyClass.instructorName || "상담 후 안내"}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="shrink-0 font-medium text-foreground">장소</dt>
                          <dd className="break-keep break-words">{academyClass.location || "상담 후 안내"}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="shrink-0 font-medium text-foreground">일정</dt>
                          <dd className="break-keep break-words">{academyClass.scheduleText || "상담 후 조율"}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="shrink-0 font-medium text-foreground">정원</dt>
                          <dd>{typeof academyClass.capacity === "number" && academyClass.capacity > 0 ? `정원 ${academyClass.capacity}명` : "상담 후 안내"}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="shrink-0 font-medium text-foreground">가격</dt>
                          <dd>{formatClassPrice(academyClass.price)}</dd>
                        </div>
                      </dl>
                      <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row">
                        {existingApplication ? (
                          <Button asChild variant="outline" className="w-full border-success/45 bg-success/10 text-success hover:border-success/60 hover:bg-success/15 hover:text-success">
                            <Link href={`/mypage/academy-applications/${existingApplication.id}`}>신청 완료</Link>
                          </Button>
                        ) : isClosed ? (
                          <>
                            <Button disabled variant="secondary" className="w-full sm:flex-1">
                              모집 마감
                            </Button>
                            <Button asChild variant="outline" className="w-full sm:flex-1">
                              <Link href="/board/qna/write?category=academy">문의하기</Link>
                            </Button>
                          </>
                        ) : (
                          <Button asChild className="w-full">
                            <Link href={userId ? applyHref : loginHref}>{userId ? "레슨 신청하기" : "로그인 후 신청"}</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="space-y-4 p-5 md:p-6">
                <p className="break-keep text-sm leading-6 text-muted-foreground">현재 모집 중인 클래스가 없습니다. 레슨 문의를 남겨주시면 가능한 수업과 현장결제 안내를 함께 도와드립니다.</p>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/board/qna/write?category=academy">레슨 문의하기</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="break-keep text-2xl font-semibold text-foreground">안내 및 FAQ</h2>
            <p className="break-keep text-sm leading-6 text-muted-foreground">레슨 문의 전 자주 확인하는 내용을 정리했습니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <Card key={faq.question} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="break-keep text-base">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="break-keep text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card px-5 py-7 text-center shadow-sm md:px-8">
          <div className="mx-auto max-w-2xl space-y-4">
            <h2 className="break-keep text-2xl font-semibold text-foreground">나에게 맞는 레슨이 궁금하다면 문의해 주세요</h2>
            <p className="break-keep text-sm leading-6 text-muted-foreground">도깨비테니스 아카데미가 레벨, 목표, 가능한 일정을 확인해 상담을 도와드리고, 등록 확정 후 현장에서 결제를 안내해드립니다.</p>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/board/qna/write?category=academy">레슨 문의하기</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
