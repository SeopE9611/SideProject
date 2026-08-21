"use client";

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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { adminFetcher } from "@/lib/admin/adminFetcher";
import { formatKoreanDateTime } from "@/lib/korean-date";
import { formatKoreanPhone, normalizePhoneDigits } from "@/lib/phone";
import { getCommonPaymentStatusLabel } from "@/lib/status-labels/base";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown, CreditCard } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  title: string;
  amount: number;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: string;
  paymentStatus: string;
  expiresAt?: string;
  archivedAt?: string;
  createdAt: string;
  paidAt?: string;
  canceledAt?: string;
  cancellationInfo?: {
    status?: "processing" | "completed" | "failed";
  };
  offlineLink?: {
    status: "linked";
    offlineCustomerId: string;
    offlineRecordId?: string | null;
    linkedAt: string;
    linkedBy: string;
  };
};
type Summary = {
  total: number;
  pending: number;
  paid: number;
  canceled: number;
  monthPaidAmount: number;
};
type ListResponse = {
  ok: boolean;
  items: Item[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: Summary;
};
type SaveResponse = { ok: boolean; message?: string };
type Filters = {
  q: string;
  paymentStatus: string;
  status: string;
  archived: string;
  from: string;
  to: string;
};
const empty = {
  title: "",
  amount: "",
  description: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  expiresAt: "",
};
type PrivatePaymentFormState = typeof empty;
type PrivatePaymentFormField =
  | "title"
  | "amount"
  | "description"
  | "customerName"
  | "customerPhone"
  | "customerEmail"
  | "expiresAt";
type PrivatePaymentFormErrors = Partial<Record<PrivatePaymentFormField, string>>;
type OfflineLinkField = "customerName" | "customerPhone" | "customerEmail" | "memo";
type OfflineLinkFieldErrors = Partial<Record<OfflineLinkField, string>>;
const emptyFilters: Filters = {
  q: "",
  paymentStatus: "",
  status: "",
  archived: "active",
  from: "",
  to: "",
};
const defaultCancelReason = "관리자 개인결제 승인취소";
const emptyOfflineLinkForm = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  memo: "",
  createRecord: true,
};
const defaultSummary: Summary = { total: 0, pending: 0, paid: 0, canceled: 0, monthPaidAmount: 0 };
const PRIVATE_PAYMENT_PAGE_SIZE = 50;
const KOREA_TIME_OFFSET_MS = 9 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AMOUNT_DIGITS_PATTERN = /^\d+$/;
const PRIVATE_PAYMENT_LIMITS = {
  title: 80,
  description: 500,
  customerName: 80,
  customerPhoneDigits: 11,
  customerEmail: 254,
  offlineMemo: 500,
} as const;
const PRIVATE_PAYMENT_LIST_COLUMNS =
  "grid-cols-[40px_minmax(360px,1.35fr)_150px_minmax(230px,0.85fr)_minmax(240px,0.9fr)_116px]";

const privatePaymentStatusLabels: Record<string, string> = {
  payment_completed: "결제완료",
};

const getPrivatePaymentStatusLabel = (status?: string | null) => {
  const normalized = String(status ?? "").trim();
  return (
    getCommonPaymentStatusLabel(normalized) ?? privatePaymentStatusLabels[normalized] ?? normalized
  );
};

const statusLabel = (status: string) => (status === "active" ? "활성" : "비활성");
const money = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
const toKoreanDateTimeLocal = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + KOREA_TIME_OFFSET_MS).toISOString().slice(0, 16);
};
const koreanDateTimeLocalToIso = (value: string) => {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const defaultExpiresAt = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + KOREA_TIME_OFFSET_MS)
    .toISOString()
    .slice(0, 16);
const currentKoreanDateTimeLocal = () =>
  new Date(Date.now() + KOREA_TIME_OFFSET_MS).toISOString().slice(0, 16);
const normalizeAmountDigits = (value: string) =>
  value.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
const formatAmountInput = (value: string) => {
  const digits = normalizeAmountDigits(value);
  if (!digits) return "";
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount.toLocaleString("ko-KR") : "";
};
const parseAmountInput = (value: string) => {
  const digits = value.replace(/,/g, "");
  if (!AMOUNT_DIGITS_PATTERN.test(digits)) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
};
function validatePrivatePaymentForm(form: PrivatePaymentFormState) {
  const errors: PrivatePaymentFormErrors = {};
  const title = form.title.trim();
  const description = form.description.trim();
  const customerName = form.customerName.trim();
  const customerPhoneDigits = normalizePhoneDigits(form.customerPhone);
  const customerEmail = form.customerEmail.trim().toLowerCase();
  const amount = parseAmountInput(form.amount);
  if (!title || title.length > PRIVATE_PAYMENT_LIMITS.title)
    errors.title = "결제명은 1~80자로 입력해 주세요.";
  if (amount === null || amount < 1000)
    errors.amount = "금액은 1,000원 이상의 정수로 입력해 주세요.";
  if (description.length > PRIVATE_PAYMENT_LIMITS.description)
    errors.description = "설명은 500자 이하로 입력해 주세요.";
  if (customerName.length > PRIVATE_PAYMENT_LIMITS.customerName)
    errors.customerName = "고객명은 80자 이하로 입력해 주세요.";
  if (customerPhoneDigits && (customerPhoneDigits.length < 9 || customerPhoneDigits.length > 11))
    errors.customerPhone = "연락처는 숫자 9~11자리로 입력해 주세요.";
  if (customerEmail && (customerEmail.length > PRIVATE_PAYMENT_LIMITS.customerEmail || !EMAIL_PATTERN.test(customerEmail)))
    errors.customerEmail = "이메일 형식을 확인해 주세요.";
  let expiresAt: string | null = null;
  if (form.expiresAt) {
    expiresAt = koreanDateTimeLocalToIso(form.expiresAt);
    if (!expiresAt) errors.expiresAt = "만료일 형식을 확인해 주세요.";
    else if (new Date(expiresAt).getTime() <= Date.now())
      errors.expiresAt = "만료일은 현재 시각보다 이후로 설정해 주세요.";
  }
  return { errors, normalized: { title, amount, description, customerName,
    customerPhone: customerPhoneDigits ? formatKoreanPhone(customerPhoneDigits) : "",
    customerEmail, expiresAt: form.expiresAt ? expiresAt : "" } };
}
function validateOfflineLinkForm(form: typeof emptyOfflineLinkForm) {
  const errors: OfflineLinkFieldErrors = {};
  const customerName = form.customerName.trim();
  const customerPhoneDigits = normalizePhoneDigits(form.customerPhone);
  const customerEmail = form.customerEmail.trim().toLowerCase();
  const memo = form.memo.trim();
  if (!customerName || customerName.length > PRIVATE_PAYMENT_LIMITS.customerName)
    errors.customerName = "고객명은 1~80자로 입력해 주세요.";
  if (customerPhoneDigits && (customerPhoneDigits.length < 9 || customerPhoneDigits.length > 11))
    errors.customerPhone = "연락처는 숫자 9~11자리로 입력해 주세요.";
  if (customerEmail && (customerEmail.length > PRIVATE_PAYMENT_LIMITS.customerEmail || !EMAIL_PATTERN.test(customerEmail)))
    errors.customerEmail = "이메일 형식을 확인해 주세요.";
  if (!customerPhoneDigits && !customerEmail) {
    errors.customerPhone = "연락처 또는 이메일 중 하나를 입력해 주세요.";
    errors.customerEmail = "연락처 또는 이메일 중 하나를 입력해 주세요.";
  }
  if (memo.length > PRIVATE_PAYMENT_LIMITS.offlineMemo)
    errors.memo = "작업 메모는 500자 이하로 입력해 주세요.";
  return { errors, normalized: { ...form, customerName,
    customerPhone: customerPhoneDigits ? formatKoreanPhone(customerPhoneDigits) : "",
    customerEmail, memo } };
}
const isExpired = (item: Item, now: number) =>
  !!item.expiresAt && new Date(item.expiresAt).getTime() < now;

export default function PrivatePaymentsClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary>(defaultSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ ...empty, expiresAt: defaultExpiresAt() });
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formErrors, setFormErrors] = useState<PrivatePaymentFormErrors>({});
  const [message, setMessage] = useState("");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Item | null>(null);
  const [cancelReason, setCancelReason] = useState(defaultCancelReason);
  const [cancelError, setCancelError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleteMode, setDeleteMode] = useState<"item" | "bulk" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [offlineLinkTarget, setOfflineLinkTarget] = useState<Item | null>(null);
  const [offlineLinkForm, setOfflineLinkForm] = useState(emptyOfflineLinkForm);
  const [offlineLinking, setOfflineLinking] = useState(false);
  const [offlineLinkError, setOfflineLinkError] = useState("");
  const [offlineLinkFieldErrors, setOfflineLinkFieldErrors] =
    useState<OfflineLinkFieldErrors>({});
  const [now, setNow] = useState<number | null>(null);
  const requestSequenceRef = useRef(0);
  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PRIVATE_PAYMENT_PAGE_SIZE),
      sort,
      dir,
    });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params.toString();
  }, [filters, page, sort, dir]);
  const load = async () => {
    const requestId = ++requestSequenceRef.current;
    setIsLoading(true);
    setLoadError("");

    try {
      const json = await adminFetcher<ListResponse>(`/api/admin/private-payments?${query}`);
      if (requestId !== requestSequenceRef.current) return;
      const totalPages = Math.max(1, Number(json.totalPages || 1));
      if (page > totalPages) {
        setPage(totalPages);
        return;
      }
      setItems(json.items || []);
      setSummary(json.summary || defaultSummary);
      setPagination({
        total: Number(json.total || 0),
        page: Number(json.page || page),
        totalPages,
      });
      setSelected([]);
    } catch (error) {
      if (requestId !== requestSequenceRef.current) return;
      setLoadError("목록을 불러오지 못했습니다.");
      throw error;
    } finally {
      if (requestId === requestSequenceRef.current) setIsLoading(false);
    }
  };
  useEffect(() => {
    load().catch(() => undefined);
  }, [query]);
  useEffect(() => {
    setNow(Date.now());
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setFilters((current) =>
        current.q === searchInput ? current : { ...current, q: searchInput },
      );
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);
  const save = async () => {
    if (saving) return;
    setFormError("");
    setFormErrors({});
    const validation = validatePrivatePaymentForm(form);
    if (Object.keys(validation.errors).length > 0) {
      setFormErrors(validation.errors);
      return;
    }
    if (validation.normalized.amount === null) {
      setFormErrors({ amount: "금액은 1,000원 이상의 정수로 입력해 주세요." });
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/admin/private-payments/${editing.id}`
        : "/api/admin/private-payments";
      const json = await adminFetcher<SaveResponse>(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: validation.normalized.title,
          amount: validation.normalized.amount,
          description: validation.normalized.description,
          customerName: validation.normalized.customerName,
          customerPhone: validation.normalized.customerPhone,
          customerEmail: validation.normalized.customerEmail,
          expiresAt: validation.normalized.expiresAt,
          status: editing?.status || "active",
        }),
      });
      if (!json.ok) throw new Error(json.message || "저장에 실패했습니다.");
      const wasEditing = Boolean(editing);
      setForm({ ...empty, expiresAt: defaultExpiresAt() });
      setEditing(null);
      setFormDialogOpen(false);
      setFormErrors({});
      setFormError("");
      setMessage(
        wasEditing
          ? "수정했습니다."
          : "개인결제 링크를 생성했습니다. 링크 복사 메뉴로 고객에게 전달해 주세요.",
      );
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };
  const openCreateDialog = () => {
    setEditing(null);
    setForm({ ...empty, expiresAt: defaultExpiresAt() });
    setFormErrors({});
    setFormError("");
    setMessage("");
    setFormDialogOpen(true);
  };
  const edit = (item: Item) => {
    setEditing(item);
    setForm({
      title: item.title,
      amount: formatAmountInput(String(item.amount)),
      description: item.description || "",
      customerName: item.customerName || "",
      customerPhone: item.customerPhone || "",
      customerEmail: item.customerEmail || "",
      expiresAt: toKoreanDateTimeLocal(item.expiresAt),
    });
    setFormErrors({});
    setFormError("");
    setMessage("");
    setFormDialogOpen(true);
  };
  const copy = async (id: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/private-payments/${id}`);
    setMessage("고객에게 전달할 결제 링크입니다. 링크를 복사했습니다.");
  };
  const runItemAction = async (item: Item, action: "archive" | "unarchive" | "delete") => {
    const json = await adminFetcher<SaveResponse>(`/api/admin/private-payments/${item.id}`, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: action === "delete" ? undefined : JSON.stringify({ action }),
    });
    if (!json.ok) throw new Error(json.message || "작업에 실패했습니다.");
    setMessage(
      action === "archive"
        ? "보관했습니다."
        : action === "unarchive"
          ? "보관 해제했습니다."
          : "결제대기 건을 삭제했습니다.",
    );
    await load();
  };
  const runBulkAction = async (action: "archive" | "unarchive" | "delete_pending") => {
    const json = await adminFetcher<SaveResponse>("/api/admin/private-payments/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: selected }),
    });
    if (!json.ok) throw new Error(json.message || "선택 작업에 실패했습니다.");
    setMessage(
      action === "archive"
        ? "선택 항목을 보관했습니다."
        : action === "unarchive"
          ? "선택 항목을 보관 해제했습니다."
          : "선택한 결제대기 건을 삭제했습니다.",
    );
    await load();
  };
  const openDeleteDialog = (item?: Item) => {
    setDeleteTarget(item || null);
    setDeleteMode(item ? "item" : "bulk");
    setDeleteError("");
    setMessage("");
  };
  const confirmDelete = async () => {
    if (!deleteMode) return;
    setDeleting(true);
    setDeleteError("");
    try {
      if (deleteMode === "item") {
        if (!deleteTarget) return;
        await runItemAction(deleteTarget, "delete");
      } else {
        await runBulkAction("delete_pending");
      }
      setDeleteTarget(null);
      setDeleteMode(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };
  const openOfflineLinkDialog = (item: Item) => {
    if (item.paymentStatus !== "결제완료" || item.offlineLink?.status === "linked") return;
    setOfflineLinkTarget(item);
    setOfflineLinkForm({
      customerName: item.customerName || "",
      customerPhone: item.customerPhone || "",
      customerEmail: item.customerEmail || "",
      memo: "",
      createRecord: true,
    });
    setOfflineLinkError("");
    setOfflineLinkFieldErrors({});
    setMessage("");
  };
  const linkOffline = async () => {
    if (!offlineLinkTarget) return;
    const validation = validateOfflineLinkForm(offlineLinkForm);
    if (Object.keys(validation.errors).length > 0) {
      setOfflineLinkFieldErrors(validation.errors);
      return;
    }
    setOfflineLinking(true);
    setOfflineLinkError("");
    try {
      const json = await adminFetcher<SaveResponse>(
        `/api/admin/private-payments/${offlineLinkTarget.id}/link-offline`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.normalized),
        },
      );
      if (!json.ok) throw new Error(json.message || "오프라인 연결에 실패했습니다.");
      setMessage("오프라인 고객/작업 기록과 연결했습니다.");
      setOfflineLinkTarget(null);
      await load();
    } catch (e) {
      setOfflineLinkError(e instanceof Error ? e.message : "오프라인 연결에 실패했습니다.");
    } finally {
      setOfflineLinking(false);
    }
  };
  const openCancelDialog = (item: Item) => {
    setCancelTarget(item);
    setCancelReason(defaultCancelReason);
    setCancelError("");
    setMessage("");
  };
  const cancelPayment = async () => {
    if (!cancelTarget) return;
    setCancelingId(cancelTarget.id);
    setCancelError("");
    try {
      const json = await adminFetcher<SaveResponse>(
        `/api/admin/private-payments/${cancelTarget.id}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancelReason.trim() || defaultCancelReason }),
        },
      );
      if (!json.ok) throw new Error(json.message || "결제취소에 실패했습니다.");
      setMessage("개인결제를 취소했습니다.");
      setCancelTarget(null);
      await load();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "결제취소에 실패했습니다.");
    } finally {
      setCancelingId(null);
    }
  };
  const toggleSort = (key: string) => {
    setPage(1);
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir("desc");
    }
  };
  const allChecked = items.length > 0 && selected.length === items.length;
  const selectedItems = items.filter((item) => selected.includes(item.id));
  const isPartiallySelected = selected.length > 0 && !allChecked;
  const hasAppliedFilters = Boolean(
    filters.q ||
      filters.paymentStatus ||
      filters.status ||
      filters.archived !== "active" ||
      filters.from ||
      filters.to,
  );
  const currentViewLabel = filters.q ? "검색 결과" : hasAppliedFilters ? "필터 결과" : "활성 목록";
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const resetFilters = () => {
    setSearchInput("");
    setPage(1);
    setFilters({ ...emptyFilters });
  };
  const updateFormField = <K extends PrivatePaymentFormField>(
    key: K,
    value: PrivatePaymentFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
    setFormError("");
  };
  const hasArchivable = selectedItems.some(
    (item) => item.paymentStatus !== "결제대기" && !item.archivedAt,
  );
  const hasUnarchivable = selectedItems.some((item) => item.archivedAt);
  const hasPending = selectedItems.some((item) => item.paymentStatus === "결제대기");
  const canEdit = !editing || editing.paymentStatus === "결제대기";
  const hasNoExpiration = form.expiresAt === "";
  const header = (label: string, key: string) => (
    <button
      className="inline-flex min-h-8 items-center gap-1 rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      type="button"
      onClick={() => toggleSort(key)}
      aria-label={`${label} 기준 정렬${sort === key ? `, 현재 ${dir === "asc" ? "오름차순" : "내림차순"}` : ""}`}
    >
      {label}
      {sort === key ? (
        dir === "asc" ? (
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      )}
    </button>
  );
  return (
    <AdminPageShell variant="wide">
      <AdminPageHeader
        title="개인결제 관리"
        description="개인결제 링크 생성부터 결제 상태, 보관, 취소, 오프라인 연결을 한 화면에서 관리합니다."
        icon={CreditCard}
        actions={<Button onClick={openCreateDialog}>개인결제 생성</Button>}
      />
      <div className="space-y-6">
        <div className="grid gap-3 grid-cols-4">
          {[
            ["전체", summary.total],
            ["결제대기", summary.pending],
            ["결제완료", summary.paid],
            ["이번 달 완료금액", money(summary.monthPaidAmount)],
          ].map(([label, value]) => (
            <Card key={label} className={adminSurface.kpiCard}>
              <CardContent className="p-0">
                <p className={adminTypography.caption}>{label}</p>
                <p
                  className={cn(
                    "mt-2 whitespace-nowrap",
                    typeof value === "string"
                      ? adminTypography.kpiValueCompact
                      : adminTypography.kpiValue,
                  )}
                >
                  {value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <AdminFilterBar
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={!hasAppliedFilters}
            >
              필터 초기화
            </Button>
          }
          activeFilters={
            <>
              <span className="font-medium text-foreground/80">
                결제 상태:{" "}
                {filters.paymentStatus
                  ? getPrivatePaymentStatusLabel(filters.paymentStatus)
                  : "전체"}
              </span>
              <span>활성 상태: {filters.status ? statusLabel(filters.status) : "전체"}</span>
              <span>
                보관 범위:{" "}
                {filters.archived === "archived"
                  ? "보관함"
                  : filters.archived === "all"
                    ? "전체"
                    : "보관 제외"}
              </span>
              {filters.from || filters.to ? (
                <span>
                  기간: {filters.from || "시작 제한 없음"} ~ {filters.to || "종료 제한 없음"}
                </span>
              ) : null}
              <span className="tabular-nums">조회 결과: {pagination.total.toLocaleString("ko-KR")}건</span>
            </>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="private-payment-filter-q">검색어</Label>
              <Input
                id="private-payment-filter-q"
                className="w-full min-w-0"
                placeholder="결제명, 고객명, 연락처 검색"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="private-payment-filter-payment-status">결제상태</Label>
              <select
                id="private-payment-filter-payment-status"
                className="h-10 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm"
                value={filters.paymentStatus}
                onChange={(event) => updateFilter("paymentStatus", event.target.value)}
              >
                <option value="">전체</option>
                <option>결제대기</option>
                <option>결제완료</option>
                <option>결제취소</option>
              </select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="private-payment-filter-status">활성상태</Label>
              <select
                id="private-payment-filter-status"
                className="h-10 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm"
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
              >
                <option value="">전체</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="private-payment-filter-archived">보관상태</Label>
              <select
                id="private-payment-filter-archived"
                className="h-10 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm"
                value={filters.archived}
                onChange={(event) => updateFilter("archived", event.target.value)}
              >
                <option value="active">보관 제외</option>
                <option value="archived">보관함 보기</option>
                <option value="all">전체 보기</option>
              </select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="private-payment-filter-from">시작일</Label>
              <Input
                id="private-payment-filter-from"
                className="w-full min-w-0"
                type="date"
                value={filters.from}
                onChange={(event) => updateFilter("from", event.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="private-payment-filter-to">종료일</Label>
              <Input
                id="private-payment-filter-to"
                className="w-full min-w-0"
                type="date"
                value={filters.to}
                onChange={(event) => updateFilter("to", event.target.value)}
              />
            </div>
          </div>
        </AdminFilterBar>

        {message ? (
          <div
            role="status"
            className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground"
          >
            {message}
          </div>
        ) : null}

        {selected.length > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
            <p className={adminTypography.caption}>
              선택됨{" "}
              <span className="font-semibold text-foreground">{selected.length}</span>개
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!hasArchivable}
                onClick={() => runBulkAction("archive").catch((e) => setMessage(e.message))}
              >
                선택 보관
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!hasUnarchivable}
                onClick={() => runBulkAction("unarchive").catch((e) => setMessage(e.message))}
              >
                선택 보관 해제
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!hasPending}
                onClick={() => openDeleteDialog()}
              >
                선택 삭제
              </Button>
            </div>
          </div>
        ) : null}

        <AdminListTable
          title="개인결제 목록"
          viewLabel={currentViewLabel}
          resultLabel={
            loadError
              ? "불러오기 실패"
              : isLoading
                ? "불러오는 중…"
                : `총 ${pagination.total.toLocaleString("ko-KR")}건`
          }
          description="결제 정보와 고객, 금액, 결제·운영 상태, 만료 일정 및 관리 작업을 한 행에서 확인합니다."
          columnsClassName={PRIVATE_PAYMENT_LIST_COLUMNS}
          ariaLabel="개인결제 관리 목록"
        >
          <AdminListColumnHeader columnsClassName={PRIVATE_PAYMENT_LIST_COLUMNS}>
            <div role="columnheader" className="flex min-w-0 items-center justify-center px-2 py-2.5">
              <Checkbox
                aria-label="현재 목록의 개인결제 전체 선택"
                checked={allChecked ? true : isPartiallySelected ? "indeterminate" : false}
                onCheckedChange={(checked) => {
                  setSelected(checked === true ? items.map((item) => item.id) : []);
                }}
              />
            </div>
            <div role="columnheader" className="min-w-0 px-4 py-2.5">
              {header("결제 / 고객", "title")}
            </div>
            <div role="columnheader" className="min-w-0 px-4 py-2.5 text-right">
              {header("금액", "amount")}
            </div>
            <div role="columnheader" className="min-w-0 px-4 py-2.5">
              {header("상태 / 연결", "paymentStatus")}
            </div>
            <div role="columnheader" className="min-w-0 px-4 py-2.5 text-right">
              만료 / 생성
            </div>
            <div role="columnheader" className="min-w-0 px-2 py-2.5 text-right">
              작업
            </div>
          </AdminListColumnHeader>
          <AdminListBody>
            {loadError ? (
              <AdminListRow columnsClassName={PRIVATE_PAYMENT_LIST_COLUMNS} ariaLabel="개인결제 목록 오류">
                <AdminListCell className="col-span-6 py-10 text-center text-destructive">
                  개인결제 목록을 불러오지 못했습니다.
                </AdminListCell>
              </AdminListRow>
            ) : isLoading ? (
              Array.from({ length: 6 }, (_, index) => (
                <AdminListRow key={index} columnsClassName={PRIVATE_PAYMENT_LIST_COLUMNS} ariaLabel="개인결제 목록 로딩 중">
                  <AdminListCell align="center" className="px-2"><Skeleton className="h-4 w-4" /></AdminListCell>
                  <AdminListCell><Skeleton className="h-12 w-full" /></AdminListCell>
                  <AdminListCell align="end"><Skeleton className="h-5 w-24" /></AdminListCell>
                  <AdminListCell><Skeleton className="h-12 w-full" /></AdminListCell>
                  <AdminListCell align="end"><Skeleton className="h-10 w-40" /></AdminListCell>
                  <AdminListCell align="end" className="px-2"><Skeleton className="h-8 w-20" /></AdminListCell>
                </AdminListRow>
              ))
            ) : items.length === 0 ? (
              <AdminListRow columnsClassName={PRIVATE_PAYMENT_LIST_COLUMNS} ariaLabel="개인결제 목록 없음">
                <AdminListCell className="col-span-6 py-16 text-center">
                  <p className={adminTypography.bodyStrong}>
                    {hasAppliedFilters
                      ? "현재 조건에 맞는 개인결제가 없습니다."
                      : "등록된 개인결제가 없습니다."}
                  </p>
                  <p className={cn(adminTypography.caption, "mt-2")}>
                    새 개인결제를 만들려면 상단의 개인결제 생성 버튼을 사용하세요. 오프라인 연결은 결제완료 후 작업 메뉴에서 진행할 수 있습니다.
                  </p>
                </AdminListCell>
              </AdminListRow>
            ) : (
              items.map((item) => {
                const paymentStatusLabel = getPrivatePaymentStatusLabel(item.paymentStatus);
                const expired = now !== null && isExpired(item, now);
                const exceptionLabel =
                  item.cancellationInfo?.status === "processing"
                    ? "취소 처리 확인 중"
                    : expired
                      ? "만료"
                      : null;
                const operationalSummary = [
                  statusLabel(item.status),
                  item.archivedAt ? "보관됨" : "보관 안 됨",
                  item.offlineLink?.status === "linked"
                    ? "오프라인 연결됨"
                    : "오프라인 미연결",
                ].join(" · ");

                return (
                  <AdminListRow key={item.id} columnsClassName={PRIVATE_PAYMENT_LIST_COLUMNS}>
                    <AdminListCell align="center" className="px-2">
                      <Checkbox
                        aria-label={`${item.title || item.customerName || item.id} 개인결제 선택`}
                        checked={selected.includes(item.id)}
                        onCheckedChange={(checked) => {
                          setSelected((current) =>
                            checked === true
                              ? current.includes(item.id)
                                ? current
                                : [...current, item.id]
                              : current.filter((id) => id !== item.id),
                          );
                        }}
                      />
                    </AdminListCell>
                    <AdminListCell>
                      <AdminListPrimary
                        title={item.title || "-"}
                        meta={<span>{item.customerName || "고객 미입력"}</span>}
                        supporting={item.description || "설명 미입력"}
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <AdminReferencePopover
                          title="개인결제 참조 정보"
                          trigger={<button type="button" className={adminDataTable.referenceTrigger}>결제 ID 보기</button>}
                          items={[
                            { label: "결제 ID", value: item.id, copyValue: item.id },
                            { label: "설명", value: item.description || null },
                            { label: "활성 상태", value: statusLabel(item.status) },
                            { label: "보관", value: item.archivedAt ? "보관됨" : "보관 안 됨" },
                            { label: "오프라인", value: item.offlineLink?.status === "linked" ? "연결됨" : "연결 없음" },
                            ...(item.offlineLink?.status === "linked" && item.offlineLink.offlineCustomerId
                              ? [{ label: "오프라인 고객 ID", value: item.offlineLink.offlineCustomerId, copyValue: item.offlineLink.offlineCustomerId }]
                              : []),
                          ]}
                        />
                        <AdminReferencePopover
                          title="고객 연락처"
                          trigger={<button type="button" className={adminDataTable.referenceTrigger}>연락처 보기</button>}
                          items={[
                            { label: "전화", value: item.customerPhone || null, copyValue: item.customerPhone || undefined },
                            { label: "이메일", value: item.customerEmail || null, copyValue: item.customerEmail || undefined },
                          ]}
                        />
                      </div>
                    </AdminListCell>
                    <AdminListCell align="end"><AdminMoneyBlock amount={money(item.amount)} /></AdminListCell>
                    <AdminListCell>
                      <AdminStatusGroup
                        primary={
                          <Badge
                            variant={
                              paymentStatusLabel === "결제완료"
                                ? "success"
                                : paymentStatusLabel === "결제대기"
                                  ? "warning"
                                  : paymentStatusLabel === "결제취소" || paymentStatusLabel === "환불완료"
                                    ? "danger"
                                    : "neutral"
                            }
                          >
                            {paymentStatusLabel}
                          </Badge>
                        }
                        secondary={operationalSummary}
                        alert={exceptionLabel}
                        alertTone={expired ? "danger" : "attention"}
                      />
                    </AdminListCell>
                    <AdminListCell align="end">
                      <div className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)] gap-x-2 gap-y-1 text-ui-label tabular-nums">
                        <span className="text-left text-muted-foreground">만료</span>
                        {item.expiresAt ? (
                          <time dateTime={item.expiresAt} className="whitespace-nowrap text-right font-medium text-foreground">
                            {formatKoreanDateTime(item.expiresAt)}
                          </time>
                        ) : (
                          <span className="whitespace-nowrap text-right font-medium text-foreground">없음</span>
                        )}
                        <span className="text-left text-muted-foreground">생성</span>
                        <time dateTime={item.createdAt} className="whitespace-nowrap text-right text-muted-foreground">
                          {formatKoreanDateTime(item.createdAt)}
                        </time>
                      </div>
                    </AdminListCell>
                    <AdminListCell align="end" className="px-2">
                      <AdminRowActions>
                        <Button type="button" size="sm" variant="outline" onClick={() => edit(item)}>
                          상세
                        </Button>
                        <AdminRowActionMenu
                          ariaLabel={`${item.title || "개인결제"} 작업 메뉴`}
                          destructiveActions={
                            item.paymentStatus === "결제완료" || item.paymentStatus === "결제대기" ? (
                              <>
                                {item.paymentStatus === "결제완료" && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    disabled={cancelingId === item.id || item.cancellationInfo?.status === "processing"}
                                    onSelect={(event) => { event.preventDefault(); openCancelDialog(item); }}
                                  >
                                    {item.cancellationInfo?.status === "processing"
                                      ? "취소 처리 확인 중"
                                      : cancelingId === item.id
                                        ? "취소 처리 중..."
                                        : "결제취소"}
                                  </DropdownMenuItem>
                                )}
                                {item.paymentStatus === "결제대기" && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={(event) => { event.preventDefault(); openDeleteDialog(item); }}
                                  >
                                    결제대기 삭제
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : undefined
                          }
                        >
                          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); copy(item.id).catch((e) => setMessage(e.message)); }}>
                            결제 링크 복사
                          </DropdownMenuItem>
                          {item.paymentStatus === "결제완료" && item.offlineLink?.status !== "linked" && (
                            <DropdownMenuItem onSelect={(event) => { event.preventDefault(); openOfflineLinkDialog(item); }}>
                              오프라인 연결
                            </DropdownMenuItem>
                          )}
                          {item.offlineLink?.status === "linked" && <DropdownMenuItem disabled>오프라인 연결됨</DropdownMenuItem>}
                          {item.paymentStatus !== "결제대기" &&
                            (item.archivedAt ? (
                              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); runItemAction(item, "unarchive").catch((e) => setMessage(e.message)); }}>
                                보관 해제
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); runItemAction(item, "archive").catch((e) => setMessage(e.message)); }}>
                                보관
                              </DropdownMenuItem>
                            ))}
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
              <div role="cell" aria-colspan={6} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className={adminTypography.metaMuted}>
                  총 {pagination.total.toLocaleString("ko-KR")}건 · {pagination.page}/{pagination.totalPages}페이지
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={isLoading || page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}>
                    이전
                  </Button>
                  <Button type="button" variant="outline" size="sm"
                    disabled={isLoading || page >= pagination.totalPages}
                    onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}>
                    다음
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </AdminListTable>

        <Dialog
          open={formDialogOpen}
          onOpenChange={(open) => {
            if (!open && saving) return;
            setFormDialogOpen(open);
            if (!open) {
              setEditing(null);
              setForm({ ...empty, expiresAt: defaultExpiresAt() });
              setFormErrors({});
              setFormError("");
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto border-border/70 sm:max-w-3xl [&>button:first-of-type]:rounded-full [&>button:first-of-type]:p-1.5 [&>button:first-of-type]:text-muted-foreground [&>button:first-of-type]:hover:bg-muted [&>button:first-of-type]:hover:text-foreground">
            <DialogHeader className="gap-1.5 pr-8">
              <DialogTitle>{editing ? "개인결제 상세 및 수정" : "개인결제 생성"}</DialogTitle>
              <DialogDescription>
                고객 정보는 선택 입력이며, 실제 결제 화면에서 고객이 다시 입력할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {!canEdit && (
                <p className="rounded-xl border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  결제완료/취소 건은 결제 기록 보존을 위해 수정할 수 없습니다. 보관 또는 보관 해제만
                  가능합니다.
                </p>
              )}
              <section className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">기본 정보</h3>
                  <p className="text-xs text-muted-foreground">
                    고객에게 표시될 결제명과 금액을 입력합니다.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="private-payment-title">결제명</Label>
                    <Input
                      id="private-payment-title"
                      placeholder="예: 김재민 1회 레슨권"
                      value={form.title}
                      maxLength={80}
                      required
                      disabled={!canEdit || saving}
                      aria-invalid={Boolean(formErrors.title)}
                      aria-describedby={formErrors.title ? "private-payment-title-error" : undefined}
                      onChange={(e) => updateFormField("title", e.target.value)}
                    />
                    {formErrors.title ? <p id="private-payment-title-error" className="text-xs text-destructive">{formErrors.title}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="private-payment-amount">결제금액</Label>
                    <Input
                      id="private-payment-amount"
                      placeholder="예: 40,000"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.amount}
                      disabled={!canEdit || saving}
                      aria-invalid={Boolean(formErrors.amount)}
                      aria-describedby={formErrors.amount ? "private-payment-amount-error" : undefined}
                      onChange={(e) => updateFormField("amount", formatAmountInput(e.target.value))}
                    />
                    {formErrors.amount ? <p id="private-payment-amount-error" className="text-xs text-destructive">{formErrors.amount}</p> : null}
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="private-payment-description">설명</Label>
                  <Textarea
                    id="private-payment-description"
                    placeholder="예: 레슨 1회권 결제"
                    value={form.description}
                    maxLength={500}
                    disabled={!canEdit || saving}
                    aria-invalid={Boolean(formErrors.description)}
                    aria-describedby={formErrors.description ? "private-payment-description-error" : undefined}
                    onChange={(e) => updateFormField("description", e.target.value)}
                  />
                  {formErrors.description ? <p id="private-payment-description-error" className="text-xs text-destructive">{formErrors.description}</p> : null}
                </div>
              </section>
              <section className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">고객 정보</h3>
                  <p className="text-xs text-muted-foreground">
                    선택 입력이며 고객이 결제 화면에서 다시 수정할 수 있습니다.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="private-payment-customer-name">고객명 (선택)</Label>
                    <Input
                      id="private-payment-customer-name"
                      placeholder="예: 김재민 (선택)"
                      value={form.customerName}
                      maxLength={80}
                      autoComplete="name"
                      disabled={!canEdit || saving}
                      aria-invalid={Boolean(formErrors.customerName)}
                      aria-describedby={formErrors.customerName ? "private-payment-customer-name-error" : undefined}
                      onChange={(e) => updateFormField("customerName", e.target.value)}
                    />
                    {formErrors.customerName ? <p id="private-payment-customer-name-error" className="text-xs text-destructive">{formErrors.customerName}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="private-payment-customer-phone">연락처 (선택)</Label>
                    <Input
                      id="private-payment-customer-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={13}
                      placeholder="예: 010-1234-5678 (선택)"
                      value={form.customerPhone}
                      disabled={!canEdit || saving}
                      aria-invalid={Boolean(formErrors.customerPhone)}
                      aria-describedby={formErrors.customerPhone ? "private-payment-customer-phone-error" : undefined}
                      onChange={(e) => {
                        const digits = normalizePhoneDigits(e.target.value).slice(0, PRIVATE_PAYMENT_LIMITS.customerPhoneDigits);
                        updateFormField("customerPhone", formatKoreanPhone(digits));
                      }}
                    />
                    {formErrors.customerPhone ? <p id="private-payment-customer-phone-error" className="text-xs text-destructive">{formErrors.customerPhone}</p> : null}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="private-payment-customer-email">이메일 (선택)</Label>
                    <Input
                      id="private-payment-customer-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="예: customer@example.com (선택)"
                      value={form.customerEmail}
                      disabled={!canEdit || saving}
                      aria-invalid={Boolean(formErrors.customerEmail)}
                      aria-describedby={formErrors.customerEmail ? "private-payment-customer-email-error" : undefined}
                      onChange={(e) => updateFormField("customerEmail", e.target.value)}
                    />
                    {formErrors.customerEmail ? <p id="private-payment-customer-email-error" className="text-xs text-destructive">{formErrors.customerEmail}</p> : null}
                  </div>
                </div>
              </section>
              <section className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">만료 설정</h3>
                  <p className="text-xs text-muted-foreground">
                    기본 생성 만료일은 7일 뒤이며, 필요하면 만료 없이 운영할 수 있습니다.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="private-payment-expires-at">만료일</Label>
                    <Input
                      id="private-payment-expires-at"
                      type="datetime-local"
                      min={currentKoreanDateTimeLocal()}
                      value={form.expiresAt}
                      disabled={!canEdit || saving || hasNoExpiration}
                      aria-invalid={Boolean(formErrors.expiresAt)}
                      aria-describedby={formErrors.expiresAt ? "private-payment-expires-at-error" : undefined}
                      onChange={(e) => updateFormField("expiresAt", e.target.value)}
                    />
                    {formErrors.expiresAt ? <p id="private-payment-expires-at-error" className="text-xs text-destructive">{formErrors.expiresAt}</p> : null}
                  </div>
                  <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3 text-sm">
                    <Checkbox
                      checked={hasNoExpiration}
                      disabled={!canEdit || saving}
                      onCheckedChange={(checked) =>
                        updateFormField("expiresAt", checked ? "" : form.expiresAt || defaultExpiresAt())
                      }
                    />
                    <span className="space-y-1">
                      <span className="block font-medium text-foreground">만료 없이 운영</span>
                      <span className="block text-xs text-muted-foreground">
                        체크하면 고객 결제 링크가 자동 만료되지 않습니다.
                      </span>
                    </span>
                  </label>
                </div>
              </section>
            </div>
            {formError ? (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setFormDialogOpen(false)}>
                닫기
              </Button>
              {canEdit && (
                <Button type="button" disabled={saving} onClick={save}>
                  {saving ? (editing ? "저장 중..." : "생성 중...") : editing ? "수정 저장" : "생성"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!offlineLinkTarget}
          onOpenChange={(open) => {
            if (!open && !offlineLinking) {
              setOfflineLinkError("");
              setOfflineLinkFieldErrors({});
              setOfflineLinkTarget(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>오프라인 고객/작업 기록과 연결</AlertDialogTitle>
              <AlertDialogDescription>
                개인결제는 온라인 NICEPAY 매출로 유지되며, 오프라인 연결은 고객/작업 이력
                관리용입니다. 생성되는 오프라인 기록은 오프라인 매출 집계에서 제외됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>고객명</Label>
                <Input
                  value={offlineLinkForm.customerName}
                  maxLength={80}
                  disabled={offlineLinking}
                  aria-invalid={Boolean(offlineLinkFieldErrors.customerName)}
                  onChange={(e) => {
                    setOfflineLinkForm({ ...offlineLinkForm, customerName: e.target.value });
                    setOfflineLinkFieldErrors((current) => ({ ...current, customerName: undefined }));
                  }}
                />
                {offlineLinkFieldErrors.customerName ? <p className="text-xs text-destructive">{offlineLinkFieldErrors.customerName}</p> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>연락처</Label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={13}
                    placeholder="기존 오프라인 고객을 찾거나 신규 고객을 만들 때 사용됩니다."
                    value={offlineLinkForm.customerPhone}
                    disabled={offlineLinking}
                    aria-invalid={Boolean(offlineLinkFieldErrors.customerPhone)}
                    onChange={(e) => {
                      const digits = normalizePhoneDigits(e.target.value).slice(0, PRIVATE_PAYMENT_LIMITS.customerPhoneDigits);
                      setOfflineLinkForm({ ...offlineLinkForm, customerPhone: formatKoreanPhone(digits) });
                      setOfflineLinkFieldErrors((current) => ({ ...current, customerPhone: undefined }));
                    }}
                  />
                  {offlineLinkFieldErrors.customerPhone ? <p className="text-xs text-destructive">{offlineLinkFieldErrors.customerPhone}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label>이메일 (선택)</Label>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder="선택 입력입니다. 입력하지 않아도 연결할 수 있습니다."
                    value={offlineLinkForm.customerEmail}
                    disabled={offlineLinking}
                    aria-invalid={Boolean(offlineLinkFieldErrors.customerEmail)}
                    onChange={(e) => {
                      setOfflineLinkForm({ ...offlineLinkForm, customerEmail: e.target.value });
                      setOfflineLinkFieldErrors((current) => ({ ...current, customerEmail: undefined }));
                    }}
                  />
                  {offlineLinkFieldErrors.customerEmail ? <p className="text-xs text-destructive">{offlineLinkFieldErrors.customerEmail}</p> : null}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>작업 메모 (선택)</Label>
                <Textarea
                  value={offlineLinkForm.memo}
                  maxLength={500}
                  disabled={offlineLinking}
                  aria-invalid={Boolean(offlineLinkFieldErrors.memo)}
                  onChange={(e) => {
                    setOfflineLinkForm({ ...offlineLinkForm, memo: e.target.value });
                    setOfflineLinkFieldErrors((current) => ({ ...current, memo: undefined }));
                  }}
                />
                {offlineLinkFieldErrors.memo ? <p className="text-xs text-destructive">{offlineLinkFieldErrors.memo}</p> : null}
              </div>
              <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
                <Checkbox
                  checked={offlineLinkForm.createRecord}
                  disabled={offlineLinking}
                  onCheckedChange={(checked) =>
                    setOfflineLinkForm((current) => ({
                      ...current,
                      createRecord: checked === true,
                    }))
                  }
                />
                오프라인 작업 기록 생성
              </label>
            </div>
            {offlineLinkError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {offlineLinkError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={offlineLinking}>닫기</AlertDialogCancel>
              <Button disabled={offlineLinking} onClick={linkOffline}>
                {offlineLinking ? "연결 중..." : "연결"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={!!deleteMode}
          onOpenChange={(open) => {
            if (!open && !deleting) {
              setDeleteError("");
              setDeleteTarget(null);
              setDeleteMode(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>결제대기 개인결제를 삭제할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                결제대기 상태의 개인결제만 삭제됩니다. 결제완료/결제취소 기록은 삭제되지 않습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {deleteError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>닫기</AlertDialogCancel>
              <Button variant="destructive" disabled={deleting} onClick={confirmDelete}>
                {deleting ? "삭제 중..." : "삭제"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={!!cancelTarget}
          onOpenChange={(open) => {
            if (!open && !cancelingId) {
              setCancelError("");
              setCancelTarget(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>개인결제를 취소할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                NICEPAY 승인취소가 진행됩니다. 취소 후 이 개인결제 링크로 다시 결제할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">취소 사유</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={!!cancelingId}
              />
            </div>
            {cancelError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {cancelError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!cancelingId}>닫기</AlertDialogCancel>
              <Button variant="destructive" disabled={!!cancelingId} onClick={cancelPayment}>
                {cancelingId ? "취소 처리 중..." : "승인취소 진행"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminPageShell>
  );
}
