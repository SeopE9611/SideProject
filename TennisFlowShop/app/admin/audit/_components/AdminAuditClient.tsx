"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { useAdminListQueryState } from "@/lib/admin/useAdminListQueryState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ListFilter, ClipboardList } from "lucide-react";
import AdminPageSection from "@/components/admin/AdminPageSection";
import AdminRowDetailsSheet from "@/components/admin/AdminRowDetailsSheet";
import { adminDataTable } from "@/components/admin/AdminDataTable";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type AuditItem = {
  id: string;
  type: string;
  message?: string | null;
  actor: string;
  actorTitle?: string;
  actorId?: string | null;
  targetId?: string | null;
  createdAt?: string | null;
  requestId?: string | null;
  diffSummary?: string[];
};

type AuditListResponse = {
  success: boolean;
  items: AuditItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const PAGE_SIZE = 20;
type AuditQueryState = { page: number; q: string; type: string };
const AUDIT_QUERY_DEFAULTS: AuditQueryState = { page: 1, q: "", type: "" };
const parseAuditQueryState = (params: URLSearchParams, defaults: AuditQueryState) => ({
  page: Math.max(
    1,
    Number.parseInt(params.get("page") || String(defaults.page), 10) || defaults.page,
  ),
  q: params.get("q") || defaults.q,
  type: params.get("type") || defaults.type,
});
const toAuditQueryParams = (queryState: AuditQueryState) => ({
  page: queryState.page === 1 ? undefined : queryState.page,
  q: queryState.q.trim() || undefined,
  type: queryState.type.trim() || undefined,
});
const AUDIT_PAGE_RESET_KEYS: Array<keyof AuditQueryState> = ["q", "type"];
const AUDIT_TYPE_LABELS: Record<string, string> = {
  "note.create": "내부 메모 작성",
  "note.update": "내부 메모 수정",
  "note.delete": "내부 메모 삭제",
  "review.maintenance.run": "후기 데이터 정비 실행",
  "review.maintenance.delete": "후기 데이터 정비 잠금 해제",
  admin_board_delete: "게시글 삭제",
  "racket.create": "라켓 등록",
  "racket.update": "라켓 수정",
  "racket.delete": "라켓 삭제",
  "product.create": "상품 등록",
  "product.update": "상품 수정",
  "product.delete": "상품 삭제",
  "community.post.update": "커뮤니티 게시글 수정",
  "community.post.delete": "커뮤니티 게시글 삭제",
  "community.post.status": "커뮤니티 게시글 상태 변경",
};

const QUICK_TYPE_FILTERS = [
  { label: "전체", value: "" },
  { label: "내부 메모", value: "note." },
  { label: "메모 작성", value: "note.create" },
  { label: "메모 수정", value: "note.update" },
  { label: "메모 삭제", value: "note.delete" },
] as const;

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR");
}

export default function AdminAuditClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { state, patchState, setPage } = useAdminListQueryState<AuditQueryState>({
    pathname: pathname || "/admin/audit",
    searchParams,
    replace: router.replace,
    defaults: AUDIT_QUERY_DEFAULTS,
    parse: parseAuditQueryState,
    toQueryParams: toAuditQueryParams,
    pageResetKeys: AUDIT_PAGE_RESET_KEYS,
  });

  const key = useMemo(() => {
    const qs = new URLSearchParams({
      page: String(state.page),
      limit: String(PAGE_SIZE),
    });
    if (state.q.trim()) qs.set("q", state.q.trim());
    if (state.type.trim()) qs.set("type", state.type.trim());
    return `/api/admin/audit?${qs.toString()}`;
  }, [state.page, state.q, state.type]);

  const { data, error, isValidating } = useSWR<AuditListResponse>(key, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const [draftQ, setDraftQ] = useState(state.q);
  const [draftType, setDraftType] = useState(state.type);

  const applyFilters = () => patchState({ q: draftQ, type: draftType });
  const applyQuickTypeFilter = (nextType: string) => {
    setDraftType(nextType);
    patchState({ type: nextType, page: 1 });
  };
  const resetFilters = () => {
    setDraftQ("");
    setDraftType("");
    patchState({ q: "", type: "", page: 1 });
  };

  return (
    <div className="space-y-4">
      <AdminPageSection
        title="검색/필터"
        description="메시지, 실행자, 작업 유형으로 감사 로그를 좁혀봅니다."
        icon={ListFilter}
        className={adminSurface.filterCard}
        contentClassName="space-y-3"
      >
        <div className="grid gap-3 grid-cols-[minmax(0,1fr)_280px_auto_auto]">
          <div className="space-y-2">
            <Label htmlFor="audit-filter-query">메시지 또는 실행자</Label>
            <Input
              id="audit-filter-query"
              placeholder="메시지 또는 실행자 검색"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-filter-type">작업 유형 코드</Label>
            <Input
              id="audit-filter-type"
              placeholder="users.update"
              value={draftType}
              onChange={(e) => setDraftType(e.target.value)}
            />
          </div>
          <Button onClick={applyFilters} className="self-end gap-2">
            <Search className="h-4 w-4" />
            검색
          </Button>
          <Button variant="outline" onClick={resetFilters} className="self-end">
            초기화
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_TYPE_FILTERS.map((filter) => (
            <Button
              key={filter.label}
              type="button"
              size="sm"
              variant={state.type === filter.value ? "default" : "ghost"}
              onClick={() => applyQuickTypeFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </AdminPageSection>

      {error && (
        <div className={`${adminSurface.cardMuted} p-5 ${adminTypography.body} text-destructive`}>
          감사 로그를 불러오지 못했습니다.
        </div>
      )}

      {!error && !data && (
        <div
          className={`${adminSurface.cardMuted} p-5 ${adminTypography.body} text-muted-foreground`}
        >
          불러오는 중...
        </div>
      )}

      {!!data && data.items.length === 0 && (
        <div
          className={`${adminSurface.cardMuted} p-5 ${adminTypography.body} text-muted-foreground`}
        >
          조회 결과가 없습니다.
        </div>
      )}

      {!!data && data.items.length > 0 && (
        <AdminPageSection
          title="감사 로그 목록"
          description={`총 ${data.total.toLocaleString("ko-KR")}건 · ${data.page}/${data.totalPages} 페이지`}
          icon={ClipboardList}
          contentClassName="p-0"
        >
          <Table className="min-w-[900px] table-fixed">
            <TableHeader className={adminSurface.tableHeader}>
              <TableRow className={adminDataTable.row}>
                <TableHead className={cn(adminDataTable.head, "w-[34%]")}>작업</TableHead>
                <TableHead className={cn(adminDataTable.head, "w-[20%]")}>실행자</TableHead>
                <TableHead className={cn(adminDataTable.head, "w-[16%]")}>대상</TableHead>
                <TableHead className={cn(adminDataTable.headRight, "w-[18%]")}>일시</TableHead>
                <TableHead className={cn(adminDataTable.headRight, "w-[12%]")}>상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => {
                const actionName = AUDIT_TYPE_LABELS[item.type] || item.message?.trim() || item.type;

                return (
                  <TableRow key={item.id} className={adminDataTable.compactRow}>
                    <TableCell className={adminDataTable.cellCompact}>
                      <div className={adminDataTable.cellStack}>
                        <div className={adminDataTable.primaryLine}>{actionName}</div>
                        <div className={adminDataTable.secondaryLine}>{item.type}</div>
                      </div>
                    </TableCell>
                    <TableCell className={adminDataTable.cellCompact}>
                      <span title={item.actorTitle} className={adminDataTable.primaryLine}>
                        {item.actor}
                      </span>
                    </TableCell>
                    <TableCell className={adminDataTable.cellCompact}>
                      <span className={adminDataTable.secondaryLine} title={item.targetId ?? undefined}>
                        {item.targetId
                          ? `${item.targetId.slice(0, 8)}${item.targetId.length > 8 ? "…" : ""}`
                          : "없음"}
                      </span>
                    </TableCell>
                    <TableCell className={cn(adminDataTable.dateCell, "py-2.5")}>
                      <time dateTime={item.createdAt ?? undefined}>
                        {formatDateTime(item.createdAt)}
                      </time>
                    </TableCell>
                    <TableCell className={cn(adminDataTable.cellCompact, "text-right")}>
                    <AdminRowDetailsSheet
                      title={actionName}
                      description={`${item.actor} · ${formatDateTime(item.createdAt)}`}
                      trigger={
                        <Button type="button" size="sm" variant="outline" className="h-8">
                          {item.diffSummary?.length ? `변경 ${item.diffSummary.length}건` : "보기"}
                        </Button>
                      }
                    >
                      <dl className="divide-y divide-border rounded-lg border border-border">
                        {[
                          ["감사 ID", item.id],
                          ["작업 코드", item.type],
                          ["실행자 ID", item.actorId],
                          ["대상 ID", item.targetId],
                          ["요청 ID", item.requestId],
                        ].map(([label, value]) => (
                          <div key={label} className="grid grid-cols-[100px_1fr] gap-3 px-4 py-3">
                            <dt className={adminDataTable.secondaryText}>{label}</dt>
                            <dd className="break-all text-sm font-medium text-foreground">
                              {value || "-"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {item.diffSummary?.length ? (
                        <div className="mt-5">
                          <h3 className={adminTypography.sectionTitle}>변경 요약</h3>
                          <ul className="mt-3 space-y-2">
                            {item.diffSummary.map((summary, idx) => (
                              <li
                                key={`${item.id}-detail-${idx}`}
                                className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                              >
                                {summary}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </AdminRowDetailsSheet>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className={`flex items-center justify-between border-t border-border px-4 py-3 ${adminTypography.meta}`}>
            <div className="text-muted-foreground">
              총 {data.total}건 · {data.page}/{data.totalPages} 페이지
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={state.page <= 1 || isValidating}
                onClick={() => setPage(state.page - 1)}
              >
                이전
              </Button>
              <Button
                variant="outline"
                disabled={state.page >= data.totalPages || isValidating}
                onClick={() => setPage(state.page + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </AdminPageSection>
      )}
    </div>
  );
}
