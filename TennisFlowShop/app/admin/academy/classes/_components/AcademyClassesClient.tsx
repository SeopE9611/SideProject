"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import useSWR from "swr";
import { BookOpen, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";

import AdminFilterBar from "@/components/admin/AdminFilterBar";
import {
  AdminListBody,
  AdminListCell,
  AdminListColumnHeader,
  AdminListPrimary,
  AdminListRow,
  AdminListTable,
  AdminMoneyBlock,
  AdminRowActions,
} from "@/components/admin/AdminListTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminRowActionMenu from "@/components/admin/AdminRowActionMenu";
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
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
const CLASS_LIST_COLUMNS =
  "grid-cols-[minmax(300px,1.25fr)_minmax(300px,1.15fr)_minmax(180px,0.72fr)_minmax(160px,0.65fr)_116px]";

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

function formatCapacityValue(capacity: number | null | undefined) {
  if (typeof capacity !== "number") return "미정";
  return `${capacity.toLocaleString("ko-KR")}명`;
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
    <dl className="grid min-w-0 grid-cols-[auto_1fr] gap-x-2 gap-y-1">
      <dt className={adminTypography.caption}>신청</dt>
      <dd className="whitespace-nowrap text-right font-medium text-foreground tabular-nums">
        {total.toLocaleString("ko-KR")}건
      </dd>
      <dt className={adminTypography.caption}>확정</dt>
      <dd className="whitespace-nowrap text-right tabular-nums">
        {confirmed.toLocaleString("ko-KR")}명
      </dd>
      <dt className={adminTypography.caption}>정원</dt>
      <dd className="whitespace-nowrap text-right tabular-nums">
        {formatCapacityValue(item.capacity)}
      </dd>
    </dl>
  );
}

function SummaryCard({
  label,
  value,
  active,
  onSelect,
}: {
  label: string;
  value: number;
  active?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className="min-w-0 cursor-pointer rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
    <Card className={cn(adminSurface.kpiCard, "h-full hover:bg-muted/20", active ? "border-primary/50 bg-primary/5" : "")}>
      <CardContent className="p-4">
        <div className={adminTypography.caption}>{label}</div>
        <div className={cn("mt-2 whitespace-nowrap", adminTypography.kpiValueCompact)}>
          {value.toLocaleString("ko-KR")}
        </div>
      </CardContent>
    </Card>
    </button>
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
  const currentViewLabel = keyword
    ? "검색 결과"
    : status === "all"
      ? "전체 클래스"
      : getAcademyClassStatusLabel(status);

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
    router.push(`/admin/academy/classes/${id}`);
  }

  function goToEdit(id: string) {
    router.push(`/admin/academy/classes/${id}/edit`);
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
    <AdminPageShell variant="wide" className="space-y-4">
      <AdminPageHeader
        variant="compact"
        title="아카데미 클래스 관리"
        description="레슨 프로그램을 등록하고 노출 상태를 관리합니다."
        icon={BookOpen}
        scope="도깨비테니스 아카데미"
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <SummaryCard label="전체" value={counts.all} active={status === "all"} onSelect={() => { setStatus("all"); setPage(1); }} />
        {ACADEMY_CLASS_STATUSES.map((item) => (
          <SummaryCard
            key={item}
            label={getAcademyClassStatusLabel(item)}
            value={counts[item]}
            active={status === item}
            onSelect={() => { setStatus(item); setPage(1); }}
          />
        ))}
      </div>

      <AdminFilterBar
        actions={
          <>
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              필터 초기화
            </Button>
            <Button asChild size="sm" className="h-9">
              <Link href="/admin/academy/classes/new">
                <Plus className="mr-2 h-4 w-4" />새 클래스 등록
              </Link>
            </Button>
          </>
        }
        activeFilters={
          <>
            <span className="font-medium text-foreground/80">
              현재 상태: {status === "all" ? "전체 상태" : getAcademyClassStatusLabel(status)}
            </span>
            {keyword ? (
              <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1">
                검색어: {keyword}
              </span>
            ) : null}
            <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 tabular-nums">
              전체 결과: {data ? `${data.pagination.total.toLocaleString("ko-KR")}건` : "-"}
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
                setStatus(value as AcademyClassStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full min-w-0" aria-label="클래스 상태 필터">
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
          </div>
          <div className="min-w-0">
            <Input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="클래스명, 설명, 강사, 장소, 일정 검색"
              className="w-full min-w-0"
              aria-label="클래스 검색어"
            />
          </div>
          <Button type="submit" variant="outline">
            <Search className="mr-2 h-4 w-4" />
            검색
          </Button>
        </form>
      </AdminFilterBar>

      <AdminListTable
        title="클래스 목록"
        viewLabel={currentViewLabel}
        resultLabel={
          error
            ? "불러오기 실패"
            : data
              ? `총 ${data.pagination.total.toLocaleString("ko-KR")}건`
              : "불러오는 중…"
        }
        description="클래스 기본 정보, 수업·운영 조건, 신청 현황, 가격·상태와 관리 작업을 한 행에서 확인합니다."
        columnsClassName={CLASS_LIST_COLUMNS}
        ariaLabel="아카데미 클래스 관리 목록"
      >
        <AdminListColumnHeader columnsClassName={CLASS_LIST_COLUMNS}>
          <div role="columnheader" className="min-w-0 px-4 py-2.5">
            클래스
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5">
            수업 / 운영
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5 text-right">
            신청 / 정원
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5 text-right">
            가격 / 상태
          </div>
          <div role="columnheader" className="min-w-0 px-2 py-2.5 text-right">
            작업
          </div>
        </AdminListColumnHeader>
        <AdminListBody>
          {error ? (
            <AdminListRow columnsClassName={CLASS_LIST_COLUMNS} ariaLabel="클래스 목록 오류">
              <AdminListCell className="col-span-5 py-10 text-center text-destructive">
                클래스 목록을 불러오지 못했습니다.
              </AdminListCell>
            </AdminListRow>
          ) : isLoading ? (
            Array.from({ length: 6 }).map((_, rowIndex) => (
              <AdminListRow
                key={`academy-class-loading-${rowIndex}`}
                columnsClassName={CLASS_LIST_COLUMNS}
                ariaLabel="클래스 목록 불러오는 중"
              >
                <AdminListCell>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </AdminListCell>
                <AdminListCell>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-3/5" />
                  </div>
                </AdminListCell>
                <AdminListCell align="end">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </AdminListCell>
                <AdminListCell align="end">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                </AdminListCell>
                <AdminListCell align="end" className="px-2">
                  <Skeleton className="h-8 w-20" />
                </AdminListCell>
              </AdminListRow>
            ))
          ) : !data?.items.length ? (
            <AdminListRow columnsClassName={CLASS_LIST_COLUMNS} ariaLabel="클래스 목록 없음">
              <AdminListCell className="col-span-5 py-16 text-center">
                {keyword || status !== "all"
                  ? "현재 조건에 맞는 아카데미 클래스가 없습니다."
                  : "등록된 아카데미 클래스가 없습니다."}
              </AdminListCell>
            </AdminListRow>
          ) : (
            data.items.map((item) => {
              const classId = item._id;
              if (!classId) return null;

              const createdAt = formatAdminDateTimeParts(item.createdAt);
              const isHideDisabled = item.status === "hidden" || hidingId === classId;
              const applicationTotal = item.applicationStats?.total ?? 0;
              const cancelledTotal = item.applicationStats?.cancelled ?? 0;
              const blockingApplicationTotal = Math.max(0, applicationTotal - cancelledTotal);
              const isDeleteDisabled = blockingApplicationTotal > 0 || deletingId === classId;

              return (
                <AdminListRow key={classId} columnsClassName={CLASS_LIST_COLUMNS}>
                  <AdminListCell>
                    <AdminListPrimary
                      title={item.name || "-"}
                      meta={
                        <span>
                          등록 {createdAt.date}
                          {createdAt.time ? ` ${createdAt.time}` : ""}
                        </span>
                      }
                      supporting={item.description || "설명 미입력"}
                    />
                  </AdminListCell>
                  <AdminListCell>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap gap-x-2 text-ui-label text-muted-foreground">
                        <span>{getAcademyClassLessonTypeLabel(item.lessonType)}</span>
                        <span>{getAcademyClassLevelLabel(item.level)}</span>
                      </div>
                      <div className="truncate" title={item.instructorName || "강사 미입력"}>
                        {item.instructorName || "강사 미입력"}
                      </div>
                      <div
                        className={cn("line-clamp-2 break-words", adminTypography.caption)}
                        title={item.scheduleText || "일정 미입력"}
                      >
                        {item.scheduleText || "일정 미입력"}
                      </div>
                      <div
                        className={cn("truncate", adminTypography.caption)}
                        title={item.location || "장소 미입력"}
                      >
                        {item.location || "장소 미입력"}
                      </div>
                    </div>
                  </AdminListCell>
                  <AdminListCell align="end">
                    <ApplicationStatsCell item={item} />
                  </AdminListCell>
                  <AdminListCell align="end">
                    <AdminMoneyBlock
                      amount={formatPrice(item.price)}
                      detailAction={<AcademyClassStatusBadge status={item.status} />}
                    />
                  </AdminListCell>
                  <AdminListCell align="end" className="px-2">
                    <AdminRowActions>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => goToDetail(classId)}
                      >
                        상세 보기
                      </Button>
                      <AdminRowActionMenu
                        ariaLabel={`${item.name || "클래스"} 관리 메뉴`}
                        destructiveActions={
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
                              ? "영구 삭제 불가: 진행 중 신청 내역 있음"
                              : deletingId === classId
                                ? "영구 삭제 중"
                                : "영구 삭제"}
                          </DropdownMenuItem>
                        }
                      >
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
                      </AdminRowActionMenu>
                    </AdminRowActions>
                  </AdminListCell>
                </AdminListRow>
              );
            })
          )}
        </AdminListBody>
        <div role="rowgroup" className="border-t border-border">
          <div role="row">
            <div
              role="cell"
              aria-colspan={5}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className={adminTypography.metaMuted}>
                총 {data?.pagination.total.toLocaleString("ko-KR") ?? 0}건 ·{" "}
                {data?.pagination.page ?? page} / {data?.pagination.totalPages ?? 1}페이지
              </span>
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
          </div>
        </div>
      </AdminListTable>

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
