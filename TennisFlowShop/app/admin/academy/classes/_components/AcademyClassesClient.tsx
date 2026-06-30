"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import useSWR from "swr";
import { BookOpen, Eye, EyeOff, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { adminDataTable } from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  ACADEMY_CLASS_STATUSES,
  getAcademyClassLessonTypeLabel,
  getAcademyClassLevelLabel,
  getAcademyClassStatusLabel,
  type AcademyClass,
  type AcademyClassStatus,
} from "@/lib/types/academy";
import { cn } from "@/lib/utils";

const LIMIT = 20;

type ClassesResponse = {
  success: true;
  items: AcademyClass[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  counts: Record<AcademyClassStatus | "all", number>;
};

function getStatusTone(status: AcademyClassStatus): BadgeSemanticTone {
  if (status === "draft") return "warning";
  if (status === "visible") return "success";
  if (status === "hidden") return "neutral";
  if (status === "closed") return "danger";
  return "neutral";
}

function AcademyClassStatusBadge({ status }: { status: AcademyClassStatus }) {
  return (
    <Badge variant={badgeToneVariant(getStatusTone(status))} className="shrink-0 whitespace-nowrap">
      {getAcademyClassStatusLabel(status)}
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

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return `${value.toLocaleString("ko-KR")}원`;
}

function formatCapacityLabel(capacity: number | null | undefined) {
  if (typeof capacity !== "number") return "정원 미정";
  return `정원 ${capacity.toLocaleString("ko-KR")}명`;
}

function getBlockingApplicationCount(item: AcademyClass) {
  const applicationTotal = item.applicationStats?.total ?? 0;
  const cancelledTotal = item.applicationStats?.cancelled ?? 0;
  return Math.max(0, applicationTotal - cancelledTotal);
}

function ApplicationStatsCell({ item }: { item: AcademyClass }) {
  const total = item.applicationStats?.total ?? 0;
  const confirmed = item.applicationStats?.confirmed ?? 0;

  return (
    <div className="shrink-0 whitespace-nowrap tabular-nums">
      <div className="font-medium text-foreground">신청 {total.toLocaleString("ko-KR")}건</div>
      <div className={adminTypography.caption}>
        등록 확정 {confirmed.toLocaleString("ko-KR")}명 / {formatCapacityLabel(item.capacity)}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, active }: { label: string; value: number; active?: boolean }) {
  return (
    <Card className={cn(adminSurface.kpiCard, active ? "border-primary/50 bg-primary/5" : "")}>
      <CardContent className="p-4">
        <div className={adminTypography.caption}>{label}</div>
        <div className={cn("mt-2 whitespace-nowrap", adminTypography.kpiValueCompact)}>
          {value.toLocaleString("ko-KR")}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AcademyClassesClient() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AcademyClassStatus | "all">("all");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "hide" | "delete";
    item: AcademyClass;
  } | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      sort: "latest",
    });
    if (status !== "all") params.set("status", status);
    if (keyword) params.set("keyword", keyword);
    return `/api/admin/academy/classes?${params.toString()}`;
  }, [keyword, page, status]);

  const { data, error, isLoading, mutate } = useSWR<ClassesResponse>(query, adminFetcher);

  const counts = data?.counts ?? {
    all: 0,
    draft: 0,
    visible: 0,
    hidden: 0,
    closed: 0,
  };

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setKeyword(keywordInput.trim());
  }

  function goToDetail(id: string) {
    router.push(`/admin/academy/classes/${id}`);
  }

  function goToEdit(id: string) {
    router.push(`/admin/academy/classes/${id}/edit`);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, id: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    goToDetail(id);
  }

  async function hideClass(item: AcademyClass) {
    if (!item._id || hidingId) return;

    setHidingId(item._id);
    try {
      await adminMutator(`/api/admin/academy/classes/${item._id}`, {
        method: "DELETE",
      });
      showSuccessToast("클래스가 숨김 처리되었습니다.");
      await mutate();
    } catch (mutationError) {
      showErrorToast(getAdminErrorMessage(mutationError));
    } finally {
      setHidingId(null);
    }
  }

  async function hardDeleteClass(item: AcademyClass) {
    if (!item._id || deletingId) return;

    const blockingApplicationTotal = getBlockingApplicationCount(item);
    if (blockingApplicationTotal > 0) {
      showErrorToast(
        "이 클래스에는 취소되지 않은 신청 내역이 있어 삭제할 수 없습니다. 고객 화면에서 내리려면 숨김 처리를 사용하세요.",
      );
      return;
    }

    setDeletingId(item._id);
    try {
      await adminMutator(`/api/admin/academy/classes/${item._id}/hard-delete`, {
        method: "DELETE",
      });
      showSuccessToast("클래스가 영구 삭제되었습니다.");
      await mutate();
    } catch (mutationError) {
      showErrorToast(getAdminErrorMessage(mutationError));
    } finally {
      setDeletingId(null);
    }
  }

  const handleConfirmPendingAction = () => {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;

    if (action.type === "hide") {
      void hideClass(action.item);
      return;
    }

    void hardDeleteClass(action.item);
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="아카데미 클래스 관리"
        description="레슨 프로그램을 등록하고 노출 상태를 관리합니다."
        icon={BookOpen}
        scope="도깨비테니스 아카데미"
        actions={
          <Button asChild>
            <Link href="/admin/academy/classes/new">
              <Plus className="mr-2 h-4 w-4" />새 클래스 등록
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="전체" value={counts.all} active={status === "all"} />
        {ACADEMY_CLASS_STATUSES.map((item) => (
          <SummaryCard
            key={item}
            label={getAcademyClassStatusLabel(item)}
            value={counts[item]}
            active={status === item}
          />
        ))}
      </div>

      <Card className={adminSurface.card}>
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
          <CardTitle className={adminTypography.sectionTitle}>클래스 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div
            className={cn(
              adminSurface.filterCard,
              "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
            )}
          >
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as AcademyClassStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                {ACADEMY_CLASS_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {getAcademyClassStatusLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <form className="flex w-full gap-2 lg:max-w-md" onSubmit={submitSearch}>
              <Input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder="클래스명, 설명, 강사, 장소, 일정 검색"
              />
              <Button type="submit" variant="outline">
                <Search className="mr-2 h-4 w-4" />
                검색
              </Button>
            </form>
          </div>

          {error ? (
            <div
              className={cn(
                "rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive",
                adminTypography.body,
              )}
            >
              클래스 목록을 불러오지 못했습니다.
            </div>
          ) : null}

          <div className={cn(adminSurface.tableCard, "overflow-x-auto")}>
            <Table className="min-w-[1040px] table-fixed">
              <TableHeader className={adminSurface.tableHeader}>
                <TableRow>
                  <TableHead className={adminDataTable.headRight}>등록일</TableHead>
                  <TableHead className={cn(adminDataTable.head, "w-[280px]")}>클래스</TableHead>
                  <TableHead className={adminDataTable.headCenter}>수업 정보</TableHead>
                  <TableHead className={cn(adminDataTable.head, "w-[240px]")}>운영 정보</TableHead>
                  <TableHead className={adminDataTable.headRight}>신청 현황</TableHead>
                  <TableHead className={adminDataTable.headRight}>가격/상태</TableHead>
                  <TableHead className={adminDataTable.actionHead}>관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className={cn("h-28 text-center", adminTypography.metaMuted)}
                    >
                      클래스 목록을 불러오는 중입니다.
                    </TableCell>
                  </TableRow>
                ) : null}
                {!isLoading && data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className={cn("h-28 text-center", adminTypography.metaMuted)}
                    >
                      등록된 아카데미 클래스가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : null}
                {data?.items.map((item) => {
                  const classId = item._id;
                  if (!classId) return null;

                  const createdAt = formatAdminDateTimeParts(item.createdAt);
                  const isHideDisabled = item.status === "hidden" || hidingId === classId;
                  const applicationTotal = item.applicationStats?.total ?? 0;
                  const cancelledTotal = item.applicationStats?.cancelled ?? 0;
                  const blockingApplicationTotal = Math.max(0, applicationTotal - cancelledTotal);
                  const isDeleteDisabled = blockingApplicationTotal > 0 || deletingId === classId;

                  return (
                    <TableRow
                      key={classId}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => goToDetail(classId)}
                      onKeyDown={(event) => handleRowKeyDown(event, classId)}
                    >
                      <TableCell className={adminDataTable.dateCell}>
                        <div className="font-medium text-foreground">{createdAt.date}</div>
                        <div className="text-muted-foreground">{createdAt.time}</div>
                      </TableCell>
                      <TableCell className={adminDataTable.cellTopLeft}>
                        <div
                          className={cn("line-clamp-2 max-w-[260px] break-words", adminTypography.bodyStrong)}
                          title={item.name || "-"}
                        >
                          {item.name || "-"}
                        </div>
                        <div
                          className={cn("line-clamp-2 max-w-[260px] break-words", adminTypography.caption)}
                          title={item.description || "설명 미입력"}
                        >
                          {item.description || "설명 미입력"}
                        </div>
                      </TableCell>
                      <TableCell className={adminDataTable.cellCenter}>
                        <div>{getAcademyClassLessonTypeLabel(item.lessonType)}</div>
                        <div className={adminTypography.caption}>
                          {getAcademyClassLevelLabel(item.level)}
                        </div>
                      </TableCell>
                      <TableCell className={adminDataTable.cellTopLeft}>
                        <div
                          className="max-w-[220px] truncate"
                          title={item.instructorName || "강사 미입력"}
                        >
                          {item.instructorName || "강사 미입력"}
                        </div>
                        <div
                          className={cn("line-clamp-2 max-w-[220px] break-words", adminTypography.caption)}
                          title={item.scheduleText || "일정 미입력"}
                        >
                          {item.scheduleText || "일정 미입력"}
                        </div>
                        {item.location ? (
                          <div
                            className={cn("max-w-[220px] truncate", adminTypography.caption)}
                            title={item.location}
                          >
                            {item.location}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className={adminDataTable.cellNumber}>
                        <ApplicationStatsCell item={item} />
                      </TableCell>
                      <TableCell className={adminDataTable.cellCenter}>
                        <div className={cn("whitespace-nowrap tabular-nums", adminTypography.bodyStrong)}>
                          {formatPrice(item.price)}
                        </div>
                        <div className="mt-1">
                          <AcademyClassStatusBadge status={item.status} />
                        </div>
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
                              aria-label={`${item.name || "클래스"} 관리 메뉴`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-max">
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              onSelect={(event) => {
                                event.preventDefault();
                                goToDetail(classId);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              상세 보기
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              onSelect={(event) => {
                                event.preventDefault();
                                goToEdit(classId);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              disabled={isHideDisabled}
                              onSelect={(event) => {
                                event.preventDefault();
                                if (isHideDisabled) return;
                                setPendingAction({ type: "hide", item });
                              }}
                            >
                              <EyeOff className="mr-2 h-4 w-4" />
                              {item.status === "hidden"
                                ? "이미 숨김 처리됨"
                                : hidingId === classId
                                  ? "처리 중"
                                  : "숨김 처리"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isDeleteDisabled}
                              className="whitespace-nowrap text-destructive focus:text-destructive"
                              onSelect={(event) => {
                                event.preventDefault();
                                if (isDeleteDisabled) {
                                  if (blockingApplicationTotal > 0) {
                                    showErrorToast(
                                      "이 클래스에는 취소되지 않은 신청 내역이 있어 삭제할 수 없습니다. 고객 화면에서 내리려면 숨김 처리를 사용하세요.",
                                    );
                                  }
                                  return;
                                }
                                setPendingAction({ type: "delete", item });
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {blockingApplicationTotal > 0
                                ? "삭제 불가: 진행 중 신청 내역 있음"
                                : deletingId === classId
                                  ? "삭제 중"
                                  : "삭제"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div
            className={cn(
              "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
              adminTypography.metaMuted,
            )}
          >
            <div>
              총 {data?.pagination.total.toLocaleString("ko-KR") ?? 0}건 ·{" "}
              {data?.pagination.page ?? page} / {data?.pagination.totalPages ?? 1}페이지
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!data?.pagination.hasPrevPage}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                이전
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!data?.pagination.hasNextPage}
                onClick={() => setPage((current) => current + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "delete"
                ? "클래스를 영구 삭제할까요?"
                : "클래스를 숨김 처리할까요?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              {pendingAction?.type === "delete"
                ? "이 클래스를 영구 삭제할까요? 취소되지 않은 신청 내역이 없는 클래스만 삭제할 수 있으며, 삭제 후에는 복구할 수 없습니다."
                : "이 클래스를 숨김 처리할까요? 고객 화면에는 노출되지 않지만, 기존 신청 내역과 운영 데이터는 보존됩니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPendingAction}
              className={
                pendingAction?.type === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {pendingAction?.type === "delete" ? "영구 삭제" : "숨김 처리"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
