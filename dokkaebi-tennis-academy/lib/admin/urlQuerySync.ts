import type { ReadonlyURLSearchParams } from 'next/navigation';

export function getValidatedQueryParam(sp: ReadonlyURLSearchParams, key: string, validate: (value: string) => boolean): string | null {
  const raw = sp.get(key);
  if (!raw) return null;
  return validate(raw) ? raw : null;
}

export function buildQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all' || value === false) return;
    qs.set(key, String(value));
  });
  return qs.toString();
}

export function replaceQueryUrl(pathname: string, queryString: string, replace: (url: string) => void) {
  replace(queryString ? `${pathname}?${queryString}` : pathname);
}
