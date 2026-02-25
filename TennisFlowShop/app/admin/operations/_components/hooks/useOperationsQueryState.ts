import { useEffect } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { buildQueryString, replaceQueryUrl } from '@/lib/admin/urlQuerySync';
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
  useEffect(() => {
    const t = setTimeout(() => {
      const queryString = buildQueryString({
        q: params.q,
        kind: params.kind,
        flow: params.flow,
        integrated: params.integrated,
        page: params.page === 1 ? undefined : params.page,
        warn: params.onlyWarn ? '1' : undefined,
      });
      replaceQueryUrl(pathname, queryString, replace);
    }, 200);
    return () => clearTimeout(t);
  }, [params, pathname, replace]);
}
