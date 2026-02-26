import { buildQueryString, replaceQueryUrl } from '@/lib/admin/urlQuerySync';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import type { Kind } from '../filters/operationsFilters';

type FlowValue = 'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7';
type IntegratedValue = 'all' | '1' | '0';

type Params = {
  q: string;
  kind: 'all' | Kind;
  flow: FlowValue;
  integrated: IntegratedValue;
  onlyWarn: boolean;
  warnFilter: 'all' | 'warn' | 'review' | 'clean';
  warnSort: 'default' | 'warn_first' | 'safe_first';
  page: number;
};

const VALID_KINDS: Array<'all' | Kind> = ['all', 'order', 'stringing_application', 'rental'];
const VALID_FLOWS: FlowValue[] = ['all', '1', '2', '3', '4', '5', '6', '7'];
const VALID_INTEGRATED: IntegratedValue[] = ['all', '1', '0'];
const VALID_WARN_FILTERS: Params['warnFilter'][] = ['all', 'warn', 'review', 'clean'];
const VALID_WARN_SORTS: Params['warnSort'][] = ['default', 'warn_first', 'safe_first'];

function parsePage(value: string | null) {
  if (!value) return 1;
  const parsed = Number(value);
  return !Number.isNaN(parsed) && parsed > 0 ? parsed : 1;
}

export function buildOperationsViewQueryString(params: Params) {
  return buildQueryString({
    q: params.q.trim() || undefined,
    kind: params.kind,
    flow: params.flow,
    integrated: params.integrated,
    warnFilter: params.warnFilter,
    warnSort: params.warnSort,
    page: params.page === 1 ? undefined : params.page,
    warn: params.onlyWarn ? '1' : undefined,
  });
}

export function initOperationsStateFromQuery(
  sp: ReadonlyURLSearchParams,
  setters: {
    setQ: (v: string) => void;
    setKind: (v: 'all' | Kind) => void;
    setFlow: (v: FlowValue) => void;
    setIntegrated: (v: IntegratedValue) => void;
    setOnlyWarn: (v: boolean) => void;
    setWarnFilter: (v: 'all' | 'warn' | 'review' | 'clean') => void;
    setWarnSort: (v: 'default' | 'warn_first' | 'safe_first') => void;
    setPage: (v: number) => void;
  },
) {
  const k = (sp.get('kind') as 'all' | Kind) ?? 'all';
  const f = (sp.get('flow') as FlowValue) ?? 'all';
  const i = (sp.get('integrated') as IntegratedValue) ?? 'all';
  const query = sp.get('q') ?? '';
  const warn = sp.get('warn');
  const warnFilter = (sp.get('warnFilter') as Params['warnFilter']) ?? 'all';
  const warnSort = (sp.get('warnSort') as Params['warnSort']) ?? 'default';
  const p = parsePage(sp.get('page'));

  const nextKind: 'all' | Kind = VALID_KINDS.includes(k) ? k : 'all';
  const nextFlow: FlowValue = VALID_FLOWS.includes(f) ? f : 'all';
  const nextIntegrated: IntegratedValue = VALID_INTEGRATED.includes(i) ? i : 'all';
  const nextOnlyWarn = warn === '1';
  const nextWarnFilter: Params['warnFilter'] = VALID_WARN_FILTERS.includes(warnFilter) ? warnFilter : 'all';
  const normalizedWarnFilter: Params['warnFilter'] = nextOnlyWarn && (nextWarnFilter === 'review' || nextWarnFilter === 'clean') ? 'warn' : nextWarnFilter;
  const nextWarnSort: Params['warnSort'] = VALID_WARN_SORTS.includes(warnSort) ? warnSort : 'default';

  setters.setKind(nextKind);
  setters.setFlow(nextFlow);
  setters.setIntegrated(nextIntegrated);
  setters.setQ(query);
  setters.setOnlyWarn(nextOnlyWarn);
  setters.setWarnFilter(normalizedWarnFilter);
  setters.setWarnSort(nextWarnSort);
  setters.setPage(p);
}

export function useSyncOperationsQuery(params: Params, pathname: string, replace: (url: string) => void) {
  /**
   * TODO: Issue 무한 리렌더(혹은 "무한 URL replace") 방지 포인트
   *
   * - OperationsClient에서 이 훅을 호출할 때 `{ q, kind, ... }` 객체 리터럴을 바로 넘기고 있음
   * - 객체 리터럴은 렌더링마다 "새 참조"가 만들어지므로,
   *   dependency 배열에 `params` 객체를 그대로 넣으면 매 렌더마다 effect가 다시 실행됨
   * - effect가 매번 `router.replace()`를 호출하면 URL 갱신 → searchParams 변경 → 리렌더 → 다시 replace...
   *   형태로 루프가 생길 수 있다.
   *
   * 해결:
   * - dependency를 "객체"가 아니라 "원시 값"(string/number/boolean)으로 분해해서 걸어둠.
   *   그러면 실제 값이 바뀔 때만 effect가 다시 실행됨.
   */
  const { q, kind, flow, integrated, onlyWarn, warnFilter, warnSort, page } = params;

  useEffect(() => {
    const t = setTimeout(() => {
      const queryString = buildOperationsViewQueryString({ q, kind, flow, integrated, onlyWarn, warnFilter, warnSort, page });
      replaceQueryUrl(pathname, queryString, replace);
    }, 200);
    return () => clearTimeout(t);
  }, [q, kind, flow, integrated, onlyWarn, warnFilter, warnSort, page, pathname, replace]);
}
