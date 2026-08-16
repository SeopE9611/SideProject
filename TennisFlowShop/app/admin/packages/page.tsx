"use client";

import { useDebouncedValue } from "@/app/admin/packages/_hooks/useDebouncedValue";
import {
  DEFAULT_PACKAGE_LIST_FILTERS,
  badgeSizeCls,
  getAdminPackageActivationBadgeSpec,
  getAdminPackageActivationLabel,
  getAdminPackageAttentionReasonLabel,
  getAdminPackagePaymentLabel,
  getAdminPackageUsageBadgeSpec,
  getAdminPackageUsageLabel,
  type PackageActivationFilter,
  type PackageAttentionFilter,
  type PackageListItem,
  type PackagePaymentFilter,
  type PackageSortValue,
  type PackageType,
  type PackageUsageFilter,
  type PackagesResponse,
  type ServiceType,
  type SortKey,
} from "@/app/admin/packages/_lib/packagesPageConfig";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { adminDataTable } from "@/components/admin/AdminDataTable";
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
  AdminStatusGroup,
} from "@/components/admin/AdminListTable";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminReferencePopover from "@/components/admin/AdminReferencePopover";
import AdminRowActionMenu from "@/components/admin/AdminRowActionMenu";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { buildQueryString } from "@/lib/admin/urlQuerySync";
import { useAdminListQueryState } from "@/lib/admin/useAdminListQueryState";
import { getPaymentStatusBadgeSpec } from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Eye,
  Filter,
  Package,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
const PAYMENT_CHECK_PRESET = "payment-check" as const;
const PACKAGE_LIST_COLUMNS =
  "grid-cols-[minmax(240px,1.15fr)_minmax(300px,1.35fr)_minmax(240px,1fr)_130px_52px]";
type PackagePresetFilter = typeof PAYMENT_CHECK_PRESET | null;

export default function PackageOrdersClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const DEFAULTS = DEFAULT_PACKAGE_LIST_FILTERS;

  const USAGE_VALUES: ReadonlyArray<PackageUsageFilter> = [
    "all",
    "available",
    "not_issued",
    "paused",
    "exhausted",
    "expired",
    "cancelled",
    "unknown",
  ];
  const PACKAGE_TYPE_VALUES: ReadonlyArray<"all" | PackageType> = [
    "all",
    "10회권",
    "30회권",
    "50회권",
    "100회권",
  ];
  const PAYMENT_VALUES: ReadonlyArray<PackagePaymentFilter> = [
    "all",
    "pending_any",
    "bank_pending",
    "pg_pending",
    "pending",
    "paid",
    "failed",
    "cancelled",
    "refunding",
    "refunded",
    "unknown",
    "not_required",
  ];
  const ACTIVATION_VALUES: ReadonlyArray<PackageActivationFilter> = [
    "all",
    "active",
    "awaiting_payment",
    "pending_issue",
    "paused",
    "ended",
    "cancelled",
    "failed",
    "unknown",
  ];
  const ATTENTION_VALUES: ReadonlyArray<PackageAttentionFilter> = [
    "all",
    "needs_attention",
    "clear",
  ];
  const SERVICE_TYPE_VALUES: ReadonlyArray<"all" | ServiceType> = ["all", "방문", "출장"];

  const isUsageFilter = (value: string | null): value is PackageUsageFilter =>
    !!value && USAGE_VALUES.includes(value as PackageUsageFilter);
  const isPaymentFilter = (value: string | null): value is PackagePaymentFilter =>
    !!value && PAYMENT_VALUES.includes(value as PackagePaymentFilter);
  const isActivationFilter = (value: string | null): value is PackageActivationFilter =>
    !!value && ACTIVATION_VALUES.includes(value as PackageActivationFilter);
  const isAttentionFilter = (value: string | null): value is PackageAttentionFilter =>
    !!value && ATTENTION_VALUES.includes(value as PackageAttentionFilter);
  const isServiceTypeFilter = (value: string | null): value is "all" | ServiceType =>
    !!value && SERVICE_TYPE_VALUES.includes(value as "all" | ServiceType);
  const isPackageTypeFilter = (value: string | null): value is "all" | PackageType =>
    !!value && PACKAGE_TYPE_VALUES.includes(value as "all" | PackageType);

  const { state, patchState, setPage } = useAdminListQueryState<{
    page: number;
    searchTerm: string;
    usageFilter: PackageUsageFilter;
    packageTypeFilter: "all" | PackageType;
    paymentFilter: PackagePaymentFilter;
    activationFilter: PackageActivationFilter;
    attentionFilter: PackageAttentionFilter;
    serviceTypeFilter: "all" | ServiceType;
    presetFilter: PackagePresetFilter;
    sortBy: SortKey | null;
    sortDirection: "asc" | "desc";
  }>({
    pathname: pathname || "/admin/packages",
    searchParams,
    replace: router.replace,
    defaults: {
      page: DEFAULTS.page,
      searchTerm: DEFAULTS.q,
      usageFilter: DEFAULTS.usage,
      packageTypeFilter: DEFAULTS.package,
      paymentFilter: DEFAULTS.payment,
      activationFilter: DEFAULTS.activation,
      attentionFilter: DEFAULTS.attention,
      serviceTypeFilter: DEFAULTS.service,
      presetFilter: null,
      sortBy: DEFAULTS.sortBy,
      sortDirection: DEFAULTS.sortDirection,
    },
    parse: (sp, defaults) => {
      const pkgRaw = sp.get("package");
      const normalizedPkg =
        pkgRaw && ["10", "30", "50", "100"].includes(pkgRaw) ? `${pkgRaw}회권` : pkgRaw;
      const sortParam = sp.get("sort");
      let sortBy: SortKey | null = defaults.sortBy;
      let sortDirection: "asc" | "desc" = defaults.sortDirection;
      if (sortParam) {
        const [rk, rd] = sortParam.split(":");
        const normalizedSortKey = rk === "status" ? "usage" : rk;
        if (
          normalizedSortKey &&
          [
            "customer",
            "purchaseDate",
            "expiryDate",
            "remainingSessions",
            "price",
            "usage",
            "payment",
            "package",
            "progress",
            "activation",
            "attention",
          ].includes(normalizedSortKey)
        )
          sortBy = normalizedSortKey as SortKey;
        if (rd === "asc" || rd === "desc") sortDirection = rd;
      }

      return {
        page: Math.max(
          1,
          Number.parseInt(sp.get("page") || String(defaults.page), 10) || defaults.page,
        ),
        searchTerm: (sp.get("q") || defaults.searchTerm).trim(),
        usageFilter: isUsageFilter(sp.get("usage"))
          ? (sp.get("usage") as PackageUsageFilter)
          : ((
              {
                활성: "available",
                비활성: "paused",
                일시정지: "paused",
                종료: "exhausted",
                만료: "expired",
                취소: "cancelled",
                대기: "not_issued",
              } as Record<string, PackageUsageFilter>
            )[sp.get("status") ?? ""] ?? defaults.usageFilter),
        paymentFilter: isPaymentFilter(sp.get("payment"))
          ? (sp.get("payment") as PackagePaymentFilter)
          : ((
              { 결제완료: "paid", 결제대기: "pending_any", 결제취소: "cancelled" } as Record<
                string,
                PackagePaymentFilter
              >
            )[sp.get("payment") ?? ""] ?? defaults.paymentFilter),
        activationFilter: ACTIVATION_VALUES.includes(
          sp.get("activation") as PackageActivationFilter,
        )
          ? (sp.get("activation") as PackageActivationFilter)
          : defaults.activationFilter,
        attentionFilter: ATTENTION_VALUES.includes(sp.get("attention") as PackageAttentionFilter)
          ? (sp.get("attention") as PackageAttentionFilter)
          : defaults.attentionFilter,
        serviceTypeFilter: isServiceTypeFilter(sp.get("service"))
          ? (sp.get("service") as "all" | ServiceType)
          : defaults.serviceTypeFilter,
        packageTypeFilter: isPackageTypeFilter(normalizedPkg)
          ? normalizedPkg
          : defaults.packageTypeFilter,
        presetFilter:
          sp.get("preset") === PAYMENT_CHECK_PRESET ? PAYMENT_CHECK_PRESET : defaults.presetFilter,
        sortBy,
        sortDirection,
      };
    },
    toQueryParams: (queryState) => ({
      q: queryState.searchTerm.trim(),
      usage: queryState.usageFilter,
      package:
        queryState.packageTypeFilter !== "all"
          ? queryState.packageTypeFilter.replace("회권", "")
          : "all",
      payment: queryState.paymentFilter,
      activation: queryState.activationFilter,
      attention: queryState.attentionFilter,
      service: queryState.serviceTypeFilter,
      preset: queryState.presetFilter,
      sort: queryState.sortBy ? `${queryState.sortBy}:${queryState.sortDirection}` : undefined,
      page: queryState.page === DEFAULTS.page ? undefined : queryState.page,
      limit: DEFAULTS.limit,
    }),
    pageResetKeys: [
      "searchTerm",
      "usageFilter",
      "packageTypeFilter",
      "paymentFilter",
      "activationFilter",
      "attentionFilter",
      "serviceTypeFilter",
      "presetFilter",
      "sortBy",
      "sortDirection",
    ],
  });

  const {
    page,
    searchTerm,
    usageFilter,
    packageTypeFilter,
    paymentFilter,
    activationFilter,
    attentionFilter,
    serviceTypeFilter,
    presetFilter,
    sortBy,
    sortDirection,
  } = state;
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // 한 페이지에 보여줄 항목 수
  const limit = 10;

  const queryString = useMemo(
    () =>
      buildQueryString({
        q: debouncedSearch.trim(),
        usage: usageFilter,
        package: packageTypeFilter !== "all" ? packageTypeFilter.replace("회권", "") : "all",
        payment: paymentFilter,
        activation: activationFilter,
        attention: attentionFilter,
        service: serviceTypeFilter,
        preset: presetFilter,
        sort: sortBy ? `${sortBy}:${sortDirection}` : undefined,
        page,
        limit,
      }),
    [
      debouncedSearch,
      usageFilter,
      packageTypeFilter,
      paymentFilter,
      activationFilter,
      attentionFilter,
      serviceTypeFilter,
      presetFilter,
      sortBy,
      sortDirection,
      page,
      limit,
    ],
  );

  // SWR은 디바운스된 키를 사용
  const { data, error, isValidating, mutate } = useSWR<PackagesResponse>(
    `/api/admin/package-orders?${queryString}`,
    authenticatedSWRFetcher,
    {
      dedupingInterval: 1000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const commonErrorMessage = error ? getAdminErrorMessage(error) : null;

  useEffect(() => {
    if (commonErrorMessage) showErrorToast(commonErrorMessage);
  }, [commonErrorMessage]);

  // 데이터 준비
  // 로딩/에러/실데이터를 분리해서, 미확정 상태가 0건처럼 보이지 않도록 처리한다.
  const hasDataError = !!error;
  const hasResolvedData = !isValidating && !hasDataError && !!data;
  const hasResolvedTotal = hasResolvedData && typeof data?.total === "number";
  const packages: PackageListItem[] | null = hasResolvedData
    ? Array.isArray(data?.items)
      ? data.items
      : []
    : null;
  const totalCount: number | null = hasResolvedTotal ? (data?.total ?? 0) : null;
  const shouldShowRows = !!packages && packages.length > 0;
  const shouldShowEmptyState =
    hasResolvedData && !hasDataError && !!packages && packages.length === 0;
  const totalPages = useMemo(() => {
    if (!hasResolvedTotal || totalCount === null) return null;
    return Math.max(1, Math.ceil(totalCount / limit));
  }, [hasResolvedTotal, totalCount, limit]);
  const hasResolvedTotalPages = totalPages !== null;

  const metrics = data?.metrics;

  const kpiTotal = hasResolvedData && typeof metrics?.total === "number" ? metrics.total : null;
  const kpiAvailable =
    hasResolvedData && typeof metrics?.available === "number" ? metrics.available : null;
  const kpiNeedsAttention =
    hasResolvedData && typeof metrics?.needsAttention === "number" ? metrics.needsAttention : null;
  const kpiRevenue =
    hasResolvedData && typeof metrics?.revenue === "number" ? metrics.revenue : null;
  const kpiExpSoon =
    hasResolvedData && typeof metrics?.expirySoon === "number" ? metrics.expirySoon : null;

  // 공통 로딩 플래그
  const isInitialLoading = isValidating && !data;

  // 페이지 번호 목록(앞·뒤 ... 처리)
  const pageItems = useMemo<(number | string)[]>(() => {
    if (!hasResolvedTotalPages || !totalPages) return [];
    const t = totalPages,
      c = page;
    if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
    const items: (number | string)[] = [1];
    const start = Math.max(2, c - 1);
    const end = Math.min(t - 1, c + 1);
    if (start > 2) items.push("…");
    for (let i = start; i <= end; i++) items.push(i);
    if (end < t - 1) items.push("…");
    items.push(t);
    return items;
  }, [hasResolvedTotalPages, page, totalPages]);
  const shouldRenderPaginationNumbers = hasResolvedTotalPages && !isInitialLoading;

  // totalPages가 줄어든 경우 현재 페이지를 자동 보정
  useEffect(() => {
    if (!totalPages) return;
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  if (error) {
    return (
      <AdminPageShell variant="wide" className="py-6">
        <Card className="border border-destructive/30 bg-destructive/10 dark:bg-destructive/15 text-foreground">
          <CardHeader>
            <CardTitle className="text-destructive">목록을 불러오지 못했습니다.</CardTitle>
            <CardDescription className="text-muted-foreground">
              {commonErrorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => mutate()} variant="destructive">
              다시 불러오기
            </Button>
          </CardContent>
        </Card>
      </AdminPageShell>
    );
  }

  const goToPage = (p: number) => {
    if (!totalPages) return;
    setPage(Math.min(totalPages, Math.max(1, p)));
  };

  // 날짜 포맷터
  const formatDate = (v?: string | number | Date | null) => {
    const d = toDateSafe(v);
    if (!d) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  };

  // 표용 짧은 날짜 포맷
  const formatDateCompact = (v?: string | number | Date | null) => {
    const d = toDateSafe(v);
    if (!d) return "-";
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yy}.${mm}.${dd} ${hh}:${mi}`;
  };

  // 날짜를 두 줄로 나눠 쓰기
  const formatDateSplit = (v?: string | number | Date | null) => {
    const d = toDateSafe(v);
    if (!d) return { date: "-", time: "" };
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return { date: `${yy}.${mm}.${dd}`, time: `${hh}:${mi}` };
  };

  // 안전한 Date 변환 유틸
  function toDateSafe(v?: string | number | Date | null) {
    if (v == null) return null;

    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;

    if (typeof v === "number") {
      const ms = v < 1e12 ? v * 1000 : v;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const s = String(v).trim();

    const direct = new Date(s);
    if (!Number.isNaN(direct.getTime())) return direct;

    const mDot = s.match(/^(\d{2,4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/);
    if (mDot) {
      const y = Number(mDot[1].length === 2 ? "20" + mDot[1] : mDot[1]);
      const mo = Number(mDot[2]);
      const d = Number(mDot[3]);
      const dd = new Date(y, mo - 1, d);
      return Number.isNaN(dd.getTime()) ? null : dd;
    }

    const mSep = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (mSep) {
      const y = Number(mSep[1]);
      const mo = Number(mSep[2]);
      const d = Number(mSep[3]);
      const dd = new Date(y, mo - 1, d);
      return Number.isNaN(dd.getTime()) ? null : dd;
    }

    const mCompact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (mCompact) {
      const y = Number(mCompact[1]);
      const mo = Number(mCompact[2]);
      const d = Number(mCompact[3]);
      const dd = new Date(y, mo - 1, d);
      return Number.isNaN(dd.getTime()) ? null : dd;
    }

    return null;
  }

  // 금액 포맷터
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount);

  // 현재 화면이 "필터/검색 적용 중"인지 여부
  const hasAnyFilter =
    !!searchTerm ||
    usageFilter !== "all" ||
    packageTypeFilter !== "all" ||
    paymentFilter !== "all" ||
    activationFilter !== "all" ||
    attentionFilter !== "all" ||
    serviceTypeFilter !== "all" ||
    presetFilter === PAYMENT_CHECK_PRESET;

  // 필터 리셋
  const resetFilters = () => {
    patchState({
      searchTerm: "",
      usageFilter: "all",
      packageTypeFilter: "all",
      paymentFilter: "all",
      activationFilter: "all",
      attentionFilter: "all",
      serviceTypeFilter: "all",
      presetFilter: null,
      sortBy: DEFAULTS.sortBy,
      sortDirection: DEFAULTS.sortDirection,
      page: 1,
    });
  };

  // 패키지 목록 빠른 보기입니다.
  // 서버가 이미 받는 필터 값만 사용하고, 새 API query는 만들지 않습니다.
  const applyQuickView = (
    nextState: Partial<{
      usageFilter: PackageUsageFilter;
      packageTypeFilter: "all" | PackageType;
      paymentFilter: PackagePaymentFilter;
      activationFilter: PackageActivationFilter;
      attentionFilter: PackageAttentionFilter;
      serviceTypeFilter: "all" | ServiceType;
      presetFilter: PackagePresetFilter;
    }>,
  ) => {
    patchState({
      searchTerm: "",
      usageFilter: "all",
      packageTypeFilter: "all",
      paymentFilter: "all",
      activationFilter: "all",
      attentionFilter: "all",
      serviceTypeFilter: "all",
      presetFilter: null,
      page: 1,
      ...nextState,
    });
  };

  // 현재 적용된 필터를 사람이 읽기 쉬운 라벨로 변환합니다.
  const activeFilterLabels = [
    searchTerm.trim() ? `검색어: ${searchTerm.trim()}` : null,
    usageFilter !== "all" ? `이용권: ${getAdminPackageUsageLabel(usageFilter)}` : null,
    packageTypeFilter !== "all" ? `유형: ${packageTypeFilter}` : null,
    paymentFilter !== "all"
      ? `결제: ${paymentFilter === "pending_any" ? "결제 확인 대기" : getAdminPackagePaymentLabel(paymentFilter)}`
      : null,
    activationFilter !== "all"
      ? `활성화: ${getAdminPackageActivationLabel(activationFilter)}`
      : null,
    attentionFilter !== "all"
      ? `운영: ${attentionFilter === "needs_attention" ? "확인 필요" : "확인 완료"}`
      : null,
    serviceTypeFilter !== "all" ? `서비스: ${serviceTypeFilter}` : null,
    presetFilter === PAYMENT_CHECK_PRESET ? "패키지 결제/활성화 대기" : null,
  ].filter((label): label is string => Boolean(label));

  const currentViewLabel = !hasAnyFilter
    ? "전체 패키지"
    : presetFilter === PAYMENT_CHECK_PRESET
      ? "결제/활성화 확인"
      : "사용자 지정 조건";

  const sortOptions: Array<{ value: PackageSortValue; label: string }> = [
    { value: "default", label: "기본 정렬" },
    { value: "customer", label: "고객" },
    { value: "package", label: "패키지" },
    { value: "remainingSessions", label: "남은 횟수" },
    { value: "progress", label: "진행률" },
    { value: "purchaseDate", label: "구매일" },
    { value: "expiryDate", label: "만료일" },
    { value: "usage", label: "이용권 상태" },
    { value: "payment", label: "결제 상태" },
    { value: "activation", label: "활성화 상태" },
    { value: "attention", label: "운영 확인" },
    { value: "price", label: "금액" },
  ];

  return (
    <AdminPageShell variant="wide" className="py-6">
      {/* 제목 및 설명 */}
      <AdminPageHeader
        variant="compact"
        title="패키지 관리"
        description="고객이 구매한 스트링 패키지 이용권의 결제 상태, 잔여 횟수, 만료일을 관리합니다."
        icon={Package}
        scope="범위: 구매된 패키지 이용권"
        helperText="패키지 상품 구성은 패키지 설정에서 관리합니다."
      />

      {/* 통계 카드 */}
      <div className="grid gap-4 mb-6 grid-cols-5">
        <Card className={adminSurface.kpiCard}>
          <CardContent className="p-0">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={cn("whitespace-nowrap", adminTypography.metaMuted)}>전체 결과</p>
                <div className={cn("whitespace-nowrap", adminTypography.kpiValue)}>
                  {kpiTotal === null ? "-" : kpiTotal}
                </div>
              </div>
              <div className="shrink-0 bg-primary/10 rounded-xl p-2 text-foreground dark:bg-primary/20">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={adminSurface.kpiCard}>
          <CardContent className="p-0">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={cn("whitespace-nowrap", adminTypography.metaMuted)}>운영 확인 필요</p>
                <div className={cn("whitespace-nowrap text-warning", adminTypography.kpiValue)}>
                  {kpiNeedsAttention === null ? "-" : kpiNeedsAttention}
                </div>
              </div>
              <div className="shrink-0 bg-warning/10 dark:bg-warning/15 rounded-xl p-2">
                <Filter className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={adminSurface.kpiCard}>
          <CardContent className="p-0">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={cn("whitespace-nowrap", adminTypography.metaMuted)}>사용 가능</p>
                <div className={cn("whitespace-nowrap text-success", adminTypography.kpiValue)}>
                  {kpiAvailable === null ? "-" : kpiAvailable}
                </div>
              </div>
              <div className="shrink-0 bg-success/10 dark:bg-success/15 rounded-xl p-2">
                <Calendar className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={adminSurface.kpiCard}>
          <CardContent className="p-0">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={cn("whitespace-nowrap", adminTypography.metaMuted)}>결제 완료 금액</p>
                <div className={cn("whitespace-nowrap", adminTypography.kpiValue)}>
                  {kpiRevenue === null ? "집계 중" : formatCurrency(kpiRevenue)}
                </div>
              </div>
              <div className="shrink-0 bg-muted rounded-xl p-2">
                <CreditCard className="h-5 w-5 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={adminSurface.kpiCard}>
          <CardContent className="p-0">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={cn("whitespace-nowrap", adminTypography.metaMuted)}>30일 내 만료</p>
                <div className={cn("whitespace-nowrap text-warning", adminTypography.kpiValue)}>
                  {kpiExpSoon === null ? "-" : kpiExpSoon}
                </div>
              </div>
              <div className="shrink-0 bg-warning/10 dark:bg-warning/15 rounded-xl p-2">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminFilterBar
        className="mb-6"
        quickFilters={
          <>
            <span className="mr-1 text-xs font-semibold text-muted-foreground">빠른 보기</span>
            <Button
              type="button"
              size="sm"
              variant={!hasAnyFilter ? "default" : "outline"}
              onClick={resetFilters}
            >
              전체
            </Button>
            <Button
              type="button"
              size="sm"
              variant={attentionFilter === "needs_attention" ? "default" : "outline"}
              onClick={() => applyQuickView({ attentionFilter: "needs_attention" })}
            >
              운영 확인 필요
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                usageFilter === "available" &&
                paymentFilter === "paid" &&
                attentionFilter === "clear"
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                applyQuickView({
                  usageFilter: "available",
                  paymentFilter: "paid",
                  attentionFilter: "clear",
                })
              }
            >
              사용 가능
            </Button>
            <Button
              type="button"
              size="sm"
              variant={paymentFilter === "pending_any" ? "default" : "outline"}
              onClick={() => applyQuickView({ paymentFilter: "pending_any" })}
            >
              결제 확인 대기
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activationFilter === "pending_issue" ? "default" : "outline"}
              onClick={() => applyQuickView({ activationFilter: "pending_issue" })}
            >
              발급 처리 중
            </Button>
            <Button
              type="button"
              size="sm"
              variant={presetFilter === PAYMENT_CHECK_PRESET ? "default" : "outline"}
              onClick={() => applyQuickView({ presetFilter: PAYMENT_CHECK_PRESET })}
            >
              결제·활성화 확인
            </Button>
          </>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={resetFilters}
            >
              필터 초기화
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/admin/packages/settings">패키지 설정</Link>
            </Button>
          </>
        }
        activeFilters={
          <>
            <span className="font-medium text-foreground/80">현재 보기: {currentViewLabel}</span>
            {activeFilterLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1"
              >
                {label}
              </span>
            ))}
            <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 tabular-nums">
              전체 결과: {totalCount === null ? "-" : `${totalCount.toLocaleString("ko-KR")}건`}
            </span>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative min-w-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="패키지 ID, 고객명, 이메일 검색..."
              className="h-9 pl-8 pr-9"
              value={searchTerm}
              onChange={(e) => patchState({ searchTerm: e.target.value })}
            />
            {searchTerm ? (
              <Button
                type="button"
                aria-label="검색어 지우기"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3"
                onClick={() => patchState({ searchTerm: "" })}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <Select
            value={usageFilter}
            onValueChange={(v) => {
              if (isUsageFilter(v)) patchState({ usageFilter: v });
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="이용권 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 이용권</SelectItem>
              <SelectItem value="available">사용 가능</SelectItem>
              <SelectItem value="not_issued">미발급</SelectItem>
              <SelectItem value="paused">일시정지</SelectItem>
              <SelectItem value="exhausted">횟수 소진</SelectItem>
              <SelectItem value="expired">기간 만료</SelectItem>
              <SelectItem value="cancelled">이용권 취소</SelectItem>
              <SelectItem value="unknown">상태 미확인</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={packageTypeFilter}
            onValueChange={(v) => {
              if (isPackageTypeFilter(v)) patchState({ packageTypeFilter: v });
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="패키지 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 유형</SelectItem>
              <SelectItem value="10회권">10회권</SelectItem>
              <SelectItem value="30회권">30회권</SelectItem>
              <SelectItem value="50회권">50회권</SelectItem>
              <SelectItem value="100회권">100회권</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={paymentFilter}
            onValueChange={(v) => {
              if (isPaymentFilter(v)) patchState({ paymentFilter: v });
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="결제 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 결제</SelectItem>
              <SelectItem value="pending_any">결제 확인 대기</SelectItem>
              <SelectItem value="bank_pending">입금 확인 대기</SelectItem>
              <SelectItem value="pg_pending">PG 승인 확인 대기</SelectItem>
              <SelectItem value="pending">일반 결제 확인 대기</SelectItem>
              <SelectItem value="paid">결제 완료</SelectItem>
              <SelectItem value="failed">결제 실패</SelectItem>
              <SelectItem value="cancelled">결제 취소</SelectItem>
              <SelectItem value="refunding">환불 처리 중</SelectItem>
              <SelectItem value="refunded">환불 완료</SelectItem>
              <SelectItem value="unknown">결제 상태 미확인</SelectItem>
              <SelectItem value="not_required">결제 불필요</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={activationFilter}
            onValueChange={(v) => isActivationFilter(v) && patchState({ activationFilter: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="활성화 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 활성화 상태</SelectItem>
              <SelectItem value="active">활성화 완료</SelectItem>
              <SelectItem value="awaiting_payment">결제 확인 후 활성화</SelectItem>
              <SelectItem value="pending_issue">발급 처리 중</SelectItem>
              <SelectItem value="paused">활성화 일시정지</SelectItem>
              <SelectItem value="ended">이용 종료</SelectItem>
              <SelectItem value="cancelled">활성화 취소</SelectItem>
              <SelectItem value="failed">발급 처리 실패</SelectItem>
              <SelectItem value="unknown">상태 미확인</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={attentionFilter}
            onValueChange={(v) => isAttentionFilter(v) && patchState({ attentionFilter: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="운영 확인" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="needs_attention">확인 필요</SelectItem>
              <SelectItem value="clear">확인 완료</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={serviceTypeFilter}
            onValueChange={(v) => {
              if (isServiceTypeFilter(v)) patchState({ serviceTypeFilter: v });
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="서비스 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 서비스</SelectItem>
              <SelectItem value="방문">방문</SelectItem>
              <SelectItem value="출장">출장</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex min-w-0 gap-2">
            <Select
              value={sortBy ?? "default"}
              onValueChange={(value) =>
                patchState({ sortBy: value === "default" ? null : (value as SortKey) })
              }
            >
              <SelectTrigger id="package-sort-by" className="h-9 min-w-0 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0"
              disabled={!sortBy}
              onClick={() =>
                patchState({ sortDirection: sortDirection === "asc" ? "desc" : "asc" })
              }
              aria-label={`정렬 방향: ${sortDirection === "asc" ? "오름차순" : "내림차순"}`}
            >
              {sortDirection === "asc" ? "오름차순" : "내림차순"}
            </Button>
          </div>
        </div>
      </AdminFilterBar>

      {/* 패키지 목록 */}
      <AdminListTable
        title="패키지 목록"
        viewLabel={currentViewLabel}
        resultLabel={
          hasResolvedTotal && totalCount !== null
            ? `총 ${totalCount.toLocaleString("ko-KR")}건`
            : "불러오는 중…"
        }
        description="고객, 이용 횟수와 기간, 결제·활성화 상태, 금액과 상세 이동을 한 행에서 확인합니다."
        columnsClassName={PACKAGE_LIST_COLUMNS}
        ariaLabel="패키지 관리 목록"
      >
        <AdminListColumnHeader columnsClassName={PACKAGE_LIST_COLUMNS}>
          <div role="columnheader" className="min-w-0 px-4 py-2.5">
            패키지 / 고객
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5">
            이용 / 기간
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5">
            상태 / 운영 확인
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5 text-right">
            금액
          </div>
          <div role="columnheader" className="min-w-0 px-2 py-2.5 text-right">
            작업
          </div>
        </AdminListColumnHeader>

        <AdminListBody>
          {!hasDataError && isValidating && !shouldShowRows
            ? Array.from({ length: 6 }).map((_, rowIdx) => (
                <AdminListRow
                  key={`admin-packages-loading-row-${rowIdx}`}
                  columnsClassName={PACKAGE_LIST_COLUMNS}
                  ariaLabel="패키지 목록 불러오는 중"
                >
                  <AdminListCell>
                    <Skeleton className="h-14 w-full" />
                  </AdminListCell>
                  <AdminListCell>
                    <Skeleton className="h-14 w-full" />
                  </AdminListCell>
                  <AdminListCell>
                    <Skeleton className="h-14 w-full" />
                  </AdminListCell>
                  <AdminListCell align="end">
                    <Skeleton className="h-7 w-24" />
                  </AdminListCell>
                  <AdminListCell align="end" className="px-2">
                    <Skeleton className="h-7 w-7" />
                  </AdminListCell>
                </AdminListRow>
              ))
            : null}

          {shouldShowRows
            ? packages!.map((pkg) => {
                const hasSessionCounts =
                  typeof pkg.usedSessions === "number" &&
                  Number.isFinite(pkg.usedSessions) &&
                  typeof pkg.remainingSessions === "number" &&
                  Number.isFinite(pkg.remainingSessions);
                const progressPercentage =
                  typeof pkg.progressPercent === "number" && Number.isFinite(pkg.progressPercent)
                    ? Math.round(pkg.progressPercent)
                    : null;
                const usageLabel = getAdminPackageUsageLabel(pkg.usageState);
                const paymentLabel = getAdminPackagePaymentLabel(pkg.paymentState);
                const activationLabel = getAdminPackageActivationLabel(pkg.activationState);
                const reasonLabels = pkg.attentionReasons.map(getAdminPackageAttentionReasonLabel);
                const rawName = pkg.customer?.name ?? "이름없음";
                const isGuest = /\(비회원\)\s*$/.test(rawName);
                const displayName = rawName.replace(/\s*\(비회원\)\s*$/, "");
                const { date: purchaseDate, time: purchaseTime } = formatDateSplit(
                  pkg.purchaseDate,
                );
                const expiryStatusLabel = !pkg.hasIssuedPass
                  ? null
                  : !pkg.expiryDate
                    ? "만료일 확인 필요"
                    : pkg.usageState === "expired"
                      ? "만료됨"
                      : pkg.isExpirySoon && typeof pkg.daysUntilExpiry === "number"
                        ? `${pkg.daysUntilExpiry}일 남음`
                        : null;
                const paymentBadge = getPaymentStatusBadgeSpec(paymentLabel);

                return (
                  <AdminListRow
                    key={pkg.id}
                    columnsClassName={PACKAGE_LIST_COLUMNS}
                    ariaLabel={`${displayName} ${pkg.packageType} 패키지`}
                  >
                    <AdminListCell>
                      <AdminListPrimary
                        title={
                          <span>
                            {displayName}
                            {isGuest ? (
                              <span className={cn(adminTypography.caption, "ml-1")}>(비회원)</span>
                            ) : null}
                          </span>
                        }
                        meta={
                          <>
                            <span>
                              {pkg.packageType}
                              {pkg.serviceType ? ` · ${pkg.serviceType}` : ""}
                            </span>
                            <span className="font-mono">
                              ID {pkg.id.slice(0, 6)}…{pkg.id.slice(-4)}
                            </span>
                          </>
                        }
                        supporting={
                          <AdminReferencePopover
                            title={`${displayName} 연락처·패키지 참조`}
                            trigger={
                              <button type="button" className={adminDataTable.referenceTrigger}>
                                연락처·패키지 참조 보기
                              </button>
                            }
                            items={[
                              {
                                label: "패키지 ID",
                                value: pkg.id,
                                copyValue: pkg.id,
                              },
                              {
                                label: "이메일",
                                value: pkg.customer?.email,
                                copyValue: pkg.customer?.email || undefined,
                              },
                              {
                                label: "전화번호",
                                value: pkg.customer?.phone,
                                copyValue: pkg.customer?.phone || undefined,
                              },
                              { label: "패키지", value: pkg.packageType },
                              { label: "서비스", value: pkg.serviceType },
                            ]}
                          />
                        }
                      />
                    </AdminListCell>

                    <AdminListCell>
                      <div className="min-w-0 space-y-2">
                        <div className="space-y-1">
                          <p className={adminTypography.tablePrimary}>
                            {!pkg.hasIssuedPass || !hasSessionCounts
                              ? "-"
                              : `${pkg.remainingSessions}회 / ${
                                  pkg.usedSessions! + pkg.remainingSessions!
                                }회`}
                          </p>
                          {!pkg.hasIssuedPass ? (
                            <p className={adminTypography.caption}>패스 미발급</p>
                          ) : !hasSessionCounts || progressPercentage === null ? (
                            <p className={adminTypography.caption}>횟수 정보 확인 필요</p>
                          ) : (
                            <div className="flex min-w-0 items-center gap-2">
                              <div
                                className="h-1.5 w-24 shrink-0 rounded-full bg-muted"
                                role="progressbar"
                                aria-label="사용 진행률"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progressPercentage}
                              >
                                <div
                                  className="h-1.5 rounded-full bg-primary"
                                  style={{ width: `${progressPercentage}%` }}
                                />
                              </div>
                              <span
                                className={cn(
                                  adminTypography.meta,
                                  "whitespace-nowrap tabular-nums",
                                )}
                              >
                                사용 진행 {progressPercentage}%
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className={adminTypography.meta}>
                            구매 {purchaseDate}
                            {purchaseTime ? ` ${purchaseTime}` : ""} · 만료{" "}
                            {!pkg.hasIssuedPass || !pkg.expiryDate
                              ? "-"
                              : formatDateCompact(pkg.expiryDate)}
                          </p>
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <Badge
                              {...getAdminPackageUsageBadgeSpec(pkg.usageState)}
                              className={cn("whitespace-nowrap font-medium", badgeSizeCls)}
                              aria-label={`이용권 상태 ${usageLabel}`}
                            >
                              {usageLabel}
                            </Badge>
                            {expiryStatusLabel ? (
                              <span
                                className={
                                  pkg.usageState === "expired" || pkg.isExpirySoon
                                    ? adminDataTable.attentionText
                                    : adminDataTable.secondaryText
                                }
                              >
                                {expiryStatusLabel}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </AdminListCell>

                    <AdminListCell>
                      <AdminStatusGroup
                        primary={
                          <>
                            <Badge
                              variant={paymentBadge.variant}
                              className={cn("whitespace-nowrap font-medium", badgeSizeCls)}
                              aria-label={`결제 상태 ${paymentLabel}`}
                            >
                              {paymentLabel}
                            </Badge>
                            <Badge
                              {...getAdminPackageActivationBadgeSpec(pkg.activationState)}
                              className={cn("whitespace-nowrap font-medium", badgeSizeCls)}
                              aria-label={`활성화 상태 ${activationLabel}`}
                            >
                              {activationLabel}
                            </Badge>
                          </>
                        }
                        secondary={pkg.requiresAttention ? undefined : "운영 확인 이상 없음"}
                        alert={
                          pkg.requiresAttention ? reasonLabels[0] || "사유 확인 필요" : undefined
                        }
                      />
                    </AdminListCell>

                    <AdminListCell align="end">
                      <AdminMoneyBlock
                        amount={pkg.price === null ? "-" : formatCurrency(pkg.price)}
                      />
                    </AdminListCell>

                    <AdminListCell align="end" className="px-2">
                      <AdminRowActions>
                        <AdminRowActionMenu ariaLabel={`${displayName} 패키지 관리 메뉴`}>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/packages/${pkg.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              상세보기
                            </Link>
                          </DropdownMenuItem>
                        </AdminRowActionMenu>
                      </AdminRowActions>
                    </AdminListCell>
                  </AdminListRow>
                );
              })
            : null}

          {shouldShowEmptyState ? (
            <AdminListRow columnsClassName={PACKAGE_LIST_COLUMNS} ariaLabel="패키지 목록 없음">
              <AdminListCell className="col-span-5 py-12 text-center">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">불러올 패키지 목록이 없습니다.</p>
                  </div>

                  {hasAnyFilter ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetFilters();
                        router.replace(pathname);
                      }}
                    >
                      필터 초기화
                    </Button>
                  ) : null}
                </div>
              </AdminListCell>
            </AdminListRow>
          ) : null}
        </AdminListBody>

        <div role="rowgroup" className="border-t border-border">
          <div role="row">
            <div
              role="cell"
              aria-colspan={5}
              className="flex flex-wrap items-center justify-center gap-1 px-4 py-3"
            >
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-transparent"
                onClick={() => goToPage(1)}
                disabled={!totalPages || page <= 1}
                aria-label="첫 페이지"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-transparent"
                onClick={() => goToPage(page - 1)}
                disabled={!totalPages || page <= 1}
                aria-label="이전"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {shouldRenderPaginationNumbers &&
                pageItems.map((it, idx) =>
                  typeof it === "number" ? (
                    <Button
                      key={idx}
                      variant={it === page ? "default" : "outline"}
                      className="h-9 min-w-9 px-3"
                      aria-current={it === page ? "page" : undefined}
                      onClick={() => goToPage(it)}
                    >
                      {it}
                    </Button>
                  ) : (
                    <span key={idx} className="select-none px-2 text-muted-foreground">
                      …
                    </span>
                  ),
                )}
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-transparent"
                onClick={() => goToPage(page + 1)}
                disabled={!totalPages || page >= totalPages}
                aria-label="다음"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-transparent"
                onClick={() => goToPage(totalPages ?? page)}
                disabled={!totalPages || page >= totalPages}
                aria-label="끝 페이지"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </AdminListTable>
    </AdminPageShell>
  );
}
