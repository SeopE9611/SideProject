"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { useAdminListQueryState } from "@/lib/admin/useAdminListQueryState";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

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
const NOTE_TYPE_LABEL: Record<string, string> = {
  "note.create": "내부 메모 작성",
  "note.update": "내부 메모 수정",
  "note.delete": "내부 메모 삭제",
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

  const { state, patchState, setPage } = useAdminListQueryState<{
    page: number;
    q: string;
    type: string;
  }>({
    pathname: pathname || "/admin/audit",
    searchParams,
    replace: router.replace,
    defaults: { page: 1, q: "", type: "" },
    parse: (params, defaults) => ({
      page: Math.max(1, Number.parseInt(params.get("page") || String(defaults.page), 10) || defaults.page),
      q: params.get("q") || defaults.q,
      type: params.get("type") || defaults.type,
    }),
    toQueryParams: (queryState) => ({
      page: queryState.page === 1 ? undefined : queryState.page,
      q: queryState.q.trim() || undefined,
      type: queryState.type.trim() || undefined,
    }),
    pageResetKeys: ["q", "type"],
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
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-[1fr_280px_auto_auto]">
            <Input placeholder="검색어(message/actor)" value={draftQ} onChange={(e) => setDraftQ(e.target.value)} />
            <Input placeholder="type (예: users.update)" value={draftType} onChange={(e) => setDraftType(e.target.value)} />
            <Button onClick={applyFilters} className="gap-2"><Search className="h-4 w-4" />검색</Button>
            <Button variant="outline" onClick={resetFilters}>초기화</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_TYPE_FILTERS.map((filter) => (
              <Button
                key={filter.label}
                type="button"
                size="sm"
                variant={state.type === filter.value ? "default" : "outline"}
                onClick={() => applyQuickTypeFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && <Card><CardContent className="py-6 text-sm text-destructive">감사 로그를 불러오지 못했습니다.</CardContent></Card>}

      {!error && !data && <Card><CardContent className="py-6 text-sm text-muted-foreground">불러오는 중...</CardContent></Card>}

      {!!data && data.items.length === 0 && <Card><CardContent className="py-6 text-sm text-muted-foreground">조회 결과가 없습니다.</CardContent></Card>}

      {!!data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="font-mono text-[11px]">{item.type}</Badge>
                  {NOTE_TYPE_LABEL[item.type] ? <Badge variant="outline">{NOTE_TYPE_LABEL[item.type]}</Badge> : null}
                  <span>{formatDateTime(item.createdAt)}</span>
                  {item.requestId ? <span className="font-mono">req: {item.requestId}</span> : null}
                </div>
                <p className="text-sm font-medium">{item.message || "메시지 없음"}</p>
                <div className="text-sm text-muted-foreground">
                  <span title={item.actorTitle}>{item.actor}</span>
                  <span className="mx-2">·</span>
                  <span title={item.targetId || undefined}>target: {item.targetId || "없음"}</span>
                </div>
                {item.diffSummary && item.diffSummary.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {item.diffSummary.map((summary, idx) => <li key={`${item.id}-s-${idx}`}>{summary}</li>)}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-between pt-2 text-sm">
            <div className="text-muted-foreground">총 {data.total}건 · {data.page}/{data.totalPages} 페이지</div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={state.page <= 1 || isValidating} onClick={() => setPage(state.page - 1)}>이전</Button>
              <Button variant="outline" disabled={state.page >= data.totalPages || isValidating} onClick={() => setPage(state.page + 1)}>다음</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
