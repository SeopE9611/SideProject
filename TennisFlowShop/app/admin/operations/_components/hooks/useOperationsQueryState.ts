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
  page: number;
};

export function initOperationsStateFromQuery(
  sp: ReadonlyURLSearchParams,
  setters: {
    setQ: (v: string) => void;
    setKind: (v: 'all' | Kind) => void;
    setFlow: (v: FlowValue) => void;
    setIntegrated: (v: IntegratedValue) => void;
    setOnlyWarn: (v: boolean) => void;
    setPage: (v: number) => void;
  },
) {
  const k = (sp.get('kind') as 'all' | Kind) ?? 'all';
  const f = (sp.get('flow') as FlowValue) ?? 'all';
  const i = (sp.get('integrated') as IntegratedValue) ?? 'all';
  const query = sp.get('q') ?? '';
  const warn = sp.get('warn');
  const p = Number(sp.get('page') ?? 1);

  if (k === 'all' || k === 'order' || k === 'stringing_application' || k === 'rental') setters.setKind(k);
  if (f === 'all' || ['1', '2', '3', '4', '5', '6', '7'].includes(f)) setters.setFlow(f);
  if (i === 'all' || i === '1' || i === '0') setters.setIntegrated(i);
  if (query) setters.setQ(query);
  if (warn === '1') setters.setOnlyWarn(true);
  if (!Number.isNaN(p) && p > 0) setters.setPage(p);
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
  const { q, kind, flow, integrated, onlyWarn, page } = params;

  useEffect(() => {
    const t = setTimeout(() => {
      const queryString = buildQueryString({
        q,
        kind,
        flow,
        integrated,
        page: page === 1 ? undefined : page,
        warn: onlyWarn ? '1' : undefined,
      });
      replaceQueryUrl(pathname, queryString, replace);
    }, 200);
    return () => clearTimeout(t);
  }, [q, kind, flow, integrated, onlyWarn, page, pathname, replace]);
}
