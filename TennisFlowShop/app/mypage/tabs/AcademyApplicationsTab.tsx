"use client";

import AsyncState from "@/components/system/AsyncState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import AcademyApplicationsListSkeleton from "@/app/mypage/tabs/_components/AcademyApplicationsListSkeleton";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  GraduationCap,
  MapPin,
  MessageSquareText,
  Trash2,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

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

const fetcher = (url: string) => authenticatedSWRFetcher<AcademyApplicationsResponse>(url);

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
    <div className="rounded-control border border-border/70 bg-card p-3">
      <p className="text-ui-label font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-ui-body-sm font-semibold text-foreground">
        {value?.trim() || "-"}
      </p>
    </div>
  );
}

export default function AcademyApplicationsTab() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const getKey = (pageIndex: number, previousPageData: AcademyApplicationsResponse | null) => {
    if (previousPageData && previousPageData.items.length < LIMIT) return null;

    const params = new URLSearchParams();
    params.set("kind", "academy_lesson");
    params.set("page", String(pageIndex + 1));
    params.set("limit", String(LIMIT));
    return `/api/applications/me?${params.toString()}`;
  };

  const { data, error, isValidating, size, setSize, mutate } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
  });

  const applications = useMemo(() => (data ? data.flatMap((page) => page.items) : []), [data]);
  const total = data?.[0]?.total ?? 0;
  const isInitialLoading = !data && isValidating;
  const isLoadingMore = Boolean(data) && isValidating;
  const hasMore = data ? applications.length < total : false;

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "취소 신청 기록을 삭제할까요?\n\n삭제하면 마이페이지에서 이 신청 기록이 보이지 않습니다. 운영 기록은 보존됩니다.",
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/applications/academy/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "신청 기록 삭제 중 문제가 발생했습니다.");
      }
      showSuccessToast(payload.message || "신청 기록이 삭제되었습니다.");
      await mutate();
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "신청 기록 삭제 중 문제가 발생했습니다.",
      );
    } finally {
      setDeletingId(null);
    }
  };

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
      <Card
        variant="feature"
        className="relative overflow-hidden border-brand-highlight/25 shadow-soft"
      >
        <CardContent className="p-8 text-center md:p-12">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-highlight-muted text-brand-highlight-ink md:mb-6">
            <GraduationCap className="h-10 w-10" aria-hidden="true" />
          </div>
          <h3 className="mb-2 font-ui-bold text-ui-section-title font-semibold text-foreground">
            아직 신청한 클래스가 없습니다.
          </h3>
          <p className="mx-auto mb-6 max-w-md break-keep text-muted-foreground">
            원하는 클래스를 둘러보고 상담 신청을 남겨보세요. 신청 내역은 이곳에서 확인할 수
            있습니다.
          </p>
          <Button asChild variant="highlight" wrap="responsive">
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
        const isExpanded = expandedIds.has(application.id);
        const expandedPanelId = `academy-application-expanded-${application.id}`;

        return (
          <Card
            key={application.id}
            variant="feature"
            className="overflow-hidden border-brand-highlight/25 shadow-soft transition-[box-shadow,border-color] duration-200 hover:border-brand-highlight/45 hover:shadow-md"
          >
            <CardContent className="p-0">
              <div className="border-b border-brand-highlight/20 bg-brand-highlight-muted p-4 bp-sm:p-5">
                <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-card text-brand-highlight-ink shadow-sm">
                      <GraduationCap className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-ui-body-sm font-medium text-muted-foreground">
                        <span className="text-brand-highlight-ink">클래스 신청</span>
                        <span>·</span>
                        <span>신청일 {formatDateTime(application.appliedAt)}</span>
                      </div>
                      <h3 className="line-clamp-2 break-keep font-ui-bold text-ui-card-title-lg font-semibold text-foreground">
                        {application.classSnapshot?.name || "아카데미 클래스 신청"}
                      </h3>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(application.status)}>
                    {application.statusLabel || application.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 p-4 bp-sm:p-5">
                <div className="grid gap-3 bp-sm:grid-cols-2">
                  <InfoItem
                    label="수업 유형"
                    value={
                      application.classSnapshot?.lessonTypeLabel ||
                      application.desiredLessonTypeLabel
                    }
                  />
                  <InfoItem
                    label="레벨"
                    value={application.classSnapshot?.levelLabel || application.currentLevelLabel}
                  />
                  <InfoItem
                    label="일정"
                    value={
                      application.classSnapshot?.scheduleText ||
                      application.preferredDays?.join(", ") ||
                      application.preferredTimeText
                    }
                  />
                  <InfoItem label="희망 시간대" value={application.preferredTimeText} />
                </div>

                {isCancelled ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-ui-body-sm font-medium text-destructive">
                    취소된 신청입니다. 필요하면 마이페이지에서 기록을 삭제할 수 있습니다.
                  </div>
                ) : null}

                {isExpanded && application.classSnapshot ? (
                  <div
                    id={expandedPanelId}
                    className="rounded-control border border-border/70 bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-2 text-ui-body-sm font-semibold text-foreground">
                      <GraduationCap
                        className="h-4 w-4 text-brand-highlight-ink"
                        aria-hidden="true"
                      />
                      선택 클래스 상세
                    </div>
                    <p className="mt-2 break-keep font-semibold text-foreground">
                      {application.classSnapshot.name || "클래스명 미입력"}
                    </p>
                    <dl className="mt-3 grid gap-2 text-ui-body-sm text-muted-foreground bp-sm:grid-cols-2">
                      <div className="rounded-lg bg-background p-3">
                        <dt className="flex items-center gap-1 text-ui-label uppercase tracking-wide">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> 장소
                        </dt>
                        <dd className="mt-0.5 break-keep font-medium text-foreground">
                          {application.classSnapshot.location || "상담 후 안내"}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-background p-3 bp-sm:col-span-2">
                        <dt className="flex items-center gap-1 text-ui-label uppercase tracking-wide">
                          <WalletCards className="h-3.5 w-3.5" aria-hidden="true" /> 기준 수강료
                        </dt>
                        <dd className="mt-0.5 font-medium text-foreground">
                          {formatPrice(application.classSnapshot.price)}
                        </dd>
                        {!isCancelled ? (
                          <dd className="mt-1 break-keep text-ui-label text-muted-foreground">
                            수강료는 상담 내용에 따라 최종 확인될 수 있습니다. 등록 확정 후 현장에서
                            결제를 안내해드립니다.
                          </dd>
                        ) : null}
                      </div>
                    </dl>
                  </div>
                ) : null}

                {isExpanded ? (
                  <div
                    id={!application.classSnapshot ? expandedPanelId : undefined}
                    className="grid gap-3 bp-sm:grid-cols-2"
                  >
                    <InfoItem label="희망 레슨 유형" value={application.desiredLessonTypeLabel} />
                    <InfoItem
                      label="희망 요일"
                      value={
                        application.preferredDays?.length
                          ? application.preferredDays.join(", ")
                          : null
                      }
                    />
                    <InfoItem label="희망 시간" value={application.preferredTimeText} />
                  </div>
                ) : null}

                {isExpanded && application.customerMessage ? (
                  <div className="rounded-xl border border-info/30 bg-info/10 p-3 text-info dark:bg-info/15">
                    <div className="flex items-center gap-2 text-ui-body-sm font-semibold">
                      <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                      관리자 안내
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-ui-body-sm">
                      {application.customerMessage}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
                  <Button
                    asChild
                    variant="highlight"
                    size="sm"
                    wrap="responsive"
                    className="w-full sm:w-auto"
                  >
                    <Link href={`/mypage/academy-applications/${application.id}`}>
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      상세 보기
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="highlight_soft"
                    size="sm"
                    wrap="responsive"
                    className="w-full sm:w-auto"
                    aria-expanded={isExpanded}
                    aria-controls={expandedPanelId}
                    onClick={() => toggleExpanded(application.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    )}
                    {isExpanded ? "접기" : "펼쳐보기"}
                  </Button>
                  {isCancelled ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      wrap="responsive"
                      className="w-full sm:w-auto"
                      disabled={deletingId === application.id}
                      onClick={() => void handleDelete(application.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === application.id ? "삭제 중..." : "기록 삭제"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="highlight_soft"
            wrap="responsive"
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
