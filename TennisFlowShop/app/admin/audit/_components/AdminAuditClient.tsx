"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { useAdminListQueryState } from "@/lib/admin/useAdminListQueryState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import {
  AdminListBody,
  AdminListCell,
  AdminListColumnHeader,
  AdminListPrimary,
  AdminListRow,
  AdminListTable,
  AdminRowActions,
} from "@/components/admin/AdminListTable";
import { Search } from "lucide-react";
import AdminRowDetailsSheet from "@/components/admin/AdminRowDetailsSheet";
import { adminDataTable } from "@/components/admin/AdminDataTable";
import { adminTypography } from "@/components/admin/admin-typography";

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
const AUDIT_LIST_COLUMNS =
  "grid-cols-[minmax(360px,1.4fr)_minmax(320px,1.15fr)_190px_116px]";
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

function getAuditTypeFilterLabel(value: string) {
  if (!value) return "전체 유형";

  const quickFilter = QUICK_TYPE_FILTERS.find((filter) => filter.value === value);
  if (quickFilter) return quickFilter.label;

  return AUDIT_TYPE_LABELS[value] || value;
}

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

  const appliedQuery = state.q.trim();
  const appliedType = state.type.trim();
  const currentTypeLabel = getAuditTypeFilterLabel(appliedType);

  const currentViewLabel = appliedQuery
    ? "검색 결과"
    : appliedType
      ? currentTypeLabel
      : "전체 로그";

  const isInitialLoading = !data && !error;
  const hasAppliedFilters = Boolean(appliedQuery || appliedType);

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
      <AdminFilterBar
        actions={
          <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
            초기화
          </Button>
        }
        quickFilters={
          <>
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
          </>
        }
        activeFilters={
          <>
            <span className="font-medium text-foreground/80">
              작업 유형: {currentTypeLabel}
            </span>
            {appliedQuery ? <span>검색어: {appliedQuery}</span> : null}
            <span className="tabular-nums">
              조회 결과: {data ? `${data.total.toLocaleString("ko-KR")}건` : "-"}
            </span>
          </>
        }
      >
        <form
          className="grid grid-cols-[minmax(0,1fr)_280px_auto] items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="audit-filter-query">메시지 또는 실행자</Label>
            <Input
              id="audit-filter-query"
              placeholder="메시지 또는 실행자 검색"
              value={draftQ}
              onChange={(event) => setDraftQ(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-filter-type">작업 유형 코드</Label>
            <Input
              id="audit-filter-type"
              placeholder="users.update"
              value={draftType}
              onChange={(event) => setDraftType(event.target.value)}
            />
          </div>
          <Button type="submit" className="gap-2">
            <Search className="h-4 w-4" />
            검색
          </Button>
        </form>
      </AdminFilterBar>

      <AdminListTable
        title="감사 로그 목록"
        viewLabel={currentViewLabel}
        resultLabel={
          error
            ? "불러오기 실패"
            : data
              ? `총 ${data.total.toLocaleString("ko-KR")}건`
              : "불러오는 중…"
        }
        description="관리자 작업, 실행자와 대상, 발생 일시 및 변경 상세를 한 행에서 확인합니다."
        columnsClassName={AUDIT_LIST_COLUMNS}
        ariaLabel="관리자 감사 로그 목록"
      >
        <AdminListColumnHeader columnsClassName={AUDIT_LIST_COLUMNS}>
          <div role="columnheader" className="min-w-0 px-4 py-2.5">
            작업
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5">
            실행자 / 대상
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5 text-right">
            일시
          </div>
          <div role="columnheader" className="min-w-0 px-2 py-2.5 text-right">
            상세
          </div>
        </AdminListColumnHeader>

        <AdminListBody>
          {error ? (
            <AdminListRow columnsClassName={AUDIT_LIST_COLUMNS} ariaLabel="감사 로그 목록 오류">
              <AdminListCell className="col-span-4 py-10 text-center text-destructive">
                감사 로그를 불러오지 못했습니다.
              </AdminListCell>
            </AdminListRow>
          ) : isInitialLoading ? (
            Array.from({ length: 6 }).map((_, rowIndex) => (
              <AdminListRow
                key={`audit-loading-${rowIndex}`}
                columnsClassName={AUDIT_LIST_COLUMNS}
                ariaLabel="감사 로그 불러오는 중"
              >
                <AdminListCell>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </AdminListCell>
                <AdminListCell>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </AdminListCell>
                <AdminListCell align="end">
                  <Skeleton className="h-4 w-36" />
                </AdminListCell>
                <AdminListCell align="end" className="px-2">
                  <Skeleton className="h-8 w-20" />
                </AdminListCell>
              </AdminListRow>
            ))
          ) : !data?.items.length ? (
            <AdminListRow columnsClassName={AUDIT_LIST_COLUMNS} ariaLabel="감사 로그 없음">
              <AdminListCell className="col-span-4 py-16 text-center">
                {hasAppliedFilters
                  ? "현재 조건에 맞는 감사 로그가 없습니다."
                  : "기록된 감사 로그가 없습니다."}
              </AdminListCell>
            </AdminListRow>
          ) : (
            data.items.map((item) => {
                const actionName = AUDIT_TYPE_LABELS[item.type] || item.message?.trim() || item.type;
                const message = item.message?.trim();
                const supportingMessage =
                  message && message !== actionName ? message : undefined;

                return (
                  <AdminListRow key={item.id} columnsClassName={AUDIT_LIST_COLUMNS}>
                    <AdminListCell>
                      <AdminListPrimary
                        title={actionName}
                        meta={<span>{item.type}</span>}
                        supporting={supportingMessage}
                      />
                    </AdminListCell>
                    <AdminListCell>
                      <AdminListPrimary
                        title={<span title={item.actorTitle}>{item.actor}</span>}
                        meta={
                          <span title={item.targetId ?? undefined}>
                            대상 {item.targetId || "없음"}
                          </span>
                        }
                      />
                    </AdminListCell>
                    <AdminListCell align="end">
                      <time
                        dateTime={item.createdAt ?? undefined}
                        className="whitespace-nowrap tabular-nums"
                      >
                        {formatDateTime(item.createdAt)}
                      </time>
                    </AdminListCell>
                    <AdminListCell align="end" className="px-2">
                      <AdminRowActions>
                        <AdminRowDetailsSheet
                          title={actionName}
                          description={`${item.actor} · ${formatDateTime(item.createdAt)}`}
                          trigger={
                            <Button type="button" size="sm" variant="outline">
                              {item.diffSummary?.length
                                ? `변경 ${item.diffSummary.length}건`
                                : "보기"}
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
                      </AdminRowActions>
                    </AdminListCell>
                  </AdminListRow>
                );
              })
          )}
        </AdminListBody>

        <div role="rowgroup" className="border-t border-border">
          <div role="row">
            <div
              role="cell"
              aria-colspan={4}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className={adminTypography.metaMuted}>
                총 {data?.total.toLocaleString("ko-KR") ?? 0}건 · {" "}
                {data?.page ?? state.page}/{data?.totalPages ?? 1}페이지
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!data || state.page <= 1 || isValidating}
                  onClick={() => setPage(state.page - 1)}
                >
                  이전
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!data || state.page >= data.totalPages || isValidating}
                  onClick={() => setPage(state.page + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AdminListTable>
    </div>
  );
}
