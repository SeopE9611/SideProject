"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import useSWR from "swr";
import { ArrowLeft, BookOpen, Eye, Search, Trash2 } from "lucide-react";

import { adminDataTable } from "@/components/admin/AdminDataTable";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminRowActionMenu from "@/components/admin/AdminRowActionMenu";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminFetcher, adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { badgeToneVariant, type BadgeSemanticTone } from "@/lib/badge-style";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ACADEMY_APPLICATION_STATUSES,
  getAcademyApplicationStatusLabel,
  getAcademyCurrentLevelLabel,
  getAcademyLessonTypeLabel,
  type AcademyClassSnapshot,
  type AcademyLessonApplicationStatus,
} from "@/lib/types/academy";

const LIMIT = 20;

type AcademyApplicationListItem = {
  _id: string;
  applicantName: string;
  phone: string;
  email: string | null;
  desiredLessonType: string;
  currentLevel: string;
  preferredDays: string[];
  preferredTimeText: string | null;
  status: AcademyLessonApplicationStatus;
  createdAt: string | null;
  updatedAt: string | null;
  userId: string | null;
  classId: string | null;
  classSnapshot: Pick<
    AcademyClassSnapshot,
    "classId" | "name" | "levelLabel" | "lessonTypeLabel" | "scheduleText"
  > | null;
};

type ApplicationsResponse = {
  success: true;
  items: AcademyApplicationListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  counts: Record<AcademyLessonApplicationStatus | "all", number>;
};

function getStatusTone(status: AcademyLessonApplicationStatus): BadgeSemanticTone {
  if (status === "submitted") return "warning";
  if (status === "reviewing") return "info";
  if (status === "contacted") return "brand";
  if (status === "confirmed") return "success";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function AcademyStatusBadge({ status }: { status: AcademyLessonApplicationStatus }) {
  return (
    <Badge variant={badgeToneVariant(getStatusTone(status))} className="shrink-0 whitespace-nowrap">
      {getAcademyApplicationStatusLabel(status)}
    </Badge>
  );
}

function SelectedClassCell({
  classSnapshot,
}: {
  classSnapshot: AcademyApplicationListItem["classSnapshot"];
}) {
  if (!classSnapshot?.name) {
    return (
      <div className="min-w-0 max-w-[220px]">
        <div className={adminDataTable.primaryText}>클래스 미선택</div>
        <div className={cn("truncate", adminDataTable.secondaryText)}>
          일반 레슨 신청 · 연결 필요
        </div>
      </div>
    );
  }

  const details = [
    classSnapshot.lessonTypeLabel,
    classSnapshot.levelLabel,
    classSnapshot.scheduleText,
  ].filter(Boolean);

  return (
    <div className="min-w-0 max-w-[240px]">
      <div
        className={cn("line-clamp-2 break-keep", adminDataTable.primaryText)}
        title={classSnapshot.name}
      >
        {classSnapshot.name}
      </div>
      <div className={cn("truncate", adminDataTable.secondaryText)}>
        {details.length ? details.join(" · ") : "클래스 상세 정보 미입력"}
      </div>
    </div>
  );
}

function formatAdminDateTimeParts(value: string | null) {
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

export default function AcademyApplicationsClient() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AcademyLessonApplicationStatus | "all">("all");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    params.set("sort", "latest");
    if (status !== "all") params.set("status", status);
    if (keyword) params.set("keyword", keyword);
    return `/api/admin/academy/applications?${params.toString()}`;
  }, [keyword, page, status]);

  const { data, error, isLoading, mutate } = useSWR<ApplicationsResponse>(query, adminFetcher);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AcademyApplicationListItem | null>(null);

  const counts = data?.counts ?? {
    all: 0,
    submitted: 0,
    reviewing: 0,
    contacted: 0,
    confirmed: 0,
    cancelled: 0,
  };

  async function handleDelete(item: AcademyApplicationListItem) {
    setDeletingId(item._id);
    try {
      const result = await adminMutator<{ success: boolean; message?: string }>(
        `/api/admin/academy/applications/${item._id}`,
        { method: "DELETE" },
      );
      showSuccessToast(result.message || "신청 내역이 삭제되었습니다.");
      await mutate();
      setPendingDelete(null);
    } catch (error) {
      showErrorToast(getAdminErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setKeyword(keywordInput.trim());
  }

  function resetFilters() {
    setStatus("all");
    setKeywordInput("");
    setKeyword("");
    setPage(1);
  }

  function goToDetail(id: string) {
    router.push(`/admin/academy/applications/${id}`);
  }

  return (
    <AdminPageShell variant="wide" className="space-y-6">
      <AdminPageHeader
        variant="compact"
        title="아카데미 신청 관리"
        description="수강 신청 접수, 상담 상태, 등록 확정 여부를 한 곳에서 확인합니다."
        icon={BookOpen}
        scope="도깨비테니스 아카데미"
        helperText="신청 접수 확인 → 상담·검토 진행 → 등록 확정 관리 → 모집 상태 확인 순서로 운영하세요."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/academy">
              <ArrowLeft className="mr-2 h-4 w-4" />
              아카데미 허브로 돌아가기
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="전체" value={counts.all} active={status === "all"} onSelect={() => { setStatus("all"); setPage(1); }} />
        {ACADEMY_APPLICATION_STATUSES.map((item) => (
          <SummaryCard
            key={item}
            label={getAcademyApplicationStatusLabel(item)}
            value={counts[item]}
            active={status === item}
            onSelect={() => { setStatus(item); setPage(1); }}
          />
        ))}
      </div>

      <AdminFilterBar
        actions={
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={resetFilters}>
            필터 초기화
          </Button>
        }
        activeFilters={
          <>
            <span className="font-medium text-foreground/80">
              현재 상태:{" "}
              {status === "all" ? "전체 상태" : getAcademyApplicationStatusLabel(status)}
            </span>
            {keyword ? (
              <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1">
                검색어: {keyword}
              </span>
            ) : null}
            <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 tabular-nums">
              전체 신청: {data ? `${data.pagination.total.toLocaleString("ko-KR")}건` : "-"}
            </span>
          </>
        }
      >
        <form
          className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(160px,1fr)_minmax(240px,2fr)_auto]"
          onSubmit={submitSearch}
        >
          <div className="min-w-0">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as AcademyLessonApplicationStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full min-w-0" aria-label="아카데미 신청 상태 필터">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                {ACADEMY_APPLICATION_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {getAcademyApplicationStatusLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="이름, 연락처, 이메일, 목표, 클래스명 검색"
              className="w-full min-w-0"
              aria-label="아카데미 신청 검색어"
            />
          </div>
          <Button type="submit" variant="outline">
            <Search className="mr-2 h-4 w-4" />
            검색
          </Button>
        </form>
      </AdminFilterBar>

      <Card className={adminSurface.card}>
        <CardHeader>
          <CardTitle className="text-base">신청 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
              신청 목록을 불러오지 못했습니다.
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table className="min-w-[1120px] table-fixed">
              <TableHeader className={adminSurface.tableHeader}>
                <TableRow>
                  <TableHead className={cn(adminDataTable.headRight, "w-[120px]")}>접수일</TableHead>
                  <TableHead className={cn(adminDataTable.head, "w-[200px]")}>신청자</TableHead>
                  <TableHead className={cn(adminDataTable.head, "w-[220px]")}>선택 클래스</TableHead>
                  <TableHead className={cn(adminDataTable.head, "w-[130px]")}>희망 정보</TableHead>
                  <TableHead className={cn(adminDataTable.head, "w-[170px]")}>선호 일정</TableHead>
                  <TableHead className={cn(adminDataTable.headCenter, "w-[110px]")}>상태</TableHead>
                  <TableHead className={cn(adminDataTable.stickyActionHead, "w-[170px]")}>관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-28 text-center text-sm text-muted-foreground"
                    >
                      신청 목록을 불러오는 중입니다.
                    </TableCell>
                  </TableRow>
                ) : null}
                {!isLoading && data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-28 text-center text-sm text-muted-foreground"
                    >
                      아직 접수된 레슨 신청이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : null}
                {data?.items.map((item) => {
                  const createdAt = formatAdminDateTimeParts(item.createdAt);

                  return (
                    <TableRow key={item._id} className={adminDataTable.row}>
                      <TableCell className={adminDataTable.dateCell}>
                        <div className="font-medium text-foreground">{createdAt.date}</div>
                        <div className="text-muted-foreground">{createdAt.time}</div>
                      </TableCell>
                      <TableCell className={adminDataTable.cellTopLeft}>
                        <div
                          className={cn(
                            "line-clamp-2 max-w-[180px] break-keep",
                            adminDataTable.primaryText,
                          )}
                          title={item.applicantName || "-"}
                        >
                          {item.applicantName || "-"}
                        </div>
                        <div
                          className={cn("max-w-[180px] truncate", adminDataTable.secondaryText)}
                          title={item.email || "이메일 미입력"}
                        >
                          {item.email || "이메일 미입력"}
                        </div>
                        <div className={cn("whitespace-nowrap", adminDataTable.secondaryText)}>
                          {item.phone || "연락처 미입력"}
                        </div>
                      </TableCell>
                      <TableCell className={adminDataTable.cellTopLeft}>
                        <SelectedClassCell classSnapshot={item.classSnapshot} />
                      </TableCell>
                      <TableCell className={adminDataTable.cellTopLeft}>
                        <div>{getAcademyLessonTypeLabel(item.desiredLessonType)}</div>
                        <div className={adminDataTable.secondaryText}>
                          {getAcademyCurrentLevelLabel(item.currentLevel)}
                        </div>
                      </TableCell>
                      <TableCell className={adminDataTable.cellTopLeft}>
                        <div
                          className="max-w-[160px] truncate"
                          title={item.preferredDays.length ? item.preferredDays.join(", ") : "-"}
                        >
                          {item.preferredDays.length ? item.preferredDays.join(", ") : "-"}
                        </div>
                        <div
                          className={cn("max-w-[160px] truncate", adminDataTable.secondaryText)}
                          title={item.preferredTimeText || "희망 시간 미입력"}
                        >
                          {item.preferredTimeText || "희망 시간 미입력"}
                        </div>
                      </TableCell>
                      <TableCell className={adminDataTable.cellCenter}>
                        <AcademyStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className={adminDataTable.stickyActionCell}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => goToDetail(item._id)}
                            aria-label={`${item.applicantName || "신청자"} 신청 상세 보기`}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            상세 보기
                          </Button>
                          {item.status === "cancelled" ? (
                            <AdminRowActionMenu
                              ariaLabel={`${item.applicantName || "신청"} 관리 메뉴`}
                              destructiveActions={
                              <DropdownMenuItem
                                className="whitespace-nowrap text-destructive focus:text-destructive"
                                disabled={deletingId === item._id}
                                onSelect={(event) => {
                                  event.preventDefault();
                                  setPendingDelete(item);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingId === item._id ? "삭제 중..." : "삭제"}
                              </DropdownMenuItem>
                              }
                            />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-3 text-sm text-muted-foreground flex-row items-center justify-between">
            <span>
              {data?.pagination.page ?? page} / {data?.pagination.totalPages ?? 1} 페이지 · 총{" "}
              {data?.pagination.total ?? 0}건
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.pagination.hasPrevPage}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.pagination.hasNextPage}
                onClick={() => setPage((prev) => prev + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (deletingId) return;
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>취소 신청 내역을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제하면 관리자 목록과 고객 마이페이지에서 보이지 않습니다. 진행 중 신청은 삭제할 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(deletingId) || !pendingDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!pendingDelete) return;
                void handleDelete(pendingDelete);
              }}
            >
              {deletingId ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}

function SummaryCard({ label, value, active, onSelect }: { label: string; value: number; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(adminSurface.kpiCard, "min-w-0 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-muted/20", active ? "border-primary/40 bg-primary/5" : "")}
    >
      <div className={adminTypography.metaMuted}>{label}</div>
      <div className={cn("mt-2", adminTypography.kpiValueCompact)}>{value}</div>
    </button>
  );
}
