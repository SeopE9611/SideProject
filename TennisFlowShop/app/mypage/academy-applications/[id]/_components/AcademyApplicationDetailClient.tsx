"use client";

import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { badgeToneVariant, type BadgeSemanticTone } from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import type {
  AcademyCustomerApplicationDetail,
  AcademyCustomerApplicationDetailResponse,
  AcademyLessonApplicationStatus,
} from "@/lib/types/academy";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  MapPin,
  MessageSquareText,
  PhoneCall,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

function getStatusTone(status: AcademyLessonApplicationStatus): BadgeSemanticTone {
  switch (status) {
    case "confirmed":
      return "success";
    case "reviewing":
      return "info";
    case "contacted":
      return "brand";
    case "cancelled":
      return "danger";
    case "submitted":
    default:
      return "warning";
  }
}

function getStatusDescription(status: AcademyLessonApplicationStatus) {
  switch (status) {
    case "reviewing":
      return "담당자가 신청 내용을 검토하고 있습니다.";
    case "contacted":
      return "상담이 진행되었거나 연락이 완료된 상태입니다.";
    case "confirmed":
      return "등록이 확정되었습니다. 방문 일정과 현장결제 안내를 확인해 주세요.";
    case "cancelled":
      return "취소된 신청입니다.";
    case "submitted":
    default:
      return "신청이 접수되었습니다. 담당자가 내용을 확인한 뒤 상담을 도와드립니다.";
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatReceiptId(id: string | null | undefined) {
  if (!id) return "-";
  return `#${id.slice(-8).toUpperCase()}`;
}

function formatPrice(price: number | null | undefined) {
  if (typeof price === "number" && price > 0) {
    return `${price.toLocaleString("ko-KR")}원`;
  }
  return "상담 후 안내";
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "-";
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-full max-w-md" />
        </CardContent>
      </Card>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={`academy-detail-skeleton-${index}`} className="border-border bg-card">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="grid gap-3 bp-sm:grid-cols-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InfoBox({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm font-medium text-foreground ${
          multiline ? "whitespace-pre-wrap leading-6" : ""
        }`}
      >
        {displayValue(value)}
      </dd>
    </div>
  );
}

function ClassInfoCard({ item }: { item: AcademyCustomerApplicationDetail }) {
  const classSnapshot = item.classSnapshot;

  if (!classSnapshot) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
            선택 클래스 정보
          </CardTitle>
          <CardDescription>
            선택 클래스 없이 접수된 일반 아카데미 신청입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/60 bg-muted/25 p-4 text-sm text-muted-foreground">
            담당자가 상담을 통해 적합한 수업을 안내해드립니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="h-5 w-5 text-primary" />
          선택 클래스 정보
        </CardTitle>
        <CardDescription>신청 당시 선택한 클래스 정보입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
            <div className="min-w-0">
              <p className="break-keep text-lg font-semibold text-foreground">
                {displayValue(classSnapshot.name)}
              </p>
              {classSnapshot.description ? (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {classSnapshot.description}
                </p>
              ) : null}
            </div>
            {classSnapshot.statusLabel ? (
              <Badge variant="neutral" className="w-fit shrink-0">
                {classSnapshot.statusLabel}
              </Badge>
            ) : null}
          </div>
        </div>

        <dl className="grid gap-3 bp-sm:grid-cols-2">
          <InfoBox label="수업 유형" value={classSnapshot.lessonTypeLabel} />
          <InfoBox label="레벨" value={classSnapshot.levelLabel} />
          <InfoBox label="강사" value={classSnapshot.instructorName} />
          <InfoBox label="장소" value={classSnapshot.location || "상담 후 안내"} />
          <InfoBox label="일정" value={classSnapshot.scheduleText || "상담 후 조율"} />
          <InfoBox
            label="정원"
            value={
              typeof classSnapshot.capacity === "number"
                ? `${classSnapshot.capacity}명`
                : "상담 후 안내"
            }
          />
          <div className="rounded-xl border border-border/60 bg-background p-3 bp-sm:col-span-2">
            <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <WalletCards className="h-3.5 w-3.5" /> 기준 수강료
            </dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {formatPrice(classSnapshot.price)}
            </dd>
            <dd className="mt-2 break-keep text-xs leading-5 text-muted-foreground">
              수강료는 상담 내용에 따라 최종 확인될 수 있으며, 등록 확정 후 현장에서 결제를 안내해드립니다.
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function ApplicationInfoCard({ item }: { item: AcademyCustomerApplicationDetail }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserRound className="h-5 w-5 text-primary" />
          신청 정보
        </CardTitle>
        <CardDescription>신청 당시 입력한 상담 희망 정보입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 bp-sm:grid-cols-2">
          <InfoBox label="신청자명" value={item.applicantName} />
          <InfoBox label="연락처" value={item.phone} />
          <InfoBox label="이메일" value={item.email} />
          <InfoBox label="희망 레슨 유형" value={item.desiredLessonTypeLabel} />
          <InfoBox label="현재 실력" value={item.currentLevelLabel} />
          <InfoBox
            label="희망 요일"
            value={item.preferredDays.length ? item.preferredDays.join(", ") : "미입력"}
          />
          <InfoBox label="희망 시간대" value={item.preferredTimeText || "미입력"} />
          <InfoBox label="레슨 목표" value={item.lessonGoal || "미입력"} multiline />
          <div className="bp-sm:col-span-2">
            <InfoBox label="요청사항" value={item.requestMemo || "미입력"} multiline />
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export default function AcademyApplicationDetailClient({ id }: { id: string }) {
  const { data, error, isLoading, mutate } =
    useSWR<AcademyCustomerApplicationDetailResponse>(
      `/api/applications/academy/${id}`,
      authenticatedSWRFetcher,
      { revalidateOnFocus: false },
    );

  const item = data?.item;

  if (isLoading) return <DetailSkeleton />;

  if (error || !item) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/mypage?tab=academy">
            <ArrowLeft className="h-4 w-4" />
            목록으로 돌아가기
          </Link>
        </Button>
        <AsyncState
          kind="error"
          variant="card"
          resourceName="클래스 신청 상세"
          onAction={() => mutate()}
          title="신청 내역을 찾을 수 없습니다."
          description="신청 번호가 올바르지 않거나 조회 권한이 없는 신청입니다."
        />
      </div>
    );
  }

  const statusTone = getStatusTone(item.status);

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-6">
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 hover:bg-transparent">
            <Link href="/mypage?tab=academy">
              <ArrowLeft className="h-4 w-4" />
              클래스 신청 목록
            </Link>
          </Button>
          <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span>신청일 {formatDateTime(item.createdAt)}</span>
                <span>·</span>
                <span>접수번호 {formatReceiptId(item._id)}</span>
              </div>
              <h1 className="break-keep text-2xl font-bold text-foreground bp-sm:text-3xl">
                클래스 신청 상세
              </h1>
              <p className="break-keep text-sm text-muted-foreground">
                도깨비테니스 아카데미 클래스 신청 진행 상황과 상담 안내를 확인할 수 있습니다.
              </p>
            </div>
            <Badge variant={badgeToneVariant(statusTone)} className="w-fit text-sm">
              {item.statusLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            진행 상태 안내
          </CardTitle>
          <CardDescription>현재 상태와 다음 안내를 확인해 주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/60 bg-muted/25 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">현재 상태</span>
              <Badge variant={badgeToneVariant(statusTone)}>{item.statusLabel}</Badge>
            </div>
            <p className="mt-3 break-keep text-sm leading-6 text-foreground">
              {getStatusDescription(item.status)}
            </p>
          </div>
        </CardContent>
      </Card>

      <ClassInfoCard item={item} />
      <ApplicationInfoCard item={item} />

      {item.customerMessage ? (
        <Card className="border-info/30 bg-info/10 shadow-sm dark:bg-info/15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-info">
              <MessageSquareText className="h-5 w-5" />
              관리자 안내
            </CardTitle>
            <CardDescription>도깨비테니스 담당자가 남긴 안내입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap break-words rounded-xl border border-info/20 bg-background p-4 text-sm leading-6 text-foreground">
              {item.customerMessage}
            </p>
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
          아직 등록된 관리자 안내가 없습니다.
        </p>
      )}

      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <WalletCards className="h-5 w-5 text-primary" />
            현장결제 안내
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="break-keep text-sm leading-6 text-foreground">
            아카데미 수강료는 신청 단계에서 결제되지 않습니다. 상담 후 등록이 확정되면 첫 방문 또는 안내된 일정에 맞춰 현장에서 결제해 주세요.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 bp-sm:grid-cols-3">
        <Button asChild variant="outline" className="w-full">
          <Link href="/mypage?tab=academy">목록으로 돌아가기</Link>
        </Button>
        <Button asChild variant="secondary" className="w-full">
          <Link href="/academy">아카데미 홈 보기</Link>
        </Button>
        <Button asChild variant="default" className="w-full">
          <Link href="/board/qna/write?category=academy">
            <PhoneCall className="h-4 w-4" />
            문의하기
          </Link>
        </Button>
      </div>
    </div>
  );
}
