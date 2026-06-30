"use client";

import { adminDataTable } from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface } from "@/components/admin/admin-typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { usedBadgeMeta } from "@/lib/badge-style";
import { racketBrandLabel } from "@/lib/constants";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Edit,
  Eye,
  MoreVertical,
  Package,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";

function StockChip({ id, total }: { id: string; total: number }) {
  const { data } = useSWR<{ ok: boolean; available: number }>(
    `/api/admin/rentals/active-count/${id}`,
    authenticatedSWRFetcher,
    {
      dedupingInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const qty = Math.max(1, total ?? 1);
  const avail = Math.max(0, Number(data?.available ?? 0));
  const soldOut = avail <= 0;
  return (
    <Badge variant={soldOut ? "destructive" : "default"} className="font-normal">
      {qty > 1 ? (soldOut ? `0/${qty}` : `${avail}/${qty}`) : soldOut ? "대여 중" : "대여 가능"}
    </Badge>
  );
}

type Item = {
  id: string;
  brand: string;
  model: string;
  price: number;
  condition: "A" | "B" | "C";
  status: "available" | "rented" | "sold" | "inactive" | "비노출";
  isVisible?: boolean;
  rental?: {
    enabled: boolean;
    deposit: number;
    fee: { d7: number; d15: number; d30: number };
  };
  images?: string[];
  quantity?: number;
  marketing?: {
    isFeatured?: boolean;
    isNew?: boolean;
    isSale?: boolean;
    salePrice?: number;
  };
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    available: { label: "판매가능", variant: "default" },
    rented: { label: "대여중", variant: "secondary" },
    sold: { label: "판매완료", variant: "destructive" },
    inactive: { label: "비노출 상태", variant: "outline" },
    비노출: { label: "비노출 상태", variant: "outline" },
  };
  const config = variants[status] || { label: status, variant: "outline" };
  return (
    <Badge variant={config.variant} className="shrink-0 whitespace-nowrap">
      {config.label}
    </Badge>
  );
}

function ConditionBadge({ condition }: { condition: string }) {
  const meta = usedBadgeMeta("condition", condition);
  const labelMap: Record<string, string> = {
    A: "A급 (최상)",
    B: "B급 (양호)",
    C: "C급 (보통)",
  };
  return (
    <Badge className={cn(meta.className, "shrink-0 whitespace-nowrap")}>
      {labelMap[condition] || meta.label}
    </Badge>
  );
}

export default function AdminRacketsClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [exposureFilter, setExposureFilter] = useState<string>("all");

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setConditionFilter("all");
    setExposureFilter("all");
  };

  const applyQuickView = ({
    status = "all",
    exposure = "all",
  }: {
    status?: string;
    exposure?: string;
  }) => {
    setSearchQuery("");
    setStatusFilter(status);
    setConditionFilter("all");
    setExposureFilter(exposure);
  };

  const qs = new URLSearchParams({
    page: "1",
    pageSize: "50",
    q: searchQuery,
    status: statusFilter === "all" ? "" : statusFilter,
    exposure: exposureFilter,
  });

  const { data, isLoading, error } = useSWR<{
    items: Item[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/api/admin/rackets?${qs.toString()}`, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const commonErrorMessage = error ? getAdminErrorMessage(error) : null;
  // 로딩/에러/실데이터를 분리해서 상단 설명과 본문 상태가 충돌하지 않도록 관리한다.
  const hasDataError = !!commonErrorMessage;
  const hasResolvedData = !isLoading && !hasDataError && !!data;
  const items = hasResolvedData ? (data?.items ?? []) : [];
  const filteredItems = useMemo(() => {
    if (!items.length) return [];

    return items.filter((item) => {
      const matchesCondition = conditionFilter === "all" || item.condition === conditionFilter;

      return matchesCondition;
    });
  }, [items, conditionFilter]);

  const hasActiveTableFilter =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all" ||
    conditionFilter !== "all" ||
    exposureFilter !== "all";

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];

    if (searchQuery.trim()) {
      labels.push(`검색어: ${searchQuery.trim()}`);
    }

    const statusLabelMap: Record<string, string> = {
      available: "판매가능",
      rented: "대여중",
      sold: "판매완료",
      inactive: "비노출",
    };

    const conditionLabelMap: Record<string, string> = {
      A: "A급",
      B: "B급",
      C: "C급",
    };

    const exposureLabelMap: Record<string, string> = {
      featured: "추천 상품",
      new: "신상품",
      sale: "할인 상품",
    };

    if (statusFilter !== "all") {
      labels.push(statusLabelMap[statusFilter] ?? statusFilter);
    }

    if (conditionFilter !== "all") {
      labels.push(conditionLabelMap[conditionFilter] ?? conditionFilter);
    }

    if (exposureFilter !== "all") {
      labels.push(exposureLabelMap[exposureFilter] ?? exposureFilter);
    }

    return labels;
  }, [searchQuery, statusFilter, conditionFilter, exposureFilter]);

  const currentViewLabel = useMemo(() => {
    if (!hasActiveTableFilter) return "전체 라켓";
    if (!searchQuery.trim() && conditionFilter === "all" && exposureFilter === "all") {
      if (statusFilter === "available") return "판매가능 라켓";
      if (statusFilter === "rented") return "대여중 라켓";
      if (statusFilter === "sold") return "판매완료 라켓";
      if (statusFilter === "inactive") return "비노출 라켓";
    }

    if (!searchQuery.trim() && statusFilter === "all" && conditionFilter === "all") {
      if (exposureFilter === "featured") return "추천 라켓";
      if (exposureFilter === "new") return "신상품 라켓";
      if (exposureFilter === "sale") return "할인 라켓";
    }

    return "사용자 지정 조건";
  }, [hasActiveTableFilter, searchQuery, statusFilter, conditionFilter, exposureFilter]);

  const stats = useMemo(() => {
    const total = filteredItems.length;
    const available = filteredItems.filter((item) => item.status === "available").length;
    const rented = filteredItems.filter((item) => item.status === "rented").length;
    const sold = filteredItems.filter((item) => item.status === "sold").length;
    return { total, available, rented, sold };
  }, [filteredItems]);

  const kpiStatus = hasDataError
    ? "error"
    : isLoading && !data
      ? "loading"
      : hasResolvedData
        ? "ready"
        : "pending";

  const renderKpiValue = (value: number) => {
    if (kpiStatus === "loading")
      return <span className="inline-block h-7 w-12 rounded bg-muted animate-pulse align-middle" />;
    if (kpiStatus !== "ready") return "-";
    return value;
  };

  const listDescription = useMemo(() => {
    if (isLoading && !data) return "라켓 목록을 불러오는 중입니다.";
    if (hasDataError) return "라켓 목록을 불러오는 중 문제가 발생했습니다.";
    if (!hasResolvedData) return "라켓 목록을 준비 중입니다.";
    if (filteredItems.length === 0) return "조건에 맞는 라켓이 없습니다.";
    return `총 ${filteredItems.length}개의 라켓이 검색되었습니다.`;
  }, [isLoading, data, hasDataError, hasResolvedData, filteredItems.length]);

  return (
    <AdminPageShell variant="wide" className="space-y-6">
        <AdminPageHeader
          title="라켓 관리"
          description="판매·대여 라켓의 노출 상태, 가격, 재고, 대여 가능 여부, 배송비를 한 곳에서 관리합니다."
          icon={ClipboardList}
          scope="범위: 등록된 라켓"
          helperText="신규 등록 전 가격·배송비·재고 정보를 확인하고, 대여 가능 라켓은 상태와 노출 여부를 우선 점검하세요."
        />

        <section
          className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 shrink-0"
          aria-label="라켓 관리 업무 가이드"
        >
          {[
            {
              title: "신규 라켓 등록",
              description: "브랜드, 모델, 대표 이미지와 기본 정보를 먼저 확인한 뒤 등록하세요.",
            },
            {
              title: "판매·대여 상태 확인",
              description: "판매 가능, 대여 중, 비노출 상태를 점검해 운영 우선순위를 정리하세요.",
            },
            {
              title: "재고·가격·배송비 점검",
              description: "재고 수량과 판매가, 배송비를 함께 확인해 주문 이슈를 예방하세요.",
            },
            {
              title: "노출·상세 정보 관리",
              description: "고객이 보는 상세 정보와 노출 상태를 주기적으로 업데이트하세요.",
            },
          ].map((guide) => (
            <Card key={guide.title} className="border-border/70 bg-muted/30">
              <CardContent className="p-4">
                <p className="text-sm font-semibold leading-relaxed break-keep text-foreground">
                  {guide.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed break-keep text-muted-foreground">
                  {guide.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="mb-6 flex justify-end">
          <Link
            href="/admin/operations"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            오늘 처리할 일 보기
          </Link>
        </div>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8 shrink-0">
          {[
            {
              label: "전체 라켓",
              icon: <Package className="h-6 w-6 text-primary" />,
              value: stats.total,
              bgColor: "bg-muted",
            },
            {
              label: "판매 가능",
              icon: <CheckCircle className="h-6 w-6 text-success" />,
              value: stats.available,
              bgColor: "bg-success/10 dark:bg-success/15",
            },
            {
              label: "대여 중",
              icon: <AlertTriangle className="h-6 w-6 text-warning" />,
              value: stats.rented,
              bgColor: "bg-warning/10 dark:bg-warning/15",
            },
            {
              label: "판매 완료",
              icon: <XCircle className="h-6 w-6 text-destructive" />,
              value: stats.sold,
              bgColor: "bg-destructive/10 dark:bg-destructive/15",
            },
          ].map((c, i) => (
            <Card key={i} className={adminSurface.kpiCard}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                    <p className="text-3xl font-bold text-foreground">{renderKpiValue(c.value)}</p>
                  </div>
                  <div className={`${c.bgColor} rounded-xl p-3 border border-border`}>{c.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
        <section className="mb-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <p className="shrink-0 text-sm font-semibold text-muted-foreground">빠른 보기</p>

            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: "전체",
                  active: !hasActiveTableFilter,
                  onClick: resetFilters,
                },
                {
                  label: "판매가능",
                  active:
                    statusFilter === "available" &&
                    exposureFilter === "all" &&
                    conditionFilter === "all" &&
                    !searchQuery.trim(),
                  onClick: () => applyQuickView({ status: "available" }),
                },
                {
                  label: "대여중",
                  active:
                    statusFilter === "rented" &&
                    exposureFilter === "all" &&
                    conditionFilter === "all" &&
                    !searchQuery.trim(),
                  onClick: () => applyQuickView({ status: "rented" }),
                },
                {
                  label: "판매완료",
                  active:
                    statusFilter === "sold" &&
                    exposureFilter === "all" &&
                    conditionFilter === "all" &&
                    !searchQuery.trim(),
                  onClick: () => applyQuickView({ status: "sold" }),
                },
                {
                  label: "비노출",
                  active:
                    statusFilter === "inactive" &&
                    exposureFilter === "all" &&
                    conditionFilter === "all" &&
                    !searchQuery.trim(),
                  onClick: () => applyQuickView({ status: "inactive" }),
                },
                {
                  label: "추천",
                  active:
                    exposureFilter === "featured" &&
                    statusFilter === "all" &&
                    conditionFilter === "all" &&
                    !searchQuery.trim(),
                  onClick: () => applyQuickView({ exposure: "featured" }),
                },
                {
                  label: "신상품",
                  active:
                    exposureFilter === "new" &&
                    statusFilter === "all" &&
                    conditionFilter === "all" &&
                    !searchQuery.trim(),
                  onClick: () => applyQuickView({ exposure: "new" }),
                },
                {
                  label: "할인",
                  active:
                    exposureFilter === "sale" &&
                    statusFilter === "all" &&
                    conditionFilter === "all" &&
                    !searchQuery.trim(),
                  onClick: () => applyQuickView({ exposure: "sale" }),
                },
              ].map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant={preset.active ? "default" : "outline"}
                  onClick={preset.onClick}
                  className="h-8 rounded-lg px-3 text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </section>
        <div className="mb-6 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">현재 보기: {currentViewLabel}</p>

              {activeFilterLabels.length > 0 ? (
                activeFilterLabels.map((label) => (
                  <Badge key={label} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="text-xs">
                  전체 조건
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {hasResolvedData
                ? `총 ${filteredItems.length.toLocaleString("ko-KR")}개`
                : "라켓 목록을 불러오는 중입니다."}
            </p>
          </div>
        </div>
        <Card className={cn(adminSurface.tableCard, "flex min-h-0 flex-1 flex-col")}>
          <CardHeader className="shrink-0 border-b border-border bg-muted/30 pb-4">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <CardTitle className="text-xl font-semibold text-primary">라켓 찾기</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {listDescription}
                </CardDescription>
              </div>
              <Button
                asChild
                className={[
                  "h-9 px-4 rounded-lg font-medium inline-flex items-center gap-2",
                  "bg-primary hover:bg-primary/90 text-primary-foreground",
                  "border border-border/10 shadow-sm hover:shadow",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "ring-offset-2 ring-offset-background dark:ring-offset-background",
                  "transition-colors",
                ].join(" ")}
              >
                <Link href="/admin/rackets/new">
                  <Plus className="mr-2 h-4 w-4" />
                  라켓 등록
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 flex-1 min-h-0 flex flex-col p-6">
            <div className={cn(adminSurface.filterCard, "mb-4 flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0")}>
              <div className="w-full space-y-3">
                <div className="w-full max-w-md">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="브랜드, 모델 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-xs border-border focus:border-border dark:focus:border-border bg-card"
                    />
                  </div>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-2 md:grid-cols-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-full min-w-0 border-border text-xs">
                      <SelectValue placeholder="상태 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="available">판매가능</SelectItem>
                      <SelectItem value="rented">대여중</SelectItem>
                      <SelectItem value="sold">판매완료</SelectItem>
                      <SelectItem value="inactive">비노출</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={conditionFilter} onValueChange={setConditionFilter}>
                    <SelectTrigger className="h-9 w-full min-w-0 border-border text-xs">
                      <SelectValue placeholder="등급 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 등급</SelectItem>
                      <SelectItem value="A">A급 (최상)</SelectItem>
                      <SelectItem value="B">B급 (양호)</SelectItem>
                      <SelectItem value="C">C급 (보통)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={exposureFilter} onValueChange={setExposureFilter}>
                    <SelectTrigger className="h-9 w-full min-w-0 border-border text-xs">
                      <SelectValue placeholder="노출 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 노출 유형</SelectItem>
                      <SelectItem value="featured">추천 상품</SelectItem>
                      <SelectItem value="new">신상품</SelectItem>
                      <SelectItem value="sale">할인 상품</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="h-9 w-full border-border text-xs hover:bg-primary/10 dark:hover:bg-primary/20 dark:border-border"
                  >
                    필터 초기화
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1">
              {isLoading ? (
                <div className="overflow-auto rounded-lg border border-border">
                  <div className="space-y-4 p-8">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : commonErrorMessage ? (
                <div className="overflow-auto rounded-lg border border-destructive">
                  <div className="p-8 text-center">
                    <p className="text-destructive">{commonErrorMessage}</p>
                  </div>
                </div>
              ) : !filteredItems.length ? (
                <div className="flex flex-col items-center gap-2">
                  <Search className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {hasActiveTableFilter
                      ? "현재 조건에 맞는 라켓이 없습니다."
                      : "등록된 라켓이 없습니다."}
                  </p>
                </div>
              ) : (
                <div className="overflow-auto rounded-lg border border-border">
                  <Table className="min-w-[860px]">
                    <TableHeader className={cn("sticky top-0 z-10", adminSurface.tableHeader)}>
                      <TableRow className={adminDataTable.row}>
                        <TableHead className={adminDataTable.head}>라켓 정보</TableHead>
                        <TableHead className={adminDataTable.headRight}>가격</TableHead>
                        <TableHead className={adminDataTable.headCenter}>등급</TableHead>
                        <TableHead className={adminDataTable.headCenter}>상태</TableHead>
                        <TableHead className={adminDataTable.headCenter}>대여</TableHead>
                        <TableHead className={adminDataTable.headCenter}>재고</TableHead>
                        <TableHead className={adminDataTable.headRight}>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow
                          key={item.id}
                          className="border-b border-border last:border-b-0 dark:border-border hover:bg-primary/10 dark:hover:bg-primary/20 even:bg-muted/30 dark:even:bg-card transition-colors"
                        >
                          <TableCell className={adminDataTable.cellLeft}>
                            <div className="flex min-w-0 items-center gap-3">
                              {item.images?.[0] && (
                                <img
                                  src={item.images[0] || "/placeholder.svg"}
                                  alt={item.model}
                                  className="h-12 w-12 rounded-lg object-cover"
                                />
                              )}
                              <div className="min-w-0">
                                <div className="line-clamp-2 break-keep font-semibold text-foreground">
                                  {racketBrandLabel(item.brand)}
                                </div>
                                <div
                                  className="line-clamp-2 break-keep text-sm text-muted-foreground"
                                  title={item.model}
                                >
                                  {item.model}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {item.marketing?.isNew && <Badge variant="secondary">NEW</Badge>}
                                  {item.marketing?.isFeatured && (
                                    <Badge variant="secondary">추천</Badge>
                                  )}
                                  {item.marketing?.isSale && (
                                    <Badge variant="destructive">SALE</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={cn(adminDataTable.moneyCell, "whitespace-nowrap")}>
                            <span className="font-semibold text-foreground">
                              {item.price?.toLocaleString()}원
                            </span>
                          </TableCell>
                          <TableCell className={adminDataTable.cellCenter}>
                            <ConditionBadge condition={item.condition} />
                          </TableCell>
                          <TableCell className={adminDataTable.cellCenter}>
                            <div className="flex flex-col items-center gap-1">
                              <StatusBadge status={item.status} />
                              {item.isVisible === false && (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 whitespace-nowrap border-warning/60 text-warning"
                                >
                                  숨김
                                </Badge>
                              )}
                              {(item.status === "inactive" || item.status === "비노출") && (
                                <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                                  기존 비노출 상태
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={adminDataTable.cellCenter}>
                            <Badge
                              className={cn(
                                item.rental?.enabled
                                  ? usedBadgeMeta("rental", "available").className
                                  : usedBadgeMeta("rental", "unavailable").className,
                                "shrink-0 whitespace-nowrap",
                              )}
                            >
                              {item.rental?.enabled ? "가능" : "불가"}
                            </Badge>
                          </TableCell>
                          <TableCell className={adminDataTable.cellCenter}>
                            <StockChip id={item.id} total={item.quantity ?? 1} />
                          </TableCell>
                          <TableCell className={adminDataTable.actionCell}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 hover:bg-primary/10 dark:hover:bg-primary/20"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-max border-border">
                                <DropdownMenuLabel>작업</DropdownMenuLabel>
                                <DropdownMenuItem asChild className="whitespace-nowrap">
                                  <Link href={`/rackets/${item.id}`} className="flex items-center">
                                    <Eye className="h-4 w-4 mr-2" />
                                    {item.isVisible === false ||
                                    item.status === "inactive" ||
                                    item.status === "비노출"
                                      ? "관리자 미리보기"
                                      : "상세 보기"}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="whitespace-nowrap">
                                  <Link
                                    href={`/admin/rackets/${item.id}/edit`}
                                    className="flex items-center"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    수정
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
    </AdminPageShell>
  );
}
