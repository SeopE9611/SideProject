"use client";

import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import AdminPageSection from "@/components/admin/AdminPageSection";
import AdminRowDetailsSheet from "@/components/admin/AdminRowDetailsSheet";
import AdminSummaryCard from "@/components/admin/AdminSummaryCard";
import AsyncState from "@/components/system/AsyncState";
import { adminDataTable } from "@/components/admin/AdminDataTable";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { cn } from "@/lib/utils";
import type {
  OfflineReconciliationItem,
  OfflineReconciliationResponse,
  OfflineReconciliationStatus,
} from "@/types/admin/offline";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCcw,
  Save,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import useSWR from "swr";

const LIMIT = 20;
const TYPE_LABELS = {
  all: "전체",
  package_issue: "패키지 발급 실패",
  package_usage: "패키지 사용 연결 누락",
} as const;
const STATUS_LABELS = {
  open: "미처리",
  resolved: "확인 완료",
  ignored: "무시",
  all: "전체",
} as const;
const SEVERITY_LABELS = { warning: "주의", critical: "중요" } as const;

type TypeFilter = keyof typeof TYPE_LABELS;
type StatusFilter = keyof typeof STATUS_LABELS;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function severityVariant(severity: "warning" | "critical") {
  return severity === "critical" ? ("danger" as const) : ("warning" as const);
}

function Select({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      className={`h-10 w-full rounded-lg border border-input bg-background px-3 ${adminTypography.body} focus:outline-none focus:ring-2 focus:ring-ring/20`}
    >
      {children}
    </select>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning" | "success" | "muted";
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <AdminSummaryCard
      title={label}
      value={`${value.toLocaleString("ko-KR")}건`}
      tone={tone === "muted" ? "neutral" : tone}
      active={active}
      onAction={onClick}
      className="shadow-none"
    />
  );
}

function ItemActions({
  item,
  note,
  description,
  errorReason,
  setNote,
  onUpdate,
}: {
  item: OfflineReconciliationItem;
  note: string;
  description: string;
  errorReason: string;
  setNote: (value: string) => void;
  onUpdate: (
    item: OfflineReconciliationItem,
    status: OfflineReconciliationStatus,
    note: string,
  ) => Promise<void>;
}) {
  return (
    <AdminRowDetailsSheet
      title={item.title}
      description={`${TYPE_LABELS[item.type]} · ${item.customer.name}`}
      trigger={
        <Button type="button" size="sm" variant={item.status === "open" ? "default" : "outline"}>
          {item.status === "open" ? "처리" : "검토"}
        </Button>
      }
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onUpdate(item, item.status, note)}
          >
            <Save className="h-3.5 w-3.5" />
            메모 저장
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onUpdate(item, "ignored", note)}
          >
            <XCircle className="h-3.5 w-3.5" />
            무시
          </Button>
          <Button type="button" size="sm" onClick={() => onUpdate(item, "resolved", note)}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            확인 완료
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className={cn(adminSurface.fieldPanelMuted, "space-y-2")}>
          <h3 className={adminTypography.panelTitle}>발생 내용</h3>
          <p className={adminTypography.body}>{description}</p>
          <div className="rounded-lg border border-warning/25 bg-warning/5 p-3">
            <p className={adminTypography.caution}>오류·확인 사유</p>
            <p className={cn("mt-1 break-words", adminTypography.body)}>{errorReason}</p>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className={adminTypography.panelTitle}>관련 화면</h3>
          <div className="flex flex-wrap gap-2">
            {item.links.customerDetailUrl ? (
              <Button asChild size="sm" variant="outline">
                <Link href={item.links.customerDetailUrl}>
                  고객 상세 <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
            {item.links.packageOrderAdminUrl ? (
              <Button asChild size="sm" variant="outline">
                <Link href={item.links.packageOrderAdminUrl}>
                  주문 보기 <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
            {item.links.offlineRecordUrl ? (
              <Button asChild size="sm" variant="outline">
                <Link href={item.links.offlineRecordUrl}>
                  기록 보기 <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>
        </section>

        <section className="space-y-2">
          <Label htmlFor={`reconciliation-note-${item.id}`}>처리 메모</Label>
          <textarea
            id={`reconciliation-note-${item.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="예: 고객 확인 완료, 수동 발급 완료, 중복 항목으로 무시"
            className={`min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 ${adminTypography.body} focus:outline-none focus:ring-2 focus:ring-ring/20`}
          />
        </section>
      </div>
    </AdminRowDetailsSheet>
  );
}

export default function OfflineReconciliationClient() {
  const [filters, setFilters] = useState({
    type: "all" as TypeFilter,
    status: "open" as StatusFilter,
    from: "",
    to: "",
  });
  const [submitted, setSubmitted] = useState(filters);
  const [page, setPage] = useState(1);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      type: submitted.type,
      status: submitted.status,
      page: String(page),
      limit: String(LIMIT),
    });
    if (submitted.from) params.set("from", submitted.from);
    if (submitted.to) params.set("to", submitted.to);
    return `/api/admin/offline/reconciliation?${params.toString()}`;
  }, [submitted, page]);

  const { data, isLoading, error, mutate } = useSWR<OfflineReconciliationResponse>(
    query,
    authenticatedSWRFetcher,
    {
      onSuccess(payload) {
        setNotes((prev) => {
          const next = { ...prev };
          for (const item of payload.items) {
            if (!(item.id in next)) next[item.id] = item.note ?? "";
          }
          return next;
        });
      },
    },
  );

  function applyQuickFilter(next: Partial<typeof filters>) {
    const merged = {
      type: "all" as TypeFilter,
      status: "open" as StatusFilter,
      from: "",
      to: "",
      ...next,
    };

    setFilters(merged);
    setSubmitted(merged);
    setPage(1);
    setMessage(null);
  }

  function resetFilters() {
    const empty = {
      type: "all" as TypeFilter,
      status: "open" as StatusFilter,
      from: "",
      to: "",
    };

    setFilters(empty);
    setSubmitted(empty);
    setPage(1);
    setMessage(null);
  }

  async function updateItem(
    item: OfflineReconciliationItem,
    status: OfflineReconciliationStatus,
    note: string,
  ) {
    const confirmMessage =
      status === "resolved"
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
      setMessage(
        "보정 항목 상태/메모를 저장했습니다. 실제 원장·발급·사용 데이터는 자동 변경되지 않습니다.",
      );
      await mutate();
    } catch (err) {
      setMessage(getAdminErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  const summary = data?.summary ?? {
    open: 0,
    packageIssue: 0,
    packageUsage: 0,
    resolved: 0,
    ignored: 0,
  };

  const currentViewLabel =
    submitted.status === "open" && submitted.type === "all" && !submitted.from && !submitted.to
      ? "전체 미처리"
      : submitted.status === "open" &&
          submitted.type === "package_issue" &&
          !submitted.from &&
          !submitted.to
        ? "패키지 발급 실패"
        : submitted.status === "open" &&
            submitted.type === "package_usage" &&
            !submitted.from &&
            !submitted.to
          ? "패키지 사용 연결 누락"
          : submitted.status === "resolved" &&
              submitted.type === "all" &&
              !submitted.from &&
              !submitted.to
            ? "확인 완료"
            : submitted.status === "ignored" &&
                submitted.type === "all" &&
                !submitted.from &&
                !submitted.to
              ? "무시"
              : "사용자 지정 조건";

  const hasCustomFilters =
    submitted.type !== "all" ||
    submitted.status !== "open" ||
    Boolean(submitted.from) ||
    Boolean(submitted.to);

  return (
    <div className="space-y-6">
      <div
        className={`${adminSurface.cardMuted} flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${adminTypography.body}`}
      >
        <p className="font-semibold text-foreground">현재 보기: {currentViewLabel}</p>

        {submitted.from || submitted.to ? (
          <p className="text-muted-foreground">
            기간: {submitted.from || "시작일 없음"} ~ {submitted.to || "종료일 없음"}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 ml-auto w-auto justify-end">
          {hasCustomFilters && (
            <Button type="button" size="sm" variant="ghost" onClick={resetFilters}>
              필터 초기화
            </Button>
          )}

          <span className="text-sm font-medium text-foreground">
            총 {(data?.total ?? 0).toLocaleString("ko-KR")}건
          </span>
        </div>
      </div>
      <div className="grid gap-3 grid-cols-3">
        <SummaryCard
          label="전체 미처리"
          value={summary.open}
          tone="warning"
          active={currentViewLabel === "전체 미처리"}
          onClick={() => applyQuickFilter({ type: "all", status: "open" })}
        />
        <SummaryCard
          label="패키지 발급 실패"
          value={summary.packageIssue}
          tone="danger"
          active={currentViewLabel === "패키지 발급 실패"}
          onClick={() => applyQuickFilter({ type: "package_issue", status: "open" })}
        />
        <SummaryCard
          label="패키지 사용 연결 누락"
          value={summary.packageUsage}
          tone="warning"
          active={currentViewLabel === "패키지 사용 연결 누락"}
          onClick={() => applyQuickFilter({ type: "package_usage", status: "open" })}
        />
      </div>
      <AdminPageSection
        title="필터"
        description="유형, 상태, 기간으로 보정 대상 목록을 조정합니다."
        icon={Search}
      >
        <div className="grid gap-3 grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="type">유형</Label>
            <Select
              id="type"
              value={filters.type}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  type: e.target.value as TypeFilter,
                }))
              }
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">상태</Label>
            <Select
              id="status"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as StatusFilter,
                }))
              }
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from">시작일</Label>
            <Input
              id="from"
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">종료일</Label>
            <Input
              id="to"
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
            />
          </div>
          <div className="flex w-full items-end gap-2">
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                setSubmitted(filters);
                setPage(1);
                setMessage(null);
              }}
            >
              <Search className="h-4 w-4" />
              검색
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={resetFilters}>
              <RefreshCcw className="h-4 w-4" />
              초기화
            </Button>
          </div>
        </div>
      </AdminPageSection>

      {message && (
        <div className={`${adminSurface.cardMuted} p-3 ${adminTypography.metaMuted}`}>
          {message}
        </div>
      )}

      <AdminPageSection
        title="보정 필요 목록"
        description="확인 상태, 메모, 관련 상세 이동을 한 곳에서 관리합니다."
        icon={AlertTriangle}
      >
        {isLoading && (
          <div className={`${adminSurface.tableCard} overflow-x-auto`}>
            <table className="w-full min-w-[1150px] table-fixed">
              <tbody className="divide-y">
                {Array.from({ length: 4 }, (_, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: 7 }, (_, cellIndex) => (
                      <td key={cellIndex} className={adminDataTable.cell}>
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && !isLoading && (
          <AsyncState kind="error" tone="admin" resourceName="보정 필요 항목" onAction={() => void mutate()} />
        )}
        {!isLoading && !error && (data?.items.length ?? 0) === 0 && (
          <AsyncState
            kind="empty"
            tone="admin"
            title="조회 조건에 해당하는 보정 필요 항목이 없습니다"
            description="검색 조건을 변경하거나 초기화해 다시 확인해 주세요."
          />
        )}
        {!isLoading && !error && (data?.items.length ?? 0) > 0 && (
          <div className={`${adminSurface.tableCard} overflow-x-auto`}>
            <table className={`w-full min-w-[1150px] table-fixed ${adminTypography.body}`}>
              <colgroup>
                <col className="w-[90px]" />
                <col className="w-[150px]" />
                <col className="w-[150px]" />
                <col className="w-[180px]" />
                <col className="w-[280px]" />
                <col className="w-[180px]" />
                <col className="w-[120px]" />
              </colgroup>
              <thead className={adminSurface.tableHeader}>
                <tr>
                  <th className={adminDataTable.headCenter}>주의</th>
                  <th className={adminDataTable.head}>이슈</th>
                  <th className={adminDataTable.headRight}>발생일</th>
                  <th className={adminDataTable.head}>고객</th>
                  <th className={adminDataTable.head}>내용</th>
                  <th className={adminDataTable.headRight}>금액 / 패키지</th>
                  <th className={cn(adminDataTable.stickyActionHead, "w-[120px]")}>처리</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data!.items.map((item) => {
                  const note = notes[item.id] ?? item.note ?? "";
                  const description =
                    item.type === "package_usage"
                      ? stringValue(item.metadata.lineSummary)
                      : item.description;
                  const errorReason = stringValue(
                    item.metadata.error ?? item.metadata.memo ?? "consumptionId 연결 없음",
                  );
                  return (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className={cn(adminDataTable.row, updatingId === item.id && "opacity-60")}
                    >
                      <td className={adminDataTable.cellCenter}>
                        <Badge variant={severityVariant(item.severity)}>
                          {SEVERITY_LABELS[item.severity]}
                        </Badge>
                      </td>
                      <td className={adminDataTable.cellTopLeft}>
                        <p className={adminDataTable.categoryText}>{TYPE_LABELS[item.type]}</p>
                        {submitted.status === "all" ? (
                          <p className={adminDataTable.secondaryText}>{STATUS_LABELS[item.status]}</p>
                        ) : null}
                      </td>
                      <td className={adminDataTable.dateCell}>
                        {formatDate(
                          stringValue(
                            item.metadata.failedAt ?? item.metadata.occurredAt ?? item.updatedAt,
                            "",
                          ),
                        )}
                      </td>
                      <td className={adminDataTable.cellTopLeft}>
                        <p className="font-medium">{item.customer.name}</p>
                        <p className={adminDataTable.secondaryText}>
                          {item.customer.phoneMasked ?? "연락처 없음"}
                        </p>
                      </td>
                      <td className={adminDataTable.cellTopLeft}>
                        <p className="font-medium">{item.title}</p>
                        <p
                          className={cn(adminDataTable.secondaryText, "mt-1 line-clamp-2 break-words")}
                          title={description}
                        >
                          {description}
                        </p>
                      </td>
                      <td className={adminDataTable.cellRight}>
                        <p>
                          {item.type === "package_issue"
                            ? stringValue(item.metadata.packageName)
                            : `passId: ${stringValue(item.metadata.passId)}`}
                        </p>
                        <p className={adminDataTable.secondaryText}>
                          {item.type === "package_issue"
                            ? formatCurrency(item.metadata.amount)
                            : `${stringValue(item.metadata.usedCount, "1")}회 사용 표시`}
                        </p>
                      </td>
                      <td className={cn(adminDataTable.stickyActionCell, "w-[120px]")}>
                        <ItemActions
                          item={item}
                          note={note}
                          description={description}
                          errorReason={errorReason}
                          setNote={(value) =>
                            setNotes((prev) => ({
                              ...prev,
                              [item.id]: value,
                            }))
                          }
                          onUpdate={updateItem}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className={`mt-4 flex flex-row items-center gap-3 justify-between ${adminTypography.metaMuted}`}>
          <span>
            총 {(data?.total ?? 0).toLocaleString("ko-KR")}건 · {data?.page ?? page}/
            {Math.max(data?.totalPages ?? 0, 1)}페이지
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              이전
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= (data?.totalPages ?? 0)}
              onClick={() => setPage((prev) => prev + 1)}
            >
              다음
            </Button>
          </div>
        </div>
      </AdminPageSection>
    </div>
  );
}
