"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type KeyboardEvent } from "react";
import useSWR from "swr";
import { ArrowLeft, BookOpen, Eye, Pencil } from "lucide-react";

import { adminDataTable } from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageSection from "@/components/admin/AdminPageSection";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminFetcher } from "@/lib/admin/adminFetcher";
import { badgeToneVariant, type BadgeSemanticTone } from "@/lib/badge-style";
import {
  getAcademyApplicationStatusLabel,
  getAcademyClassLessonTypeLabel,
  getAcademyClassLevelLabel,
  getAcademyClassStatusLabel,
  getAcademyCurrentLevelLabel,
  getAcademyLessonTypeLabel,
  type AcademyClassDetailResponse,
  type AcademyClassStatus,
  type AcademyLessonApplicationStatus,
} from "@/lib/types/academy";
import { cn } from "@/lib/utils";

function getClassStatusTone(status: AcademyClassStatus): BadgeSemanticTone {
  if (status === "draft") return "warning";
  if (status === "visible") return "success";
  if (status === "hidden") return "neutral";
  if (status === "closed") return "danger";
  return "neutral";
}

function getApplicationStatusTone(status: AcademyLessonApplicationStatus): BadgeSemanticTone {
  if (status === "submitted") return "warning";
  if (status === "reviewing") return "info";
  if (status === "contacted") return "brand";
  if (status === "confirmed") return "success";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function AcademyClassStatusBadge({ status }: { status: AcademyClassStatus }) {
  return (
    <Badge variant={badgeToneVariant(getClassStatusTone(status))}>
      {getAcademyClassStatusLabel(status)}
    </Badge>
  );
}

function AcademyApplicationStatusBadge({ status }: { status: AcademyLessonApplicationStatus }) {
  return (
    <Badge variant={badgeToneVariant(getApplicationStatusTone(status))}>
      {getAcademyApplicationStatusLabel(status)}
    </Badge>
  );
}

function formatAdminDateTimeParts(value: string | null | undefined) {
  if (!value) return { date: "-", time: "-" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "-", time: "-" };

  const dateParts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const time = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);

  const year = dateParts.find((part) => part.type === "year")?.value ?? "--";
  const month = dateParts.find((part) => part.type === "month")?.value ?? "--";
  const day = dateParts.find((part) => part.type === "day")?.value ?? "--";

  return { date: `${year}.${month}.${day}`, time };
}

function formatAdminDateTime(value: string | null | undefined) {
  const parts = formatAdminDateTimeParts(value);
  if (parts.date === "-" && parts.time === "-") return "-";
  return `${parts.date} ${parts.time}`;
}

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return `${value.toLocaleString("ko-KR")}원`;
}

function formatCapacity(value: number | null | undefined) {
  if (typeof value !== "number") return "정원 미정";
  return `정원 ${value.toLocaleString("ko-KR")}명`;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="grid min-w-0 gap-1 border-b border-border/60 py-3 last:border-b-0 sm:grid-cols-[120px_1fr]">
      <div className={adminTypography.metaMuted}>{label}</div>
      <div className={cn("min-w-0 whitespace-pre-wrap break-words", adminTypography.bodyStrong)}>
        {value === null || value === undefined || value === "" ? "-" : value}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={cn(adminSurface.kpiCard, "p-4")}>
      <div className={adminTypography.caption}>{label}</div>
      <div className={cn("mt-2", adminTypography.kpiValueCompact)}>
        {value.toLocaleString("ko-KR")}
      </div>
    </div>
  );
}

export default function AcademyClassDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { data, error, isLoading } = useSWR<AcademyClassDetailResponse>(
    `/api/admin/academy/classes/${id}`,
    adminFetcher,
  );

  const item = data?.item;
  const stats = data?.applicationStats ?? {
    total: 0,
    submitted: 0,
    reviewing: 0,
    contacted: 0,
    confirmed: 0,
    cancelled: 0,
  };
  const applications = data?.applications ?? [];

  function goToApplicationDetail(applicationId: string) {
    router.push(`/admin/academy/applications/${applicationId}`);
  }

  function handleApplicationRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    applicationId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    goToApplicationDetail(applicationId);
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className={`${adminSurface.cardMuted} p-8 ${adminTypography.metaMuted}`}>
          클래스 상세 정보를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/academy/classes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Link>
        </Button>
        <div
          className={`${adminSurface.cardMuted} border-destructive/30 bg-destructive/10 p-8 ${adminTypography.body} text-destructive`}
        >
          클래스 상세 정보를 불러오지 못했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="클래스 상세"
        description="클래스 기본 정보와 클래스별 신청자 현황을 확인합니다."
        icon={BookOpen}
        scope="도깨비테니스 아카데미"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AcademyClassStatusBadge status={item.status} />
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/academy/classes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                뒤로가기
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/admin/academy/classes/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                수정
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="전체 신청" value={stats.total} />
        <StatCard label="접수완료" value={stats.submitted} />
        <StatCard label="검토 중" value={stats.reviewing} />
        <StatCard label="상담 완료" value={stats.contacted} />
        <StatCard label="등록 확정" value={stats.confirmed} />
        <StatCard label="취소" value={stats.cancelled} />
      </div>

      <AdminPageSection
        title="등록 현황"
        description="신청 상태 기준으로 집계하며 클래스 저장값은 변경하지 않습니다. 취소되지 않은 신청 내역이 1건 이상 있으면 영구 삭제는 차단되며, 취소 내역만 남은 클래스는 영구 삭제할 수 있습니다."
        contentClassName="pt-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className={adminTypography.metaMuted}>등록 확정</div>
            <div className={cn("mt-2", adminTypography.kpiValueCompact)}>
              등록 확정 {stats.confirmed.toLocaleString("ko-KR")}명 /{" "}
              {formatCapacity(item.capacity)}
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className={adminTypography.metaMuted}>전체 신청</div>
            <div className={cn("mt-2", adminTypography.kpiValueCompact)}>
              전체 신청 {stats.total.toLocaleString("ko-KR")}건
            </div>
          </div>
        </div>
      </AdminPageSection>

      <AdminPageSection
        title="클래스 기본 정보"
        description="고객에게 노출되는 클래스 운영 정보를 확인합니다."
        className="min-w-0"
        contentClassName="pt-4"
      >
        <InfoRow label="클래스명" value={item.name} />
        <InfoRow label="설명" value={item.description} />
        <InfoRow
          label="수업 유형"
          value={item.lessonTypeLabel ?? getAcademyClassLessonTypeLabel(item.lessonType)}
        />
        <InfoRow label="레벨" value={item.levelLabel ?? getAcademyClassLevelLabel(item.level)} />
        <InfoRow label="강사" value={item.instructorName} />
        <InfoRow label="장소" value={item.location} />
        <InfoRow label="일정" value={item.scheduleText} />
        <InfoRow label="기준 수강료" value={formatPrice(item.price)} />
        <InfoRow label="정원" value={formatCapacity(item.capacity)} />
        <InfoRow label="상태" value={item.statusLabel ?? getAcademyClassStatusLabel(item.status)} />
        <InfoRow label="생성일" value={formatAdminDateTime(item.createdAt)} />
        <InfoRow label="수정일" value={formatAdminDateTime(item.updatedAt)} />
      </AdminPageSection>

      <AdminPageSection
        title="신청자 목록"
        description="이 클래스와 연결된 최근 신청 50건을 최신순으로 표시합니다."
        className="min-w-0"
        contentClassName="pt-4"
      >
        <div className={adminSurface.tableCard}>
          <Table>
            <TableHeader className={adminSurface.tableHeader}>
              <TableRow>
                <TableHead className={adminDataTable.headRight}>신청일</TableHead>
                <TableHead className={adminDataTable.head}>신청자</TableHead>
                <TableHead className={adminDataTable.head}>희망 정보</TableHead>
                <TableHead className={adminDataTable.headCenter}>선호 일정</TableHead>
                <TableHead className={adminDataTable.headCenter}>상태</TableHead>
                <TableHead className={adminDataTable.actionHead}>상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className={cn("h-32 text-center", adminTypography.metaMuted)}
                  >
                    <div className={adminTypography.bodyStrong}>
                      아직 이 클래스에 접수된 신청이 없습니다.
                    </div>
                    <div className={cn("mt-1", adminTypography.caption)}>
                      고객이 아카데미 페이지에서 이 클래스를 선택해 신청하면 이곳에 표시됩니다.
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
              {applications.map((application) => {
                const createdAt = formatAdminDateTimeParts(application.createdAt);

                return (
                  <TableRow
                    key={application._id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => goToApplicationDetail(application._id)}
                    onKeyDown={(event) => handleApplicationRowKeyDown(event, application._id)}
                  >
                    <TableCell className={adminDataTable.dateCell}>
                      <div className={adminTypography.bodyStrong}>{createdAt.date}</div>
                      <div className={adminTypography.caption}>{createdAt.time}</div>
                    </TableCell>
                    <TableCell className={adminDataTable.cellTopLeft}>
                      <div className={adminTypography.bodyStrong}>
                        {application.applicantName || "-"}
                      </div>
                      <div className={adminTypography.caption}>
                        {application.email || "이메일 미입력"}
                      </div>
                      <div className={adminTypography.caption}>
                        {application.phone || "연락처 미입력"}
                      </div>
                    </TableCell>
                    <TableCell className={cn(adminDataTable.cellTopLeft, adminTypography.body)}>
                      <div>
                        {application.desiredLessonTypeLabel ||
                          getAcademyLessonTypeLabel(application.desiredLessonType)}
                      </div>
                      <div className={adminTypography.caption}>
                        {application.currentLevelLabel ||
                          getAcademyCurrentLevelLabel(application.currentLevel)}
                      </div>
                    </TableCell>
                    <TableCell className={cn(adminDataTable.cellCenter, adminTypography.body)}>
                      <div className="max-w-[180px] truncate">
                        {application.preferredDays.length
                          ? application.preferredDays.join(", ")
                          : "-"}
                      </div>
                      <div className={cn("max-w-[180px] truncate", adminTypography.caption)}>
                        {application.preferredTimeText || "희망 시간 미입력"}
                      </div>
                    </TableCell>
                    <TableCell className={adminDataTable.cellCenter}>
                      <AcademyApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell
                      className={adminDataTable.actionCell}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/academy/applications/${application._id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          상세
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </AdminPageSection>
    </div>
  );
}
