"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import useSWR from "swr";
import { BookOpen, Eye, MoreHorizontal, Search, Trash2 } from "lucide-react";

import { adminDataTable } from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface } from "@/components/admin/admin-typography";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
        <div className="font-medium text-muted-foreground">클래스 미선택</div>
        <div className="truncate text-xs text-muted-foreground">일반 레슨 신청</div>
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
        className="line-clamp-2 break-keep font-medium text-foreground"
        title={classSnapshot.name}
      >
        {classSnapshot.name}
      </div>
      <div className="truncate text-xs text-muted-foreground">
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

  function goToDetail(id: string) {
    router.push(`/admin/academy/applications/${id}`);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, id: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    goToDetail(id);
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="아카데미 신청 관리"
        description="수강 신청 접수, 상담 상태, 등록 확정 여부를 한 곳에서 확인합니다."
        icon={BookOpen}
        scope="도깨비테니스 아카데미"
        helperText="신청 접수 확인 → 상담·검토 진행 → 등록 확정 관리 → 모집 상태 확인 순서로 운영하세요."
      />

      <Card className={cn(adminSurface.card, "border-dashed")}>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-2.5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="font-medium text-foreground">1) 신청 접수 확인</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                신규 신청의 기본 정보와 접수 시점을 우선 확인합니다.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="font-medium text-foreground">2) 상담·검토 진행</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                레슨 목적과 가능 일정을 점검하며 상담 상태를 관리합니다.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="font-medium text-foreground">3) 등록 확정 관리</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                정원 및 상담 결과를 기준으로 등록 확정 여부를 반영합니다.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="font-medium text-foreground">4) 모집 상태 확인</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                클래스 모집·마감 상태와 신청 처리 현황을 함께 확인합니다.
              </p>
            </div>
          </div>

          <Link
            href="/admin/academy"
            className="inline-flex text-sm font-medium leading-relaxed text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            아카데미 허브로 돌아가기
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <SummaryCard label="전체" value={counts.all} active={status === "all"} />
        {ACADEMY_APPLICATION_STATUSES.map((item) => (
          <SummaryCard
            key={item}
            label={getAcademyApplicationStatusLabel(item)}
            value={counts[item]}
            active={status === item}
          />
        ))}
      </div>

      <Card className={adminSurface.card}>
        <CardHeader>
          <CardTitle className="text-base">신청 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as AcademyLessonApplicationStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[180px]">
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

            <form
              className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-md"
              onSubmit={submitSearch}
            >
              <Input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder="이름, 연락처, 이메일, 목표, 클래스명 검색"
              />
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                <Search className="mr-2 h-4 w-4" />
                검색
              </Button>
            </form>
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
              신청 목록을 불러오지 못했습니다.
            </div>
          ) : null}

          <div className={cn(adminSurface.tableCard, "overflow-x-auto")}>
            <Table className="min-w-[940px]">
              <TableHeader className={adminSurface.tableHeader}>
                <TableRow>
                  <TableHead className={adminDataTable.headRight}>접수일</TableHead>
                  <TableHead className={adminDataTable.head}>신청자</TableHead>
                  <TableHead className={adminDataTable.head}>선택 클래스</TableHead>
                  <TableHead className={adminDataTable.head}>희망 정보</TableHead>
                  <TableHead className={adminDataTable.headCenter}>선호 일정</TableHead>
                  <TableHead className={adminDataTable.headCenter}>상태</TableHead>
                  <TableHead className={adminDataTable.actionHead}>관리</TableHead>
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
                    <TableRow
                      key={item._id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => goToDetail(item._id)}
                      onKeyDown={(event) => handleRowKeyDown(event, item._id)}
                    >
                      <TableCell className={adminDataTable.dateCell}>
                        <div className="font-medium text-foreground">{createdAt.date}</div>
                        <div className="text-muted-foreground">{createdAt.time}</div>
                      </TableCell>
                      <TableCell className={adminDataTable.cellTopLeft}>
                        <div
                          className="line-clamp-2 max-w-[180px] break-keep font-medium text-foreground"
                          title={item.applicantName || "-"}
                        >
                          {item.applicantName || "-"}
                        </div>
                        <div
                          className="max-w-[180px] truncate text-xs text-muted-foreground"
                          title={item.email || "이메일 미입력"}
                        >
                          {item.email || "이메일 미입력"}
                        </div>
                        <div className="whitespace-nowrap text-xs text-muted-foreground">
                          {item.phone || "연락처 미입력"}
                        </div>
                      </TableCell>
                      <TableCell className={adminDataTable.cellTopLeft}>
                        <SelectedClassCell classSnapshot={item.classSnapshot} />
                      </TableCell>
                      <TableCell className={adminDataTable.cellTopLeft}>
                        <div>{getAcademyLessonTypeLabel(item.desiredLessonType)}</div>
                        <div className="text-xs text-muted-foreground">
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
                          className="max-w-[160px] truncate text-xs text-muted-foreground"
                          title={item.preferredTimeText || "희망 시간 미입력"}
                        >
                          {item.preferredTimeText || "희망 시간 미입력"}
                        </div>
                      </TableCell>
                      <TableCell className={adminDataTable.cellCenter}>
                        <AcademyStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell
                        className={adminDataTable.actionCell}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`${item.applicantName || "신청"} 관리 메뉴`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-max">
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              onSelect={(event) => {
                                event.preventDefault();
                                goToDetail(item._id);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              상세 보기
                            </DropdownMenuItem>
                            {item.status === "cancelled" ? (
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
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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

function SummaryCard({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div className={cn(adminSurface.kpiCard, active ? "border-primary/40 bg-primary/5" : "")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
