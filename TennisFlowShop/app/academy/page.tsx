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
import { Calendar, CheckCircle2, Clock, GraduationCap, MapPin, MessageCircle, Phone, Sparkles, User, Users, Wallet } from "lucide-react";
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
    answer: "아카데미 홈의 기준 수강료를 먼저 확인할 수 있으며, 수강료는 레슨 유형과 일정에 따라 상담 후 최종 확인될 수 있습니다.",
  },
];

export const dynamic = "force-dynamic";

export default async function AcademyPage() {
  const userId = await getCurrentUserId();
  const [academyClasses, activeApplications] = await Promise.all([getPublicAcademyClasses(), getMyActiveAcademyApplications(userId)]);
  const activeApplicationByClassId = new Map(activeApplications.filter((application) => application.classId).map((application) => [application.classId, application]));

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-muted/20">
        <div className="absolute inset-x-0 top-0 h-24 bg-primary/5" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:items-center lg:gap-16">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  도깨비테니스 레슨 안내
                </div>
                <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">도깨비테니스 아카데미</h1>
                <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                  아카데미는 스트링/라켓 장비 서비스와 별도의 레슨 신청 흐름입니다. 입문자부터 실전 플레이어까지, 목표와 레벨에 맞춘 수업 방향을 상담하며 함께 찾아보세요.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-8 text-base">
                  <Link href={userId ? "/academy/apply" : `/login?next=${encodeURIComponent("/academy/apply")}`}>
                    <GraduationCap className="mr-2 h-5 w-5" />
                    {userId ? "레슨 신청하기" : "로그인 후 신청"}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
                  <Link href="/board/qna/write?category=academy">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    문의하기
                  </Link>
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <span>1:1 맞춤 레슨</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <span>유연한 일정 조율</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <span>레벨별 맞춤 커리큘럼</span>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative hidden lg:block">
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/20 shadow-xl">
                <Image src="/brand/academy-hero-tennis-court.png" alt="도깨비테니스 아카데미 레슨 장면" width={1122} height={1402} priority sizes="(min-width: 1024px) 400px, 100vw" className="h-[480px] w-full object-cover object-center" />
                <div className="absolute inset-0 bg-background/20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 md:px-6 md:py-16">
        {/* Lesson Programs Section */}
        <section className="space-y-8" aria-labelledby="lesson-fees-heading">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Lesson Program</p>
            <h2 id="lesson-fees-heading" className="text-3xl font-bold tracking-tight text-foreground">
              레슨 프로그램 & 기준 수강료
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">레슨 유형과 횟수별 기준 수강료를 카드형 안내로 정리했습니다. 수강료는 레슨 유형과 일정에 따라 상담 후 최종 확인될 수 있습니다.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {lessonPrograms.map((program) => {
              const IconComponent = program.icon;
              return (
                <Card key={program.category} className="group relative flex h-full flex-col overflow-hidden border-border/60 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg">
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15">
                        {program.badge}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{program.category}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">{program.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                    {program.items.map((item) => (
                      <div key={`${program.category}-${item.title}-${item.detail}`} className="rounded-xl border border-border/40 bg-muted/30 p-4 transition-all duration-200 hover:border-primary/20 hover:bg-muted/50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{item.title}</p>
                            <p className="text-sm text-muted-foreground">{item.detail}</p>
                          </div>
                          <p className="shrink-0 text-lg font-bold text-primary">{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Contact Section */}
        <section className="space-y-8" aria-labelledby="academy-contact-heading">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Contact</p>
            <h2 id="academy-contact-heading" className="text-3xl font-bold tracking-tight text-foreground">
              상담 문의
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">레슨 유형, 시간표, 수강 시작 가능일이 궁금하다면 담당자에게 문의해 주세요. 상담 후 등록이 확정되면 첫 방문 시 현장에서 결제를 안내합니다.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {academyContacts.map((contact) => (
              <Card key={contact.phone} className="group border-border/60 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg">
                <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Badge variant="outline" className="mb-2">
                      {contact.role}
                    </Badge>
                    <h3 className="text-xl font-semibold text-foreground">{contact.name}</h3>
                    <a href={`tel:${contact.phone.replaceAll("-", "")}`} className="inline-flex items-center gap-2 text-lg font-medium text-primary transition-colors hover:text-primary/80">
                      <Phone className="h-4 w-4" />
                      {contact.phone}
                    </a>
                  </div>
                  <Button asChild variant="outline" size="lg" className="w-full shrink-0 sm:w-auto">
                    <Link href={`tel:${contact.phone.replaceAll("-", "")}`}>전화하기</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Classes Section */}
        <section className="space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Classes</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">현재 모집 중인 클래스</h2>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">목적과 경험에 맞춰 상담 후 적합한 수업 방향을 안내합니다. 선택한 클래스는 상담 신청 기준으로 사용됩니다.</p>
          </div>

          {academyClasses.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {academyClasses.map((academyClass) => {
                const isClosed = academyClass.status === "closed";
                const existingApplication = activeApplicationByClassId.get(academyClass._id);
                const applyHref = `/academy/apply?classId=${academyClass._id}`;
                const loginHref = `/login?next=${encodeURIComponent(applyHref)}`;

                return (
                  <Card key={academyClass._id} className={`group flex h-full flex-col border-border/60 bg-card transition-all duration-300 hover:shadow-lg ${isClosed ? "opacity-75" : "hover:border-primary/30"}`}>
                    <CardHeader className="space-y-4 pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={isClosed ? "secondary" : "default"} className={isClosed ? "" : "bg-primary text-primary-foreground"}>
                          {academyClass.statusLabel}
                        </Badge>
                        <Badge variant="outline">{academyClass.lessonTypeLabel}</Badge>
                        <Badge variant="outline">{academyClass.levelLabel}</Badge>
                      </div>
                      <CardTitle className="text-xl leading-tight">{academyClass.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                      <p className="text-sm leading-relaxed text-muted-foreground">{academyClass.description || "도깨비테니스에서 레벨과 목표에 맞춰 안내하는 아카데미 클래스입니다."}</p>

                      <div className="space-y-3 rounded-xl border border-border/40 bg-muted/30 p-4">
                        <div className="flex items-center gap-3 text-sm">
                          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground">강사</span>
                          <span className="text-muted-foreground">{academyClass.instructorName || "상담 후 안내"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground">장소</span>
                          <span className="text-muted-foreground">{academyClass.location || "상담 후 안내"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground">일정</span>
                          <span className="text-muted-foreground">{academyClass.scheduleText || "상담 후 조율"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground">정원</span>
                          <span className="text-muted-foreground">{typeof academyClass.capacity === "number" && academyClass.capacity > 0 ? `${academyClass.capacity}명` : "상담 후 안내"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground">가격</span>
                          <span className="font-semibold text-primary">{formatClassPrice(academyClass.price)}</span>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-col gap-2 pt-2">
                        {existingApplication ? (
                          <Button asChild variant="outline" className="w-full border-primary/30 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10">
                            <Link href={`/mypage/academy-applications/${existingApplication.id}`}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              신청 완료
                            </Link>
                          </Button>
                        ) : isClosed ? (
                          <div className="flex gap-2">
                            <Button disabled variant="secondary" className="flex-1">
                              모집 마감
                            </Button>
                            <Button asChild variant="outline" className="flex-1">
                              <Link href="/board/qna/write?category=academy">문의하기</Link>
                            </Button>
                          </div>
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
            <Card className="border-border/60 bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <GraduationCap className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">현재 모집 중인 클래스가 없습니다</p>
                  <p className="text-sm text-muted-foreground">새로운 클래스가 열리면 안내해 드리겠습니다.</p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/board/qna/write?category=academy">문의하기</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* FAQ Section */}
        <section className="space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">FAQ</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">자주 묻는 질문</h2>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">레슨 문의 전 자주 확인하는 내용을 정리했습니다.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq, index) => (
              <Card key={faq.question} className="group border-border/60 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start gap-3 text-base font-semibold">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
                    <span className="text-balance leading-relaxed">{faq.question}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="pl-10 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/30 p-8 md:p-12">
          <div className="absolute inset-0 bg-primary/5" />
          <div className="relative mx-auto max-w-2xl space-y-6 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <MessageCircle className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground md:text-3xl">나에게 맞는 레슨이 궁금하다면 문의해 주세요</h2>
            <p className="text-pretty text-base leading-relaxed text-muted-foreground">도깨비테니스 아카데미가 레벨, 목표, 가능한 일정을 확인해 상담을 도와드리고, 등록 확정 후 현장에서 결제를 안내해드립니다.</p>
            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-8">
                <Link href={userId ? "/academy/apply" : `/login?next=${encodeURIComponent("/academy/apply")}`}>레슨 신청하기</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8">
                <Link href="/board/qna/write?category=academy">문의글 작성하기</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
