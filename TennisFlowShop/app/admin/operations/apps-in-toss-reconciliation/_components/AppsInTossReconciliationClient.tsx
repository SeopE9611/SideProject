"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCcw, Search } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import useSWR from "swr";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import AdminPageSection from "@/components/admin/AdminPageSection";
import AdminSummaryCard from "@/components/admin/AdminSummaryCard";
import AdminStatusCard from "@/components/admin/AdminStatusCard";
import AsyncState from "@/components/system/AsyncState";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { adminDataTable } from "@/components/admin/AdminDataTable";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import type { AppsInTossAdminRecoveryResponse, AppsInTossAdminStatusCheckResponse, AppsInTossAttentionIssueType, AppsInTossObservedPaymentStatusClassification, AppsInTossReconciliationResponse } from "@/types/admin/apps-in-toss-reconciliation";

const ISSUE_LABELS: Record<AppsInTossAttentionIssueType | "all", string> = {
  all: "전체", reconciliation_required: "수동 대사 필요", compensation_refund_required: "보상 환불 필요",
  execution_lease_expired: "승인 확인 필요", refund_lease_expired: "환불 확인 필요",
  finalization_stale: "주문 확정 지연", state_inconsistent: "상태 불일치",
};

const STATUS_LABELS: Record<AppsInTossObservedPaymentStatusClassification, string> = {
  payment_pending: "결제 대기", payment_cancelled: "결제 취소", payment_complete: "결제 완료",
  payment_settled: "결제 정산 완료", refund_progress: "환불 진행", refund_complete: "환불 완료",
  refund_settled: "환불 정산 완료", refund_inconsistent: "환불 상태 불일치", unknown: "해석 불가",
};

function Select({ id, value, onChange, children }: { id: string; value: string; onChange: (event: ChangeEvent<HTMLSelectElement>) => void; children: ReactNode }) {
  return <select id={id} value={value} onChange={onChange} className={`h-10 w-full rounded-lg border border-input bg-background px-3 ${adminTypography.body}`}>{children}</select>;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function AppsInTossReconciliationClient() {
  const [filters, setFilters] = useState({ issueType: "all", environment: "all", from: "", to: "" });
  const [submitted, setSubmitted] = useState(filters);
  const [page, setPage] = useState(1);
  const checkingAttemptIdsRef = useRef(new Set<string>());
  const [checkingAttemptIds, setCheckingAttemptIds] = useState<Set<string>>(() => new Set());
  const recoveringAttemptIdsRef = useRef(new Set<string>());
  const [recoveringAttemptIds, setRecoveringAttemptIds] = useState<Set<string>>(() => new Set());
  const [recoveryAttemptId, setRecoveryAttemptId] = useState<string | null>(null);
  const [recoveryResults, setRecoveryResults] = useState<Record<string, AppsInTossAdminRecoveryResponse>>({});
  const [statusChecks, setStatusChecks] = useState<Record<string, AppsInTossAdminStatusCheckResponse>>({});
  const [statusCheckErrors, setStatusCheckErrors] = useState<Record<string, string>>({});
  const query = useMemo(() => {
    const params = new URLSearchParams({ issueType: submitted.issueType, environment: submitted.environment, page: String(page), limit: "20" });
    if (submitted.from) params.set("from", submitted.from);
    if (submitted.to) params.set("to", submitted.to);
    return `/api/admin/apps-in-toss/reconciliation?${params}`;
  }, [submitted, page]);
  const { data, error, isLoading, isValidating, mutate } = useSWR<AppsInTossReconciliationResponse>(query, authenticatedSWRFetcher);
  const summary = data?.summary;
  const checkTossStatus = async (attemptId: string) => {
    if (checkingAttemptIdsRef.current.has(attemptId) || recoveringAttemptIdsRef.current.has(attemptId)) return;
    checkingAttemptIdsRef.current.add(attemptId);
    setCheckingAttemptIds((current) => new Set(current).add(attemptId));
    setStatusCheckErrors((current) => ({ ...current, [attemptId]: "" }));
    try {
      const result = await adminMutator<AppsInTossAdminStatusCheckResponse>(`/api/admin/apps-in-toss/reconciliation/${attemptId}/status-check`, { method: "POST" });
      setStatusChecks((current) => ({ ...current, [attemptId]: result }));
    } catch (checkError) {
      setStatusCheckErrors((current) => ({ ...current, [attemptId]: getAdminErrorMessage(checkError) }));
    } finally {
      checkingAttemptIdsRef.current.delete(attemptId);
      setCheckingAttemptIds((current) => {
        const next = new Set(current);
        next.delete(attemptId);
        return next;
      });
    }
  };
  const recoverPayment = async (attemptId: string) => {
    if (checkingAttemptIdsRef.current.has(attemptId) || recoveringAttemptIdsRef.current.has(attemptId)) return;
    recoveringAttemptIdsRef.current.add(attemptId);
    setRecoveringAttemptIds((current) => new Set(current).add(attemptId));
    setRecoveryAttemptId(null);
    setStatusCheckErrors((current) => ({ ...current, [attemptId]: "" }));
    try {
      const result = await adminMutator<AppsInTossAdminRecoveryResponse>(`/api/admin/apps-in-toss/reconciliation/${attemptId}/recover`, { method: "POST" });
      setRecoveryResults((current) => ({ ...current, [attemptId]: result }));
      if (result.outcome === "recovered" || result.outcome === "followup_required") {
        setStatusChecks((current) => { const next = { ...current }; delete next[attemptId]; return next; });
        await mutate();
      }
    } catch (recoveryError) {
      setStatusCheckErrors((current) => ({ ...current, [attemptId]: getAdminErrorMessage(recoveryError) }));
    } finally {
      recoveringAttemptIdsRef.current.delete(attemptId);
      setRecoveringAttemptIds((current) => { const next = new Set(current); next.delete(attemptId); return next; });
    }
  };
  const statusCards = [
    ["수동 대사 필요", summary?.reconciliationRequired, "danger"],
    ["보상 환불 필요", summary?.compensationRefundRequired, "danger"], ["승인 확인 필요", summary?.executionLeaseExpired, "danger"],
    ["환불 확인 필요", summary?.refundLeaseExpired, "danger"], ["주문 확정 지연", summary?.finalizationStale, "warning"],
    ["상태 불일치", summary?.stateInconsistent, "danger"],
  ] as const;

  return <div className="space-y-6">
    <div className={adminSurface.fieldPanelMuted}>현재 보기: {ISSUE_LABELS[submitted.issueType as keyof typeof ISSUE_LABELS]} · {submitted.environment === "all" ? "전체 환경" : submitted.environment} · {data?.total ?? 0}건</div>
    <section className="space-y-3" aria-label="결제 정합성 상태">
      <AdminSummaryCard
        title="전체 확인 필요"
        value={`${summary?.total ?? 0}건`}
        description="자동 처리가 완료되지 않았거나 운영 확인이 필요한 전체 결제"
        tone="danger"
      />
      <div className="grid gap-3 grid-cols-3">
        {statusCards.map(([title, value, tone]) => (
          <AdminStatusCard
            key={title}
            title={title}
            value={`${value ?? 0}건`}
            tone={tone}
          />
        ))}
      </div>
    </section>
    <AdminPageSection title="조회 조건" description="기간은 결제 intent의 마지막 갱신 시각을 기준으로 합니다. 목록 새로고침은 MongoDB 내부 점검 큐만 다시 조회합니다." icon={Search} actions={<Button type="button" variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating}><RefreshCcw className="h-4 w-4" />목록 새로고침</Button>}>
      <div className="grid gap-3 grid-cols-4">
        <div><Label htmlFor="issueType">유형</Label><Select id="issueType" value={filters.issueType} onChange={(e) => setFilters({ ...filters, issueType: e.target.value })}>{Object.entries(ISSUE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
        <div><Label htmlFor="environment">환경</Label><Select id="environment" value={filters.environment} onChange={(e) => setFilters({ ...filters, environment: e.target.value })}><option value="all">전체</option><option value="live">live</option><option value="test">test</option></Select></div>
        <div><Label htmlFor="from">시작일</Label><Input id="from" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></div>
        <div><Label htmlFor="to">종료일</Label><Input id="to" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></div>
      </div>
      <Button className="mt-4" type="button" onClick={() => { setSubmitted(filters); setPage(1); }}>조회</Button>
    </AdminPageSection>
    <AdminPageSection title="운영 확인 필요 결제" description="MongoDB에 저장된 진단 정보만 표시합니다." icon={AlertTriangle}>
      <div className={`${adminSurface.tableCard} overflow-x-auto`}><Table className="min-w-[1180px]"><TableHeader><TableRow>
        {['우선도','문제 유형','결제 상태','고객/상품','금액','발생/갱신 시각','진단 정보','다음 조치'].map((label) => <TableHead key={label} className={adminDataTable.head}>{label}</TableHead>)}
      </TableRow></TableHeader><TableBody>
        {error ? <TableRow><TableCell colSpan={8} className="p-4"><AsyncState kind="error" variant="inline" tone="admin" resourceName="결제 점검 목록" onAction={() => void mutate()} /></TableCell></TableRow> : null}
        {isLoading ? Array.from({ length: 4 }, (_, rowIndex) => <TableRow key={rowIndex}>{Array.from({ length: 8 }, (_, cellIndex) => <TableCell key={cellIndex} className={adminDataTable.cell}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>) : null}
        {!error && !isLoading && !data?.items.length ? <TableRow><TableCell colSpan={8} className="p-4"><AsyncState kind="empty" variant="inline" tone="admin" title="현재 조회 조건에 해당하는 결제가 없습니다" description="조회 조건을 변경하거나 목록을 새로고침해 확인해 주세요." /></TableCell></TableRow> : null}
        {!error && !isLoading ? data?.items.map((item) => <TableRow key={item.id} className={adminDataTable.row}>
        <TableCell className={adminDataTable.cellTop}><Badge variant={item.severity === "critical" ? "danger" : "warning"}>{item.severity === "critical" ? "긴급" : "주의"}</Badge></TableCell>
        <TableCell className={adminDataTable.cellTop}>{ISSUE_LABELS[item.issueType]}</TableCell>
        <TableCell className={adminDataTable.cellTop}><div className="flex flex-col gap-1"><Badge variant="secondary">{item.state}</Badge><Badge variant="info">{item.environment}</Badge></div></TableCell>
        <TableCell className={adminDataTable.cellTop}><p className="font-medium">{item.customer.name}</p><p className={adminTypography.metaMuted}>{item.customer.phoneMasked ?? item.customer.emailMasked ?? "연락처 없음"}</p><p className="mt-1">{item.product.name ?? "상품 정보 없음"}</p><p className={adminTypography.metaMuted}>{[item.product.selectedColor, item.product.selectedGauge].filter(Boolean).join(" · ")}</p></TableCell>
        <TableCell className={adminDataTable.moneyCell}>{item.amount.toLocaleString("ko-KR")}원</TableCell>
        <TableCell className={adminDataTable.cellTop}><p>{formatDate(item.timestamps.updatedAt)}</p><p className={adminTypography.metaMuted}>결제 {formatDate(item.timestamps.paidAt)}</p></TableCell>
        <TableCell className={adminDataTable.cellTop}><p>{[item.failure.stage, item.failure.code, item.failure.finalizationCode].filter(Boolean).join(" · ") || "코드 없음"}</p><p className={adminTypography.metaMuted}>시도 ID {item.attemptId}</p>{item.links.orderAdminUrl ? <Link className="text-primary underline" href={item.links.orderAdminUrl}>주문 상세</Link> : null}</TableCell>
        <TableCell className={adminDataTable.cellTop}><div className="space-y-3"><p>{item.nextAction}</p><Button type="button" variant="outline" size="sm" disabled={checkingAttemptIds.has(item.attemptId) || recoveringAttemptIds.has(item.attemptId)} onClick={() => checkTossStatus(item.attemptId)}>{checkingAttemptIds.has(item.attemptId) ? "확인 중..." : "Toss 상태 확인"}</Button>{statusChecks[item.attemptId]?.recovery.eligibility === "eligible" && item.issueType === "reconciliation_required" ? <Button type="button" size="sm" disabled={checkingAttemptIds.has(item.attemptId) || recoveringAttemptIds.has(item.attemptId)} onClick={() => setRecoveryAttemptId(item.attemptId)}>{recoveringAttemptIds.has(item.attemptId) ? "복구 중..." : "안전 복구 실행"}</Button> : null}{statusCheckErrors[item.attemptId] ? <p className="text-sm text-destructive">{statusCheckErrors[item.attemptId]}</p> : null}{statusChecks[item.attemptId] ? <div className={`space-y-1 ${adminTypography.metaMuted}`}><p>외부 상태: {statusChecks[item.attemptId].external.payStatus}</p><p>판정: {STATUS_LABELS[statusChecks[item.attemptId].external.classification]}</p><p>환불 가능 잔액: {statusChecks[item.attemptId].external.refundableAmount.toLocaleString("ko-KR")}원</p><p>확인 시각: {formatDate(statusChecks[item.attemptId].checkedAt)}</p><p>{statusChecks[item.attemptId].guidance}</p><p>{statusChecks[item.attemptId].recovery.message}</p></div> : null}{recoveryResults[item.attemptId] ? <p className={adminTypography.metaMuted}>{recoveryResults[item.attemptId].message}</p> : null}</div></TableCell>
      </TableRow>) : null}</TableBody></Table></div>
      <div className="mt-4 flex items-center justify-between"><p className={adminTypography.metaMuted}>{data?.total ?? 0}건 · {page}/{Math.max(data?.totalPages ?? 0, 1)}페이지</p><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>이전</Button><Button type="button" variant="outline" size="sm" disabled={!data || page >= data.totalPages} onClick={() => setPage((v) => v + 1)}>다음</Button></div></div>
    </AdminPageSection>
    <AdminConfirmDialog open={Boolean(recoveryAttemptId)} title="Apps in Toss 결제 안전 복구" description={"Toss의 최신 거래 상태를 다시 확인한 뒤 서버 정책상 안전한 경우에만 내부 결제 상태를 복구합니다.\n결제 완료가 확인된 건은 주문 확정 절차가 이어질 수 있으며, 주문 확정이 불가능하면 기존 정책에 따라 보상 환불이 진행될 수 있습니다."} severity="danger" confirmText="안전 복구 실행" confirmDisabled={Boolean(recoveryAttemptId && recoveringAttemptIds.has(recoveryAttemptId))} onOpenChange={(open) => { if (!open) setRecoveryAttemptId(null); }} onConfirm={() => { if (recoveryAttemptId) void recoverPayment(recoveryAttemptId); }} eventKey="apps-in-toss-reconciliation-recovery" />
  </div>;
}
