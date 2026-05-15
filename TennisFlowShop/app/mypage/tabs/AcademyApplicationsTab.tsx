"use client";

import AsyncState from "@/components/system/AsyncState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  CalendarDays,
  GraduationCap,
  MapPin,
  MessageSquareText,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";

type AcademyClassSnapshotForApplication = {
  classId: string;
  name: string;
  lessonTypeLabel?: string | null;
  levelLabel?: string | null;
  location?: string | null;
  scheduleText?: string | null;
  price?: number | null;
};

type AcademyApplication = {
  id: string;
  kind: "academy_lesson";
  type: "아카데미 레슨 신청" | "아카데미 수강 신청";
  title?: string;
  applicantName: string | null;
  phone: string | null;
  appliedAt: string;
  status: string;
  statusLabel?: string;
  desiredLessonType?: string | null;
  desiredLessonTypeLabel?: string | null;
  currentLevel?: string | null;
  currentLevelLabel?: string | null;
  preferredDays?: string[];
  preferredTimeText?: string | null;
  lessonGoal?: string | null;
  requestMemo?: string | null;
  customerMessage?: string | null;
  classSnapshot?: AcademyClassSnapshotForApplication | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AcademyApplicationsResponse = {
  items: AcademyApplication[];
  total: number;
};

const LIMIT = 5;

const fetcher = (url: string) =>
  authenticatedSWRFetcher<AcademyApplicationsResponse>(url);

function AcademyApplicationsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={`academy-applications-loading-${index}`}
          className="border-border bg-card shadow-sm"
        >
          <CardContent className="space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-56" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(price?: number | null) {
  if (typeof price === "number" && price > 0) {
    return `${price.toLocaleString("ko-KR")}원`;
  }
  return "상담 후 안내";
}

function getStatusVariant(status: string) {
  switch (status) {
    case "confirmed":
    case "등록 확정":
      return "success" as const;
    case "reviewing":
    case "검토 중":
      return "warning" as const;
    case "contacted":
    case "상담 완료":
      return "info" as const;
    case "cancelled":
    case "취소":
      return "danger" as const;
    case "submitted":
    case "접수완료":
    default:
      return "neutral" as const;
  }
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value?.trim() || "-"}
      </p>
    </div>
  );
}

export default function AcademyApplicationsTab() {
  const getKey = (
    pageIndex: number,
    previousPageData: AcademyApplicationsResponse | null,
  ) => {
    if (previousPageData && previousPageData.items.length < LIMIT) return null;

    const params = new URLSearchParams();
    params.set("kind", "academy_lesson");
    params.set("page", String(pageIndex + 1));
    params.set("limit", String(LIMIT));
    return `/api/applications/me?${params.toString()}`;
  };

  const { data, error, isValidating, size, setSize, mutate } = useSWRInfinite(
    getKey,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const applications = useMemo(
    () => (data ? data.flatMap((page) => page.items) : []),
    [data],
  );
  const total = data?.[0]?.total ?? 0;
  const isInitialLoading = !data && isValidating;
  const isLoadingMore = Boolean(data) && isValidating;
  const hasMore = data ? applications.length < total : false;

  if (error) {
    return (
      <AsyncState
        kind="error"
        variant="card"
        resourceName="클래스 신청"
        onAction={() => mutate()}
      />
    );
  }

  if (isInitialLoading) {
    return <AcademyApplicationsListSkeleton />;
  }

  if (applications.length === 0) {
    return (
      <Card className="relative overflow-hidden border-border bg-card shadow-sm">
        <CardContent className="p-8 text-center md:p-12">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/30 md:mb-6">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">
            아직 신청한 아카데미 클래스가 없습니다.
          </h3>
          <p className="mb-6 text-muted-foreground">
            아카데미 페이지에서 원하는 클래스를 확인하고 상담 신청을 남겨보세요.
            등록이 확정되면 현장에서 결제를 안내해드립니다.
          </p>
          <Button asChild variant="default" className="shadow-sm">
            <Link href="/academy">아카데미 보러가기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {applications.map((application) => {
        const isCancelled = application.status === "cancelled";

        return (
          <Card
            key={application.id}
            className="overflow-hidden border-border bg-card shadow-sm"
          >
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="flex flex-col gap-3 border-b border-border/60 pb-4 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span>클래스 신청</span>
                    <span>·</span>
                    <span>신청일 {formatDateTime(application.appliedAt)}</span>
                  </div>
                  <h3 className="break-keep text-lg font-semibold text-foreground">
                    {application.classSnapshot?.name || "아카데미 클래스 신청"}
                  </h3>
                </div>
                <Badge variant={getStatusVariant(application.status)}>
                  {application.statusLabel || application.status}
                </Badge>
              </div>

              {application.classSnapshot ? (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    선택 클래스
                  </div>
                  <p className="mt-2 break-keep font-semibold text-foreground">
                    {application.classSnapshot.name || "클래스명 미입력"}
                  </p>
                  <dl className="mt-3 grid gap-2 text-sm text-muted-foreground bp-sm:grid-cols-2">
                    <div className="rounded-lg bg-background p-3">
                      <dt className="text-xs uppercase tracking-wide">
                        수업 유형
                      </dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {application.classSnapshot.lessonTypeLabel || "미선택"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <dt className="text-xs uppercase tracking-wide">레벨</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {application.classSnapshot.levelLabel || "미선택"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <dt className="flex items-center gap-1 text-xs uppercase tracking-wide">
                        <CalendarDays className="h-3.5 w-3.5" /> 일정
                      </dt>
                      <dd className="mt-0.5 break-keep font-medium text-foreground">
                        {application.classSnapshot.scheduleText ||
                          "상담 후 조율"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <dt className="flex items-center gap-1 text-xs uppercase tracking-wide">
                        <MapPin className="h-3.5 w-3.5" /> 장소
                      </dt>
                      <dd className="mt-0.5 break-keep font-medium text-foreground">
                        {application.classSnapshot.location || "상담 후 안내"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-background p-3 bp-sm:col-span-2">
                      <dt className="flex items-center gap-1 text-xs uppercase tracking-wide">
                        <WalletCards className="h-3.5 w-3.5" /> 기준 수강료
                      </dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {formatPrice(application.classSnapshot.price)}
                      </dd>
                      {!isCancelled ? (
                        <dd className="mt-1 break-keep text-xs text-muted-foreground">
                          수강료는 상담 내용에 따라 최종 확인될 수 있습니다.
                          등록 확정 후 현장에서 결제를 안내해드립니다.
                        </dd>
                      ) : null}
                    </div>
                  </dl>
                </div>
              ) : null}

              <div className="grid gap-3 bp-sm:grid-cols-2">
                <InfoItem
                  label="희망 레슨 유형"
                  value={application.desiredLessonTypeLabel}
                />
                <InfoItem
                  label="현재 실력"
                  value={application.currentLevelLabel}
                />
                <InfoItem
                  label="희망 요일"
                  value={
                    application.preferredDays?.length
                      ? application.preferredDays.join(", ")
                      : null
                  }
                />
                <InfoItem
                  label="희망 시간대"
                  value={application.preferredTimeText}
                />
              </div>

              {isCancelled ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  취소된 신청입니다. 상세 페이지에서 상태를 확인할 수 있습니다.
                </div>
              ) : null}

              {application.customerMessage ? (
                <div className="rounded-xl border border-info/30 bg-info/10 p-3 text-info dark:bg-info/15">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquareText className="h-4 w-4" />
                    관리자 안내
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {application.customerMessage}
                  </p>
                </div>
              ) : null}

              <div className="flex justify-end border-t border-border/60 pt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/mypage/academy-applications/${application.id}`}>
                    상세 보기
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSize(size + 1)}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "불러오는 중..." : "더 보기"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
