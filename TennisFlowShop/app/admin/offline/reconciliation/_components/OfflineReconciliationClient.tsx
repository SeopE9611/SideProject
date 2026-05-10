"use client";

import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCcw, Save, Search, ShieldAlert, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { cn } from "@/lib/utils";
import type { OfflineReconciliationItem, OfflineReconciliationResponse, OfflineReconciliationStatus } from "@/types/admin/offline";

const LIMIT = 20;
const TYPE_LABELS = { all: "전체", package_issue: "패키지 발급 실패", package_usage: "패키지 사용 연결 누락" } as const;
const STATUS_LABELS = { open: "미처리", resolved: "확인 완료", ignored: "무시", all: "전체" } as const;
const SEVERITY_LABELS = { warning: "주의", critical: "중요" } as const;

type TypeFilter = keyof typeof TYPE_LABELS;
type StatusFilter = keyof typeof STATUS_LABELS;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  return `${amount.toLocaleString("ko-KR")}원`;
}

function stringValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function statusVariant(status: OfflineReconciliationStatus) {
  if (status === "resolved") return "success" as const;
  if (status === "ignored") return "secondary" as const;
  return "warning" as const;
}

function severityVariant(severity: "warning" | "critical") {
  return severity === "critical" ? "danger" as const : "warning" as const;
}

function Select({ id, value, onChange, children }: { id: string; value: string; onChange: (event: ChangeEvent<HTMLSelectElement>) => void; children: ReactNode }) {
  return (
    <select id={id} value={value} onChange={onChange} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
      {children}
    </select>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "danger" | "warning" | "success" | "muted" }) {
  return (
    <div className={cn("rounded-xl border p-4", tone === "danger" && "border-destructive/30 bg-destructive/10", tone === "warning" && "border-warning/30 bg-warning/10", tone === "success" && "border-success/30 bg-success/10", (!tone || tone === "muted") && "border-border/60 bg-muted/20")}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value.toLocaleString("ko-KR")}건</p>
    </div>
  );
}

function ItemActions({ item, note, setNote, onUpdate }: { item: OfflineReconciliationItem; note: string; setNote: (value: string) => void; onUpdate: (item: OfflineReconciliationItem, status: OfflineReconciliationStatus, note: string) => Promise<void> }) {
  return (
    <div className="flex min-w-[220px] flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {item.links.customerDetailUrl && (
          <Button asChild size="sm" variant="outline"><Link href={item.links.customerDetailUrl}>고객 상세 <ExternalLink className="h-3 w-3" /></Link></Button>
        )}
        {item.links.packageOrderAdminUrl && (
          <Button asChild size="sm" variant="outline"><Link href={item.links.packageOrderAdminUrl}>주문 보기 <ExternalLink className="h-3 w-3" /></Link></Button>
        )}
        {item.links.offlineRecordUrl && (
          <Button asChild size="sm" variant="outline"><Link href={item.links.offlineRecordUrl}>record 보기 <ExternalLink className="h-3 w-3" /></Link></Button>
        )}
      </div>
      <textarea
        aria-label="보정 메모"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="운영 확인 메모"
        className="min-h-[68px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => onUpdate(item, item.status, note)}><Save className="h-3 w-3" />메모 저장</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onUpdate(item, "resolved", note)}><CheckCircle2 className="h-3 w-3" />확인 완료</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onUpdate(item, "ignored", note)}><XCircle className="h-3 w-3" />무시</Button>
      </div>
    </div>
  );
}

export default function OfflineReconciliationClient() {
  const [filters, setFilters] = useState({ type: "all" as TypeFilter, status: "open" as StatusFilter, from: "", to: "" });
  const [submitted, setSubmitted] = useState(filters);
  const [page, setPage] = useState(1);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ type: submitted.type, status: submitted.status, page: String(page), limit: String(LIMIT) });
    if (submitted.from) params.set("from", submitted.from);
    if (submitted.to) params.set("to", submitted.to);
    return `/api/admin/offline/reconciliation?${params.toString()}`;
  }, [submitted, page]);

  const { data, isLoading, error, mutate } = useSWR<OfflineReconciliationResponse>(query, authenticatedSWRFetcher, {
    onSuccess(payload) {
      setNotes((prev) => {
        const next = { ...prev };
        for (const item of payload.items) {
          if (!(item.id in next)) next[item.id] = item.note ?? "";
        }
        return next;
      });
    },
  });

  async function updateItem(item: OfflineReconciliationItem, status: OfflineReconciliationStatus, note: string) {
    const confirmMessage = status === "resolved"
      ? "확인 완료 처리는 실제 데이터 복구를 의미하지 않습니다. 운영자 확인 상태만 저장할까요?"
      : status === "ignored"
        ? "무시 처리는 실제 데이터 복구를 의미하지 않습니다. 목록 상태만 변경할까요?"
        : null;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setUpdatingId(item.id);
    setMessage(null);
    try {
      await adminMutator(`/api/admin/offline/reconciliation/${item.type}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      setMessage("보정 항목 상태/메모를 저장했습니다. 실제 원장·발급·사용 데이터는 자동 변경되지 않습니다.");
      await mutate();
    } catch (err) {
      setMessage(getAdminErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  const summary = data?.summary ?? { open: 0, packageIssue: 0, packageUsage: 0, resolved: 0, ignored: 0 };

  return (
    <div className="space-y-6">
      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="flex flex-col gap-2 p-4 text-sm text-foreground/80 md:flex-row md:items-center">
          <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-foreground">보정 필요 항목은 자동 처리 실패 또는 운영자 확인이 필요한 항목입니다.</p>
            <p className="text-xs text-muted-foreground">확인 완료 처리는 실제 데이터 복구를 의미하지 않습니다. 자동 재발급/자동 환불은 이번 화면에서 수행하지 않습니다.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">필터</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1.5"><Label htmlFor="type">유형</Label><Select id="type" value={filters.type} onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as TypeFilter }))}>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
            <div className="space-y-1.5"><Label htmlFor="status">상태</Label><Select id="status" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as StatusFilter }))}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
            <div className="space-y-1.5"><Label htmlFor="from">시작일</Label><Input id="from" type="date" value={filters.from} onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label htmlFor="to">종료일</Label><Input id="to" type="date" value={filters.to} onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))} /></div>
            <div className="flex items-end gap-2">
              <Button type="button" className="flex-1" onClick={() => { setSubmitted(filters); setPage(1); }}><Search className="h-4 w-4" />검색</Button>
              <Button type="button" variant="outline" onClick={() => { const empty = { type: "all" as TypeFilter, status: "open" as StatusFilter, from: "", to: "" }; setFilters(empty); setSubmitted(empty); setPage(1); }}><RefreshCcw className="h-4 w-4" />초기화</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="전체 미처리" value={summary.open} tone="warning" />
        <SummaryCard label="패키지 발급 실패" value={summary.packageIssue} tone="danger" />
        <SummaryCard label="패키지 사용 연결 누락" value={summary.packageUsage} tone="warning" />
        <SummaryCard label="확인 완료" value={summary.resolved} tone="success" />
        <SummaryCard label="무시" value={summary.ignored} tone="muted" />
      </div>

      {message && <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">{message}</div>}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" />보정 필요 목록</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <div className="rounded-xl border border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">보정 항목을 불러오는 중...</div>}
          {error && !isLoading && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">보정 항목을 불러오지 못했습니다.</div>}
          {!isLoading && !error && (data?.items.length ?? 0) === 0 && <div className="rounded-xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">조회 조건에 해당하는 보정 필요 항목이 없습니다.</div>}
          {!isLoading && !error && (data?.items.length ?? 0) > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="py-3 pr-3">유형</th><th className="py-3 pr-3">상태</th><th className="py-3 pr-3">심각도</th><th className="py-3 pr-3">발생일</th><th className="py-3 pr-3">고객</th><th className="py-3 pr-3">내용</th><th className="py-3 pr-3">금액/패키지명</th><th className="py-3 pr-3">에러/사유</th><th className="py-3">관리</th></tr></thead>
                <tbody className="divide-y">
                  {data!.items.map((item) => {
                    const note = notes[item.id] ?? item.note ?? "";
                    return (
                      <tr key={`${item.type}-${item.id}`} className={cn(updatingId === item.id && "opacity-60")}>
                        <td className="py-4 pr-3"><Badge variant="info">{TYPE_LABELS[item.type]}</Badge></td>
                        <td className="py-4 pr-3"><Badge variant={statusVariant(item.status)}>{STATUS_LABELS[item.status]}</Badge></td>
                        <td className="py-4 pr-3"><Badge variant={severityVariant(item.severity)}>{SEVERITY_LABELS[item.severity]}</Badge></td>
                        <td className="py-4 pr-3 text-muted-foreground">{formatDate(stringValue(item.metadata.failedAt ?? item.metadata.occurredAt ?? item.updatedAt, ""))}</td>
                        <td className="py-4 pr-3"><p className="font-medium">{item.customer.name}</p><p className="text-xs text-muted-foreground">{item.customer.phoneMasked ?? "연락처 없음"}</p></td>
                        <td className="max-w-[260px] py-4 pr-3"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.type === "package_usage" ? stringValue(item.metadata.lineSummary) : item.description}</p></td>
                        <td className="py-4 pr-3"><p>{item.type === "package_issue" ? stringValue(item.metadata.packageName) : `passId: ${stringValue(item.metadata.passId)}`}</p><p className="text-xs text-muted-foreground">{item.type === "package_issue" ? formatCurrency(item.metadata.amount) : `${stringValue(item.metadata.usedCount, "1")}회 사용 표시`}</p></td>
                        <td className="max-w-[240px] py-4 pr-3 text-xs text-muted-foreground">{stringValue(item.metadata.error ?? item.metadata.memo ?? "consumptionId 연결 없음")}</td>
                        <td className="py-4"><ItemActions item={item} note={note} setNote={(value) => setNotes((prev) => ({ ...prev, [item.id]: value }))} onUpdate={updateItem} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>총 {(data?.total ?? 0).toLocaleString("ko-KR")}건 · {data?.page ?? page}/{Math.max(data?.totalPages ?? 0, 1)}페이지</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>이전</Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 0)} onClick={() => setPage((prev) => prev + 1)}>다음</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
