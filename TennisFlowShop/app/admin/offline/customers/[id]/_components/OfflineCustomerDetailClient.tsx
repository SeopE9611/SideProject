"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import useSWR from "swr";
import { ArrowLeft, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { adminFetcher, adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import type { OfflineCustomerDto, OfflineKind, OfflineLinkCandidate, OfflineLinkedUser, OfflinePaymentMethod, OfflinePackageSaleSummary, OfflinePaymentStatus, OfflineRecordPackageUsage, OfflineRecordPoints, OfflineServicePassSummary, OfflineStatus } from "@/types/admin/offline";

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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1 rounded-md border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{value || "-"}</div>
    </div>
  );
}


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

function MatchBadge({ active, label }: { active: boolean; label: string }) {
  return active ? (
    <Badge variant="secondary">{label} 일치</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      {label} 불일치
    </Badge>
  );
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
  "invalid package option": "선택한 패키지 옵션을 사용할 수 없습니다.",
  "package order creation failed": "패키지 주문 생성에 실패했습니다.",
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

export default function OfflineCustomerDetailClient({ id }: { id: string }) {
  const { data, error, isLoading, mutate: mutateDetail } = useSWR<DetailResponse>(`/api/admin/offline/customers/${id}`, authenticatedSWRFetcher, {
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

  const candidateKey = submittedCandidateQuery
    ? `/api/admin/offline/customers/${id}/link-candidates?name=${encodeURIComponent(submittedCandidateQuery.name)}&phone=${encodeURIComponent(submittedCandidateQuery.phone)}&email=${encodeURIComponent(submittedCandidateQuery.email)}`
    : null;
  const { data: candidatesData, isLoading: candidatesLoading, mutate: mutateCandidates } = useSWR<LinkCandidatesResponse>(candidateKey, adminFetcher, {
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


  if (isLoading) {
    return <Card><CardContent className="py-10 text-sm">오프라인 고객 상세 정보를 불러오는 중입니다...</CardContent></Card>;
  }

  if (error || !item) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>오프라인 고객 상세를 불러오지 못했습니다.</CardTitle>
          <CardDescription>고객 ID가 잘못되었거나 고객이 삭제되었을 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline"><Link href="/admin/offline">오프라인 관리로 돌아가기</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">오프라인 고객 상세</h1>
          <p className="mt-1 text-sm text-muted-foreground">고객 기본 정보와 오프라인 작업/매출 이력을 확인합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/offline"><ArrowLeft className="mr-2 h-4 w-4" />오프라인 관리로 돌아가기</Link></Button>
          <Button asChild variant="secondary"><a href="#offline-records"><History className="mr-2 h-4 w-4" />최근 기록으로 이동</a></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>고객 기본 정보</CardTitle>
            <CardDescription>휴대폰은 마스킹 정보를 우선 표시하고, 관리자 확인용 원번호를 보조로 제공합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <DetailRow label="고객명" value={<span className="font-medium">{item.name || "-"}</span>} />
              <DetailRow label="휴대폰 번호" value={<><span>{item.phoneMasked || "-"}</span>{item.phone ? <p className="mt-1 text-xs text-muted-foreground">원번호: {item.phone}</p> : null}</>} />
              <DetailRow label="이메일" value={item.email || "-"} />
              <DetailRow label="마지막 방문일" value={formatDate(item.stats?.lastVisitedAt)} />
              <DetailRow label="등록일" value={formatDate(item.createdAt)} />
              <DetailRow label="수정일" value={formatDate(item.updatedAt)} />
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">메모</p>
              <p className="whitespace-pre-wrap text-sm">{item.memo || "등록된 메모가 없습니다."}</p>
            </div>
            {item.tags?.length ? <div className="flex flex-wrap gap-2">{item.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div> : null}
            <p className="text-xs text-muted-foreground">고객 정보 수정은 오프라인 관리 화면 또는 후속 단계에서 지원 예정입니다.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>온라인 회원 연결 상태</CardTitle>
            <CardDescription>온라인 회원과 오프라인 고객을 관리자가 직접 확인한 뒤 연결합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {item.linkedUserId ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">온라인 회원과 연결됨</Badge>
                  {!item.linkedUser ? <Badge variant="outline">회원 정보 없음</Badge> : null}
                </div>
                <p className="text-muted-foreground">이 연결은 향후 포인트/패키지 연동 기준으로 사용됩니다.</p>
                <DetailRow label="회원명" value={item.linkedUser?.name || "회원 정보 없음"} />
                <DetailRow label="회원 이메일" value={item.linkedUser?.email || "-"} />
                <DetailRow label="회원 휴대폰" value={item.linkedUser?.phoneMasked || item.linkedUser?.phone || "-"} />
                <p className="break-all text-xs text-muted-foreground">linkedUserId: {item.linkedUserId}</p>
                <Button type="button" variant="destructive" size="sm" onClick={handleUnlinkUser} disabled={isUnlinking}>
                  {isUnlinking ? "연결 해제 중..." : "연결 해제"}
                </Button>
              </>
            ) : (
              <>
                <Badge variant="outline">온라인 회원 미연결</Badge>
                <p className="text-muted-foreground">포인트/패키지 연동은 온라인 회원 연결 후 사용할 수 있습니다.</p>
                <form
                  className="space-y-3 rounded-md border p-3"
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
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="link-candidate-name">이름</Label>
                      <Input id="link-candidate-name" value={candidateQuery.name} onChange={(e) => setCandidateQuery({ ...candidateQuery, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="link-candidate-phone">휴대폰 번호</Label>
                      <Input id="link-candidate-phone" value={candidateQuery.phone} onChange={(e) => setCandidateQuery({ ...candidateQuery, phone: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                      <Label htmlFor="link-candidate-email">이메일</Label>
                      <Input id="link-candidate-email" type="email" value={candidateQuery.email} onChange={(e) => setCandidateQuery({ ...candidateQuery, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm">검색</Button>
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
                {!submittedCandidateQuery && !candidateMessage ? <p>온라인 회원을 검색해 이 오프라인 고객과 연결할 수 있습니다.</p> : null}
                {candidateMessage ? <p className="text-sm text-destructive">{candidateMessage}</p> : null}
                {submittedCandidateQuery && candidatesLoading ? <p>회원 검색 중...</p> : null}
                {submittedCandidateQuery && !candidatesLoading && candidates.length === 0 ? <p>검색 결과가 없습니다.</p> : null}
                {submittedCandidateQuery && !candidatesLoading && candidates.length > 0 ? (
                  <div className="space-y-2">
                    {candidates.map((candidate) => {
                      const isLinkedToCurrent = candidate.alreadyLinkedOfflineCustomerId === item.id;
                      const isLinkedToOther = !!candidate.alreadyLinkedOfflineCustomerId && !isLinkedToCurrent;
                      return (
                        <div key={candidate.id} className="space-y-2 rounded-md border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium">{candidate.name || "이름 없음"}</p>
                              <p className="break-all text-muted-foreground">{candidate.email || "이메일 없음"}</p>
                              <p className="text-muted-foreground">{candidate.phoneMasked || "휴대폰 없음"}</p>
                              <p className="break-all text-xs text-muted-foreground">회원 ID: {candidate.id}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleLinkUser(candidate.id)}
                              disabled={isLinkedToOther || isLinkedToCurrent || linkingUserId === candidate.id}
                            >
                              {isLinkedToCurrent ? "현재 연결됨" : linkingUserId === candidate.id ? "연결 중..." : "연결"}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <MatchBadge active={candidate.match.name} label="이름" />
                            <MatchBadge active={candidate.match.phone} label="휴대폰" />
                            <MatchBadge active={candidate.match.email} label="이메일" />
                          </div>
                          {isLinkedToOther ? <p className="text-xs text-destructive">이미 다른 오프라인 고객({candidate.alreadyLinkedOfflineCustomerId})과 연결된 회원입니다.</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
            {linkMessage ? <p className={linkMessageType === "error" ? "text-sm text-destructive" : "text-sm text-foreground"}>{linkMessage}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>포인트</CardTitle>
          <CardDescription>온라인 회원과 연결된 고객의 포인트 조회 및 오프라인 기록 기준 처리 상태입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {canUseLinkedFeatures ? (
            <>
              <DetailRow label="현재 포인트 잔액" value={<span className="text-lg font-semibold">{formatPoints(pointBalance)}</span>} />
              <p className="text-muted-foreground">오프라인 작업 기록에서 포인트 적립/사용을 처리할 수 있습니다.</p>
              <p className="text-xs text-muted-foreground">포인트 사용 시 실제 결제금액은 필요에 따라 기존 record 수정 UI에서 별도로 수정하세요.</p>
              <p className="text-xs text-muted-foreground">포인트 처리 취소는 후속 단계에서 지원 예정입니다. 잘못 처리한 경우 관리자 포인트 조정 기능을 사용하세요.</p>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground">온라인 회원과 연결된 고객만 포인트 조회/사용/적립이 가능합니다.</p>
              {item.linkedUserId && !item.linkedUser ? <p className="text-xs text-destructive">연결된 온라인 회원 정보를 찾을 수 없어 포인트를 처리할 수 없습니다.</p> : null}
            </div>
          )}
        </CardContent>
      </Card>



      <Card>
        <CardHeader>
          <CardTitle>패키지/서비스권</CardTitle>
          <CardDescription>온라인 회원과 연결된 고객의 보유 패키지/서비스권을 조회합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!canUseLinkedFeatures ? (
            <p className="text-muted-foreground">온라인 회원과 연결된 고객만 보유 패키지 조회 및 사용 처리가 가능합니다.</p>
          ) : passes.length === 0 ? (
            <p className="text-muted-foreground">보유 패키지/서비스권이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {passes.map((pass) => {
                const usable = isUsablePass(pass);
                return (
                  <div key={pass.id} className={usable ? "rounded-md border border-primary/30 bg-primary/5 p-3" : "rounded-md border bg-muted/30 p-3 text-muted-foreground"}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{getPassLabel(pass)}</p>
                      <Badge variant={usable ? "secondary" : "outline"}>{usable ? "사용 가능" : pass.status || "비활성"}</Badge>
                    </div>
                    <p className="mt-2">잔여 {Number(pass.remainingCount ?? 0).toLocaleString("ko-KR")} / {Number(pass.totalCount ?? 0).toLocaleString("ko-KR")}회</p>
                    <p>사용 {Number(pass.usedCount ?? 0).toLocaleString("ko-KR")}회</p>
                    <p>만료일 {formatDate(pass.expiresAt)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>오프라인 패키지 판매</CardTitle>
          <CardDescription>매장에서 결제 완료된 패키지권을 온라인 회원 계정에 발급합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!canUseLinkedFeatures ? (
            <p className="text-muted-foreground">온라인 회원과 연결된 고객만 패키지 판매/발급이 가능합니다.</p>
          ) : (
            <div className="space-y-4 rounded-md border p-3">
              {packageOptions.length > 0 ? (
                <div className="space-y-1.5">
                  <Label htmlFor="offline-package-option">패키지 옵션</Label>
                  <select
                    id="offline-package-option"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={packageSellForm.packageTypeId}
                    onChange={(event) => handlePackageOptionChange(event.target.value)}
                    disabled={isSellingPackage}
                  >
                    <option value="">수동 입력</option>
                    {packageOptions.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} · {Number(pkg.sessions).toLocaleString("ko-KR")}회 · {formatCurrency(pkg.price)} · {Number(pkg.validityDays).toLocaleString("ko-KR")}일
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">옵션 선택 시 패키지명, 횟수, 유효기간, 판매 금액을 자동 입력합니다.</p>
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="offline-package-name">패키지명</Label>
                  <Input id="offline-package-name" value={packageSellForm.packageName} onChange={(e) => updatePackageSellForm({ packageName: e.target.value })} disabled={isSellingPackage} placeholder="예: 10회권" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offline-package-sessions">이용 횟수 / 세션 수</Label>
                  <Input id="offline-package-sessions" type="number" min={1} step={1} value={packageSellForm.sessions} onChange={(e) => updatePackageSellForm({ sessions: e.target.value })} disabled={isSellingPackage} placeholder="예: 10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offline-package-validity">유효기간 일수</Label>
                  <Input id="offline-package-validity" type="number" min={1} step={1} value={packageSellForm.validityDays} onChange={(e) => updatePackageSellForm({ validityDays: e.target.value })} disabled={isSellingPackage} placeholder="예: 365" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offline-package-price">판매 금액</Label>
                  <Input id="offline-package-price" type="number" min={0} step={1000} value={packageSellForm.price} onChange={(e) => updatePackageSellForm({ price: e.target.value })} disabled={isSellingPackage} placeholder="예: 100000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offline-package-payment-method">결제수단</Label>
                  <select
                    id="offline-package-payment-method"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={packageSellForm.paymentMethod}
                    onChange={(event) => updatePackageSellForm({ paymentMethod: event.target.value as OfflinePaymentMethod })}
                    disabled={isSellingPackage}
                  >
                    <option value="cash">현금</option>
                    <option value="card">카드</option>
                    <option value="bank_transfer">계좌이체</option>
                    <option value="etc">기타</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="offline-package-memo">메모</Label>
                  <textarea
                    id="offline-package-memo"
                    className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={packageSellForm.memo}
                    onChange={(e) => updatePackageSellForm({ memo: e.target.value })}
                    disabled={isSellingPackage}
                    placeholder="오프라인 판매 메모(선택)"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={handlePackageSell} disabled={isSellingPackage}>
                  {isSellingPackage ? "패키지 판매/발급 중..." : "패키지 판매/발급"}
                </Button>
                <p className="text-xs text-muted-foreground">판매는 service_pass 발급만 처리하며, 특정 오프라인 기록에 자동 사용 처리하지 않습니다.</p>
              </div>
            </div>
          )}
          {packageSellMessage ? <p className={packageSellMessageType === "error" ? "text-sm text-destructive" : "text-sm text-foreground"}>{packageSellMessage}</p> : null}
          <div className="space-y-2">
            <p className="font-medium">패키지 판매 내역</p>
            {packageSales.length === 0 ? (
              <p className="text-muted-foreground">표시할 패키지 판매 내역이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">패키지</th>
                      <th className="px-3 py-2">횟수</th>
                      <th className="px-3 py-2">금액</th>
                      <th className="px-3 py-2">결제수단</th>
                      <th className="px-3 py-2">결제상태</th>
                      <th className="px-3 py-2">결제일</th>
                      <th className="px-3 py-2">출처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packageSales.map((sale) => (
                      <tr key={sale.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{sale.packageName || "교체 서비스 패키지"}</td>
                        <td className="px-3 py-2">{Number(sale.sessions ?? 0).toLocaleString("ko-KR")}회</td>
                        <td className="px-3 py-2">{formatCurrency(sale.price)}</td>
                        <td className="px-3 py-2">{PAYMENT_METHOD_LABELS[sale.paymentMethod as OfflinePaymentMethod] ?? sale.paymentMethod ?? "-"}</td>
                        <td className="px-3 py-2">{sale.paymentStatus || "-"}</td>
                        <td className="px-3 py-2">{formatDate(sale.paidAt || sale.createdAt)}</td>
                        <td className="px-3 py-2">{sale.source === "offline_admin" ? "오프라인 판매" : sale.source || "온라인/기존"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>누적 통계</CardTitle>
          <CardDescription>오프라인 고객 기준으로 누적된 방문/작업/결제 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <DetailRow label="방문 횟수" value={`${item.stats?.visitCount ?? 0}회`} />
          <DetailRow label="총 작업 수" value={`${item.stats?.totalServiceCount ?? 0}건`} />
          <DetailRow label="총 결제액" value={formatCurrency(item.stats?.totalPaid)} />
          <DetailRow label="마지막 방문일" value={formatDate(item.stats?.lastVisitedAt)} />
          <DetailRow label="미결제 기록 수" value={`${pendingCount}건`} />
          <DetailRow label="환불 기록 수" value={`${refundedCount}건`} />
        </CardContent>
      </Card>

      <Card id="offline-records">
        <CardHeader>
          <CardTitle>작업/매출 이력</CardTitle>
          <CardDescription>해당 고객에게 등록된 최근 오프라인 작업/매출 이력입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm">아직 등록된 오프라인 작업/매출 이력이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">날짜</th>
                    <th className="px-2 py-2">유형</th>
                    <th className="px-2 py-2">작업 내용</th>
                    <th className="px-2 py-2">결제 금액</th>
                    <th className="px-2 py-2">결제 상태</th>
                    <th className="px-2 py-2">작업 상태</th>
                    <th className="px-2 py-2">메모</th>
                    <th className="px-2 py-2">포인트</th>
                    <th className="px-2 py-2">패키지</th>
                    <th className="px-2 py-2">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const form = pointForms[record.id] ?? { grantAmount: "", grantReason: "", useAmount: "", useReason: "" };
                    const hasGrant = !!record.points?.grantTxId;
                    const hasDeduct = !!record.points?.deductTxId;
                    const canProcessPoints = canUseLinkedFeatures;
                    const pointUnavailableMessage = item.linkedUserId && !item.linkedUser
                      ? "연결된 온라인 회원 정보를 찾을 수 없어 포인트를 처리할 수 없습니다."
                      : "온라인 회원과 연결된 고객만 포인트를 처리할 수 있습니다.";
                    const packageUsage = record.packageUsage;
                    const hasPackageUsage = !!packageUsage?.passId || !!packageUsage?.consumptionId;
                    const usedPass = passes.find((pass) => pass.id === packageUsage?.passId);
                    const packageForm = packageForms[record.id] ?? { passId: usablePasses[0]?.id ?? "" };
                    const canUsePackageForRecord = canUseLinkedFeatures && !hasPackageUsage && usablePasses.length > 0;
                    return (
                      <tr key={record.id} className="border-b align-top">
                        <td className="px-2 py-2">{formatDate(record.occurredAt)}</td>
                        <td className="px-2 py-2">{KIND_LABELS[record.kind] ?? record.kind}</td>
                        <td className="px-2 py-2">{record.lineSummary || formatLineSummary(record.lines)}</td>
                        <td className="px-2 py-2">{formatCurrency(record.payment?.amount)}</td>
                        <td className="px-2 py-2"><Badge variant="outline">{record.payment?.status ? PAYMENT_STATUS_LABELS[record.payment.status] : "-"}</Badge><p className="mt-1 text-xs text-muted-foreground">{record.payment?.method ? PAYMENT_METHOD_LABELS[record.payment.method] : "-"}</p></td>
                        <td className="px-2 py-2"><Badge variant="outline">{RECORD_STATUS_LABELS[record.status] ?? record.status}</Badge></td>
                        <td className="max-w-xs px-2 py-2">{record.memo || "-"}</td>
                        <td className="min-w-72 px-2 py-2">
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant={hasGrant ? "secondary" : "outline"}>적립 {formatPoints(record.points?.earn)}</Badge>
                              <Badge variant={hasDeduct ? "secondary" : "outline"}>사용 {formatPoints(record.points?.use)}</Badge>
                            </div>
                            {!canProcessPoints ? <p className="text-xs text-muted-foreground">{pointUnavailableMessage}</p> : null}
                            <div className="grid gap-2 md:grid-cols-2">
                              <div className="space-y-1.5 rounded-md border p-2">
                                <Label htmlFor={`grant-points-${record.id}`} className="text-xs">적립 포인트</Label>
                                <Input
                                  id={`grant-points-${record.id}`}
                                  inputMode="numeric"
                                  value={form.grantAmount}
                                  onChange={(e) => updatePointForm(record.id, { grantAmount: e.target.value })}
                                  placeholder="예: 1000"
                                  disabled={!canProcessPoints || hasGrant}
                                />
                                <Input
                                  value={form.grantReason}
                                  onChange={(e) => updatePointForm(record.id, { grantReason: e.target.value })}
                                  placeholder="사유(선택)"
                                  disabled={!canProcessPoints || hasGrant}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleRecordPoints(record.id, "grant")}
                                  disabled={!canProcessPoints || hasGrant || processingPointKey === `${record.id}:grant`}
                                >
                                  {hasGrant ? "적립 완료" : processingPointKey === `${record.id}:grant` ? "적립 처리 중..." : "적립 처리"}
                                </Button>
                              </div>
                              <div className="space-y-1.5 rounded-md border p-2">
                                <Label htmlFor={`deduct-points-${record.id}`} className="text-xs">사용 포인트</Label>
                                <Input
                                  id={`deduct-points-${record.id}`}
                                  inputMode="numeric"
                                  value={form.useAmount}
                                  onChange={(e) => updatePointForm(record.id, { useAmount: e.target.value })}
                                  placeholder="예: 1000"
                                  disabled={!canProcessPoints || hasDeduct}
                                />
                                <Input
                                  value={form.useReason}
                                  onChange={(e) => updatePointForm(record.id, { useReason: e.target.value })}
                                  placeholder="사유(선택)"
                                  disabled={!canProcessPoints || hasDeduct}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => handleRecordPoints(record.id, "deduct")}
                                  disabled={!canProcessPoints || hasDeduct || processingPointKey === `${record.id}:deduct`}
                                >
                                  {hasDeduct ? "사용 완료" : processingPointKey === `${record.id}:deduct` ? "사용 처리 중..." : "사용 처리"}
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">포인트 사용은 결제금액을 자동 변경하지 않습니다.</p>
                            {form.message ? <p className={form.messageType === "error" ? "text-xs text-destructive" : "text-xs text-foreground"}>{form.message}</p> : null}
                          </div>
                        </td>
                        <td className="min-w-64 px-2 py-2">
                          <div className="space-y-2">
                            {hasPackageUsage ? (
                              <div className="space-y-1">
                                <Badge variant="secondary">패키지 1회 사용 완료</Badge>
                                <p className="text-xs text-muted-foreground">{getPassLabel(usedPass)} {Number(packageUsage?.usedCount ?? 1)}회 사용</p>
                                {packageUsage?.consumptionId ? <p className="break-all text-xs text-muted-foreground">consumptionId: {packageUsage.consumptionId}</p> : <p className="text-xs text-destructive">패키지 사용 상태를 복구해야 합니다.</p>}
                              </div>
                            ) : (
                              <Badge variant="outline">패키지 미사용</Badge>
                            )}
                            {!canUseLinkedFeatures ? <p className="text-xs text-muted-foreground">온라인 회원과 연결된 고객만 패키지를 사용할 수 있습니다.</p> : null}
                            {canUseLinkedFeatures && usablePasses.length === 0 && !hasPackageUsage ? <p className="text-xs text-muted-foreground">사용 가능한 패키지가 없습니다.</p> : null}
                            {!hasPackageUsage && canUseLinkedFeatures && usablePasses.length > 0 ? (
                              <div className="space-y-2 rounded-md border p-2">
                                <Label htmlFor={`package-pass-${record.id}`} className="text-xs">사용할 패키지</Label>
                                <select
                                  id={`package-pass-${record.id}`}
                                  className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                                  value={packageForm.passId}
                                  onChange={(event) => updatePackageForm(record.id, { passId: event.target.value })}
                                  disabled={!canUsePackageForRecord || processingPackageRecordId === record.id}
                                >
                                  {usablePasses.map((pass) => (
                                    <option key={pass.id} value={pass.id}>
                                      {getPassLabel(pass)} · 잔여 {Number(pass.remainingCount ?? 0)}회
                                    </option>
                                  ))}
                                </select>
                                <p className="text-xs text-muted-foreground">이 기록에 패키지 1회를 사용 처리합니다. 결제금액은 자동 변경되지 않습니다.</p>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => handleRecordPackageUse(record.id)}
                                  disabled={!canUsePackageForRecord || processingPackageRecordId === record.id}
                                >
                                  {processingPackageRecordId === record.id ? "패키지 사용 처리 중..." : "패키지 사용"}
                                </Button>
                              </div>
                            ) : null}
                            {packageForm.message ? <p className={packageForm.messageType === "error" ? "text-xs text-destructive" : "text-xs text-foreground"}>{packageForm.message}</p> : null}
                          </div>
                        </td>
                        <td className="px-2 py-2"><Button asChild size="sm" variant="outline"><Link href="/admin/offline">오프라인 관리에서 수정</Link></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
