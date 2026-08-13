"use client";

import { adminDataTable } from "@/components/admin/AdminDataTable";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { RacketBadge } from "@/components/badges/RacketBadge";
import { AdminSemanticBadge as SemanticBadge } from "@/components/admin/AdminSemanticBadge";
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
import { racketBrandLabel } from "@/lib/constants";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { getRacketAvailabilityState } from "@/lib/badge-style";
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
import Image from "next/image";
import { useMemo, useState } from "react";
import useSWR from "swr";

function RacketAvailabilityCell({ item }: { item: Item }) {
  const { data } = useSWR<{ ok: boolean; available: number }>(
    `/api/admin/rentals/active-count/${item.id}`,
    authenticatedSWRFetcher,
    {
      dedupingInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const qty = Math.max(0, Number(item.quantity ?? 1));
  const ready = data !== undefined;
  const avail = ready
    ? Math.min(qty, Math.max(0, Number(data?.available ?? 0)))
    : 0;
  const rentedCount = ready ? Math.max(0, qty - avail) : 0;
  const availability = getRacketAvailabilityState({
    ready,
    quantity: qty,
    available: avail,
    rentedCount,
    rentalEnabled: item.rental?.enabled,
    status: item.status,
    isVisible: item.isVisible,
  });
  const stockDisplay = (() => {
    switch (availability) {
      case "loading":
        return "확인 중";
      case "sold":
        return "재고 없음";
      case "rented":
      case "all_rented":
        return "대여 중";
      case "unavailable":
        return "이용 불가";
      case "low_stock":
        return `재고 ${avail}/${qty}`;
      case "purchase_rental_available":
        return qty > 1 ? `재고 ${avail}/${qty}` : "대여 가능";
      case "purchase_available":
        return qty > 1 ? `재고 ${avail}/${qty}` : "재고 있음";
    }
  })();
  return (
    <TableCell className={adminDataTable.cellCenter}>
      <div className={cn(adminDataTable.cellStack, "flex flex-col items-center")}>
        <RacketBadge
          kind="availability"
          state={availability}
          size="sm"
          className={adminTypography.badgeLabel}
        />
        <span className={adminDataTable.secondaryText}>{stockDisplay}</span>
        {item.isVisible === false || item.status === "inactive" || item.status === "비노출" ? (
          <span className={adminDataTable.attentionText}>스토어 숨김</span>
        ) : null}
      </div>
    </TableCell>
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

function ConditionBadge({ condition }: { condition: string }) {
  return (
    <RacketBadge
      kind="condition"
      state={condition}
      size="sm"
      className={adminTypography.badgeLabel}
    />
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
        variant="compact"
        title="라켓 관리"
        description="판매·대여 라켓의 노출 상태, 가격, 재고, 대여 가능 여부, 배송비를 한 곳에서 관리합니다."
        icon={ClipboardList}
        scope="범위: 등록된 라켓"
        helperText="신규 등록 전 가격·배송비·재고 정보를 확인하고, 대여 가능 라켓은 상태와 노출 여부를 우선 점검하세요."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/operations">오늘 처리할 일 보기</Link>
          </Button>
        }
      />

      <section aria-label="라켓 운영 현황">
        <Card className={cn(adminSurface.card, "overflow-hidden")}>
          <CardContent className="grid gap-px bg-border/60 p-0 grid-cols-4">
            {[
              {
                label: "전체 라켓",
                icon: <Package className="h-4 w-4 text-primary" />,
                value: stats.total,
                bgColor: "bg-muted",
              },
              {
                label: "판매 가능",
                icon: <CheckCircle className="h-4 w-4 text-success" />,
                value: stats.available,
                bgColor: "bg-success/10 dark:bg-success/15",
              },
              {
                label: "대여 중",
                icon: <AlertTriangle className="h-4 w-4 text-warning" />,
                value: stats.rented,
                bgColor: "bg-warning/10 dark:bg-warning/15",
              },
              {
                label: "판매 완료",
                icon: <XCircle className="h-4 w-4 text-destructive" />,
                value: stats.sold,
                bgColor: "bg-destructive/10 dark:bg-destructive/15",
              },
            ].map((c) => (
              <div
                key={c.label}
                className="flex min-w-0 items-center justify-between gap-3 bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className={adminTypography.metaMuted}>{c.label}</p>
                  <p className={adminTypography.kpiValueCompact}>{renderKpiValue(c.value)}</p>
                </div>
                <div
                  className={cn(
                    c.bgColor,
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border",
                  )}
                >
                  {c.icon}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      <AdminFilterBar
        quickFilters={
          <>
            <span className={cn("mr-1", adminTypography.panelTitleCompact)}>빠른 보기</span>
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
                className="h-8 rounded-lg px-3"
              >
                {preset.label}
              </Button>
            ))}
          </>
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              필터 초기화
            </Button>
            <Button asChild size="sm" className="h-9">
              <Link href="/admin/rackets/new">
                <Plus className="mr-2 h-4 w-4" />
                라켓 등록
              </Link>
            </Button>
          </>
        }
        activeFilters={
          <>
            <span className="font-medium text-foreground/80">현재 보기: {currentViewLabel}</span>
            {activeFilterLabels.length > 0 ? (
              activeFilterLabels.map((label) => (
                <SemanticBadge key={label} tone="neutral" size="xs">
                  {label}
                </SemanticBadge>
              ))
            ) : (
              <SemanticBadge tone="neutral" emphasis="outline" size="xs">
                전체 조건
              </SemanticBadge>
            )}
            <span className={cn("tabular-nums", adminTypography.metaMuted)}>
            {hasResolvedData
              ? `검색된 라켓: ${filteredItems.length.toLocaleString("ko-KR")}개`
              : "라켓 목록을 불러오는 중입니다."}
            </span>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,2fr)_repeat(3,minmax(130px,1fr))]">
          <div className="relative min-w-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="브랜드, 모델 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full min-w-0 border-border bg-card pl-8 focus:border-border dark:focus:border-border"
            />
          </div>
          <div className="min-w-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full min-w-0 border-border">
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
          </div>
          <div className="min-w-0">
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="h-9 w-full min-w-0 border-border">
                <SelectValue placeholder="등급 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 등급</SelectItem>
                <SelectItem value="A">A급 (최상)</SelectItem>
                <SelectItem value="B">B급 (양호)</SelectItem>
                <SelectItem value="C">C급 (보통)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Select value={exposureFilter} onValueChange={setExposureFilter}>
              <SelectTrigger className="h-9 w-full min-w-0 border-border">
                <SelectValue placeholder="노출 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 노출 유형</SelectItem>
                <SelectItem value="featured">추천 상품</SelectItem>
                <SelectItem value="new">신상품</SelectItem>
                <SelectItem value="sale">할인 상품</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </AdminFilterBar>
      <Card className={cn(adminSurface.tableCard, "flex min-h-0 flex-1 flex-col")}>
        <CardHeader className="shrink-0 border-b border-border bg-muted/30 pb-4">
          <CardTitle className={adminTypography.sectionTitle}>라켓 목록</CardTitle>
          <CardDescription className="text-muted-foreground">{listDescription}</CardDescription>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col p-6">
          <div className="flex-1">
            {isLoading ? (
              <div className={cn(adminSurface.tableCard, "overflow-auto")}>
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
                <Table className="min-w-[720px] table-fixed">
                  <TableHeader className={cn("sticky top-0 z-10", adminSurface.tableHeader)}>
                    <TableRow className={adminDataTable.row}>
                      <TableHead className={cn(adminDataTable.head, "w-[300px]")}>라켓 정보</TableHead>
                      <TableHead className={cn(adminDataTable.headRight, "w-[120px]")}>가격</TableHead>
                      <TableHead className={cn(adminDataTable.headCenter, "w-[90px]")}>등급</TableHead>
                      <TableHead className={cn(adminDataTable.headCenter, "w-[130px]")}>이용 / 재고</TableHead>
                      <TableHead className={cn(adminDataTable.stickyActionHead, "w-[150px]")}>관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow
                        key={item.id}
                        className={adminDataTable.row}
                      >
                        <TableCell className={adminDataTable.cellLeft}>
                          <div className="flex min-w-0 items-center gap-3">
                            {item.images?.[0] && (
                              <Image
                                src={item.images[0] || "/placeholder.svg"}
                                alt={item.model}
                                width={48}
                                height={48}
                                sizes="48px"
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="line-clamp-2 break-keep font-semibold text-foreground">
                                {racketBrandLabel(item.brand)}
                              </div>
                              <div
                                className={cn("line-clamp-2 break-keep", adminTypography.tableSecondary)}
                                title={item.model}
                              >
                                {item.model}
                              </div>
                              {item.marketing?.isNew ||
                              item.marketing?.isFeatured ||
                              (item.marketing?.isSale &&
                                Number(item.marketing.salePrice) > 0 &&
                                Number(item.marketing.salePrice) < Number(item.price)) ? (
                                <div className={cn("mt-1", adminDataTable.secondaryLine)}>
                                  {[
                                    item.marketing?.isNew ? "신상품" : null,
                                    item.marketing?.isFeatured ? "추천" : null,
                                    item.marketing?.isSale &&
                                    Number(item.marketing.salePrice) > 0 &&
                                    Number(item.marketing.salePrice) < Number(item.price)
                                      ? `할인 ${Math.round(
                                          ((Number(item.price) - Number(item.marketing.salePrice)) /
                                            Number(item.price)) *
                                            100,
                                        )}%`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </div>
                              ) : null}
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
                        <RacketAvailabilityCell item={item} />
                        <TableCell
                          className={cn(adminDataTable.stickyActionCell, "w-[150px]")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/rackets/${item.id}/edit`}>
                                <Edit className="mr-1.5 h-3.5 w-3.5" />
                                수정
                              </Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-primary/10 dark:hover:bg-primary/20"
                                  aria-label={`${item.model || "라켓"} 관리 메뉴`}
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
                          </div>
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
