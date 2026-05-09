"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetcher, adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import type {
  OfflineCustomerDto,
  OfflineKind,
  OfflineLinkCandidate,
  OfflineLinkedUser,
  OfflinePackageSaleSummary,
  OfflinePaymentMethod,
  OfflinePaymentStatus,
  OfflineRecordPackageUsage,
  OfflineRecordPoints,
  OfflineServicePassSummary,
  OfflineStatus,
} from "@/types/admin/offline";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  FileText,
  Gift,
  Hash,
  History,
  Info,
  Link2,
  Mail,
  Package,
  Phone,
  Search,
  ShoppingBag,
  TrendingUp,
  Unlink,
  User,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import useSWR from "swr";

type OfflineRecord = {
  id: string;
  kind: OfflineKind;
  status: OfflineStatus;
  occurredAt?: string | null;
  customerSnapshot?: { name?: string; phone?: string; email?: string | null } | null;
  lines?: Array<{ racketName?: string; stringName?: string; tensionMain?: string; tensionCross?: string }>;
  lineSummary?: string;
  payment?: { status?: OfflinePaymentStatus; method?: OfflinePaymentMethod; amount?: number | null } | null;
  points?: OfflineRecordPoints | null;
  packageUsage?: OfflineRecordPackageUsage | null;
  memo?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type OfflineCustomerDetail = OfflineCustomerDto & {
  phoneNormalized?: string | null;
  linkedUser?: OfflineLinkedUser | null;
};

type DetailResponse = { item: OfflineCustomerDetail; records?: OfflineRecord[]; passes?: OfflineServicePassSummary[]; packageSales?: OfflinePackageSaleSummary[] };

const KIND_LABELS = { stringing: "스트링 작업", package_sale: "패키지 판매", etc: "기타" } as const;
const RECORD_STATUS_LABELS = { received: "접수", in_progress: "작업중", completed: "완료", picked_up: "수령완료", canceled: "취소" } as const;
const PAYMENT_STATUS_LABELS = { pending: "미결제", paid: "결제완료", refunded: "환불" } as const;
const PAYMENT_METHOD_LABELS = { cash: "현금", card: "카드", bank_transfer: "계좌이체", etc: "기타" } as const;

/* ─────────────────────────────────────────────────────────────────────────────
   Utility Functions
───────────────────────────────────────────────────────────────────────────── */

function formatCurrency(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

function formatPoints(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}P`;
}

function formatDate(value?: string | Date | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "numeric", day: "numeric" }).format(date);
}

function formatLineSummary(lines?: OfflineRecord["lines"]): string {
  if (!Array.isArray(lines) || lines.length === 0) return "작업 내용 미입력";
  const summary = lines
    .map((line) => {
      const main = String(line.tensionMain ?? "").trim();
      const cross = String(line.tensionCross ?? "").trim();
      const tension = main || cross ? `${main || "-"}/${cross || "-"}` : "";
      return [String(line.racketName ?? "").trim(), String(line.stringName ?? "").trim(), tension].filter(Boolean).join(" · ");
    })
    .filter(Boolean)
    .join(", ");
  return summary || "작업 내용 미입력";
}

/* ─────────────────────────────────────────────────────────────────────────────
   Reusable UI Components
───────────────────────────────────────────────────────────────────────────── */

function SectionCard({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 px-6 py-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, className = "" }: { icon?: React.ElementType; label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`group flex items-start gap-3 rounded-lg border border-border/40 bg-muted/30 p-4 transition-colors hover:bg-muted/50 ${className}`}>
      {Icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="mt-1 text-sm font-medium text-foreground">{value || "-"}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, variant = "default" }: { label: string; value: ReactNode; icon?: React.ElementType; variant?: "default" | "highlight" | "warning" }) {
  const variantStyles = {
    default: "border-border/40 bg-muted/30",
    highlight: "border-primary/30 bg-primary/5",
    warning: "border-destructive/30 bg-destructive/5",
  };
  return (
    <div className={`rounded-lg border p-4 transition-colors hover:bg-muted/50 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status, labels }: { status: string; labels: Record<string, string> }) {
  const statusStyles: Record<string, string> = {
    received: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    picked_up: "bg-primary/10 text-primary border-primary/20",
    canceled: "bg-muted text-muted-foreground border-border",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    refunded: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[status] || "bg-muted text-muted-foreground border-border"}`}>{labels[status] || status}</span>;
}

function Message({ type, children }: { type: "success" | "error" | "info"; children: ReactNode }) {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-primary/10 text-primary border-primary/20",
  };
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };
  const Icon = icons[type];
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${styles[type]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function FormField({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Select({ id, value, onChange, options, disabled, className = "" }: { id?: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean; className?: string }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children, badge, id }: { title: string; icon: React.ElementType; defaultOpen?: boolean; children: ReactNode; badge?: ReactNode; id?: string }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div id={id} className="rounded-lg border border-border/40 bg-muted/20">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/40">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{title}</span>
          {badge}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && <div className="border-t border-border/40 p-4">{children}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Error Message Mappings
───────────────────────────────────────────────────────────────────────────── */

type LinkCandidatesResponse = { items: OfflineLinkCandidate[] };

type PackageConfigOption = {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validityDays: number;
  isActive: boolean;
};

type PackageSettingsResponse = { packageConfigs?: PackageConfigOption[] };

type OfflinePackageSellFormState = {
  packageTypeId: string;
  packageName: string;
  sessions: string;
  validityDays: string;
  price: string;
  paymentMethod: OfflinePaymentMethod;
  memo: string;
};

const INITIAL_PACKAGE_SELL_FORM: OfflinePackageSellFormState = {
  packageTypeId: "",
  packageName: "",
  sessions: "",
  validityDays: "365",
  price: "0",
  paymentMethod: "cash",
  memo: "",
};

const LINK_ERROR_MESSAGES: Record<string, string> = {
  "customer not found": "오프라인 고객을 찾을 수 없습니다.",
  "user not found": "온라인 회원을 찾을 수 없습니다.",
  "customer already linked to another user": "이미 다른 온라인 회원과 연결된 오프라인 고객입니다.",
  "user already linked to another offline customer": "이미 다른 오프라인 고객과 연결된 온라인 회원입니다.",
  "invalid userId": "온라인 회원 ID가 올바르지 않습니다.",
  "invalid customer id": "오프라인 고객 ID가 올바르지 않습니다.",
};

function translateLinkError(error: unknown): string {
  const message = getAdminErrorMessage(error);
  return LINK_ERROR_MESSAGES[message] ?? message ?? "온라인 회원 연결에 실패했습니다.";
}

type PointFormState = {
  grantAmount: string;
  grantReason: string;
  useAmount: string;
  useReason: string;
  message?: string | null;
  messageType?: "success" | "error" | null;
};

type PackageFormState = {
  passId: string;
  message?: string | null;
  messageType?: "success" | "error" | null;
};

const PACKAGE_ERROR_MESSAGES: Record<string, string> = {
  "linked user required": "온라인 회원과 연결된 고객만 패키지를 사용할 수 있습니다.",
  "user not found": "연결된 온라인 회원 정보를 찾을 수 없어 패키지를 사용할 수 없습니다.",
  "pass not found": "선택한 패키지를 찾을 수 없습니다.",
  "pass does not belong to linked user": "선택한 패키지는 이 고객의 패키지가 아닙니다.",
  "pass is not usable": "선택한 패키지는 사용할 수 없습니다.",
  "no remaining pass count": "잔여 횟수가 부족합니다.",
  "package already used for this record": "이미 이 기록에 패키지가 사용 처리되었습니다.",
  "package consumption failed": "패키지 사용 처리에 실패했습니다.",
  "package consumed but offline record update failed": "패키지는 차감됐지만 기록 연결에 실패했습니다. 관리자에게 보정이 필요합니다.",
};

function translatePackageError(error: unknown): string {
  const message = getAdminErrorMessage(error);
  return PACKAGE_ERROR_MESSAGES[message] ?? message ?? "패키지 사용 처리에 실패했습니다.";
}

const PACKAGE_SELL_ERROR_MESSAGES: Record<string, string> = {
  "customer not found": "오프라인 고객을 찾을 수 없습니다.",
  "linked user required": "온라인 회원과 연결된 고객만 패키지를 판매/발급할 수 있습니다.",
  "user not found": "연결된 온라인 회원 정보를 찾을 수 없어 패키지를 판매/발급할 수 없습니다.",
  "invalid package name": "패키지명을 입력해주세요.",
  "invalid sessions": "이용 횟수는 1 이상이어야 합니다.",
  "invalid price": "판매 금액은 0원 이상이어야 합니다.",
  "invalid payment method": "결제수단을 확인해주세요.",
  "invalid validity days": "유효기간 일수는 1 이상이어야 합니다.",
  "package option not found": "선택한 패키지 옵션을 찾을 수 없습니다.",
  "invalid package option": "선택한 패키지 옵션을 사용할 수 없습니다.",
  "package order creation failed": "패키지 주문 생성에 실패했습니다.",
  "package order created but pass issuance failed": "패키지 주문은 생성됐지만 이용권 발급에 실패했습니다. 관리자 보정이 필요합니다.",
  "package pass issuance failed": "패키지 판매/발급에 실패했습니다.",
};

function translatePackageSellError(error: unknown): string {
  const message = getAdminErrorMessage(error);
  return PACKAGE_SELL_ERROR_MESSAGES[message] ?? message ?? "패키지 판매/발급에 실패했습니다.";
}

function getPassLabel(pass?: OfflineServicePassSummary | null) {
  if (!pass) return "선택한 패키지";
  return pass.packageName || pass.name || "교체 서비스 패키지";
}

function isUsablePass(pass: OfflineServicePassSummary) {
  const expiresAt = pass.expiresAt ? new Date(pass.expiresAt) : null;
  const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() : true;
  return pass.status === "active" && Number(pass.remainingCount ?? 0) > 0 && !isExpired;
}

const POINT_ERROR_MESSAGES: Record<string, string> = {
  "linked user required": "온라인 회원과 연결된 고객만 포인트를 처리할 수 있습니다.",
  "invalid amount": "포인트 금액은 1 이상이어야 합니다.",
  "insufficient points": "보유 포인트가 부족합니다.",
  "points already granted for this record": "이미 이 기록에 포인트 적립이 처리되었습니다.",
  "points already deducted for this record": "이미 이 기록에 포인트 사용이 처리되었습니다.",
  "points transaction failed": "포인트 처리에 실패했습니다.",
};

function translatePointError(error: unknown): string {
  const message = getAdminErrorMessage(error);
  return POINT_ERROR_MESSAGES[message] ?? message ?? "포인트 처리에 실패했습니다.";
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────────────────── */

export default function OfflineCustomerDetailClient({ id }: { id: string }) {
  const {
    data,
    error,
    isLoading,
    mutate: mutateDetail,
  } = useSWR<DetailResponse>(`/api/admin/offline/customers/${id}`, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
  });
  const [candidateQuery, setCandidateQuery] = useState({ name: "", phone: "", email: "" });
  const [submittedCandidateQuery, setSubmittedCandidateQuery] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkMessageType, setLinkMessageType] = useState<"success" | "error" | null>(null);
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [pointForms, setPointForms] = useState<Record<string, PointFormState>>({});
  const [processingPointKey, setProcessingPointKey] = useState<string | null>(null);
  const [packageForms, setPackageForms] = useState<Record<string, PackageFormState>>({});
  const [processingPackageRecordId, setProcessingPackageRecordId] = useState<string | null>(null);
  const [packageSellForm, setPackageSellForm] = useState<OfflinePackageSellFormState>(INITIAL_PACKAGE_SELL_FORM);
  const [isSellingPackage, setIsSellingPackage] = useState(false);
  const [packageSellMessage, setPackageSellMessage] = useState<string | null>(null);
  const [packageSellMessageType, setPackageSellMessageType] = useState<"success" | "error" | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  const candidateKey = submittedCandidateQuery
    ? `/api/admin/offline/customers/${id}/link-candidates?name=${encodeURIComponent(submittedCandidateQuery.name)}&phone=${encodeURIComponent(submittedCandidateQuery.phone)}&email=${encodeURIComponent(submittedCandidateQuery.email)}`
    : null;
  const {
    data: candidatesData,
    isLoading: candidatesLoading,
    mutate: mutateCandidates,
  } = useSWR<LinkCandidatesResponse>(candidateKey, adminFetcher, {
    revalidateOnFocus: false,
  });
  const { data: packageSettings } = useSWR<PackageSettingsResponse>("/api/admin/packages/settings", adminFetcher, {
    revalidateOnFocus: false,
  });

  const item = data?.item;
  const records = data?.records ?? [];
  const pendingCount = records.filter((record) => record.payment?.status === "pending").length;
  const refundedCount = records.filter((record) => record.payment?.status === "refunded").length;
  const candidates = candidatesData?.items ?? [];
  const pointBalance = item?.linkedUser?.pointsBalance ?? null;
  const passes = data?.passes ?? [];
  const packageSales = data?.packageSales ?? [];
  const packageOptions = (packageSettings?.packageConfigs ?? []).filter((pkg) => pkg.isActive);
  const canUseLinkedFeatures = !!item?.linkedUserId && !!item?.linkedUser;
  const usablePasses = passes.filter(isUsablePass);
  const isPackageOptionSelected = !!packageSellForm.packageTypeId;

  function toggleRecordExpand(recordId: string) {
    setExpandedRecords((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  }

  function updatePointForm(recordId: string, patch: Partial<PointFormState>) {
    setPointForms((prev) => {
      const current = prev[recordId] ?? { grantAmount: "", grantReason: "", useAmount: "", useReason: "" };
      return {
        ...prev,
        [recordId]: { ...current, ...patch },
      };
    });
  }

  async function handleRecordPoints(recordId: string, mode: "grant" | "deduct") {
    const form = pointForms[recordId];
    const amountText = mode === "grant" ? form?.grantAmount : form?.useAmount;
    const reasonText = mode === "grant" ? form?.grantReason : form?.useReason;
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) {
      updatePointForm(recordId, { message: "포인트 금액은 1 이상이어야 합니다.", messageType: "error" });
      return;
    }

    const actionLabel = mode === "grant" ? "적립" : "사용";
    if (!window.confirm(`이 기록에 ${formatPoints(amount)} ${actionLabel} 처리를 진행하시겠습니까?`)) return;

    setProcessingPointKey(`${recordId}:${mode}`);
    updatePointForm(recordId, { message: null, messageType: null });
    try {
      await adminMutator(`/api/admin/offline/records/${recordId}/points/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: reasonText?.trim() || undefined }),
      });
      updatePointForm(recordId, {
        ...(mode === "grant" ? { grantAmount: "", grantReason: "" } : { useAmount: "", useReason: "" }),
        message: `포인트 ${actionLabel} 처리가 완료되었습니다.`,
        messageType: "success",
      });
      await mutateDetail();
    } catch (err) {
      updatePointForm(recordId, { message: translatePointError(err), messageType: "error" });
    } finally {
      setProcessingPointKey(null);
    }
  }

  function updatePackageForm(recordId: string, patch: Partial<PackageFormState>) {
    setPackageForms((prev) => ({
      ...prev,
      [recordId]: { ...(prev[recordId] ?? { passId: usablePasses[0]?.id ?? "" }), ...patch },
    }));
  }

  async function handleRecordPackageUse(recordId: string) {
    if (!canUseLinkedFeatures) {
      updatePackageForm(recordId, { message: "온라인 회원과 연결된 고객만 패키지를 사용할 수 있습니다.", messageType: "error" });
      return;
    }
    const selectedPassId = packageForms[recordId]?.passId || usablePasses[0]?.id || "";
    const selectedPass = passes.find((pass) => pass.id === selectedPassId);
    if (!selectedPassId || !selectedPass) {
      updatePackageForm(recordId, { message: "사용 가능한 패키지가 없습니다.", messageType: "error" });
      return;
    }
    if (!window.confirm(`${getPassLabel(selectedPass)} 1회를 이 오프라인 작업에 사용 처리하시겠습니까?`)) return;

    setProcessingPackageRecordId(recordId);
    updatePackageForm(recordId, { passId: selectedPassId, message: null, messageType: null });
    try {
      await adminMutator(`/api/admin/offline/records/${recordId}/package/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passId: selectedPassId, usedCount: 1 }),
      });
      updatePackageForm(recordId, { passId: selectedPassId, message: "패키지 1회 사용 처리가 완료되었습니다.", messageType: "success" });
      await mutateDetail();
    } catch (err) {
      updatePackageForm(recordId, { passId: selectedPassId, message: translatePackageError(err), messageType: "error" });
    } finally {
      setProcessingPackageRecordId(null);
    }
  }

  function updatePackageSellForm(patch: Partial<OfflinePackageSellFormState>) {
    setPackageSellForm((prev) => ({ ...prev, ...patch }));
  }

  function handlePackageOptionChange(packageTypeId: string) {
    const selected = packageOptions.find((pkg) => pkg.id === packageTypeId);
    if (!selected) {
      updatePackageSellForm({ packageTypeId });
      return;
    }
    updatePackageSellForm({
      packageTypeId: selected.id,
      packageName: selected.name,
      sessions: String(selected.sessions),
      validityDays: String(selected.validityDays),
      price: String(selected.price),
    });
  }

  async function handlePackageSell() {
    if (!canUseLinkedFeatures) {
      setPackageSellMessage("온라인 회원과 연결된 고객만 패키지를 판매/발급할 수 있습니다.");
      setPackageSellMessageType("error");
      return;
    }
    const packageName = packageSellForm.packageName.trim();
    const sessions = Number(packageSellForm.sessions);
    const validityDays = packageSellForm.validityDays.trim() ? Number(packageSellForm.validityDays) : undefined;
    const price = Number(packageSellForm.price);
    if (!packageName) {
      setPackageSellMessage("패키지명을 입력해주세요.");
      setPackageSellMessageType("error");
      return;
    }
    if (!Number.isInteger(sessions) || sessions < 1) {
      setPackageSellMessage("이용 횟수는 1 이상이어야 합니다.");
      setPackageSellMessageType("error");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setPackageSellMessage("판매 금액은 0원 이상이어야 합니다.");
      setPackageSellMessageType("error");
      return;
    }
    if (validityDays !== undefined && (!Number.isInteger(validityDays) || validityDays < 1)) {
      setPackageSellMessage("유효기간 일수는 1 이상이어야 합니다.");
      setPackageSellMessageType("error");
      return;
    }
    if (!window.confirm("이 고객에게 오프라인 결제 완료 패키지를 발급하시겠습니까?")) return;

    setIsSellingPackage(true);
    setPackageSellMessage(null);
    setPackageSellMessageType(null);
    try {
      await adminMutator(`/api/admin/offline/customers/${id}/packages/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageTypeId: packageSellForm.packageTypeId || undefined,
          packageName,
          sessions,
          validityDays,
          price,
          paymentMethod: packageSellForm.paymentMethod,
          paymentStatus: "paid",
          memo: packageSellForm.memo.trim() || undefined,
        }),
      });
      setPackageSellMessage("패키지 판매 및 발급이 완료되었습니다.");
      setPackageSellMessageType("success");
      setPackageSellForm(INITIAL_PACKAGE_SELL_FORM);
      await mutateDetail();
    } catch (err) {
      setPackageSellMessage(translatePackageSellError(err));
      setPackageSellMessageType("error");
    } finally {
      setIsSellingPackage(false);
    }
  }

  async function handleLinkUser(userId: string) {
    if (!window.confirm("이 온라인 회원을 현재 오프라인 고객과 연결하시겠습니까?")) return;
    setLinkingUserId(userId);
    setLinkMessage(null);
    setLinkMessageType(null);
    try {
      await adminMutator(`/api/admin/offline/customers/${id}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setLinkMessage("온라인 회원과 연결했습니다.");
      setLinkMessageType("success");
      await mutateDetail();
      await mutateCandidates();
    } catch (err) {
      setLinkMessage(translateLinkError(err));
      setLinkMessageType("error");
    } finally {
      setLinkingUserId(null);
    }
  }

  async function handleUnlinkUser() {
    if (!window.confirm("온라인 회원 연결을 해제하시겠습니까? 기존 오프라인 기록은 삭제되지 않습니다.")) return;
    setIsUnlinking(true);
    setLinkMessage(null);
    setLinkMessageType(null);
    try {
      await adminMutator(`/api/admin/offline/customers/${id}/link`, { method: "DELETE" });
      setLinkMessage("온라인 회원 연결을 해제했습니다.");
      setLinkMessageType("success");
      setSubmittedCandidateQuery(null);
      await mutateDetail();
    } catch (err) {
      setLinkMessage(translateLinkError(err));
      setLinkMessageType("error");
    } finally {
      setIsUnlinking(false);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────────
     Loading & Error States
  ───────────────────────────────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">오프라인 고객 상세 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <SectionCard>
        <div className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">오프라인 고객 상세를 불러오지 못했습니다</h2>
          <p className="mt-2 text-sm text-muted-foreground">고객 ID가 잘못되었거나 고객이 삭제되었을 수 있습니다.</p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/admin/offline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              오프라인 관리로 돌아가기
            </Link>
          </Button>
        </div>
      </SectionCard>
    );
  }

  /* ───────────────────────────────��─────────────────────────────────────────────
     Main Render
  ───────────────────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">오프라인 고객 상세</h1>
          <p className="mt-1 text-sm text-muted-foreground">고객 기본 정보와 오프라인 작업/매출 이력을 확인합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/offline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              오프라인 관리
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href="#offline-records">
              <History className="mr-2 h-4 w-4" />
              최근 기록
            </a>
          </Button>
        </div>
      </div>

      {/* Customer Quick Info Banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{item.name || "이름 없음"}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {item.phoneMasked || item.phone || "-"}
                </span>
                {item.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {item.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {item.linkedUserId ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                온라인 연결됨
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <Unlink className="mr-1.5 h-3.5 w-3.5" />
                온라인 미연결
              </Badge>
            )}
            {item.tags?.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column - Customer Info & Link */}
        <div className="space-y-6 lg:col-span-5">
          {/* Customer Basic Info */}
          <SectionCard>
            <SectionHeader icon={User} title="고객 기본 정보" description="휴대폰 번호와 연락처 정보" />
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoItem icon={User} label="고객명" value={<span className="font-semibold">{item.name || "-"}</span>} />
                <InfoItem
                  icon={Phone}
                  label="휴대폰 번호"
                  value={
                    <div>
                      <span>{item.phoneMasked || "-"}</span>
                      {item.phone && <p className="mt-1 text-xs text-muted-foreground">원번호: {item.phone}</p>}
                    </div>
                  }
                />
                <InfoItem icon={Mail} label="이메일" value={item.email || "-"} />
                <InfoItem icon={Calendar} label="마지막 방문일" value={formatDate(item.stats?.lastVisitedAt)} />
                <InfoItem icon={Clock} label="등록일" value={formatDate(item.createdAt)} />
                <InfoItem icon={Clock} label="수정일" value={formatDate(item.updatedAt)} />
              </div>

              {/* Memo */}
              <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  메모
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{item.memo || "등록된 메모가 없습니다."}</p>
              </div>

              <p className="text-xs text-muted-foreground">고객 정보 수정은 오프라인 관리 화면 또는 후속 단계에서 지원 예정입니다.</p>
            </div>
          </SectionCard>

          {/* Online Member Link */}
          <SectionCard>
            <SectionHeader
              icon={Link2}
              title="온라인 회원 연결"
              description="포인트/패키지 연동을 위한 회원 연결"
              action={
                item.linkedUserId ? (
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">연결됨</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    미연결
                  </Badge>
                )
              }
            />
            <div className="space-y-4 p-6">
              {item.linkedUserId ? (
                <>
                  {/* Linked User Info */}
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{item.linkedUser?.name || "회원 정보 없음"}</p>
                        <p className="text-sm text-muted-foreground">{item.linkedUser?.email || "-"}</p>
                        <p className="text-sm text-muted-foreground">{item.linkedUser?.phoneMasked || item.linkedUser?.phone || "-"}</p>
                        <p className="mt-2 text-xs text-muted-foreground break-all">ID: {item.linkedUserId}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">이 연결은 향후 포인트/패키지 연동 기준으로 사용됩니다.</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleUnlinkUser} disabled={isUnlinking} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Unlink className="mr-2 h-4 w-4" />
                    {isUnlinking ? "연결 해제 중..." : "연결 해제"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">포인트/패키지 연동은 온��인 회원 연결 후 사용할 수 있습니다.</p>

                  {/* Search Form */}
                  <form
                    className="rounded-lg border border-border/40 bg-muted/20 p-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setCandidateMessage(null);
                      setLinkMessage(null);
                      if (!candidateQuery.name.trim() && !candidateQuery.phone.trim() && !candidateQuery.email.trim()) {
                        setCandidateMessage("검색어를 하나 이상 입력해 주세요.");
                        setSubmittedCandidateQuery(null);
                        return;
                      }
                      setSubmittedCandidateQuery({ ...candidateQuery });
                    }}
                  >
                    <div className="space-y-3">
                      <FormField label="이름" htmlFor="link-candidate-name">
                        <Input id="link-candidate-name" value={candidateQuery.name} onChange={(e) => setCandidateQuery({ ...candidateQuery, name: e.target.value })} placeholder="회원 이름 입력" />
                      </FormField>
                      <FormField label="휴대폰 번호" htmlFor="link-candidate-phone">
                        <Input id="link-candidate-phone" value={candidateQuery.phone} onChange={(e) => setCandidateQuery({ ...candidateQuery, phone: e.target.value })} placeholder="010-0000-0000" />
                      </FormField>
                      <FormField label="이메일" htmlFor="link-candidate-email">
                        <Input id="link-candidate-email" type="email" value={candidateQuery.email} onChange={(e) => setCandidateQuery({ ...candidateQuery, email: e.target.value })} placeholder="email@example.com" />
                      </FormField>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="submit" size="sm">
                        <Search className="mr-2 h-4 w-4" />
                        검색
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCandidateQuery({ name: "", phone: "", email: "" });
                          setSubmittedCandidateQuery(null);
                          setCandidateMessage(null);
                          setLinkMessage(null);
                        }}
                      >
                        초기화
                      </Button>
                    </div>
                  </form>

                  {/* Search Results */}
                  {candidateMessage && <Message type="error">{candidateMessage}</Message>}
                  {submittedCandidateQuery && candidatesLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      회원 검색 중...
                    </div>
                  )}
                  {submittedCandidateQuery && !candidatesLoading && candidates.length === 0 && <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>}
                  {submittedCandidateQuery && !candidatesLoading && candidates.length > 0 && (
                    <div className="space-y-2">
                      {candidates.map((candidate) => {
                        const isLinkedToCurrent = candidate.alreadyLinkedOfflineCustomerId === item.id;
                        const isLinkedToOther = !!candidate.alreadyLinkedOfflineCustomerId && !isLinkedToCurrent;
                        return (
                          <div
                            key={candidate.id}
                            className={`rounded-lg border p-4 transition-colors ${isLinkedToOther ? "border-destructive/30 bg-destructive/5" : isLinkedToCurrent ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40 hover:bg-muted/30"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground">{candidate.name || "이름 없음"}</p>
                                <p className="text-sm text-muted-foreground break-all">{candidate.email || "이메일 없음"}</p>
                                <p className="text-sm text-muted-foreground">{candidate.phoneMasked || "휴대폰 없음"}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {candidate.match.name && (
                                    <Badge variant="secondary" className="text-xs">
                                      이름 일치
                                    </Badge>
                                  )}
                                  {candidate.match.phone && (
                                    <Badge variant="secondary" className="text-xs">
                                      휴대폰 일치
                                    </Badge>
                                  )}
                                  {candidate.match.email && (
                                    <Badge variant="secondary" className="text-xs">
                                      이메일 일치
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button type="button" size="sm" onClick={() => handleLinkUser(candidate.id)} disabled={isLinkedToOther || isLinkedToCurrent || linkingUserId === candidate.id}>
                                {isLinkedToCurrent ? (
                                  <>
                                    <Check className="mr-1.5 h-3.5 w-3.5" />
                                    연결됨
                                  </>
                                ) : linkingUserId === candidate.id ? (
                                  "연결 중..."
                                ) : (
                                  <>
                                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                                    연결
                                  </>
                                )}
                              </Button>
                            </div>
                            {isLinkedToOther && <p className="mt-2 text-xs text-destructive">이미 다른 오프라인 고객과 연결된 회원입니다.</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              {linkMessage && <Message type={linkMessageType || "info"}>{linkMessage}</Message>}
            </div>
          </SectionCard>
        </div>

        {/* Right Column - Points, Packages, Stats */}
        <div className="space-y-6 lg:col-span-7">
          {/* Statistics */}
          <SectionCard>
            <SectionHeader icon={TrendingUp} title="누적 통계" description="오프라인 고객 기준 누적 데이터" />
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="방문 횟수" value={`${item.stats?.visitCount ?? 0}회`} icon={Calendar} />
                <StatCard label="총 작업 수" value={`${item.stats?.totalServiceCount ?? 0}건`} icon={Hash} />
                <StatCard label="총 결제액" value={formatCurrency(item.stats?.totalPaid)} icon={CreditCard} variant="highlight" />
                <StatCard label="마지막 방문" value={formatDate(item.stats?.lastVisitedAt)} icon={Clock} />
                <StatCard label="미결제 기록" value={`${pendingCount}건`} icon={AlertCircle} variant={pendingCount > 0 ? "warning" : "default"} />
                <StatCard label="환불 기록" value={`${refundedCount}건`} icon={X} />
              </div>
            </div>
          </SectionCard>

          {/* Points */}
          <SectionCard>
            <SectionHeader
              icon={Wallet}
              title="포인트"
              description="온라인 회원 연동 포인트 현황"
              action={
                canUseLinkedFeatures && pointBalance !== null ? (
                  <div className="rounded-lg bg-primary/10 px-4 py-2 text-right">
                    <p className="text-xs text-muted-foreground">현재 잔액</p>
                    <p className="text-lg font-bold text-primary">{formatPoints(pointBalance)}</p>
                  </div>
                ) : null
              }
            />
            <div className="p-6">
              {canUseLinkedFeatures ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">오프라인 작업 기록에서 포인트 적립/사용을 처리할 수 있습니다.</p>
                  <p className="text-xs text-muted-foreground">포인트 사용 시 실제 결제금액은 별도로 수정하세요. 포인트 처리 취소는 후속 단계에서 지원 예정입니다.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">온라인 회원과 연결된 고객만 포인트 조회/사용/적립이 가능합니다.</p>
                  {item.linkedUserId && !item.linkedUser && <p className="mt-2 text-xs text-destructive">연결된 온라인 회원 정보를 찾을 수 없어 포인트를 처리할 수 없습니다.</p>}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Packages */}
          <SectionCard>
            <SectionHeader
              icon={Package}
              title="패키지/서비스권"
              description="보유 패키지 현황"
              action={canUseLinkedFeatures && usablePasses.length > 0 ? <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">{usablePasses.length}개 사용 가능</Badge> : null}
            />
            <div className="p-6">
              {!canUseLinkedFeatures ? (
                <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">온라인 회원과 연결된 고객만 보유 패키지 조회 및 사용 처리가 가능합니다.</p>
                </div>
              ) : passes.length === 0 ? (
                <p className="text-sm text-muted-foreground">보유 패키지/서비스권이 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {passes.map((pass) => {
                    const usable = isUsablePass(pass);
                    return (
                      <div key={pass.id} className={`rounded-lg border p-4 transition-colors ${usable ? "border-primary/30 bg-primary/5 hover:bg-primary/10" : "border-border/40 bg-muted/20 text-muted-foreground"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-foreground">{getPassLabel(pass)}</p>
                          <Badge variant={usable ? "secondary" : "outline"} className={usable ? "bg-emerald-500/10 text-emerald-700" : ""}>
                            {usable ? "사용 가능" : pass.status || "비활성"}
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-1 text-sm">
                          <p>
                            잔여 <span className="font-semibold text-foreground">{Number(pass.remainingCount ?? 0).toLocaleString("ko-KR")}</span> / {Number(pass.totalCount ?? 0).toLocaleString("ko-KR")}회
                          </p>
                          <p>사용 {Number(pass.usedCount ?? 0).toLocaleString("ko-KR")}회</p>
                          <p>만료일 {formatDate(pass.expiresAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Package Sell */}
          <SectionCard>
            <SectionHeader icon={ShoppingBag} title="오프라인 패키지 판매" description="매장에서 결제 완료된 패키지권을 온라인 회원 계정에 발급" />
            <div className="p-6">
              {!canUseLinkedFeatures ? (
                <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">온라인 회원과 연결된 고객만 패키지 판매/발급이 가능합니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {packageOptions.length > 0 && (
                    <FormField label="패키지 옵션" htmlFor="offline-package-option" hint="옵션 선택 시 패키지명, 횟수, 유효기간, 판매 금액을 자동 입력합니다.">
                      <Select
                        id="offline-package-option"
                        value={packageSellForm.packageTypeId}
                        onChange={handlePackageOptionChange}
                        disabled={isSellingPackage}
                        options={[
                          { value: "", label: "수동 입력" },
                          ...packageOptions.map((pkg) => ({
                            value: pkg.id,
                            label: `${pkg.name} · ${Number(pkg.sessions).toLocaleString("ko-KR")}회 · ${formatCurrency(pkg.price)} · ${Number(pkg.validityDays).toLocaleString("ko-KR")}일`,
                          })),
                        ]}
                      />
                    </FormField>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FormField label="패키지명" htmlFor="offline-package-name">
                      <Input id="offline-package-name" value={packageSellForm.packageName} onChange={(e) => updatePackageSellForm({ packageName: e.target.value })} disabled={isSellingPackage || isPackageOptionSelected} placeholder="예: 10회권" />
                    </FormField>
                    <FormField label="이용 횟수" htmlFor="offline-package-sessions">
                      <Input
                        id="offline-package-sessions"
                        type="number"
                        min={1}
                        step={1}
                        value={packageSellForm.sessions}
                        onChange={(e) => updatePackageSellForm({ sessions: e.target.value })}
                        disabled={isSellingPackage || isPackageOptionSelected}
                        placeholder="예: 10"
                      />
                    </FormField>
                    <FormField label="유효기간 일수" htmlFor="offline-package-validity">
                      <Input
                        id="offline-package-validity"
                        type="number"
                        min={1}
                        step={1}
                        value={packageSellForm.validityDays}
                        onChange={(e) => updatePackageSellForm({ validityDays: e.target.value })}
                        disabled={isSellingPackage || isPackageOptionSelected}
                        placeholder="예: 365"
                      />
                    </FormField>
                    <FormField label="판매 금액" htmlFor="offline-package-price">
                      <Input
                        id="offline-package-price"
                        type="number"
                        min={0}
                        step={1000}
                        value={packageSellForm.price}
                        onChange={(e) => updatePackageSellForm({ price: e.target.value })}
                        disabled={isSellingPackage || isPackageOptionSelected}
                        placeholder="예: 100000"
                      />
                    </FormField>
                    <FormField label="결제수단" htmlFor="offline-package-payment-method">
                      <Select
                        id="offline-package-payment-method"
                        value={packageSellForm.paymentMethod}
                        onChange={(v) => updatePackageSellForm({ paymentMethod: v as OfflinePaymentMethod })}
                        disabled={isSellingPackage}
                        options={[
                          { value: "cash", label: "현금" },
                          { value: "card", label: "카드" },
                          { value: "bank_transfer", label: "계좌이체" },
                          { value: "etc", label: "기타" },
                        ]}
                      />
                    </FormField>
                  </div>

                  <FormField label="메모" htmlFor="offline-package-memo">
                    <textarea
                      id="offline-package-memo"
                      className="min-h-20 w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                      value={packageSellForm.memo}
                      onChange={(e) => updatePackageSellForm({ memo: e.target.value })}
                      disabled={isSellingPackage}
                      placeholder="오프라인 판매 메모(선택)"
                    />
                  </FormField>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" onClick={handlePackageSell} disabled={isSellingPackage}>
                      <Gift className="mr-2 h-4 w-4" />
                      {isSellingPackage ? "패키지 판매/발급 중..." : "패키지 판매/발급"}
                    </Button>
                    <p className="text-xs text-muted-foreground">판매는 service_pass 발급만 처리하며, 특정 오프라인 기록에 자동 사용 처리하지 않습니다.</p>
                  </div>
                </div>
              )}
              {packageSellMessage && <Message type={packageSellMessageType || "info"}>{packageSellMessage}</Message>}

              {/* Package Sales History */}
              <CollapsibleSection
                title="패키지 판매/주문 내역"
                icon={ShoppingBag}
                badge={
                  packageSales.length > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      {packageSales.length}건
                    </Badge>
                  ) : null
                }
              >
                {packageSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground">표시할 패키지 판매/주문 내역이 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border/40">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">패키지</th>
                          <th className="px-4 py-3 font-medium">횟수</th>
                          <th className="px-4 py-3 font-medium">금액</th>
                          <th className="px-4 py-3 font-medium">결제수단</th>
                          <th className="px-4 py-3 font-medium">결제상태</th>
                          <th className="px-4 py-3 font-medium">결제일</th>
                          <th className="px-4 py-3 font-medium">출처</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packageSales.map((sale) => (
                          <tr key={sale.id} className="border-t border-border/40 transition-colors hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-foreground">{sale.packageName || "교체 서비스 패키지"}</td>
                            <td className="px-4 py-3">{Number(sale.sessions ?? 0).toLocaleString("ko-KR")}회</td>
                            <td className="px-4 py-3">{formatCurrency(sale.price)}</td>
                            <td className="px-4 py-3">{PAYMENT_METHOD_LABELS[sale.paymentMethod as OfflinePaymentMethod] ?? sale.paymentMethod ?? "-"}</td>
                            <td className="px-4 py-3">{sale.paymentStatus || "-"}</td>
                            <td className="px-4 py-3">{formatDate(sale.paidAt || sale.createdAt)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={sale.source === "offline_admin" ? "secondary" : "outline"}>{sale.sourceLabel || (sale.source === "offline_admin" ? "오프라인 판매" : "온라인/기존 주문")}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CollapsibleSection>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Records Section */}
      <SectionCard id="offline-records">
        <SectionHeader icon={History} title="작업/매출 이력" description="해당 고객의 오프라인 작업/매출 이력" action={records.length > 0 ? <Badge variant="secondary">{records.length}건</Badge> : null} />
        <div className="p-6">
          {records.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-8 text-center">
              <History className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">아직 등록된 오프라인 작업/매출 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => {
                const form = pointForms[record.id] ?? { grantAmount: "", grantReason: "", useAmount: "", useReason: "" };
                const hasGrant = !!record.points?.grantTxId;
                const hasDeduct = !!record.points?.deductTxId;
                const canProcessPoints = canUseLinkedFeatures;
                const pointUnavailableMessage = item.linkedUserId && !item.linkedUser ? "연결된 온라인 회원 정보를 찾을 수 없어 포인트를 처리할 수 없습니다." : "온라인 회원과 연결된 고객만 포인트를 처리할 수 있습니다.";
                const packageUsage = record.packageUsage;
                const hasPackageUsage = !!packageUsage?.passId || !!packageUsage?.consumptionId;
                const usedPass = passes.find((pass) => pass.id === packageUsage?.passId);
                const packageForm = packageForms[record.id] ?? { passId: usablePasses[0]?.id ?? "" };
                const canUsePackageForRecord = canUseLinkedFeatures && !hasPackageUsage && usablePasses.length > 0;
                const isExpanded = expandedRecords.has(record.id);

                return (
                  <div key={record.id} className="rounded-lg border border-border/40 bg-card transition-shadow hover:shadow-sm">
                    {/* Record Header */}
                    <button type="button" onClick={() => toggleRecordExpand(record.id)} className="flex w-full items-center justify-between p-4 text-left">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{formatDate(record.occurredAt)}</span>
                            <Badge variant="outline">{KIND_LABELS[record.kind] ?? record.kind}</Badge>
                            <StatusBadge status={record.status} labels={RECORD_STATUS_LABELS} />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{record.lineSummary || formatLineSummary(record.lines)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{formatCurrency(record.payment?.amount)}</p>
                          <StatusBadge status={record.payment?.status || ""} labels={PAYMENT_STATUS_LABELS} />
                        </div>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-border/40 p-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                          {/* Basic Info */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-foreground">기본 정보</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">결제 수단</span>
                                <span className="text-foreground">{record.payment?.method ? PAYMENT_METHOD_LABELS[record.payment.method] : "-"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">메모</span>
                                <span className="text-foreground text-right max-w-[200px] truncate">{record.memo || "-"}</span>
                              </div>
                            </div>
                            <Button asChild size="sm" variant="outline" className="w-full">
                              <Link href="/admin/offline">오프라인 관리에서 수정</Link>
                            </Button>
                          </div>

                          {/* Points Section */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-foreground">포인트</h4>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={hasGrant ? "secondary" : "outline"} className={hasGrant ? "bg-emerald-500/10 text-emerald-700" : ""}>
                                적립 {formatPoints(record.points?.earn)}
                              </Badge>
                              <Badge variant={hasDeduct ? "secondary" : "outline"} className={hasDeduct ? "bg-amber-500/10 text-amber-700" : ""}>
                                사용 {formatPoints(record.points?.use)}
                              </Badge>
                            </div>
                            {!canProcessPoints ? (
                              <p className="text-xs text-muted-foreground">{pointUnavailableMessage}</p>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3">
                                  <p className="text-xs font-medium text-muted-foreground">적립 포인트</p>
                                  <Input
                                    inputMode="numeric"
                                    value={form.grantAmount}
                                    onChange={(e) => updatePointForm(record.id, { grantAmount: e.target.value })}
                                    placeholder="예: 1000"
                                    disabled={!canProcessPoints || hasGrant}
                                    className="h-8 text-sm"
                                  />
                                  <Input value={form.grantReason} onChange={(e) => updatePointForm(record.id, { grantReason: e.target.value })} placeholder="사유(선택)" disabled={!canProcessPoints || hasGrant} className="h-8 text-sm" />
                                  <Button type="button" size="sm" className="w-full" onClick={() => handleRecordPoints(record.id, "grant")} disabled={!canProcessPoints || hasGrant || processingPointKey === `${record.id}:grant`}>
                                    {hasGrant ? "적립 완료" : processingPointKey === `${record.id}:grant` ? "처리 중..." : "적립"}
                                  </Button>
                                </div>
                                <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3">
                                  <p className="text-xs font-medium text-muted-foreground">사용 포인트</p>
                                  <Input
                                    inputMode="numeric"
                                    value={form.useAmount}
                                    onChange={(e) => updatePointForm(record.id, { useAmount: e.target.value })}
                                    placeholder="예: 1000"
                                    disabled={!canProcessPoints || hasDeduct}
                                    className="h-8 text-sm"
                                  />
                                  <Input value={form.useReason} onChange={(e) => updatePointForm(record.id, { useReason: e.target.value })} placeholder="사유(선택)" disabled={!canProcessPoints || hasDeduct} className="h-8 text-sm" />
                                  <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => handleRecordPoints(record.id, "deduct")} disabled={!canProcessPoints || hasDeduct || processingPointKey === `${record.id}:deduct`}>
                                    {hasDeduct ? "사용 완료" : processingPointKey === `${record.id}:deduct` ? "처리 중..." : "사용"}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {form.message && <Message type={form.messageType || "info"}>{form.message}</Message>}
                          </div>

                          {/* Package Section */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-foreground">패키지</h4>
                            {hasPackageUsage ? (
                              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                                  <Check className="mr-1.5 h-3.5 w-3.5" />
                                  패키지 1회 사용 완료
                                </Badge>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {getPassLabel(usedPass)} {Number(packageUsage?.usedCount ?? 1)}회 사용
                                </p>
                                {!packageUsage?.consumptionId && <p className="mt-1 text-xs text-destructive">패키지 사용 상태를 복구해야 합니다.</p>}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                패키지 미사용
                              </Badge>
                            )}
                            {!canUseLinkedFeatures && !hasPackageUsage && <p className="text-xs text-muted-foreground">온라인 회원과 연결된 고객만 패키지를 사용할 수 있습니다.</p>}
                            {canUseLinkedFeatures && usablePasses.length === 0 && !hasPackageUsage && <p className="text-xs text-muted-foreground">사용 가능한 패키지가 없습니다.</p>}
                            {!hasPackageUsage && canUseLinkedFeatures && usablePasses.length > 0 && (
                              <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3">
                                <p className="text-xs font-medium text-muted-foreground">사용할 패키지</p>
                                <Select
                                  value={packageForm.passId}
                                  onChange={(v) => updatePackageForm(record.id, { passId: v })}
                                  disabled={!canUsePackageForRecord || processingPackageRecordId === record.id}
                                  options={usablePasses.map((pass) => ({
                                    value: pass.id,
                                    label: `${getPassLabel(pass)} · 잔여 ${Number(pass.remainingCount ?? 0)}회`,
                                  }))}
                                />
                                <p className="text-xs text-muted-foreground">이 기록에 패키지 1회를 사용 처리합니다.</p>
                                <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => handleRecordPackageUse(record.id)} disabled={!canUsePackageForRecord || processingPackageRecordId === record.id}>
                                  <Package className="mr-2 h-4 w-4" />
                                  {processingPackageRecordId === record.id ? "처리 중..." : "패키지 사용"}
                                </Button>
                              </div>
                            )}
                            {packageForm.message && <Message type={packageForm.messageType || "info"}>{packageForm.message}</Message>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
