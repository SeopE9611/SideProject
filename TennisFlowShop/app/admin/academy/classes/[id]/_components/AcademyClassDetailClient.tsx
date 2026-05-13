"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, BookOpen, Eye, Pencil } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminSurface } from "@/components/admin/admin-typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function getApplicationStatusTone(
  status: AcademyLessonApplicationStatus,
): BadgeSemanticTone {
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

function AcademyApplicationStatusBadge({
  status,
}: {
  status: AcademyLessonApplicationStatus;
}) {
  return (
    <Badge variant={badgeToneVariant(getApplicationStatusTone(status))}>
      {getAcademyApplicationStatusLabel(status)}
    </Badge>
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return `${value.toLocaleString("ko-KR")}원`;
}

function formatCapacity(value: number | null | undefined) {
  if (typeof value !== "number") return "정원 미정";
  return `정원 ${value.toLocaleString("ko-KR")}명`;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-b-0 sm:grid-cols-[140px_1fr]">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap text-sm text-foreground">
        {value === null || value === undefined || value === "" ? "-" : value}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={cn(adminSurface.kpiCard, "p-4")}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">
        {value.toLocaleString("ko-KR")}
      </div>
    </div>
  );
}

export default function AcademyClassDetailClient({ id }: { id: string }) {
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

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-sm text-muted-foreground">
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
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
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

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className={adminSurface.card}>
            <CardHeader>
              <CardTitle className="text-base">클래스 기본 정보</CardTitle>
              <CardDescription>
                고객에게 노출되는 클래스 운영 정보를 확인합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InfoRow label="클래스명" value={item.name} />
              <InfoRow label="설명" value={item.description} />
              <InfoRow
                label="수업 유형"
                value={item.lessonTypeLabel ?? getAcademyClassLessonTypeLabel(item.lessonType)}
              />
              <InfoRow
                label="레벨"
                value={item.levelLabel ?? getAcademyClassLevelLabel(item.level)}
              />
              <InfoRow label="강사" value={item.instructorName} />
              <InfoRow label="장소" value={item.location} />
              <InfoRow label="일정" value={item.scheduleText} />
              <InfoRow label="가격" value={formatPrice(item.price)} />
              <InfoRow label="정원" value={formatCapacity(item.capacity)} />
              <InfoRow
                label="상태"
                value={item.statusLabel ?? getAcademyClassStatusLabel(item.status)}
              />
              <InfoRow label="생성일" value={formatDateTime(item.createdAt)} />
              <InfoRow label="수정일" value={formatDateTime(item.updatedAt)} />
            </CardContent>
          </Card>

          <Card className={adminSurface.card}>
            <CardHeader>
              <CardTitle className="text-base">신청자 목록</CardTitle>
              <CardDescription>
                이 클래스와 연결된 최근 신청 50건을 최신순으로 표시합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(adminSurface.tableCard, "overflow-x-auto")}>
                <Table>
                  <TableHeader className={adminSurface.tableHeader}>
                    <TableRow>
                      <TableHead>신청일</TableHead>
                      <TableHead>신청자</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>희망 레슨 유형</TableHead>
                      <TableHead>현재 실력</TableHead>
                      <TableHead>희망 요일</TableHead>
                      <TableHead>희망 시간</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">상세 보기</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="h-32 text-center text-sm text-muted-foreground"
                        >
                          <div className="font-medium text-foreground">
                            아직 이 클래스에 접수된 신청이 없습니다.
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            고객이 아카데미 페이지에서 이 클래스를 선택해 신청하면 이곳에 표시됩니다.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {applications.map((application) => (
                      <TableRow key={application._id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(application.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {application.applicantName || "-"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {application.email || "이메일 미입력"}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {application.phone || "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {application.desiredLessonTypeLabel ||
                            getAcademyLessonTypeLabel(application.desiredLessonType)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {application.currentLevelLabel ||
                            getAcademyCurrentLevelLabel(application.currentLevel)}
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          {application.preferredDays.length
                            ? application.preferredDays.join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell className="min-w-[140px]">
                          {application.preferredTimeText || "-"}
                        </TableCell>
                        <TableCell>
                          <AcademyApplicationStatusBadge status={application.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/academy/applications/${application._id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              상세 보기
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className={adminSurface.card}>
            <CardHeader>
              <CardTitle className="text-base">신청 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <StatCard label="전체 신청" value={stats.total} />
                <StatCard label="접수완료" value={stats.submitted} />
                <StatCard label="검토 중" value={stats.reviewing} />
                <StatCard label="상담 완료" value={stats.contacted} />
                <StatCard label="등록 확정" value={stats.confirmed} />
                <StatCard label="취소" value={stats.cancelled} />
              </div>
            </CardContent>
          </Card>

          <Card className={adminSurface.card}>
            <CardHeader>
              <CardTitle className="text-base">등록 현황</CardTitle>
              <CardDescription>
                신청 상태 기준으로 집계하며 클래스 저장값은 변경하지 않습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="text-sm text-muted-foreground">등록 확정</div>
                <div className="mt-2 text-xl font-semibold text-foreground">
                  등록 확정 {stats.confirmed.toLocaleString("ko-KR")}명 / {formatCapacity(item.capacity)}
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="text-sm text-muted-foreground">전체 신청</div>
                <div className="mt-2 text-xl font-semibold text-foreground">
                  전체 신청 {stats.total.toLocaleString("ko-KR")}건
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
