"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import useSWR from "swr";
import { BookOpen, EyeOff, Pencil, Plus, Search } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminSurface } from "@/components/admin/admin-typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <Badge variant={badgeToneVariant(getStatusTone(status))}>
      {getAcademyClassStatusLabel(status)}
    </Badge>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return `${value.toLocaleString("ko-KR")}원`;
}

function formatCapacity(item: AcademyClass) {
  const enrolledCount = item.enrolledCount ?? 0;
  if (typeof item.capacity !== "number") return `${enrolledCount}명 / 제한 없음`;
  return `${enrolledCount}명 / ${item.capacity}명`;
}

function SummaryCard({ label, value, active }: { label: string; value: number; active?: boolean }) {
  return (
    <Card className={cn(adminSurface.kpiCard, active ? "border-primary/50 bg-primary/5" : "")}>
      <CardContent className="p-4">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-foreground">{value.toLocaleString("ko-KR")}</div>
      </CardContent>
    </Card>
  );
}

export default function AcademyClassesClient() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AcademyClassStatus | "all">("all");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [hidingId, setHidingId] = useState<string | null>(null);

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

  const { data, error, isLoading, mutate } = useSWR<ClassesResponse>(
    query,
    adminFetcher,
  );

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

  async function hideClass(item: AcademyClass) {
    if (!item._id || hidingId) return;
    const confirmed = window.confirm(
      "이 클래스를 숨김 처리할까요? 고객 화면에는 노출되지 않습니다.",
    );
    if (!confirmed) return;

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

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="아카데미 클래스 관리"
        description="레슨 프로그램을 등록하고 노출 상태를 관리합니다."
        icon={BookOpen}
        scope="도깨비테니스 아카데미"
        actions={
          <Button asChild>
            <Link href="/admin/academy/classes/new">
              <Plus className="mr-2 h-4 w-4" />
              새 클래스 등록
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
        <CardHeader>
          <CardTitle className="text-base">클래스 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
              클래스 목록을 불러오지 못했습니다.
            </div>
          ) : null}

          <div className={cn(adminSurface.tableCard, "overflow-x-auto")}>
            <Table>
              <TableHeader className={adminSurface.tableHeader}>
                <TableRow>
                  <TableHead>등록일</TableHead>
                  <TableHead>클래스명</TableHead>
                  <TableHead>수업 유형</TableHead>
                  <TableHead>레벨</TableHead>
                  <TableHead>강사</TableHead>
                  <TableHead>일정</TableHead>
                  <TableHead>정원</TableHead>
                  <TableHead>가격</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-28 text-center text-sm text-muted-foreground">
                      클래스 목록을 불러오는 중입니다.
                    </TableCell>
                  </TableRow>
                ) : null}
                {!isLoading && data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-28 text-center text-sm text-muted-foreground">
                      등록된 아카데미 클래스가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : null}
                {data?.items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[180px] font-medium text-foreground">
                        {item.name || "-"}
                      </div>
                      <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                        {item.description || "설명 미입력"}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getAcademyClassLessonTypeLabel(item.lessonType)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getAcademyClassLevelLabel(item.level)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{item.instructorName || "-"}</TableCell>
                    <TableCell className="min-w-[180px]">{item.scheduleText || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatCapacity(item)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatPrice(item.price)}</TableCell>
                    <TableCell>
                      <AcademyClassStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/academy/classes/${item._id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            수정
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={item.status === "hidden" || hidingId === item._id}
                          onClick={() => hideClass(item)}
                        >
                          <EyeOff className="mr-2 h-4 w-4" />
                          {hidingId === item._id ? "처리 중" : "숨김 처리"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              총 {data?.pagination.total.toLocaleString("ko-KR") ?? 0}건 · {data?.pagination.page ?? page} / {data?.pagination.totalPages ?? 1}페이지
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
    </div>
  );
}
