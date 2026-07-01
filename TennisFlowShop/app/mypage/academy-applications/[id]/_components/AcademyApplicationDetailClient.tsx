"use client";

import { ResultState, SummaryCard } from "@/components/public";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { badgeToneVariant, type BadgeSemanticTone } from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  ACADEMY_CURRENT_LEVELS,
  ACADEMY_LESSON_TYPES,
  ACADEMY_PREFERRED_DAY_OPTIONS,
  getAcademyCurrentLevelLabel,
  getAcademyLessonTypeLabel,
  type AcademyCustomerApplicationDetail,
  type AcademyCustomerApplicationDetailResponse,
  type AcademyLessonApplicationStatus,
} from "@/lib/types/academy";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  MessageSquareText,
  PhoneCall,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

const CANCEL_REASON_OPTIONS = [
  { value: "schedule_mismatch", label: "일정이 맞지 않아요" },
  { value: "apply_other_class", label: "다른 클래스를 신청하려고 해요" },
  { value: "wrong_information", label: "신청 정보를 잘못 입력했어요" },
  { value: "personal_reason", label: "개인 사정으로 수강이 어려워요" },
  { value: "other", label: "기타" },
] as const;

const CANCEL_REASON_DETAIL_MAX_LENGTH = 300;
const CUSTOMER_EDITABLE_STATUSES = new Set(["submitted", "reviewing"]);

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
  className = "",
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-xl border border-border bg-background p-3 ${className}`}>
      <dt className="text-ui-label font-medium text-muted-foreground">{label}</dt>
      <dd
        className={`mt-1 min-w-0 break-words text-ui-body-sm font-medium text-foreground ${
          multiline ? "whitespace-pre-wrap leading-relaxed" : "leading-6"
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
      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ui-card-title-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
            클래스 정보
          </CardTitle>
          <CardDescription>선택 클래스 없이 접수된 일반 아카데미 신청입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-ui-body-sm leading-relaxed text-muted-foreground">
            담당자가 상담을 통해 적합한 수업을 안내해드립니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ui-card-title-lg">
          <GraduationCap className="h-5 w-5 text-primary" />
          클래스 정보
        </CardTitle>
        <CardDescription>신청 당시 선택한 클래스 정보입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
            <div className="min-w-0">
              <p className="break-keep text-ui-card-title-lg font-semibold leading-snug text-foreground">
                {displayValue(classSnapshot.name)}
              </p>
              {classSnapshot.description ? (
                <p className="mt-2 whitespace-pre-wrap break-words text-ui-body-sm leading-relaxed text-muted-foreground">
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
          <InfoBox label="일정" value={classSnapshot.scheduleText || "상담 후 조율"} multiline />
          <InfoBox
            label="정원"
            value={
              typeof classSnapshot.capacity === "number"
                ? `${classSnapshot.capacity}명`
                : "상담 후 안내"
            }
          />
          <div className="rounded-xl border border-border bg-background p-3 bp-sm:col-span-2">
            <dt className="flex items-center gap-1 text-ui-label font-medium uppercase tracking-wide text-muted-foreground">
              <WalletCards className="h-3.5 w-3.5" /> 기준 수강료
            </dt>
            <dd className="mt-1 text-ui-body-sm font-semibold tabular-nums text-foreground">
              {formatPrice(classSnapshot.price)}
            </dd>
            <dd className="mt-2 break-keep text-ui-label leading-5 text-muted-foreground">
              수강료는 상담 내용에 따라 최종 확인될 수 있으며, 등록 확정 후 현장에서 결제를
              안내해드립니다.
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function ApplicationInfoCard({ item }: { item: AcademyCustomerApplicationDetail }) {
  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ui-card-title-lg">
          <UserRound className="h-5 w-5 text-primary" />
          신청자 정보
        </CardTitle>
        <CardDescription>신청자와 접수 정보를 확인하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 bp-sm:grid-cols-2">
          <InfoBox label="신청자명" value={item.applicantName} />
          <InfoBox label="연락처" value={item.phone} />
          <InfoBox label="이메일" value={item.email} />
          <InfoBox label="신청 상태" value={item.statusLabel} />
          <InfoBox label="신청일" value={formatDateTime(item.createdAt)} />
          <InfoBox label="희망 레슨 유형" value={item.desiredLessonTypeLabel} />
          <InfoBox label="현재 실력" value={item.currentLevelLabel} />
          <InfoBox
            label="희망 요일"
            value={item.preferredDays.length ? item.preferredDays.join(", ") : "미입력"}
          />
          <InfoBox label="희망 시간대" value={item.preferredTimeText || "미입력"} />
        </dl>
      </CardContent>
    </Card>
  );
}

function RequestInfoCard({ item }: { item: AcademyCustomerApplicationDetail }) {
  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ui-card-title-lg">
          <MessageSquareText className="h-5 w-5 text-primary" />
          레슨 목표 및 요청사항
        </CardTitle>
        <CardDescription>신청 당시 남긴 목표와 요청사항입니다.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <InfoBox
          label="레슨 목표"
          value={item.lessonGoal || "미입력"}
          multiline
          className="bg-muted/20"
        />
        <InfoBox
          label="요청사항"
          value={item.requestMemo || "미입력"}
          multiline
          className="bg-muted/20"
        />
      </CardContent>
    </Card>
  );
}

export default function AcademyApplicationDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    desiredLessonType: "",
    currentLevel: "",
    preferredDays: [] as string[],
    preferredTimeText: "",
    lessonGoal: "",
    requestMemo: "",
  });
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonDetail, setCancelReasonDetail] = useState("");
  const { data, error, isLoading, mutate } = useSWR<AcademyCustomerApplicationDetailResponse>(
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
        <ResultState
          status="error"
          title="신청 내역을 찾을 수 없습니다."
          description="신청 번호가 올바르지 않거나 조회 권한이 없는 신청입니다."
          actions={
            <Button type="button" onClick={() => mutate()}>
              다시 불러오기
            </Button>
          }
        />
      </div>
    );
  }

  const statusTone = getStatusTone(item.status);
  const isCancelled = item.status === "cancelled";
  const canEditApplication = CUSTOMER_EDITABLE_STATUSES.has(item.status);

  const openEditForm = () => {
    setEditForm({
      desiredLessonType: item.desiredLessonType ?? "",
      currentLevel: item.currentLevel ?? "",
      preferredDays: item.preferredDays,
      preferredTimeText: item.preferredTimeText ?? "",
      lessonGoal: item.lessonGoal ?? "",
      requestMemo: item.requestMemo ?? "",
    });
    setIsEditing(true);
  };

  const toggleEditDay = (day: string) => {
    setEditForm((current) => ({
      ...current,
      preferredDays: current.preferredDays.includes(day)
        ? current.preferredDays.filter((item) => item !== day)
        : [...current.preferredDays, day],
    }));
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/applications/academy/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        item?: AcademyCustomerApplicationDetail;
        message?: string;
      } | null;
      if (!response.ok || !payload?.success || !payload.item) {
        throw new Error(payload?.message || "신청 정보 수정 중 문제가 발생했습니다.");
      }
      await mutate({ success: true, item: payload.item }, false);
      setIsEditing(false);
      showSuccessToast("신청 정보가 수정되었습니다.");
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "신청 정보 수정 중 문제가 발생했습니다.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteApplication = async () => {
    setIsDeleting(true);
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
      router.push("/mypage?tab=academy");
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "신청 기록 삭제 중 문제가 발생했습니다.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelApplication = async () => {
    if (!cancelReason) {
      showErrorToast("신청 취소 사유를 선택해 주세요.");
      return;
    }

    if (cancelReasonDetail.trim().length > CANCEL_REASON_DETAIL_MAX_LENGTH) {
      showErrorToast(`상세 사유는 ${CANCEL_REASON_DETAIL_MAX_LENGTH}자 이하로 입력해 주세요.`);
      return;
    }

    const reasonLabel =
      CANCEL_REASON_OPTIONS.find((option) => option.value === cancelReason)?.label ?? "";

    setIsCancelling(true);

    try {
      const response = await fetch(`/api/applications/academy/${id}/cancel`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason,
          reasonLabel,
          reasonDetail: cancelReasonDetail.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        item?: AcademyCustomerApplicationDetail;
        message?: string;
      } | null;

      if (!response.ok || !payload?.success || !payload.item) {
        throw new Error(payload?.message || "신청 취소 중 문제가 발생했습니다.");
      }

      await mutate({ success: true, item: payload.item }, false);
      setIsCancelDialogOpen(false);
      setCancelReason("");
      setCancelReasonDetail("");
      showSuccessToast(
        payload.message === "이미 취소된 신청입니다."
          ? payload.message
          : "아카데미 신청이 취소되었습니다.",
      );
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "신청 취소 중 문제가 발생했습니다.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
      <SummaryCard
        eyebrow="마이페이지"
        title="아카데미 신청 상세"
        description="신청 상태, 수업 정보, 일정과 다음 해야 할 일을 한눈에 확인할 수 있습니다."
        action={
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 hover:bg-transparent">
            <Link href="/mypage?tab=academy">
              <ArrowLeft className="h-4 w-4" />
              클래스 신청 목록
            </Link>
          </Button>
        }
        contentClassName="space-y-4"
      >
        <div className="flex flex-col gap-4 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-ui-body-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>신청일 {formatDateTime(item.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span className="min-w-0 break-all">접수번호 {formatReceiptId(item._id)}</span>
            </div>
            <h1 className="break-keep text-ui-page-title font-semibold leading-tight text-foreground bp-sm:text-ui-page-title-lg">
              {item.classSnapshot?.name || "아카데미 클래스 신청"}
            </h1>
            <p className="break-keep text-ui-body-sm text-muted-foreground">
              신청 진행 상황과 상담 안내를 확인할 수 있습니다.
            </p>
          </div>
          <Badge
            variant={badgeToneVariant(statusTone)}
            wrap="normal"
            className="w-fit shrink-0 text-ui-body-sm"
          >
            {item.statusLabel}
          </Badge>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-ui-body-sm font-medium text-muted-foreground">현재 상태</span>
            <Badge variant={badgeToneVariant(statusTone)}>{item.statusLabel}</Badge>
          </div>
          <p className="mt-3 break-keep text-ui-body-sm leading-relaxed text-foreground">
            {getStatusDescription(item.status)}
          </p>
        </div>
      </SummaryCard>

      <ClassInfoCard item={item} />
      <ApplicationInfoCard item={item} />
      <RequestInfoCard item={item} />

      {item.customerMessage ? (
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ui-card-title-lg">
              <MessageSquareText className="h-5 w-5 text-primary" />
              관리자 안내
            </CardTitle>
            <CardDescription>도깨비테니스 담당자가 남긴 안내입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/20 p-4 text-ui-body-sm leading-relaxed text-foreground">
              {item.customerMessage}
            </p>
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-xl border border-border bg-card p-4 text-ui-body-sm text-muted-foreground shadow-sm">
          아직 등록된 관리자 안내가 없습니다.
        </p>
      )}

      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ui-card-title-lg">
            <WalletCards className="h-5 w-5 text-primary" />
            현장결제 안내
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-xl border border-border bg-muted/20 p-4 break-keep text-ui-body-sm leading-relaxed text-foreground">
            아카데미 수강료는 신청 단계에서 결제되지 않습니다. 상담 후 등록이 확정되면 첫 방문 또는
            안내된 일정에 맞춰 현장에서 결제해 주세요.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-ui-card-title-lg">신청 관리</CardTitle>
          <CardDescription>
            {isCancelled
              ? "취소된 신청입니다."
              : canEditApplication
                ? "신청 내용을 수정하거나, 필요한 경우 신청 취소를 진행할 수 있습니다."
                : "상담이 진행된 신청은 직접 수정할 수 없습니다. 변경이 필요하면 문의해 주세요."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCancelled && canEditApplication ? (
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              {!isEditing ? (
                <Button type="button" variant="outline" onClick={openEditForm}>
                  신청 정보 수정
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 bp-sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-ui-body-sm font-medium">희망 레슨 유형</label>
                      <Select value={editForm.desiredLessonType} onValueChange={(value) => setEditForm((current) => ({ ...current, desiredLessonType: value }))} disabled={isSavingEdit}>
                        <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                        <SelectContent>{ACADEMY_LESSON_TYPES.map((value) => <SelectItem key={value} value={value}>{getAcademyLessonTypeLabel(value)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-ui-body-sm font-medium">현재 실력</label>
                      <Select value={editForm.currentLevel} onValueChange={(value) => setEditForm((current) => ({ ...current, currentLevel: value }))} disabled={isSavingEdit}>
                        <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                        <SelectContent>{ACADEMY_CURRENT_LEVELS.map((value) => <SelectItem key={value} value={value}>{getAcademyCurrentLevelLabel(value)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-ui-body-sm font-medium">희망 요일</label>
                    <div className="flex flex-wrap gap-2">{ACADEMY_PREFERRED_DAY_OPTIONS.map((day) => <label key={day} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-ui-body-sm"><input type="checkbox" checked={editForm.preferredDays.includes(day)} onChange={() => toggleEditDay(day)} disabled={isSavingEdit} />{day}</label>)}</div>
                  </div>
                  <Input value={editForm.preferredTimeText} maxLength={100} onChange={(event) => setEditForm((current) => ({ ...current, preferredTimeText: event.target.value }))} placeholder="희망 시간대" disabled={isSavingEdit} />
                  <Textarea value={editForm.lessonGoal} maxLength={500} onChange={(event) => setEditForm((current) => ({ ...current, lessonGoal: event.target.value }))} placeholder="레슨 목표" disabled={isSavingEdit} />
                  <Textarea value={editForm.requestMemo} maxLength={1000} onChange={(event) => setEditForm((current) => ({ ...current, requestMemo: event.target.value }))} placeholder="요청사항" disabled={isSavingEdit} />
                  <div className="flex flex-col gap-2 bp-sm:flex-row">
                    <Button type="button" onClick={handleSaveEdit} disabled={isSavingEdit || editForm.preferredDays.length === 0}>{isSavingEdit ? "저장 중..." : "저장"}</Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSavingEdit}>취소</Button>
                  </div>
                </div>
              )}
            </div>
          ) : !isCancelled ? (
            <p className="rounded-xl border border-border bg-muted/20 p-4 text-ui-body-sm text-muted-foreground">
              상담이 진행된 신청은 마이페이지에서 직접 수정할 수 없습니다. 변경이 필요하면 문의해 주세요.
            </p>
          ) : null}
          {isCancelled ? (
            <div className="space-y-3">
              <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-ui-body-sm text-destructive">
                <p className="font-medium">
                  이미 취소된 신청입니다. 다시 수강을 원하시면 아카데미 페이지에서 새로 신청해
                  주세요.
                </p>
                {item.cancelReasonLabel ? (
                  <p className="text-ui-label leading-5 text-destructive/85">
                    취소 사유: {item.cancelReasonLabel}
                    {item.cancelReasonDetail ? ` - ${item.cancelReasonDetail}` : ""}
                  </p>
                ) : null}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    wrap="responsive"
                    className="w-full bp-sm:w-auto"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "삭제 중..." : "기록 삭제"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>취소 신청 기록을 삭제할까요?</AlertDialogTitle>
                    <AlertDialogDescription>
                      삭제하면 마이페이지에서 이 신청 기록이 보이지 않습니다. 운영 기록은
                      보존됩니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                      onClick={(event) => {
                        event.preventDefault();
                        void handleDeleteApplication();
                      }}
                    >
                      {isDeleting ? "삭제 중..." : "기록 삭제"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <AlertDialog
              open={isCancelDialogOpen}
              onOpenChange={(open) => {
                if (isCancelling) return;
                setIsCancelDialogOpen(open);
                if (!open) {
                  setCancelReason("");
                  setCancelReasonDetail("");
                }
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  wrap="responsive"
                  className="w-full bp-sm:w-auto"
                >
                  신청 취소
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>아카데미 신청을 취소할까요?</AlertDialogTitle>
                  <AlertDialogDescription>
                    취소 후에는 이 신청이 취소 상태로 표시됩니다. 다시 수강을 원하시면 아카데미
                    페이지에서 새로 신청해 주세요.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-1">
                  <div className="space-y-2">
                    <label className="text-ui-body-sm font-medium" htmlFor="academy-cancel-reason">
                      취소 사유 <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={cancelReason}
                      onValueChange={setCancelReason}
                      disabled={isCancelling}
                    >
                      <SelectTrigger id="academy-cancel-reason">
                        <SelectValue placeholder="취소 사유를 선택해 주세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {CANCEL_REASON_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {cancelReason === "other" ? (
                    <div className="space-y-2">
                      <label
                        className="text-ui-body-sm font-medium"
                        htmlFor="academy-cancel-detail"
                      >
                        상세 사유 <span className="text-muted-foreground">(선택)</span>
                      </label>
                      <Textarea
                        id="academy-cancel-detail"
                        value={cancelReasonDetail}
                        onChange={(event) => setCancelReasonDetail(event.target.value)}
                        maxLength={CANCEL_REASON_DETAIL_MAX_LENGTH}
                        rows={3}
                        placeholder="운영자에게 전달할 내용을 간단히 입력해 주세요."
                        disabled={isCancelling}
                      />
                      <p className="text-right text-ui-label text-muted-foreground">
                        {cancelReasonDetail.length}/{CANCEL_REASON_DETAIL_MAX_LENGTH}
                      </p>
                    </div>
                  ) : null}
                  <p className="break-keep rounded-xl border border-border/60 bg-muted/30 p-3 text-ui-label leading-5 text-muted-foreground">
                    취소 사유는 운영자가 신청 내역을 확인하고 안내를 개선하는 데 사용됩니다.
                  </p>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isCancelling}>취소하지 않기</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isCancelling || !cancelReason}
                    onClick={(event) => {
                      event.preventDefault();
                      void handleCancelApplication();
                    }}
                  >
                    {isCancelling ? "취소 중..." : "신청 취소하기"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:flex-wrap bp-sm:justify-end">
        <Button asChild variant="outline" wrap="responsive" className="w-full bp-sm:w-auto">
          <Link href="/mypage?tab=academy">목록으로 돌아가기</Link>
        </Button>
        <Button asChild variant="secondary" wrap="responsive" className="w-full bp-sm:w-auto">
          <Link href="/academy">아카데미 홈 보기</Link>
        </Button>
        <Button asChild variant="default" wrap="responsive" className="w-full bp-sm:w-auto">
          <Link href="/board/qna/write?category=academy">
            <PhoneCall className="h-4 w-4" />
            문의하기
          </Link>
        </Button>
      </div>
    </div>
  );
}
