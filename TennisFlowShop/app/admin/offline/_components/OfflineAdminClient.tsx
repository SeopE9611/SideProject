"use client";

import AdminInlineEmpty from "@/components/admin/AdminInlineEmpty";
import { adminDataTable } from "@/components/admin/AdminDataTable";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { getKstMonthRange, getKstTodayRange, toKstYmd } from "@/lib/date/kst";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { maskPhone } from "@/lib/offline/normalizers";
import { cn } from "@/lib/utils";
import type {
  OfflineCustomerDto,
  OfflinePaymentMethod,
  OfflineRevenueSummary,
} from "@/types/admin/offline";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  ExternalLink,
  History,
  Mail,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Store,
  Trash2,
  User,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

type SelectedCustomer =
  | {
      source: "offline";
      offlineCustomerId: string;
      userId?: string | null;
      name: string;
      phone: string;
      email?: string | null;
    }
  | {
      source: "online";
      userId: string;
      name: string;
      phone: string;
      email?: string | null;
      offlineCustomerId?: string | null;
    };

type OfflineWorkLineForm = {
  id: string;
  racketName: string;
  mainStringName: string;
  crossStringName: string;
  tensionMain: string;
  tensionCross: string;
  amount: number;
  note: string;
};

const INITIAL_WORK_LINE: OfflineWorkLineForm = {
  id: "line-1",
  racketName: "",
  mainStringName: "",
  crossStringName: "",
  tensionMain: "",
  tensionCross: "",
  amount: 0,
  note: "",
};

function createWorkLine(index: number): OfflineWorkLineForm {
  return {
    id: `line-${Date.now()}-${index}`,
    racketName: "",
    mainStringName: "",
    crossStringName: "",
    tensionMain: "",
    tensionCross: "",
    amount: 0,
    note: "",
  };
}

const KIND_LABELS = {
  stringing: "스트링 작업",
  package_sale: "패키지 판매",
  etc: "기타",
} as const;
const RECORD_STATUS_LABELS = {
  received: "접수",
  in_progress: "작업중",
  completed: "완료",
  picked_up: "수령완료",
  canceled: "취소",
} as const;
const PAYMENT_STATUS_LABELS = {
  pending: "미결제",
  paid: "결제완료",
  refunded: "환불",
} as const;
const PAYMENT_METHOD_LABELS = {
  cash: "현금",
  card: "카드",
  bank_transfer: "계좌이체",
  etc: "기타",
} as const;
const RECORDS_LIMIT = 20;
const EMPTY_RECORD_FILTERS = {
  from: "",
  to: "",
  name: "",
  phone: "",
  kind: "",
  status: "",
  paymentStatus: "",
  paymentMethod: "",
};

// 오프라인 접수 흐름 안내용 UI 데이터입니다.
// 실제 저장/조회 로직에는 영향을 주지 않는 표시 전용 데이터입니다.
const OFFLINE_WORKFLOW_STEPS = [
  {
    icon: Search,
    title: "1. 고객 확인",
    description: "온라인 회원과 오프라인 명부를 먼저 검색합니다.",
  },
  {
    icon: UserPlus,
    title: "2. 고객 선택/등록",
    description: "기존 고객을 선택하거나 현장 고객을 새로 등록합니다.",
  },
  {
    icon: ClipboardList,
    title: "3. 작업·결제 기록",
    description: "선택된 고객 기준으로 작업 내용과 결제 상태를 저장합니다.",
  },
];

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toKstYmd(date);
}

function formatCurrency(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

function buildSummaryRangePreset(preset: "today" | "month") {
  return preset === "today" ? getKstTodayRange() : getKstMonthRange();
}

function methodLabel(method: OfflinePaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method] ?? "기타";
}

function formatLineSummary(
  lines?: Array<{
    racketName?: string;
    stringName?: string;
    mainStringName?: string;
    crossStringName?: string;
    tensionMain?: string;
    tensionCross?: string;
  }>,
): string {
  if (!Array.isArray(lines) || lines.length === 0) return "작업 내용 미입력";

  const summary = lines
    .map((line, index) => {
      const main = String(line.tensionMain ?? "").trim();
      const cross = String(line.tensionCross ?? "").trim();
      const tension = main || cross ? `${main || "-"}/${cross || "-"}` : "";

      const mainString = String(line.mainStringName || line.stringName || "").trim();
      const crossString = String(line.crossStringName || "").trim();

      const stringSummary =
        mainString && crossString && mainString !== crossString
          ? `메인 ${mainString} / 크로스 ${crossString}`
          : mainString
            ? `스트링 ${mainString}`
            : "";

      return [
        lines.length > 1 ? `라켓 ${index + 1}` : "",
        String(line.racketName ?? "").trim(),
        stringSummary,
        tension,
      ]
        .filter(Boolean)
        .join(" · ");
    })
    .filter(Boolean)
    .join(", ");

  return summary || "작업 내용 미입력";
}

function sumLineAmounts(lines?: Array<{ amount?: number | string | null }>): number {
  if (!Array.isArray(lines)) return 0;

  return lines.reduce((total, line) => {
    const amount = Number(line.amount ?? 0);

    // 숫자로 변환 불가능한 값은 합계에서 제외합니다.
    if (!Number.isFinite(amount)) return total;

    return total + amount;
  }, 0);
}

// Section Header Component
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-border/50">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className={adminTypography.sectionTitle}>{title}</h3>
        {description && <p className={adminTypography.metaMuted}>{description}</p>}
      </div>
    </div>
  );
}

// Form Field Component
function FormField({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className={adminTypography.bodyStrong}>
        {label}
      </Label>
      {children}
      {hint && <p className={adminTypography.caption}>{hint}</p>}
    </div>
  );
}

// Custom Select Component
function Select({
  id,
  value,
  onChange,
  children,
  className,
}: {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-background px-3",
        adminTypography.body,
        "transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring",
        "hover:border-ring/50",
        className,
      )}
    >
      {children}
    </select>
  );
}

// Status Badge Component
function StatusBadge({ status, type }: { status: string; type: "record" | "payment" }) {
  const colors = {
    record: {
      received: "bg-info/10 text-info dark:text-info border-info/20",
      in_progress: "bg-warning/10 text-warning dark:text-warning border-warning/20",
      completed: "bg-success/10 text-success dark:text-success border-success/20",
      picked_up: "bg-primary/10 text-primary border-primary/20",
      canceled: "bg-destructive/10 text-destructive border-destructive/20",
    },
    payment: {
      pending: "bg-warning/10 text-warning dark:text-warning border-warning/20",
      paid: "bg-success/10 text-success dark:text-success border-success/20",
      refunded: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };

  const labels = type === "record" ? RECORD_STATUS_LABELS : PAYMENT_STATUS_LABELS;
  const colorMap = colors[type] as Record<string, string>;
  const colorClass = colorMap[status] || "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-2 py-0.5 font-medium",
        adminTypography.badgeLabel,
        colorClass,
      )}
    >
      {labels[status as keyof typeof labels] ?? status}
    </span>
  );
}

// Message Component
function Message({
  type,
  children,
}: {
  type: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    success: "bg-success/10 text-success dark:text-success border-success/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-primary/5 text-foreground border-border",
  };
  const icons = {
    success: Check,
    error: AlertCircle,
    info: AlertCircle,
  };
  const Icon = icons[type];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2",
        adminTypography.body,
        styles[type],
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function OfflineAdminClient() {
  const [query, setQuery] = useState({ name: "", phone: "", email: "" });
  const [submittedQuery, setSubmittedQuery] = useState<{
    name: string;
    phone: string;
    email: string;
  } | null>(null);
  const [selected, setSelected] = useState<SelectedCustomer | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<"success" | "error" | null>(null);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    kind: "stringing",
    occurredAt: "",

    lines: [INITIAL_WORK_LINE],

    status: "received",
    paymentStatus: "pending",
    paymentMethod: "cash",
    paymentAmount: 0,
    memo: "",
  });
  const [recordFilters, setRecordFilters] = useState(EMPTY_RECORD_FILTERS);
  const [submittedRecordFilters, setSubmittedRecordFilters] = useState(EMPTY_RECORD_FILTERS);
  const [recordsPage, setRecordsPage] = useState(1);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [isDeletingRecords, setIsDeletingRecords] = useState(false);
  const [recordsMessage, setRecordsMessage] = useState<string | null>(null);
  const [recordsMessageType, setRecordsMessageType] = useState<"success" | "error" | null>(null);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [isEditingSubmit, setIsEditingSubmit] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [summaryPreset, setSummaryPreset] = useState<"today" | "month" | "custom">("month");
  const [summaryRange, setSummaryRange] = useState(() => buildSummaryRangePreset("month"));

  const [form, setForm] = useState({
    kind: "stringing",
    status: "received",

    // 여러 라켓 작업을 담는 배열입니다.
    lines: [INITIAL_WORK_LINE],

    // 전체 작업 메모입니다. 라켓별 메모는 line.note에 따로 저장합니다.
    memo: "",

    // 전체 결제금액입니다. 라켓별 금액 합계와 다를 수도 있으므로 분리 유지합니다.
    amount: 0,
    method: "cash",
    payStatus: "pending",
  });
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    memo: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const key = submittedQuery
    ? `/api/admin/offline/lookup?name=${encodeURIComponent(submittedQuery.name)}&phone=${encodeURIComponent(submittedQuery.phone)}&email=${encodeURIComponent(submittedQuery.email)}`
    : null;

  const recordParams = new URLSearchParams({
    page: String(recordsPage),
    limit: String(RECORDS_LIMIT),
  });
  Object.entries(submittedRecordFilters).forEach(([filterKey, value]) => {
    if (value.trim()) recordParams.set(filterKey, value.trim());
  });
  const recordsKey = `/api/admin/offline/records?${recordParams.toString()}`;
  const summaryParams = new URLSearchParams({
    from: summaryRange.from,
    to: summaryRange.to,
    groupBy: "day",
    includePackageSales: "true",
  });
  const summaryKey = `/api/admin/offline/summary?${summaryParams.toString()}`;

  const {
    data,
    isLoading: searchLoading,
    mutate,
  } = useSWR<{ onlineUsers: any[]; offlineCustomers: any[] }>(key, authenticatedSWRFetcher);
  const {
    data: records,
    isLoading: recordsLoading,
    mutate: mutateRecords,
  } = useSWR<{
    items: any[];
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  }>(recordsKey, authenticatedSWRFetcher);
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    mutate: mutateSummary,
  } = useSWR<OfflineRevenueSummary>(summaryKey, authenticatedSWRFetcher);
  async function selectOfflineCustomer(id: string) {
    const res = (await authenticatedSWRFetcher(`/api/admin/offline/customers/${id}`)) as {
      item: OfflineCustomerDto;
    };
    setSelected({
      source: "offline",
      offlineCustomerId: res.item.id,
      userId: res.item.linkedUserId ?? null,
      name: res.item.name,
      phone: res.item.phone,
      email: res.item.email ?? null,
    });
  }

  const onlineItems = data?.onlineUsers ?? [];
  const offlineItems = data?.offlineCustomers ?? [];
  const hasSearchResult = onlineItems.length > 0 || offlineItems.length > 0;
  const recordsTotal = records?.total ?? records?.items?.length ?? 0;
  const recordsTotalPages =
    records?.totalPages ?? (recordsTotal > 0 ? Math.ceil(recordsTotal / RECORDS_LIMIT) : 0);
  const currentRecordsPage = records?.page ?? recordsPage;
  const currentPageRecordIds = (records?.items ?? [])
    .map((record: any) => String(record.id ?? ""))
    .filter(Boolean);

  const isCurrentPageAllRecordsSelected =
    currentPageRecordIds.length > 0 &&
    currentPageRecordIds.every((id) => selectedRecordIds.includes(id));

  const isCurrentPagePartiallySelected =
    currentPageRecordIds.some((id) => selectedRecordIds.includes(id)) &&
    !isCurrentPageAllRecordsSelected;

  // 최근 작업/매출 기록에 실제 적용된 필터가 있는지 확인합니다.
  // 주의: recordFilters는 입력 중인 값이고,
  // submittedRecordFilters가 실제 API 조회에 사용되는 값입니다.
  const hasSubmittedRecordFilters = Object.values(submittedRecordFilters).some(
    (value) => value.trim().length > 0,
  );

  // 현재 적용된 필터를 운영자가 읽기 쉬운 한글 라벨로 변환합니다.
  const submittedRecordFilterLabels = [
    submittedRecordFilters.from || submittedRecordFilters.to
      ? `기간: ${submittedRecordFilters.from || "시작일 없음"} ~ ${submittedRecordFilters.to || "종료일 없음"}`
      : null,
    submittedRecordFilters.name ? `고객명: ${submittedRecordFilters.name}` : null,
    submittedRecordFilters.phone ? `휴대폰: ${submittedRecordFilters.phone}` : null,
    submittedRecordFilters.kind
      ? `유형: ${KIND_LABELS[submittedRecordFilters.kind as keyof typeof KIND_LABELS] ?? submittedRecordFilters.kind}`
      : null,
    submittedRecordFilters.status
      ? `작업 상태: ${RECORD_STATUS_LABELS[submittedRecordFilters.status as keyof typeof RECORD_STATUS_LABELS] ?? submittedRecordFilters.status}`
      : null,
    submittedRecordFilters.paymentStatus
      ? `결제 상태: ${PAYMENT_STATUS_LABELS[submittedRecordFilters.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS] ?? submittedRecordFilters.paymentStatus}`
      : null,
    submittedRecordFilters.paymentMethod
      ? `결제수단: ${PAYMENT_METHOD_LABELS[submittedRecordFilters.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? submittedRecordFilters.paymentMethod}`
      : null,
  ].filter((label): label is string => Boolean(label));

  // 현재 화면이 어떤 조건으로 조회 중인지 한 줄로 보여주기 위한 라벨입니다.
  // 빠른 보기 라벨은 "정확히 그 조건만 적용된 경우"에만 표시합니다.
  // 다른 필터가 함께 적용되면 사용자 지정 조건으로 보여주는 편이 운영자에게 더 정확합니다.
  const hasOnlyPaymentPendingFilter =
    submittedRecordFilters.paymentStatus === "pending" &&
    !submittedRecordFilters.from &&
    !submittedRecordFilters.to &&
    !submittedRecordFilters.name &&
    !submittedRecordFilters.phone &&
    !submittedRecordFilters.kind &&
    !submittedRecordFilters.status &&
    !submittedRecordFilters.paymentMethod;

  const hasOnlyPaymentPaidFilter =
    submittedRecordFilters.paymentStatus === "paid" &&
    !submittedRecordFilters.from &&
    !submittedRecordFilters.to &&
    !submittedRecordFilters.name &&
    !submittedRecordFilters.phone &&
    !submittedRecordFilters.kind &&
    !submittedRecordFilters.status &&
    !submittedRecordFilters.paymentMethod;

  const hasOnlyInProgressFilter =
    submittedRecordFilters.status === "in_progress" &&
    !submittedRecordFilters.from &&
    !submittedRecordFilters.to &&
    !submittedRecordFilters.name &&
    !submittedRecordFilters.phone &&
    !submittedRecordFilters.kind &&
    !submittedRecordFilters.paymentStatus &&
    !submittedRecordFilters.paymentMethod;

  const hasOnlyPickedUpFilter =
    submittedRecordFilters.status === "picked_up" &&
    !submittedRecordFilters.from &&
    !submittedRecordFilters.to &&
    !submittedRecordFilters.name &&
    !submittedRecordFilters.phone &&
    !submittedRecordFilters.kind &&
    !submittedRecordFilters.paymentStatus &&
    !submittedRecordFilters.paymentMethod;

  const hasOnlyPackageSaleFilter =
    submittedRecordFilters.kind === "package_sale" &&
    !submittedRecordFilters.from &&
    !submittedRecordFilters.to &&
    !submittedRecordFilters.name &&
    !submittedRecordFilters.phone &&
    !submittedRecordFilters.status &&
    !submittedRecordFilters.paymentStatus &&
    !submittedRecordFilters.paymentMethod;

  const todayRange = buildSummaryRangePreset("today");
  const hasOnlyTodayFilter =
    submittedRecordFilters.from === todayRange.from &&
    submittedRecordFilters.to === todayRange.to &&
    !submittedRecordFilters.name &&
    !submittedRecordFilters.phone &&
    !submittedRecordFilters.kind &&
    !submittedRecordFilters.status &&
    !submittedRecordFilters.paymentStatus &&
    !submittedRecordFilters.paymentMethod;

  const currentRecordViewLabel = !hasSubmittedRecordFilters
    ? "전체 작업/매출"
    : hasOnlyPaymentPendingFilter
      ? "미결제 작업"
      : hasOnlyPaymentPaidFilter
        ? "결제완료"
        : hasOnlyInProgressFilter
          ? "작업중"
          : hasOnlyPickedUpFilter
            ? "수령완료"
            : hasOnlyPackageSaleFilter
              ? "패키지 판매"
              : hasOnlyTodayFilter
                ? "오늘 기록"
                : "사용자 지정 조건";

  // 신규 등록 폼의 라켓별 금액 합계와 전체 결제금액 차이입니다.
  // 전체 결제금액은 할인, 추가비, 현장 조정액 때문에 라켓별 합계와 다를 수 있습니다.
  const workLineTotalAmount = sumLineAmounts(form.lines);
  const workPaymentAmount = Number(form.amount ?? 0);
  const workPaymentDifference = workPaymentAmount - workLineTotalAmount;

  // 수정 모달의 라켓별 금액 합계와 전체 결제금액 차이입니다.
  const editLineTotalAmount = sumLineAmounts(editForm.lines);
  const editPaymentAmount = Number(editForm.paymentAmount ?? 0);
  const editPaymentDifference = editPaymentAmount - editLineTotalAmount;

  // 빠른 보기 버튼에서 사용할 안전한 필터 적용 함수입니다.
  // 서버가 이미 허용하는 필터 값만 사용합니다.
  function applyRecordQuickView(nextFilters: Partial<typeof EMPTY_RECORD_FILTERS>) {
    const merged = {
      ...EMPTY_RECORD_FILTERS,
      ...nextFilters,
    };

    setRecordFilters(merged);
    setSubmittedRecordFilters(merged);
    setRecordsPage(1);
    setSelectedRecordIds([]);
    setRecordsMessage(null);
    setRecordsMessageType(null);
  }

  function resetRecordFilters() {
    setRecordFilters(EMPTY_RECORD_FILTERS);
    setSubmittedRecordFilters(EMPTY_RECORD_FILTERS);
    setRecordsPage(1);
    setSelectedRecordIds([]);
    setRecordsMessage(null);
    setRecordsMessageType(null);
  }

  // 선택/전체선택 삭제 함수
  function toggleRecordSelection(recordId: string, checked: boolean) {
    setSelectedRecordIds((prev) => {
      if (checked) {
        return prev.includes(recordId) ? prev : [...prev, recordId];
      }

      return prev.filter((id) => id !== recordId);
    });
  }

  function toggleSelectAllCurrentRecords(checked: boolean) {
    setSelectedRecordIds((prev) => {
      const currentSet = new Set(currentPageRecordIds);

      if (!checked) {
        return prev.filter((id) => !currentSet.has(id));
      }

      const next = new Set(prev);
      currentPageRecordIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  }

  async function deleteSelectedOfflineRecords() {
    if (selectedRecordIds.length === 0 || isDeletingRecords) return;

    const ok = window.confirm(
      `선택한 오프라인 작업/매출 기록 ${selectedRecordIds.length}건을 삭제하시겠습니까?\n\n삭제하면 해당 고객의 오프라인 누적 통계도 다시 계산됩니다.\n포인트/패키지 사용 처리 이력이 있는 기록은 삭제가 제한될 수 있습니다.\n이 작업은 되돌릴 수 없습니다.`,
    );

    if (!ok) return;

    try {
      setIsDeletingRecords(true);
      setRecordsMessage(null);
      setRecordsMessageType(null);

      const result = (await adminMutator("/api/admin/offline/records/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedRecordIds }),
      })) as { deletedCount?: number };

      const deletedCount = Number(result?.deletedCount ?? selectedRecordIds.length);
      const nextTotal = Math.max(0, recordsTotal - deletedCount);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / RECORDS_LIMIT));

      setRecordsPage((page) => Math.min(page, nextTotalPages));
      setSelectedRecordIds([]);
      setRecordsMessage("선택한 오프라인 작업/매출 기록을 삭제했습니다.");
      setRecordsMessageType("success");

      mutateRecords();
      mutateSummary();
    } catch (e: any) {
      setRecordsMessage(e?.message || "선택 삭제에 실패했습니다.");
      setRecordsMessageType("error");
    } finally {
      setIsDeletingRecords(false);
    }
  }

  function updateWorkLine(lineId: string, updates: Partial<Omit<OfflineWorkLineForm, "id">>) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === lineId ? { ...line, ...updates } : line)),
    }));
  }

  function addWorkLine() {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, createWorkLine(prev.lines.length + 1)],
    }));
  }

  function removeWorkLine(lineId: string) {
    setForm((prev) => {
      if (prev.lines.length <= 1) return prev;

      return {
        ...prev,
        lines: prev.lines.filter((line) => line.id !== lineId),
      };
    });
  }

  function updateEditWorkLine(lineId: string, updates: Partial<Omit<OfflineWorkLineForm, "id">>) {
    setEditForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === lineId ? { ...line, ...updates } : line)),
    }));
  }

  function addEditWorkLine() {
    setEditForm((prev) => ({
      ...prev,
      lines: [...prev.lines, createWorkLine(prev.lines.length + 1)],
    }));
  }

  function removeEditWorkLine(lineId: string) {
    setEditForm((prev) => {
      if (prev.lines.length <= 1) return prev;

      return {
        ...prev,
        lines: prev.lines.filter((line) => line.id !== lineId),
      };
    });
  }

  return (
    <div className="space-y-6">
      {/* Offline Revenue Summary */}
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <SectionHeader
              icon={Store}
              title="오프라인 매출 요약"
              description="온라인 주문/정산 총액과 분리된 오프라인 작업·패키지 판매 집계입니다"
            />
            <div className="flex flex-wrap items-end gap-2">
              <Button
                type="button"
                size="sm"
                variant={summaryPreset === "today" ? "default" : "outline"}
                onClick={() => {
                  setSummaryPreset("today");
                  setSummaryRange(buildSummaryRangePreset("today"));
                }}
              >
                오늘
              </Button>
              <Button
                type="button"
                size="sm"
                variant={summaryPreset === "month" ? "default" : "outline"}
                onClick={() => {
                  setSummaryPreset("month");
                  setSummaryRange(buildSummaryRangePreset("month"));
                }}
              >
                이번 달
              </Button>
              <Input
                aria-label="요약 시작일"
                type="date"
                value={summaryRange.from}
                onChange={(e) => {
                  setSummaryPreset("custom");
                  setSummaryRange((prev) => ({
                    ...prev,
                    from: e.target.value,
                  }));
                }}
                className="h-9 w-[150px]"
              />
              <Input
                aria-label="요약 종료일"
                type="date"
                value={summaryRange.to}
                onChange={(e) => {
                  setSummaryPreset("custom");
                  setSummaryRange((prev) => ({ ...prev, to: e.target.value }));
                }}
                className="h-9 w-[150px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {summaryLoading && (
            <div className="rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
              집계 불러오는 중...
            </div>
          )}
          {summaryError && !summaryLoading && (
            <Message type="error">
              오프라인 매출 요약을 불러오지 못했습니다. 기존 고객/기록 관리는 계속 사용할 수
              있습니다.
            </Message>
          )}
          {summary && !summaryError && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-border/60 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">오프라인 총 매출</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    {formatCurrency(summary.total.paidAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    순매출 {formatCurrency(summary.total.netAmount)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                  <p className="text-xs font-medium text-muted-foreground">작업/매출 기록</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums">
                    {formatCurrency(summary.records.paidAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.records.paidCount.toLocaleString("ko-KR")}건 결제완료
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                  <p className="text-xs font-medium text-muted-foreground">패키지 판매</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums">
                    {formatCurrency(summary.packageSales.paidAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.packageSales.paidCount.toLocaleString("ko-KR")}건 결제완료
                  </p>
                </div>
                <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                  <p className="text-xs font-medium text-muted-foreground">미결제</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums">
                    {formatCurrency(summary.total.pendingAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.total.pendingCount.toLocaleString("ko-KR")}건
                  </p>
                </div>
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <p className="text-xs font-medium text-muted-foreground">환불/차감</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums">
                    {formatCurrency(summary.total.refundedAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.total.refundedCount.toLocaleString("ko-KR")}건
                  </p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">
                    결제수단별 결제완료 매출
                  </p>
                  <div className="grid gap-2 sm:grid-cols-4">
                    {(Object.keys(PAYMENT_METHOD_LABELS) as OfflinePaymentMethod[]).map(
                      (method) => (
                        <div key={method} className="rounded-lg bg-muted/30 px-3 py-2">
                          <p className="text-xs text-muted-foreground">{methodLabel(method)}</p>
                          <p className="font-semibold tabular-nums">
                            {formatCurrency(summary.total.byMethod[method])}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                  <p>패키지 발급 보정 필요</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {summary.packageSales.issueFailedCount.toLocaleString("ko-KR")}건
                  </p>
                  {summary.packageSales.issueFailedCount > 0 && (
                    <p className="text-xs">
                      금액 {formatCurrency(summary.packageSales.issueFailedAmount)} ·{" "}
                      <Link
                        href="/admin/offline/reconciliation"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        보정 관리 화면 열기
                      </Link>
                    </p>
                  )}
                  {summary.packageSales.issueFailedCount === 0 && (
                    <Link
                      href="/admin/offline/reconciliation"
                      className="mt-1 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      보정 필요 항목 전체 보기
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top Section: Selected Customer Quick View */}
      {selected && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold text-primary">현재 선택 고객</p>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span
                    className="line-clamp-2 break-keep text-lg font-semibold"
                    title={selected.name}
                  >
                    {selected.name}
                  </span>
                  <Badge variant="secondary" className="shrink-0 whitespace-nowrap text-xs">
                    {selected.source === "online" ? "온라인 회원" : "오프라인 명부"}
                  </Badge>
                </div>
                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums">
                    <Phone className="h-3 w-3" />
                    {maskPhone(selected.phone)}
                  </span>
                  {selected.email && (
                    <span className="flex min-w-0 items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="block max-w-[220px] break-all" title={selected.email}>
                        {selected.email}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {selected.offlineCustomerId && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/offline/customers/${selected.offlineCustomerId}`}>
                    상세 보기 <ExternalLink className="ml-1.5 h-3 w-3" />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Workflow Guide */}
      <div className="grid gap-3 md:grid-cols-3">
        {OFFLINE_WORKFLOW_STEPS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-xl border border-border/60 bg-background/70 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column: Customer Search & Registration */}
        <div className="space-y-6 xl:col-span-4">
          {/* Customer Search Card */}
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="pb-0">
              <SectionHeader
                icon={Search}
                title="고객 찾기"
                description="온라인 회원과 오프라인 명부를 함께 검색합니다"
              />
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearchMessage(null);
                  if (!query.name.trim() && !query.phone.trim() && !query.email.trim()) {
                    setSearchMessage("검색어를 입력해주세요.");
                    return;
                  }
                  setSubmittedQuery({ ...query });
                }}
              >
                <div className="space-y-3">
                  <FormField label="이름" htmlFor="offline-search-name">
                    <Input
                      id="offline-search-name"
                      placeholder="고객 이름"
                      value={query.name}
                      onChange={(e) => setQuery({ ...query, name: e.target.value })}
                      className="h-10"
                    />
                  </FormField>
                  <FormField label="휴대폰 번호" htmlFor="offline-search-phone">
                    <Input
                      id="offline-search-phone"
                      placeholder="010-0000-0000"
                      value={query.phone}
                      onChange={(e) => setQuery({ ...query, phone: e.target.value })}
                      className="h-10"
                    />
                  </FormField>
                  <FormField label="이메일" htmlFor="offline-search-email">
                    <Input
                      id="offline-search-email"
                      placeholder="email@example.com"
                      value={query.email}
                      onChange={(e) => setQuery({ ...query, email: e.target.value })}
                      className="h-10"
                    />
                  </FormField>
                </div>
                <Button type="submit" className="w-full h-10">
                  <Search className="mr-2 h-4 w-4" />
                  검색
                </Button>
              </form>

              {/* Search Results */}
              {searchMessage && <Message type="info">{searchMessage}</Message>}
              {submittedQuery && searchLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              {submittedQuery && !searchLoading && !hasSearchResult && (
                <Message type="info">
                  검색 결과가 없습니다. 신규 고객으로 등록할 수 있습니다.
                </Message>
              )}

              {submittedQuery && !searchLoading && hasSearchResult && (
                <div className="space-y-4">
                  {/* Online Users */}
                  {onlineItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                        <span>온라인 회원</span>
                        <Badge variant="secondary" className="text-xs">
                          {onlineItems.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {onlineItems.map((u: any) => (
                          <div
                            key={u.id}
                            className="group flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border/60 p-3 transition-all hover:border-primary/40 hover:bg-primary/5"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <User className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {u.name || "이름 없음"}
                                </p>
                                <p
                                  className="truncate text-xs text-muted-foreground"
                                  title={u.phone ? maskPhone(u.phone) : u.email || "정보 없음"}
                                >
                                  {u.phone ? maskPhone(u.phone) : u.email || "정보 없음"}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() =>
                                setSelected({
                                  source: "online",
                                  name: u.name,
                                  phone: u.phone,
                                  email: u.email,
                                  userId: u.id,
                                  offlineCustomerId: u.offlineCustomerId ?? null,
                                })
                              }
                            >
                              선택 <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Offline Customers */}
                  {offlineItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                        <span>오프라인 명부</span>
                        <Badge variant="secondary" className="text-xs">
                          {offlineItems.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {offlineItems.map((c: any) => (
                          <div
                            key={c.id}
                            className="group flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border/60 p-3 transition-all hover:border-primary/40 hover:bg-primary/5"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <User className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {c.name || "이름 없음"}
                                </p>
                                <p className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                                  {c.phoneMasked}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <Link href={`/admin/offline/customers/${c.id}`}>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={() => selectOfflineCustomer(c.id)}
                              >
                                선택 <ChevronRight className="ml-1 h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* New Customer Registration Card */}
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="pb-0">
              <SectionHeader
                icon={UserPlus}
                title="오프라인 고객 등록"
                description="온라인 계정이 없거나 현장 접수 고객일 때 등록합니다"
              />
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="고객명" htmlFor="offline-new-name">
                    <Input
                      id="offline-new-name"
                      placeholder="홍길동"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="h-10"
                    />
                  </FormField>
                  <FormField label="휴대폰 번호" htmlFor="offline-new-phone">
                    <Input
                      id="offline-new-phone"
                      placeholder="01012345678"
                      value={newCustomer.phone}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          phone: e.target.value,
                        })
                      }
                      className="h-10"
                    />
                  </FormField>
                </div>
                <FormField label="이메일 (선택)" htmlFor="offline-new-email">
                  <Input
                    id="offline-new-email"
                    placeholder="email@example.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="h-10"
                  />
                </FormField>
                <FormField label="고객 메모 (선택)" htmlFor="offline-new-memo">
                  <Input
                    id="offline-new-memo"
                    placeholder="특이사항 입력"
                    value={newCustomer.memo}
                    onChange={(e) => setNewCustomer({ ...newCustomer, memo: e.target.value })}
                    className="h-10"
                  />
                </FormField>
              </div>
              {registerMessage && (
                <Message type={registerMessage.includes("완료") ? "success" : "error"}>
                  {registerMessage}
                </Message>
              )}
              <Button
                variant="secondary"
                className="w-full h-10"
                onClick={async () => {
                  setRegisterMessage(null);
                  try {
                    const res = (await adminMutator("/api/admin/offline/customers", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: newCustomer.name,
                        phone: newCustomer.phone,
                        email: newCustomer.email || null,
                        memo: newCustomer.memo || "",
                      }),
                    })) as { item: OfflineCustomerDto };
                    const item: OfflineCustomerDto = res.item;
                    setSelected({
                      source: "offline",
                      offlineCustomerId: item.id,
                      userId: item.linkedUserId ?? null,
                      name: item.name,
                      phone: item.phone,
                      email: item.email ?? null,
                    });
                    setNewCustomer({
                      name: "",
                      phone: "",
                      email: "",
                      memo: "",
                    });
                    setRegisterMessage("고객 등록이 완료되었습니다.");
                    if (submittedQuery) mutate();
                  } catch (e: any) {
                    const message = String(e?.message || "");
                    if (message.includes("duplicate") || message.includes("409"))
                      setRegisterMessage("중복 고객입니다. 기존 고객을 선택해 주세요.");
                    else setRegisterMessage("고객 등록에 실패했습니다.");
                  }
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                고객 등록
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Work/Payment Registration */}
        <div className="xl:col-span-8">
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="pb-0">
              <SectionHeader
                icon={ClipboardList}
                title="오프라인 작업/매출 등록"
                description={
                  selected
                    ? `${selected.name} 고객 기준으로 작업 내용과 결제 상태를 기록합니다`
                    : "고객을 먼저 선택하면 작업·결제 기록을 저장할 수 있습니다"
                }
              />
            </CardHeader>
            <CardContent className="pt-4">
              {!selected ? (
                <AdminInlineEmpty>
                  좌측에서 고객을 검색하거나 신규 등록 후 작업을 등록할 수 있습니다.
                </AdminInlineEmpty>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          선택 고객 기준으로 기록합니다
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          작업 저장 전 고객명과 휴대폰 번호를 한 번 더 확인하세요. 저장 후 최근
                          작업/매출 목록에서 수정할 수 있습니다.
                        </p>
                      </div>
                      <Badge variant="secondary" className="w-fit shrink-0">
                        {selected.source === "online" ? "온라인 회원 연결" : "오프라인 명부"}
                      </Badge>
                    </div>
                  </div>
                  {/* Work Info Section */}
                  <div className="rounded-xl border border-border/60 bg-background/70 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Wrench className="h-4 w-4 text-primary" />
                      작업 정보
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField label="작업 유형" htmlFor="kind">
                        <Select
                          id="kind"
                          value={form.kind}
                          onChange={(e) => setForm({ ...form, kind: e.target.value })}
                        >
                          {Object.entries(KIND_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </FormField>

                      <FormField label="작업 상태" htmlFor="status">
                        <Select
                          id="status"
                          value={form.status}
                          onChange={(e) => setForm({ ...form, status: e.target.value })}
                        >
                          {Object.entries(RECORD_STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">라켓별 작업 정보</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            한 고객이 여러 자루를 맡긴 경우 라켓을 추가해서 각각 기록합니다.
                          </p>
                        </div>

                        <Button type="button" variant="outline" size="sm" onClick={addWorkLine}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          라켓 추가
                        </Button>
                      </div>

                      {form.lines.map((line, index) => (
                        <div
                          key={line.id}
                          className="rounded-xl border border-border/60 bg-background p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              라켓 {index + 1}
                            </p>

                            {form.lines.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => removeWorkLine(line.id)}
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                삭제
                              </Button>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="라켓명" htmlFor={`racketName-${line.id}`}>
                              <Input
                                id={`racketName-${line.id}`}
                                placeholder="바볼랏 퓨어에어로"
                                value={line.racketName}
                                onChange={(e) =>
                                  updateWorkLine(line.id, {
                                    racketName: e.target.value,
                                  })
                                }
                                className="h-10"
                              />
                            </FormField>

                            <FormField label="작업 금액 (선택)" htmlFor={`lineAmount-${line.id}`}>
                              <FormattedNumberInput
                                id={`lineAmount-${line.id}`}
                                min={0}
                                placeholder="20,000"
                                value={line.amount}
                                onValueChange={(amount) =>
                                  updateWorkLine(line.id, {
                                    amount,
                                  })
                                }
                                className="h-10"
                              />
                            </FormField>

                            <FormField label="메인 스트링" htmlFor={`mainStringName-${line.id}`}>
                              <Input
                                id={`mainStringName-${line.id}`}
                                placeholder="포커스 헥스 1.23 블루"
                                value={line.mainStringName}
                                onChange={(e) =>
                                  updateWorkLine(line.id, {
                                    mainStringName: e.target.value,
                                  })
                                }
                                className="h-10"
                              />
                            </FormField>

                            <FormField label="크로스 스트링" htmlFor={`crossStringName-${line.id}`}>
                              <Input
                                id={`crossStringName-${line.id}`}
                                placeholder="아이스 코드 1.25"
                                value={line.crossStringName}
                                onChange={(e) =>
                                  updateWorkLine(line.id, {
                                    crossStringName: e.target.value,
                                  })
                                }
                                className="h-10"
                              />
                            </FormField>

                            <FormField label="메인 텐션" htmlFor={`tensionMain-${line.id}`}>
                              <Input
                                id={`tensionMain-${line.id}`}
                                placeholder="50"
                                value={line.tensionMain}
                                onChange={(e) =>
                                  updateWorkLine(line.id, {
                                    tensionMain: e.target.value,
                                  })
                                }
                                className="h-10"
                              />
                            </FormField>

                            <FormField label="크로스 텐션" htmlFor={`tensionCross-${line.id}`}>
                              <Input
                                id={`tensionCross-${line.id}`}
                                placeholder="48"
                                value={line.tensionCross}
                                onChange={(e) =>
                                  updateWorkLine(line.id, {
                                    tensionCross: e.target.value,
                                  })
                                }
                                className="h-10"
                              />
                            </FormField>
                          </div>

                          <div className="mt-4">
                            <FormField label="라켓별 메모 (선택)" htmlFor={`lineNote-${line.id}`}>
                              <Input
                                id={`lineNote-${line.id}`}
                                placeholder="예: 프레임 흠집 있음, 급한 작업"
                                value={line.note}
                                onChange={(e) =>
                                  updateWorkLine(line.id, {
                                    note: e.target.value,
                                  })
                                }
                                className="h-10"
                              />
                            </FormField>
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormField label="작업 메모" htmlFor="memo">
                      <textarea
                        id="memo"
                        placeholder="작업 관련 특이사항을 입력하세요"
                        value={form.memo}
                        onChange={(e) => setForm({ ...form, memo: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring hover:border-ring/50 min-h-[80px] resize-none"
                      />
                    </FormField>
                  </div>

                  {/* Payment Info Section */}
                  <div className="rounded-xl border border-border/60 bg-background/70 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CreditCard className="h-4 w-4 text-primary" />
                      결제 정보
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <FormField label="결제 상태" htmlFor="payStatus">
                        <Select
                          id="payStatus"
                          value={form.payStatus}
                          onChange={(e) => setForm({ ...form, payStatus: e.target.value })}
                        >
                          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </FormField>

                      <FormField label="결제수단" htmlFor="method">
                        <Select
                          id="method"
                          value={form.method}
                          onChange={(e) => setForm({ ...form, method: e.target.value })}
                        >
                          {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </FormField>

                      <FormField label="결제 금액" htmlFor="amount" hint="원 단위로 입력">
                        <FormattedNumberInput
                          id="amount"
                          min={0}
                          placeholder="15,000"
                          value={form.amount}
                          onValueChange={(amount) =>
                            setForm({
                              ...form,
                              amount,
                            })
                          }
                          className="h-10"
                        />
                      </FormField>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            라켓별 금액 합계
                          </p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                            {formatCurrency(workLineTotalAmount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground">전체 결제금액</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                            {formatCurrency(workPaymentAmount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground">차액</p>
                          <p
                            className={cn(
                              "mt-1 text-sm font-semibold tabular-nums",
                              workPaymentDifference === 0
                                ? "text-muted-foreground"
                                : "text-warning",
                            )}
                          >
                            {formatCurrency(workPaymentDifference)}
                          </p>
                        </div>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        전체 결제금액은 라켓별 합계와 다를 수 있습니다. 할인, 추가비, 현장 조정
                        금액이 있으면 차액으로 확인하세요.
                      </p>
                    </div>
                  </div>

                  {saveMessage && <Message type={saveMessageType || "info"}>{saveMessage}</Message>}

                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      disabled={isSubmitting || !selected}
                      className="min-w-[140px]"
                      onClick={async () => {
                        if (!selected || isSubmitting) return;
                        try {
                          setIsSubmitting(true);
                          setSaveMessage(null);
                          setSaveMessageType(null);
                          let offlineCustomerId =
                            selected.source === "offline"
                              ? selected.offlineCustomerId
                              : selected.offlineCustomerId;
                          if (selected.source === "online" && !offlineCustomerId) {
                            const ensured = (await adminMutator(
                              "/api/admin/offline/customers/ensure",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  userId: selected.userId,
                                }),
                              },
                            )) as {
                              item: OfflineCustomerDto;
                            };
                            offlineCustomerId = ensured.item.id;
                            setSelected({ ...selected, offlineCustomerId });
                          }
                          if (!offlineCustomerId) {
                            setSaveMessage("오프라인 고객 연결에 실패했습니다.");
                            setSaveMessageType("error");
                            return;
                          }
                          await adminMutator("/api/admin/offline/records", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              offlineCustomerId,
                              userId:
                                selected.source === "online"
                                  ? selected.userId
                                  : selected.userId || null,
                              kind: form.kind,
                              status: form.status,
                              lines: form.lines
                                .map((line) => {
                                  const mainStringName = line.mainStringName.trim();
                                  const crossStringName = line.crossStringName.trim();

                                  return {
                                    racketName: line.racketName.trim(),

                                    // 기존 화면/과거 코드 호환용 대표 스트링명입니다.
                                    stringName:
                                      mainStringName &&
                                      crossStringName &&
                                      mainStringName !== crossStringName
                                        ? `${mainStringName} / ${crossStringName}`
                                        : mainStringName || crossStringName,

                                    // 신규 분리 저장 필드입니다.
                                    mainStringName,
                                    crossStringName,

                                    tensionMain: line.tensionMain.trim(),
                                    tensionCross: line.tensionCross.trim(),

                                    // 라켓별 금액입니다. 전체 결제금액은 payment.amount에 따로 저장됩니다.
                                    amount: Number(line.amount) || 0,

                                    note: line.note.trim(),
                                  };
                                })
                                .filter(
                                  (line) =>
                                    [
                                      line.racketName,
                                      line.stringName,
                                      line.mainStringName,
                                      line.crossStringName,
                                      line.tensionMain,
                                      line.tensionCross,
                                      line.note,
                                    ].some((value) => String(value ?? "").trim().length > 0) ||
                                    Number(line.amount) > 0,
                                ),
                              payment: {
                                status: form.payStatus,
                                method: form.method,
                                amount: form.amount,
                              },
                              memo: form.memo,
                            }),
                          });
                          setForm({
                            kind: "stringing",
                            status: "received",
                            lines: [INITIAL_WORK_LINE],
                            memo: "",
                            amount: 0,
                            method: "cash",
                            payStatus: "pending",
                          });
                          setSaveMessage("작업/매출 기록이 저장되었습니다.");
                          setSaveMessageType("success");
                          mutateRecords();
                        } catch (e: any) {
                          const message = String(e?.message || "");
                          if (message.includes("휴대폰 번호"))
                            setSaveMessage(
                              "온라인 회원에 휴대폰 번호가 없어 오프라인 명부 연결이 필요합니다.",
                            );
                          else setSaveMessage(message || "오프라인 작업 저장에 실패했습니다.");
                          setSaveMessageType("error");
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          저장 중...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          저장
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Records History Section */}
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <SectionHeader
              icon={History}
              title="최근 오프라인 작업/매출"
              description="등록된 기록을 조회하고 관리합니다"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              {showFilters ? <X className="mr-2 h-4 w-4" /> : <Search className="mr-2 h-4 w-4" />}
              {showFilters ? "필터 닫기" : "필터 열기"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* 빠른 보기: 기존 API가 허용하는 필터 값만 사용합니다. */}
          <div className={`${adminSurface.filterCard} flex flex-wrap items-center gap-2`}>
            <span className="mr-1 text-xs font-semibold text-muted-foreground">빠른 보기</span>

            <Button
              type="button"
              size="sm"
              variant={!hasSubmittedRecordFilters ? "default" : "outline"}
              onClick={resetRecordFilters}
            >
              전체
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentRecordViewLabel === "미결제 작업" ? "default" : "outline"}
              onClick={() =>
                applyRecordQuickView({
                  paymentStatus: "pending",
                })
              }
            >
              미결제
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentRecordViewLabel === "결제완료" ? "default" : "outline"}
              onClick={() =>
                applyRecordQuickView({
                  paymentStatus: "paid",
                })
              }
            >
              결제완료
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentRecordViewLabel === "수령완료" ? "default" : "outline"}
              onClick={() =>
                applyRecordQuickView({
                  status: "picked_up",
                })
              }
            >
              수령완료
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentRecordViewLabel === "작업중" ? "default" : "outline"}
              onClick={() =>
                applyRecordQuickView({
                  status: "in_progress",
                })
              }
            >
              작업중
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentRecordViewLabel === "패키지 판매" ? "default" : "outline"}
              onClick={() =>
                applyRecordQuickView({
                  kind: "package_sale",
                })
              }
            >
              패키지 판매
            </Button>

            <Button
              type="button"
              size="sm"
              variant={currentRecordViewLabel === "오늘 기록" ? "default" : "outline"}
              onClick={() => {
                const today = buildSummaryRangePreset("today");
                applyRecordQuickView({
                  from: today.from,
                  to: today.to,
                });
              }}
            >
              오늘 기록
            </Button>
          </div>
          {/* 현재 보기 요약: 실제 조회에 적용된 submittedRecordFilters 기준입니다. */}
          <div className={`${adminSurface.cardMuted} flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm`}>
            {/* 좌측: 현재 뷰 및 필터 상태 */}
            <p className="font-semibold text-foreground">현재 보기: {currentRecordViewLabel}</p>
            {submittedRecordFilterLabels.length > 0 && (
              <p className="text-muted-foreground">
                필터: {submittedRecordFilterLabels.join(" / ")}
              </p>
            )}

            {/* 우측: 수량 정보 및 액션 버튼 */}
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {hasSubmittedRecordFilters && (
                <Button type="button" size="sm" variant="ghost" onClick={resetRecordFilters}>
                  필터 초기화
                </Button>
              )}

              {/* 총 수량 및 선택 수량 그룹화 */}
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">
                  총 {recordsTotal.toLocaleString("ko-KR")}건
                </span>
                <span className="text-muted-foreground/50">|</span> {/* 구분선 추가 */}
                <span className="text-muted-foreground">
                  선택 {selectedRecordIds.length.toLocaleString("ko-KR")}개
                </span>
              </div>

              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={selectedRecordIds.length === 0 || isDeletingRecords}
                onClick={deleteSelectedOfflineRecords}
                className="gap-1 whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4" />
                {isDeletingRecords ? "삭제 중..." : "선택 삭제"}
              </Button>
            </div>
          </div>
          {recordsMessage && (
            <Message type={recordsMessageType || "info"}>{recordsMessage}</Message>
          )}
          {/* Filter Section */}
          {showFilters && (
            <form
              className="rounded-xl border border-border/60 bg-background/70 p-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmittedRecordFilters({ ...recordFilters });
                setRecordsPage(1);
              }}
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <FormField label="시작일" htmlFor="record-from">
                  <Input
                    id="record-from"
                    type="date"
                    value={recordFilters.from}
                    onChange={(e) =>
                      setRecordFilters({
                        ...recordFilters,
                        from: e.target.value,
                      })
                    }
                    className="h-10"
                  />
                </FormField>
                <FormField label="종료일" htmlFor="record-to">
                  <Input
                    id="record-to"
                    type="date"
                    value={recordFilters.to}
                    onChange={(e) => setRecordFilters({ ...recordFilters, to: e.target.value })}
                    className="h-10"
                  />
                </FormField>
                <FormField label="고객명" htmlFor="record-name">
                  <Input
                    id="record-name"
                    placeholder="고객명 검색"
                    value={recordFilters.name}
                    onChange={(e) =>
                      setRecordFilters({
                        ...recordFilters,
                        name: e.target.value,
                      })
                    }
                    className="h-10"
                  />
                </FormField>
                <FormField label="휴대폰 번호" htmlFor="record-phone">
                  <Input
                    id="record-phone"
                    placeholder="01012345678"
                    value={recordFilters.phone}
                    onChange={(e) =>
                      setRecordFilters({
                        ...recordFilters,
                        phone: e.target.value,
                      })
                    }
                    className="h-10"
                  />
                </FormField>
                <FormField label="작업 유형" htmlFor="record-kind">
                  <Select
                    id="record-kind"
                    value={recordFilters.kind}
                    onChange={(e) =>
                      setRecordFilters({
                        ...recordFilters,
                        kind: e.target.value,
                      })
                    }
                  >
                    <option value="">전체</option>
                    {Object.entries(KIND_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="작업 상태" htmlFor="record-status">
                  <Select
                    id="record-status"
                    value={recordFilters.status}
                    onChange={(e) =>
                      setRecordFilters({
                        ...recordFilters,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="">전체</option>
                    {Object.entries(RECORD_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="결제 상태" htmlFor="record-payment-status">
                  <Select
                    id="record-payment-status"
                    value={recordFilters.paymentStatus}
                    onChange={(e) =>
                      setRecordFilters({
                        ...recordFilters,
                        paymentStatus: e.target.value,
                      })
                    }
                  >
                    <option value="">전체</option>
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="결제수단" htmlFor="record-payment-method">
                  <Select
                    id="record-payment-method"
                    value={recordFilters.paymentMethod}
                    onChange={(e) =>
                      setRecordFilters({
                        ...recordFilters,
                        paymentMethod: e.target.value,
                      })
                    }
                  >
                    <option value="">전체</option>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetRecordFilters}>
                  <RotateCcw className="mr-2 h-3 w-3" />
                  초기화
                </Button>
                <Button type="submit" size="sm">
                  <Search className="mr-2 h-3 w-3" />
                  검색
                </Button>
              </div>
            </form>
          )}

          {/* Loading State */}
          {recordsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {/* Empty State */}
          {!recordsLoading && !records?.items?.length && (
            <AdminInlineEmpty>아직 등록된 기록이 없습니다.</AdminInlineEmpty>
          )}

          {/* Records Table */}
          {!!records?.items?.length && (
            <div className={adminSurface.tableCard}>
              <div className="overflow-x-auto">
                <table className="min-w-[1040px] w-full table-fixed text-sm">
                  <thead>
                    <tr className={adminSurface.tableHeader}>
                      <th className={adminDataTable.head}>
                        <Checkbox
                          checked={
                            isCurrentPageAllRecordsSelected ||
                            (isCurrentPagePartiallySelected ? "indeterminate" : false)
                          }
                          onCheckedChange={(checked) =>
                            toggleSelectAllCurrentRecords(Boolean(checked))
                          }
                          aria-label="현재 페이지 전체 선택"
                        />
                      </th>

                      <th className={adminDataTable.headRight}>
                        날짜
                      </th>
                      <th className={adminDataTable.head}>
                        고객
                      </th>

                      <th className={adminDataTable.headCenter}>
                        유형
                      </th>

                      <th className={adminDataTable.head}>
                        작업 내용
                      </th>

                      <th className={adminDataTable.headRight}>
                        금액
                      </th>

                      <th className={adminDataTable.headCenter}>
                        결제
                      </th>

                      <th className={adminDataTable.headCenter}>
                        상태
                      </th>

                      <th className={adminDataTable.actionHead}>
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(records?.items || []).map((r: any) => (
                      <tr key={r.id} className={adminDataTable.row}>
                        <td className={adminDataTable.cellLeft}>
                          <Checkbox
                            checked={selectedRecordIds.includes(String(r.id))}
                            onCheckedChange={(checked) =>
                              toggleRecordSelection(String(r.id), Boolean(checked))
                            }
                            aria-label={`${r.customerName ?? "오프라인 기록"} 선택`}
                          />
                        </td>

                        <td className={adminDataTable.dateCell}>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="tabular-nums">{formatDate(r.occurredAt)}</span>
                          </div>
                        </td>
                        <td className={adminDataTable.cellLeft}>
                          <div className="min-w-0 max-w-[180px]">
                            <p
                              className="line-clamp-2 break-words font-medium"
                              title={r.customerName}
                            >
                              {r.offlineCustomerId ? (
                                <Link
                                  className="hover:text-primary transition-colors"
                                  href={`/admin/offline/customers/${r.offlineCustomerId}`}
                                >
                                  {r.customerName}
                                </Link>
                              ) : (
                                r.customerName
                              )}
                            </p>
                            <p className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                              {r.customerPhoneMasked}
                            </p>
                          </div>
                        </td>
                        <td className={adminDataTable.cellCenter}>
                          <span className="text-foreground/80">
                            {KIND_LABELS[r.kind as keyof typeof KIND_LABELS] ?? r.kind}
                          </span>
                        </td>
                        <td className={adminDataTable.cellTopLeft}>
                          <span
                            className="line-clamp-2 break-words text-muted-foreground"
                            title={formatLineSummary(r.lines)}
                          >
                            {formatLineSummary(r.lines)}
                          </span>
                        </td>
                        <td className={adminDataTable.moneyCell}>
                          {formatCurrency(r.payment?.amount)}
                        </td>
                        <td className={adminDataTable.cellCenter}>
                          <StatusBadge status={r.payment?.status} type="payment" />
                        </td>
                        <td className={adminDataTable.cellCenter}>
                          <StatusBadge status={r.status} type="record" />
                        </td>
                        <td className={adminDataTable.actionCell}>
                          <div className="flex shrink-0 items-center justify-end gap-1">
                            {r.offlineCustomerId && (
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 shrink-0 p-0"
                              >
                                <Link href={`/admin/offline/customers/${r.offlineCustomerId}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 p-0"
                              onClick={() => {
                                const existingLines =
                                  Array.isArray(r.lines) && r.lines.length > 0 ? r.lines : [{}];

                                setEditingRecord(r);
                                setEditForm({
                                  kind: r.kind ?? "stringing",
                                  occurredAt: toDateInputValue(r.occurredAt),

                                  lines: existingLines.map((line: any, index: number) => {
                                    const fallbackStringName = String(line.stringName ?? "").trim();

                                    return {
                                      id: `edit-line-${r.id}-${index}`,
                                      racketName: String(line.racketName ?? ""),
                                      mainStringName: String(
                                        line.mainStringName ?? fallbackStringName,
                                      ),
                                      crossStringName: String(line.crossStringName ?? ""),
                                      tensionMain: String(line.tensionMain ?? ""),
                                      tensionCross: String(line.tensionCross ?? ""),
                                      amount: Number(line.amount ?? 0),
                                      note: String(line.note ?? ""),
                                    };
                                  }),

                                  status: r.status,
                                  paymentStatus: r.payment?.status ?? "pending",
                                  paymentMethod: r.payment?.method ?? "cash",
                                  paymentAmount: Number(r.payment?.amount ?? 0),
                                  memo: r.memo ?? "",
                                });
                                setEditMessage(null);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{currentRecordsPage}</span> /{" "}
              {Math.max(recordsTotalPages, 1)} 페이지
              <span className="mx-2">·</span>
              전체{" "}
              <span className="font-medium text-foreground">
                {recordsTotal.toLocaleString("ko-KR")}
              </span>
              건
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={recordsLoading || currentRecordsPage <= 1 || recordsTotalPages <= 1}
                onClick={() => setRecordsPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                이전
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  recordsLoading ||
                  recordsTotalPages <= 1 ||
                  currentRecordsPage >= recordsTotalPages
                }
                onClick={() => setRecordsPage((page) => page + 1)}
              >
                다음
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-overlay/60 backdrop-blur-sm"
            onClick={() => {
              setEditingRecord(null);
              setEditMessage(null);
            }}
          />
          <Card className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border-border/60">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-primary" />
                  기록 수정
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0"
                  onClick={() => {
                    setEditingRecord(null);
                    setEditMessage(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Customer Info */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p
                      className="line-clamp-2 break-words font-medium"
                      title={editingRecord.customerName}
                    >
                      {editingRecord.customerName}
                    </p>
                    <p className="line-clamp-2 break-keep text-xs text-muted-foreground">
                      <span className="whitespace-nowrap tabular-nums">
                        {editingRecord.customerPhoneMasked}
                      </span>{" "}
                      · {formatLineSummary(editingRecord.lines)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="rounded-xl border border-border/60 bg-background/70 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">기본 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="작업 유형" htmlFor="edit-kind">
                    <Select
                      id="edit-kind"
                      value={editForm.kind}
                      onChange={(e) => setEditForm({ ...editForm, kind: e.target.value })}
                    >
                      {Object.entries(KIND_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="작업일" htmlFor="edit-occurredAt">
                    <Input
                      type="date"
                      id="edit-occurredAt"
                      value={editForm.occurredAt}
                      onChange={(e) => setEditForm({ ...editForm, occurredAt: e.target.value })}
                      className="h-10"
                    />
                  </FormField>
                </div>
              </div>

              {/* Work Info */}
              <div className="rounded-xl border border-border/60 bg-background/70 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">라켓별 작업 정보</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      저장된 라켓별 메인/크로스 스트링, 텐션, 금액을 수정합니다.
                    </p>
                  </div>

                  <Button type="button" variant="outline" size="sm" onClick={addEditWorkLine}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    라켓 추가
                  </Button>
                </div>

                {editForm.lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="rounded-xl border border-border/60 bg-background p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">라켓 {index + 1}</p>

                      {editForm.lines.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeEditWorkLine(line.id)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          삭제
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField label="라켓명" htmlFor={`edit-racketName-${line.id}`}>
                        <Input
                          id={`edit-racketName-${line.id}`}
                          value={line.racketName}
                          onChange={(e) =>
                            updateEditWorkLine(line.id, {
                              racketName: e.target.value,
                            })
                          }
                          className="h-10"
                        />
                      </FormField>

                      <FormField label="작업 금액 (선택)" htmlFor={`edit-lineAmount-${line.id}`}>
                        <FormattedNumberInput
                          id={`edit-lineAmount-${line.id}`}
                          min={0}
                          value={line.amount}
                          onValueChange={(amount) =>
                            updateEditWorkLine(line.id, {
                              amount,
                            })
                          }
                          className="h-10"
                        />
                      </FormField>

                      <FormField label="메인 스트링" htmlFor={`edit-mainStringName-${line.id}`}>
                        <Input
                          id={`edit-mainStringName-${line.id}`}
                          value={line.mainStringName}
                          onChange={(e) =>
                            updateEditWorkLine(line.id, {
                              mainStringName: e.target.value,
                            })
                          }
                          className="h-10"
                        />
                      </FormField>

                      <FormField label="크로스 스트링" htmlFor={`edit-crossStringName-${line.id}`}>
                        <Input
                          id={`edit-crossStringName-${line.id}`}
                          value={line.crossStringName}
                          onChange={(e) =>
                            updateEditWorkLine(line.id, {
                              crossStringName: e.target.value,
                            })
                          }
                          className="h-10"
                        />
                      </FormField>

                      <FormField label="메인 텐션" htmlFor={`edit-tensionMain-${line.id}`}>
                        <Input
                          id={`edit-tensionMain-${line.id}`}
                          value={line.tensionMain}
                          onChange={(e) =>
                            updateEditWorkLine(line.id, {
                              tensionMain: e.target.value,
                            })
                          }
                          className="h-10"
                        />
                      </FormField>

                      <FormField label="크로스 텐션" htmlFor={`edit-tensionCross-${line.id}`}>
                        <Input
                          id={`edit-tensionCross-${line.id}`}
                          value={line.tensionCross}
                          onChange={(e) =>
                            updateEditWorkLine(line.id, {
                              tensionCross: e.target.value,
                            })
                          }
                          className="h-10"
                        />
                      </FormField>
                    </div>

                    <div className="mt-4">
                      <FormField label="라켓별 메모 (선택)" htmlFor={`edit-lineNote-${line.id}`}>
                        <Input
                          id={`edit-lineNote-${line.id}`}
                          value={line.note}
                          onChange={(e) =>
                            updateEditWorkLine(line.id, {
                              note: e.target.value,
                            })
                          }
                          className="h-10"
                        />
                      </FormField>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status & Payment Info */}
              <div className="rounded-xl border border-border/60 bg-background/70 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">상태/결제 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="작업 상태" htmlFor="edit-status">
                    <Select
                      id="edit-status"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      {Object.entries(RECORD_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="결제 상태" htmlFor="edit-paymentStatus">
                    <Select
                      id="edit-paymentStatus"
                      value={editForm.paymentStatus}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          paymentStatus: e.target.value,
                        })
                      }
                    >
                      {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="결제수단" htmlFor="edit-paymentMethod">
                    <Select
                      id="edit-paymentMethod"
                      value={editForm.paymentMethod}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          paymentMethod: e.target.value,
                        })
                      }
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="결제 금액" htmlFor="edit-paymentAmount">
                    <FormattedNumberInput
                      id="edit-paymentAmount"
                      min={0}
                      value={editForm.paymentAmount}
                      onValueChange={(paymentAmount) =>
                        setEditForm({
                          ...editForm,
                          paymentAmount,
                        })
                      }
                      className="h-10"
                    />
                  </FormField>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">라켓별 금액 합계</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(editLineTotalAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">전체 결제금액</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(editPaymentAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">차액</p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-semibold tabular-nums",
                        editPaymentDifference === 0 ? "text-muted-foreground" : "text-warning",
                      )}
                    >
                      {formatCurrency(editPaymentDifference)}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  수정 시에도 전체 결제금액은 라켓별 합계와 별도로 저장됩니다. 현장 할인이나
                  추가비가 있으면 차액으로 관리하세요.
                </p>
              </div>
              {/* Memo */}
              <FormField label="작업 메모" htmlFor="edit-memo">
                <textarea
                  id="edit-memo"
                  value={editForm.memo}
                  onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring hover:border-ring/50 min-h-[80px] resize-none"
                />
              </FormField>

              {editMessage && <Message type="error">{editMessage}</Message>}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingRecord(null);
                    setEditMessage(null);
                  }}
                >
                  취소
                </Button>
                <Button
                  disabled={isEditingSubmit}
                  onClick={async () => {
                    if (!editingRecord || isEditingSubmit) return;
                    setIsEditingSubmit(true);
                    setEditMessage(null);
                    try {
                      await adminMutator(`/api/admin/offline/records/${editingRecord.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          kind: editForm.kind,
                          occurredAt: editForm.occurredAt
                            ? new Date(`${editForm.occurredAt}T00:00:00.000Z`).toISOString()
                            : undefined,
                          status: editForm.status,
                          lines: editForm.lines
                            .map((line) => {
                              const mainStringName = line.mainStringName.trim();
                              const crossStringName = line.crossStringName.trim();

                              return {
                                racketName: line.racketName.trim(),

                                // 기존 화면/과거 코드 호환용 대표 스트링명입니다.
                                stringName:
                                  mainStringName &&
                                  crossStringName &&
                                  mainStringName !== crossStringName
                                    ? `${mainStringName} / ${crossStringName}`
                                    : mainStringName || crossStringName,

                                mainStringName,
                                crossStringName,

                                tensionMain: line.tensionMain.trim(),
                                tensionCross: line.tensionCross.trim(),

                                amount: Number(line.amount) || 0,
                                note: line.note.trim(),
                              };
                            })
                            .filter(
                              (line) =>
                                [
                                  line.racketName,
                                  line.stringName,
                                  line.mainStringName,
                                  line.crossStringName,
                                  line.tensionMain,
                                  line.tensionCross,
                                  line.note,
                                ].some((value) => String(value ?? "").trim().length > 0) ||
                                Number(line.amount) > 0,
                            ),
                          payment: {
                            status: editForm.paymentStatus,
                            method: editForm.paymentMethod,
                            amount: Number(editForm.paymentAmount || 0),
                          },
                          memo: editForm.memo,
                        }),
                      });
                      await mutateRecords();
                      setEditingRecord(null);
                    } catch (e: any) {
                      setEditMessage(String(e?.message || "수정 저장에 실패했습니다."));
                    } finally {
                      setIsEditingSubmit(false);
                    }
                  }}
                >
                  {isEditingSubmit ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      수정 저장
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
