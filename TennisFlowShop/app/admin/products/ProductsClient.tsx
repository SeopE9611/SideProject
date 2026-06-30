"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  CheckCircle2,
  MoreHorizontal,
  Package,
  PackageSearch,
  Plus,
  Search,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import useSWR from "swr";

import BrandFilter from "@/app/admin/products/product-filters/BrandFilter";
import MaterialFilter from "@/app/admin/products/product-filters/MaterialFilter";
import StockStatusFilter from "@/app/admin/products/product-filters/StockStatusFilter";
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
  DropdownMenuSeparator,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { runAdminActionWithToast } from "@/lib/admin/adminActionHelpers";
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import {
  STRING_BRANDS,
  STRING_MATERIALS,
  stringBrandLabel,
  stringMaterialLabel,
} from "@/lib/constants";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Product = {
  _id: string;
  name: string;
  sku: string;
  brand: string;
  gauge: string;
  material: string;
  price: number;
  isVisible?: boolean;
  inventory?: { stock: number; lowStock?: number };
  computedStatus?: StatusKey;
};

const STATUS_KEYS = ["active", "low_stock", "out_of_stock"] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

// 상태 매핑(아이콘+색)
const STATUS_UI: Record<StatusKey, { label: string; color: string; Icon: React.ElementType }> = {
  active: {
    label: "판매중",
    color:
      "bg-success/10 text-success ring-1 ring-success/30 " +
      "dark:bg-success/15 dark:text-success dark:ring-success/40",
    Icon: CheckCircle2,
  },

  low_stock: {
    label: "재고 부족",
    color:
      "bg-warning/10 text-warning ring-1 ring-warning/30 " +
      "dark:bg-warning/15 dark:text-warning dark:ring-warning/40",
    Icon: TriangleAlert,
  },

  out_of_stock: {
    label: "품절",
    color:
      "bg-destructive/10 text-destructive ring-1 ring-destructive/30 " +
      "dark:bg-destructive/15 dark:text-destructive dark:ring-destructive/40",
    Icon: XCircle,
  },
};

// 브랜드, 재질 매핑
const BRAND_OPTIONS = STRING_BRANDS.map(({ value, label }) => ({
  id: value,
  label,
}));

const MATERIAL_OPTIONS = STRING_MATERIALS.map(({ value, label }) => ({
  id: value,
  label,
}));
const brandLabel = stringBrandLabel;
const materialLabel = stringMaterialLabel;

// 입력 디바운스
function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const AdminConfirmDialog = dynamic(() => import("@/components/admin/AdminConfirmDialog"), {
  loading: () => null,
});

export default function ProductsClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedTerm = useDebounce(searchTerm, 250);

  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [exposureFilter, setExposureFilter] = useState<string>("all");

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [pendingDeleteProductId, setPendingDeleteProductId] = useState<string | null>(null);
  const ROW_PX = 56; // 한 행 높이를 56px = h-14 로 고정

  // 허용되는 정렬 필드(서버 allowMap과 일치시켜야 함)
  type SortField = "name" | "brand" | "gauge" | "material" | "price" | "stock" | "createdAt";

  const [sort, setSort] = useState<{
    field: SortField;
    dir: "asc" | "desc";
  } | null>(null);

  // 헤더 클릭 시 토글
  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, dir: "asc" }; // 1클릭: asc
      if (prev.dir === "asc") return { field, dir: "desc" }; // 2클릭: desc
      return null; // 3클릭: 기본(등록순)
    });
    setPage(1);
  };
  // 서버 페이지네이션 쿼리 / 쿼리스트링: sort가 있을 때만 세팅
  const sp = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    q: debouncedTerm,
    brand: brandFilter,
    material: materialFilter,
    status: statusFilter,
    exposure: exposureFilter,
  });
  if (sort) sp.set("sort", `${sort.field}:${sort.dir}`);
  const qs = sp.toString();

  type ApiRes = {
    items: Product[];
    total: number;
    page: number;
    pageSize: number;
    totalsByStatus: Record<"active" | "low_stock" | "out_of_stock", number>; // 전역 통계(필터 무시)
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR<ApiRes>(
    `/api/admin/products?${qs}`,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true, // SWR v2 전환 중 깜빡임 줄어듬
    },
  );

  // 3차 보완: data 미확정(undefined)과 실제 빈 목록([])을 명확히 분리한다.
  const items = data?.items ?? [];
  const hasResolvedData = !!data;
  const hasDataError = !!error;
  const isListLoadingState = (isLoading || isValidating) && !hasResolvedData;
  const isActualEmptyState = hasResolvedData && !hasDataError && items.length === 0;
  const commonErrorMessage = error ? getAdminErrorMessage(error) : null;
  const total = data?.total ?? 0;
  const totalPages = hasResolvedData ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : null;
  const currentPage = totalPages ? Math.min(page, totalPages) : null;

  const hasActiveTableFilter =
    debouncedTerm.trim().length > 0 ||
    brandFilter !== "all" ||
    materialFilter !== "all" ||
    statusFilter !== "all" ||
    exposureFilter !== "all";

  // 전역 카운트(필터 무시)
  const totalsByStatus = data?.totalsByStatus ?? {
    active: 0,
    low_stock: 0,
    out_of_stock: 0,
  };
  const totalAll = totalsByStatus.active + totalsByStatus.low_stock + totalsByStatus.out_of_stock;
  const activeAll = totalsByStatus.active;
  const lowStockAll = totalsByStatus.low_stock;
  const outOfStockAll = totalsByStatus.out_of_stock;

  // 삭제 핸들러
  const handleDelete = async (id: string) => {
    const result = await runAdminActionWithToast({
      action: () => adminMutator(`/api/admin/products/${id}`, { method: "DELETE" }),
      successMessage: "상품이 삭제되었습니다.",
      fallbackErrorMessage: "삭제 중 오류가 발생했습니다.",
    });
    if (result) await mutate();
  };

  // 접근성(aria-sort) + 클릭 가능한 헤더
  const renderSortButton = ({
    field,
    children,
    align = "left",
  }: {
    field: SortField;
    children: React.ReactNode;
    align?: "left" | "center" | "right";
  }) => {
    const active = !!sort && sort.field === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        aria-label={`${children} ${active ? (sort!.dir === "asc" ? "오름차순 정렬됨" : "내림차순 정렬됨") : "정렬 안 됨"}`}
        className={cn(
          "group inline-flex w-full items-center gap-1 select-none whitespace-nowrap",
          align === "right"
            ? "justify-end text-right"
            : align === "center"
              ? "justify-center text-center"
              : "justify-start text-left",
        )}
        title={active ? (sort!.dir === "asc" ? "오름차순" : "내림차순") : "등록순"}
      >
        <span className="font-medium">{children}</span>
        {active ? (
          sort!.dir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 opacity-80" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 opacity-80" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-50 group-hover:opacity-80" />
        )}
      </button>
    );
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleBrandFilterChange = (value: string) => {
    setBrandFilter(value);
    setPage(1);
  };

  const handleMaterialFilterChange = (value: string) => {
    setMaterialFilter(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleExposureFilterChange = (value: string) => {
    setExposureFilter(value);
    setPage(1);
  };

  useEffect(() => {
    if (commonErrorMessage) showErrorToast(commonErrorMessage);
  }, [commonErrorMessage]);

  const resetFilters = () => {
    setBrandFilter("all");
    setMaterialFilter("all");
    setStatusFilter("all");
    setExposureFilter("all");
    setSearchTerm("");
    setPage(1);
  };

  // 상품 목록 빠른 보기입니다.
  // 서버가 이미 받는 필터 값만 사용하고, 새 API query는 만들지 않습니다.
  const applyQuickView = ({
    status = "all",
    exposure = "all",
  }: {
    status?: string;
    exposure?: string;
  }) => {
    setSearchTerm("");
    setBrandFilter("all");
    setMaterialFilter("all");
    setStatusFilter(status);
    setExposureFilter(exposure);
    setPage(1);
  };

  // 현재 화면에 적용된 필터를 운영자가 읽기 쉬운 라벨로 변환합니다.
  const activeFilterLabels = [
    debouncedTerm.trim() ? `검색어: ${debouncedTerm.trim()}` : null,
    brandFilter !== "all" ? `브랜드: ${brandLabel(brandFilter)}` : null,
    materialFilter !== "all" ? `재질: ${materialLabel(materialFilter)}` : null,
    statusFilter !== "all"
      ? `재고 상태: ${STATUS_UI[statusFilter as StatusKey]?.label ?? statusFilter}`
      : null,
    exposureFilter !== "all"
      ? `노출: ${exposureFilter === "featured" ? "추천 상품" : exposureFilter === "new" ? "신상품" : exposureFilter === "sale" ? "할인 상품" : exposureFilter}`
      : null,
  ].filter((label): label is string => Boolean(label));

  // 빠른 보기 라벨은 정확히 해당 조건만 적용된 경우에만 표시합니다.
  const currentViewLabel = !hasActiveTableFilter
    ? "전체 상품"
    : statusFilter === "active" &&
        !debouncedTerm.trim() &&
        brandFilter === "all" &&
        materialFilter === "all" &&
        exposureFilter === "all"
      ? "판매 중"
      : statusFilter === "low_stock" &&
          !debouncedTerm.trim() &&
          brandFilter === "all" &&
          materialFilter === "all" &&
          exposureFilter === "all"
        ? "재고 부족"
        : statusFilter === "out_of_stock" &&
            !debouncedTerm.trim() &&
            brandFilter === "all" &&
            materialFilter === "all" &&
            exposureFilter === "all"
          ? "품절"
          : exposureFilter === "featured" &&
              !debouncedTerm.trim() &&
              brandFilter === "all" &&
              materialFilter === "all" &&
              statusFilter === "all"
            ? "추천 상품"
            : exposureFilter === "new" &&
                !debouncedTerm.trim() &&
                brandFilter === "all" &&
                materialFilter === "all" &&
                statusFilter === "all"
              ? "신상품"
              : exposureFilter === "sale" &&
                  !debouncedTerm.trim() &&
                  brandFilter === "all" &&
                  materialFilter === "all" &&
                  statusFilter === "all"
                ? "할인 상품"
                : "사용자 지정 조건";

  return (
    <AdminPageShell variant="wide" className="space-y-6">
        {commonErrorMessage && (
          <div className="text-center text-destructive">{commonErrorMessage}</div>
        )}
        <AdminPageHeader
          title="상품 관리"
          description="판매 상품의 노출 상태, 가격, 재고, 색상 옵션, 배송비를 한 곳에서 관리합니다."
          icon={PackageSearch}
          scope="범위: 스트링 상품"
          helperText="신규 등록 전 가격·배송비·재고 정보를 확인하고, 판매 중 상품은 품절/옵션 상태를 우선 점검하세요."
        />

        <Card className={adminSurface.card}>
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium leading-relaxed text-foreground">
                오늘의 상품 운영 우선순위를 먼저 확인하고 목록에서 바로 점검하세요.
              </p>
              <Link
                href="/admin/operations"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                오늘 처리할 일 보기
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                "신규 상품 등록: 상품명·브랜드·규격과 기본 정보를 먼저 확인하세요.",
                "재고/색상 옵션 확인: 판매 중 상품의 품절 여부와 옵션별 재고를 우선 점검하세요.",
                "가격·배송비 점검: 판매 가격, 할인 반영, 배송비 설정이 정확한지 확인하세요.",
                "판매 상태/노출 관리: 비활성·비노출 상품이 의도된 상태인지 주기적으로 검토하세요.",
              ].map((guide) => (
                <div key={guide} className="rounded-md border border-border bg-muted/40 px-3 py-2">
                  <p className="text-sm leading-relaxed text-foreground">{guide}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <section className="mb-6 grid shrink-0 gap-3 sm:grid-cols-2 bp-md:mb-8 bp-md:gap-6 lg:grid-cols-4">
          {[
            {
              label: "전체 상품",
              icon: <Package className="h-6 w-6 text-foreground" />,
              value: totalAll,
              bgColor: "bg-muted",
            },
            {
              label: "판매 중",
              icon: <CheckCircle className="h-6 w-6 text-success" />,
              value: activeAll,
              bgColor: "bg-success/10 dark:bg-success/15",
            },
            {
              label: "재고 부족",
              icon: <AlertTriangle className="h-6 w-6 text-warning" />,
              value: lowStockAll,
              bgColor: "bg-warning/10 dark:bg-warning/15",
            },
            {
              label: "품절",
              icon: <XCircle className="h-6 w-6 text-destructive" />,
              value: outOfStockAll,
              bgColor: "bg-destructive/10 dark:bg-destructive/15",
            },
          ].map((c, i) => (
            <Card key={i} className={adminSurface.kpiCard}>
              <CardContent className="p-4 bp-md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                    <p className="text-2xl font-bold text-foreground bp-md:text-3xl">
                      {hasResolvedData ? c.value : "-"}
                    </p>
                  </div>
                  <div className={`${c.bgColor} rounded-xl p-3 border border-border`}>{c.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* 빠른 보기 */}
        <Card className={adminSurface.filterCard}>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <span className="mr-1 text-xs font-semibold text-muted-foreground">빠른 보기</span>

            <Button
              type="button"
              size="sm"
              variant={!hasActiveTableFilter ? "default" : "outline"}
              onClick={resetFilters}
            >
              전체
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentViewLabel === "판매 중" ? "default" : "outline"}
              onClick={() => applyQuickView({ status: "active" })}
            >
              판매 중
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentViewLabel === "재고 부족" ? "default" : "outline"}
              onClick={() => applyQuickView({ status: "low_stock" })}
            >
              재고 부족
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentViewLabel === "품절" ? "default" : "outline"}
              onClick={() => applyQuickView({ status: "out_of_stock" })}
            >
              품절
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentViewLabel === "추천 상품" ? "default" : "outline"}
              onClick={() => applyQuickView({ exposure: "featured" })}
            >
              추천 상품
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentViewLabel === "신상품" ? "default" : "outline"}
              onClick={() => applyQuickView({ exposure: "new" })}
            >
              신상품
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentViewLabel === "할인 상품" ? "default" : "outline"}
              onClick={() => applyQuickView({ exposure: "sale" })}
            >
              할인 상품
            </Button>
          </CardContent>
        </Card>

        {/* 현재 보기 요약 */}
        <div
          className={cn(
            "mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3 text-sm",
            adminSurface.cardMuted,
          )}
        >
          <p className="font-semibold text-foreground">현재 보기: {currentViewLabel}</p>

          {activeFilterLabels.length > 0 && (
            <p className="text-muted-foreground">필터: {activeFilterLabels.join(" / ")}</p>
          )}

          <p className="text-muted-foreground">
            총 {hasResolvedData ? total.toLocaleString("ko-KR") : "-"}개
          </p>

          {hasActiveTableFilter && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={resetFilters}
            >
              필터 초기화
            </Button>
          )}
        </div>

        <Card className={cn(adminSurface.tableCard, "flex min-h-0 flex-1 flex-col")}>
          <CardHeader className="shrink-0 border-b border-border bg-muted/30 pb-4">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <CardTitle className="text-xl font-semibold text-foreground">
                  스트링 상품 찾기
                </CardTitle>
                <CardDescription className="text-foreground">
                  {hasDataError
                    ? "상품 목록을 불러오지 못했습니다."
                    : hasResolvedData
                      ? total > 0
                        ? `현재 조건으로 ${total}개의 스트링 상품이 검색되었습니다.`
                        : "현재 조건에 맞는 스트링 상품이 없습니다."
                      : "스트링 상품의 재고, 노출 상태, 가격 정보를 조회하고 관리합니다."}
                </CardDescription>
              </div>
              <Button
                asChild
                className={[
                  // 사이즈/레이아웃
                  "h-auto min-h-9 w-full px-4 rounded-lg font-medium inline-flex items-center justify-center gap-2 whitespace-normal text-center leading-snug sm:w-auto",
                  // 색상(라이트/다크 모두 자연스러운 플랫)
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  // 경계/그림자: 지나치지 않게만
                  "border border-border/10 dark:border-border/10 shadow-sm hover:shadow",
                  // 포커스 접근성
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "ring-offset-2 ring-offset-background dark:ring-offset-background",
                  // 전환
                  "transition-colors",
                ].join(" ")}
              >
                <Link href="/admin/products/new">
                  <Plus className="mr-2 h-4 w-4" />
                  신규 스트링 등록
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col space-y-5 p-4 bp-md:space-y-6 bp-md:p-6">
            {/* 검색/필터 */}
            <div className={cn(adminSurface.filterCard, "mb-4 flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0")}>
              <div className="w-full space-y-3">
                {/* 검색 */}
                <div className="w-full md:max-w-md">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="스트링명, 브랜드, SKU로 검색"
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-8 h-9 text-xs border-border focus:border-border dark:border-border dark:focus:border-border bg-card"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3 hover:bg-muted dark:hover:bg-muted"
                        onClick={() => handleSearchChange("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 필터 */}
                <div className="grid w-full gap-2 border-t border-border pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  <BrandFilter
                    value={brandFilter}
                    onChange={handleBrandFilterChange}
                    options={BRAND_OPTIONS.map((o) => o.id)}
                  />
                  <MaterialFilter
                    value={materialFilter}
                    onChange={handleMaterialFilterChange}
                    options={MATERIAL_OPTIONS.map((o) => o.id)}
                  />
                  <StockStatusFilter value={statusFilter} onChange={handleStatusFilterChange} />
                  <Select value={exposureFilter} onValueChange={handleExposureFilterChange}>
                    <SelectTrigger className="h-9 w-full min-w-0 text-xs">
                      <SelectValue placeholder="노출 유형 전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">노출 유형 전체</SelectItem>
                      <SelectItem value="featured">추천 상품</SelectItem>
                      <SelectItem value="new">신상품</SelectItem>
                      <SelectItem value="sale">할인 상품</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="h-9 w-full border-border text-xs hover:bg-muted dark:border-border dark:hover:bg-card"
                  >
                    필터 초기화
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full bg-transparent border-border text-xs hover:bg-muted dark:border-border dark:hover:bg-card"
                    onClick={() => setSort(null)}
                  >
                    정렬 초기화
                  </Button>
                </div>
              </div>
            </div>

            {/* 테이블 */}
            <div className="flex-1">
              <div className="overflow-auto rounded-lg border border-border">
                <Table className="min-w-[920px] table-fixed [&_tr]:border-0">
                  <TableHeader className={cn("sticky top-0 z-10", adminSurface.tableHeader)}>
                    <TableRow className={adminDataTable.row}>
                      <TableHead className={cn(adminDataTable.head, "w-[32%]")}>
                        {renderSortButton({
                          field: "name",
                          children: "스트링명",
                        })}
                      </TableHead>
                      <TableHead className={cn(adminDataTable.headCenter, "w-[12%]")}>
                        {renderSortButton({
                          field: "brand",
                          align: "center",
                          children: "브랜드",
                        })}
                      </TableHead>
                      <TableHead className={cn(adminDataTable.headCenter, "w-[10%]")}>
                        {renderSortButton({
                          field: "gauge",
                          align: "center",
                          children: "게이지",
                        })}
                      </TableHead>
                      <TableHead className={cn(adminDataTable.headCenter, "w-[14%]")}>
                        {renderSortButton({
                          field: "material",
                          align: "center",
                          children: "재질",
                        })}
                      </TableHead>
                      <TableHead className={cn(adminDataTable.headRight, "w-[12%]")}>
                        {renderSortButton({
                          field: "price",
                          align: "right",
                          children: "가격",
                        })}
                      </TableHead>
                      <TableHead className={cn(adminDataTable.headRight, "w-[10%]")}>
                        {renderSortButton({
                          field: "stock",
                          align: "right",
                          children: "재고",
                        })}
                      </TableHead>
                      <TableHead className={cn(adminDataTable.headCenter, "w-[10%]")}>상태</TableHead>
                      <TableHead className={cn(adminDataTable.headRight, "w-[10%]")}>관리</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isListLoadingState ? (
                      <TableRow className="border-0">
                        <TableCell colSpan={8} className="py-4">
                          <div className="space-y-2">
                            {Array.from({ length: 6 }).map((_, rowIdx) => (
                              <div
                                key={`admin-products-loading-row-${rowIdx}`}
                                className="grid grid-cols-8 gap-2"
                              >
                                {Array.from({ length: 8 }).map((__, colIdx) => (
                                  <Skeleton
                                    key={`admin-products-loading-cell-${rowIdx}-${colIdx}`}
                                    className="h-7 w-full"
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : isActualEmptyState ? (
                      <TableRow className="border-0">
                        <TableCell colSpan={8} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">등록된 상품이 없습니다.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((s) => {
                        const statusKey: StatusKey = (s.computedStatus ?? "active") as StatusKey;
                        const S = STATUS_UI[statusKey];
                        const isHidden = s.isVisible === false;
                        return (
                          <TableRow
                            key={s._id}
                            className="h-14 border-b border-border last:border-b-0 dark:border-border hover:bg-muted dark:hover:bg-card even:bg-muted dark:even:bg-card transition-colors"
                          >
                            <TableCell className={adminDataTable.cellLeft}>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/products/${s._id}`}
                                    className="line-clamp-2 break-keep font-medium text-foreground hover:text-foreground dark:hover:text-foreground"
                                    title={s.name}
                                  >
                                    {s.name}
                                  </Link>
                                  {isHidden && (
                                    <Badge
                                      variant="outline"
                                      className="shrink-0 whitespace-nowrap rounded-full px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
                                    >
                                      숨김
                                    </Badge>
                                  )}
                                </div>
                                <div
                                  className="truncate font-mono text-[11px] text-muted-foreground"
                                  title={s.sku}
                                >
                                  {s.sku}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className={adminDataTable.cellCenter}>
                              <Badge
                                variant="secondary"
                                className="shrink-0 whitespace-nowrap rounded-full border border-border bg-muted px-2 py-0.5 text-foreground dark:border-border dark:bg-muted dark:text-foreground"
                              >
                                {brandLabel(s.brand)}
                              </Badge>
                            </TableCell>

                            <TableCell className={cn(adminDataTable.cellCenter, "whitespace-nowrap text-foreground")}>
                              {s.gauge}
                            </TableCell>
                            <TableCell className={cn(adminDataTable.cellCenter, "whitespace-nowrap text-foreground")}>
                              {materialLabel(s.material)}
                            </TableCell>

                            <TableCell className={cn(adminDataTable.moneyCell, "whitespace-nowrap font-medium text-foreground")}>
                              {s.price?.toLocaleString?.() ?? s.price}원
                            </TableCell>

                            <TableCell className={adminDataTable.cellNumber}>
                              {s.inventory?.stock && s.inventory.stock > 0 ? (
                                <span className="font-medium text-foreground">
                                  {s.inventory.stock}
                                </span>
                              ) : (
                                <span className="font-medium text-foreground">품절</span>
                              )}
                            </TableCell>

                            <TableCell className={adminDataTable.cellCenter}>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-xs font-medium",
                                  S.color,
                                )}
                              >
                                <S.Icon className="h-3.5 w-3.5" />
                                {S.label}
                              </Badge>
                            </TableCell>

                            <TableCell className={adminDataTable.actionCell}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 hover:bg-muted dark:hover:bg-muted"
                                  >
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="border-border">
                                  <DropdownMenuLabel>작업</DropdownMenuLabel>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/products/${s._id}`}>
                                      {isHidden ? "관리자 미리보기" : "상세 보기"}
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/products/${s._id}/edit`}>수정</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setPendingDeleteProductId(s._id)}
                                  >
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}

                    {/* 마지막 페이지 보정용 필러 행(로딩/빈상태 제외) */}
                    {hasResolvedData &&
                      !hasDataError &&
                      !(isLoading || isValidating) &&
                      !hasActiveTableFilter &&
                      items.length > 0 &&
                      Array.from({
                        length: Math.max(0, PAGE_SIZE - items.length),
                      }).map((_, i) => (
                        <TableRow key={`filler-${i}`} className="pointer-events-none">
                          <TableCell colSpan={8} className="p-0">
                            <div className="h-14" />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 페이지네이션 */}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {currentPage ?? "-"} / {totalPages ?? "-"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, Math.min(p, totalPages ?? 1) - 1))}
                  disabled={!currentPage || currentPage <= 1}
                  className="border-border hover:bg-muted dark:hover:bg-muted"
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages ?? 1, Math.min(p, totalPages ?? 1) + 1))
                  }
                  disabled={!currentPage || !totalPages || currentPage >= totalPages}
                  className="border-border hover:bg-muted dark:hover:bg-muted"
                >
                  다음
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      <AdminConfirmDialog
        open={pendingDeleteProductId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteProductId(null);
        }}
        onCancel={() => setPendingDeleteProductId(null)}
        onConfirm={async () => {
          const productId = pendingDeleteProductId;
          if (!productId) return;
          setPendingDeleteProductId(null);
          await handleDelete(productId);
        }}
        severity="danger"
        title="상품을 삭제할까요?"
        description="삭제 후에는 되돌릴 수 없습니다. 관련 운영 데이터 영향을 확인한 뒤 진행해 주세요."
        confirmText="삭제"
        cancelText="취소"
        eventKey="admin-products-delete-confirm"
        eventMeta={{ productId: pendingDeleteProductId }}
      />
    </AdminPageShell>
  );
}
