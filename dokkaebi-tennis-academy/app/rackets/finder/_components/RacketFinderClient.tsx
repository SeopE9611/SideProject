'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';

import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RACKET_BRANDS, racketBrandLabel, STRING_PATTERNS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import FinderRacketCard, { type FinderRacket } from '@/app/rackets/finder/_components/FinderRacketCard';
import { X, Search, RotateCcw, SlidersHorizontal, ChevronLeft, ChevronRight, Filter, Sparkles } from 'lucide-react';
import RacketCompareTray from '@/app/rackets/finder/_components/RacketCompareTray';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

type Range = [number, number];
type SortKey = 'createdAt_desc' | 'price_asc' | 'price_desc' | 'swingWeight_asc' | 'swingWeight_desc' | 'weight_asc' | 'weight_desc' | 'stiffnessRa_asc' | 'stiffnessRa_desc';

type Filters = {
  q: string;
  brand: string;
  condition: string;
  sort: SortKey;
  price: Range;
  headSize: Range;
  weight: Range;
  patterns: string[];
  balance: Range;
  lengthIn: Range;
  stiffnessRa: Range;
  swingWeight: Range;
  strict: boolean;
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'createdAt_desc', label: '최신순' },
  { value: 'price_asc', label: '가격 낮은순' },
  { value: 'price_desc', label: '가격 높은순' },
  { value: 'swingWeight_desc', label: '스윙웨이트 높은순' },
  { value: 'swingWeight_asc', label: '스윙웨이트 낮은순' },
  { value: 'weight_desc', label: '무게 높은순' },
  { value: 'weight_asc', label: '무게 낮은순' },
  { value: 'stiffnessRa_desc', label: '강성(RA) 높은순' },
  { value: 'stiffnessRa_asc', label: '강성(RA) 낮은순' },
];

const DEFAULT: Filters = {
  q: '',
  brand: '',
  condition: '',
  sort: 'createdAt_desc',
  price: [0, 600000],
  headSize: [85, 115],
  weight: [240, 360],
  patterns: [],
  balance: [300, 370],
  lengthIn: [25, 29],
  stiffnessRa: [50, 80],
  swingWeight: [250, 380],
  strict: false,
};

function normalizePattern(p: string) {
  return p.replace(/\s+/g, '').replace(/×/g, 'x').toLowerCase();
}

function buildQuery(f: Filters, page: number, pageSize: number) {
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  sp.set('pageSize', String(pageSize));

  if (f.q?.trim()) sp.set('q', f.q.trim());
  if (f.brand) sp.set('brand', f.brand);
  if (f.condition) sp.set('condition', f.condition);
  if (f.strict) sp.set('strict', '1');

  if (f.sort && f.sort !== DEFAULT.sort) sp.set('sort', f.sort);

  sp.set('minPrice', String(f.price[0]));
  sp.set('maxPrice', String(f.price[1]));

  sp.set('minHeadSize', String(f.headSize[0]));
  sp.set('maxHeadSize', String(f.headSize[1]));

  sp.set('minWeight', String(f.weight[0]));
  sp.set('maxWeight', String(f.weight[1]));

  sp.set('minBalance', String(f.balance[0]));
  sp.set('maxBalance', String(f.balance[1]));

  sp.set('minLengthIn', String(f.lengthIn[0]));
  sp.set('maxLengthIn', String(f.lengthIn[1]));

  sp.set('minStiffnessRa', String(f.stiffnessRa[0]));
  sp.set('maxStiffnessRa', String(f.stiffnessRa[1]));

  sp.set('minSwingWeight', String(f.swingWeight[0]));
  sp.set('maxSwingWeight', String(f.swingWeight[1]));

  for (const p of f.patterns) sp.append('pattern', normalizePattern(p));
  return sp.toString();
}

function RangeField({ label, value, min, max, step, suffix, onChange }: { label: string; value: Range; min: number; max: number; step: number; suffix?: string; onChange: (v: Range) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold text-primary tabular-nums">
          {value[0].toLocaleString()}
          {suffix ?? ''} ~ {value[1].toLocaleString()}
          {suffix ?? ''}
        </span>
      </div>
      <Slider value={value} min={min} max={max} step={step} onValueChange={(v) => onChange([v[0], v[1]])} className="py-1" />
    </div>
  );
}

function SectionLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 pb-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</span>
    </div>
  );
}

export default function RacketFinderClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const didInitFromQueryRef = useRef(false);
  const [draft, setDraft] = useState<Filters>(DEFAULT);
  const [applied, setApplied] = useState<Filters>(DEFAULT);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [hasSearched, setHasSearched] = useState(false);
  const ALL = '__all__';

  const syncUrl = (f: Filters, nextPage: number) => {
    const nextQs = buildQuery(f, nextPage, pageSize);
    router.replace(`${pathname}?${nextQs}`, { scroll: false });
  };

  useEffect(() => {
    if (didInitFromQueryRef.current) return;
    didInitFromQueryRef.current = true;

    const sp = searchParams;
    const hasAnyQuery = sp.toString().length > 0;
    if (!hasAnyQuery) return;

    const readNum = (k: string): number | null => {
      const v = sp.get(k);
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const readRange = (minK: string, maxK: string, fallback: Range): Range => {
      const min = readNum(minK);
      const max = readNum(maxK);
      return [min ?? fallback[0], max ?? fallback[1]];
    };

    const next: Filters = { ...DEFAULT };

    const brand = sp.get('brand');
    if (brand) next.brand = brand.toLowerCase();

    const condition = sp.get('condition') ?? sp.get('cond');
    if (condition) next.condition = condition.toUpperCase();
    const q = sp.get('q');
    if (q) next.q = q;

    const patterns = sp.getAll('pattern').map(normalizePattern).filter(Boolean);
    if (patterns.length) next.patterns = patterns;

    const sort = sp.get('sort');
    if (sort) {
      const ok = SORT_OPTIONS.some((o) => o.value === (sort as SortKey));
      if (ok) next.sort = sort as SortKey;
    }

    const strict = sp.get('strict');
    if (strict === '1') next.strict = true;
    if (strict === '0') next.strict = false;

    next.price = readRange('minPrice', 'maxPrice', next.price);
    next.headSize = readRange('minHeadSize', 'maxHeadSize', next.headSize);
    next.weight = readRange('minWeight', 'maxWeight', next.weight);
    next.balance = readRange('minBalance', 'maxBalance', next.balance);
    next.lengthIn = readRange('minLengthIn', 'maxLengthIn', next.lengthIn);
    next.stiffnessRa = readRange('minStiffnessRa', 'maxStiffnessRa', next.stiffnessRa);
    next.swingWeight = readRange('minSwingWeight', 'maxSwingWeight', next.swingWeight);

    const p = readNum('page');
    if (p && p > 0) setPage(Math.floor(p));

    setDraft(next);
    setApplied(next);
    setHasSearched(true);
  }, [searchParams]);

  const qs = useMemo(() => buildQuery(applied, page, pageSize), [applied, page, pageSize]);
  const swrKey = hasSearched ? `/api/rackets/finder?${qs}` : null;
  const { data, error, isLoading } = useSWR(swrKey, fetcher);

  const items = (data?.items ?? []) as FinderRacket[];
  const total = Number(data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const apply = () => {
    const next = draft;
    setApplied(next);
    setPage(1);
    setHasSearched(true);
    syncUrl(next, 1);
  };
  const reset = () => {
    setDraft(DEFAULT);
    setApplied(DEFAULT);
    setPage(1);
    setHasSearched(false);
    router.replace(pathname, { scroll: false });
  };

  const applyNow = (next: Filters) => {
    setDraft(next);
    setApplied(next);
    setPage(1);
    setHasSearched(true);
    syncUrl(next, 1);
  };

  const chips = useMemo(() => {
    if (!hasSearched) return [];

    const rangeEq = (a: Range, b: Range) => a[0] === b[0] && a[1] === b[1];
    const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1))));
    const fmtWon = (n: number) => `${n.toLocaleString()}원`;

    const list: { id: string; text: string; onRemove: () => void }[] = [];
    const add = (id: string, text: string, next: Filters) => {
      list.push({ id, text, onRemove: () => applyNow(next) });
    };

    if (applied.q.trim()) add('q', `키워드: ${applied.q.trim()}`, { ...applied, q: '' });
    if (applied.brand) add('brand', `브랜드: ${racketBrandLabel(applied.brand)}`, { ...applied, brand: '' });
    if (applied.condition) add('condition', `컨디션: ${applied.condition}`, { ...applied, condition: '' });
    if (applied.strict) add('strict', '정확도 모드: ON', { ...applied, strict: false });

    if (!rangeEq(applied.price, DEFAULT.price))
      add('price', `가격: ${fmtWon(applied.price[0])} ~ ${fmtWon(applied.price[1])}`, {
        ...applied,
        price: DEFAULT.price,
      });
    if (!rangeEq(applied.headSize, DEFAULT.headSize))
      add('head', `헤드: ${applied.headSize[0]} ~ ${applied.headSize[1]} sq.in`, {
        ...applied,
        headSize: DEFAULT.headSize,
      });
    if (!rangeEq(applied.weight, DEFAULT.weight)) add('weight', `무게: ${applied.weight[0]} ~ ${applied.weight[1]} g`, { ...applied, weight: DEFAULT.weight });
    if (!rangeEq(applied.balance, DEFAULT.balance))
      add('balance', `밸런스: ${applied.balance[0]} ~ ${applied.balance[1]} mm`, {
        ...applied,
        balance: DEFAULT.balance,
      });
    if (!rangeEq(applied.lengthIn, DEFAULT.lengthIn))
      add('length', `길이: ${fmtNum(applied.lengthIn[0])} ~ ${fmtNum(applied.lengthIn[1])} in`, {
        ...applied,
        lengthIn: DEFAULT.lengthIn,
      });
    if (!rangeEq(applied.stiffnessRa, DEFAULT.stiffnessRa))
      add('ra', `강성(RA): ${applied.stiffnessRa[0]} ~ ${applied.stiffnessRa[1]}`, {
        ...applied,
        stiffnessRa: DEFAULT.stiffnessRa,
      });
    if (!rangeEq(applied.swingWeight, DEFAULT.swingWeight))
      add('sw', `스윙웨이트(SW): ${applied.swingWeight[0]} ~ ${applied.swingWeight[1]}`, {
        ...applied,
        swingWeight: DEFAULT.swingWeight,
      });

    for (const p of applied.patterns) {
      const display = STRING_PATTERNS.find((x) => normalizePattern(x) === p) ?? p;
      add(`pattern:${p}`, `패턴: ${display}`, { ...applied, patterns: applied.patterns.filter((x) => x !== p) });
    }

    return list;
  }, [applied, hasSearched]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">라켓 파인더</h1>
            <p className="text-sm text-muted-foreground">스펙 범위로 원하는 중고 라켓을 빠르게 찾아보세요</p>
          </div>
        </div>
      </div>

      <div className="bp-lg:grid bp-lg:grid-cols-[320px_1fr] bp-lg:gap-8 space-y-6 bp-lg:space-y-0">
        <aside className="h-fit rounded-2xl bg-muted/30 p-5 dark:bg-muted/10 ring-1 ring-muted/50 dark:ring-muted/20">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">필터</span>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="mr-1 h-3 w-3" />
              초기화
            </Button>
          </div>

          <div className="space-y-6">
            {/* 검색어 */}
            <div className="space-y-2">
              <SectionLabel>모델/키워드 검색</SectionLabel>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={draft.q} onChange={(e) => setDraft((p) => ({ ...p, q: e.target.value }))} placeholder="예) ezone, vcore, blade..." className="pl-9 bg-background/50 dark:bg-background/30 focus-visible:ring-primary/50" />
              </div>
            </div>

            {/* 브랜드 & 컨디션 */}
            <div className="space-y-3">
              <SectionLabel>브랜드 / 컨디션</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Select value={draft.brand || undefined} onValueChange={(v) => setDraft((p) => ({ ...p, brand: v === ALL ? '' : v }))}>
                  <SelectTrigger className="bg-background/50 dark:bg-background/30 focus:ring-primary/50">
                    <SelectValue placeholder="전체 브랜드" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>전체</SelectItem>
                    {RACKET_BRANDS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={draft.condition || undefined} onValueChange={(v) => setDraft((p) => ({ ...p, condition: v === ALL ? '' : v }))}>
                  <SelectTrigger className="bg-background/50 dark:bg-background/30 focus:ring-primary/50">
                    <SelectValue placeholder="전체 컨디션" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>전체</SelectItem>
                    <SelectItem value="A">A (최상)</SelectItem>
                    <SelectItem value="B">B (상)</SelectItem>
                    <SelectItem value="C">C (보통)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 기본 스펙 슬라이더 */}
            <div className="space-y-4">
              <SectionLabel>기본 스펙</SectionLabel>
              <RangeField label="가격" value={draft.price} min={0} max={600000} step={10000} suffix="원" onChange={(v) => setDraft((p) => ({ ...p, price: v }))} />
              <RangeField label="헤드 사이즈" value={draft.headSize} min={80} max={120} step={1} suffix=" sq.in" onChange={(v) => setDraft((p) => ({ ...p, headSize: v }))} />
              <RangeField label="무게" value={draft.weight} min={200} max={380} step={1} suffix="g" onChange={(v) => setDraft((p) => ({ ...p, weight: v }))} />
            </div>

            {/* 스트링 패턴 */}
            <div className="space-y-3">
              <SectionLabel>스트링 패턴</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {STRING_PATTERNS.map((p) => {
                  const key = normalizePattern(p);
                  const checked = draft.patterns.includes(key);
                  return (
                    <label
                      key={p}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
                        'bg-background/50 dark:bg-background/30 hover:bg-background/80 dark:hover:bg-background/50',
                        checked && 'bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/30'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setDraft((prev) => {
                            const set = new Set(prev.patterns);
                            if (v) set.add(key);
                            else set.delete(key);
                            return { ...prev, patterns: Array.from(set) };
                          });
                        }}
                      />
                      <span className={cn(checked && 'font-medium text-primary')}>{p}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 상세 검색 */}
            <div className="space-y-4 pt-4 border-t border-muted/50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">상세 검색</span>
              </div>

              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all',
                  'bg-background/50 dark:bg-background/30 hover:bg-background/80 dark:hover:bg-background/50',
                  draft.strict && 'bg-amber-500/10 dark:bg-amber-500/20 ring-1 ring-amber-500/30'
                )}
              >
                <Checkbox checked={draft.strict} onCheckedChange={(v) => setDraft((p) => ({ ...p, strict: !!v }))} />
                <div className="flex-1">
                  <div className={cn('text-sm font-medium', draft.strict && 'text-amber-600 dark:text-amber-400')}>정확도 모드</div>
                  <div className="text-xs text-muted-foreground">스펙 누락 상품 제외</div>
                </div>
                {draft.strict && <Sparkles className="h-4 w-4 text-amber-500" />}
              </label>

              <div className="space-y-4">
                <RangeField label="밸런스" value={draft.balance} min={280} max={380} step={1} suffix="mm" onChange={(v) => setDraft((p) => ({ ...p, balance: v }))} />
                <RangeField label="길이" value={draft.lengthIn} min={25} max={29} step={0.1} suffix=" in" onChange={(v) => setDraft((p) => ({ ...p, lengthIn: v }))} />
                <RangeField label="강성 (RA)" value={draft.stiffnessRa} min={45} max={80} step={1} suffix="" onChange={(v) => setDraft((p) => ({ ...p, stiffnessRa: v }))} />
                <RangeField label="스윙웨이트 (SW)" value={draft.swingWeight} min={250} max={390} step={1} suffix="" onChange={(v) => setDraft((p) => ({ ...p, swingWeight: v }))} />
              </div>
            </div>

            {/* 검색 버튼 */}
            <Button className="w-full h-11 font-semibold" onClick={apply}>
              <Search className="mr-2 h-4 w-4" />
              검색하기
            </Button>
          </div>
        </aside>

        {/* Results */}
        <div className="space-y-5">
          {hasSearched && chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <div key={c.id} className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 dark:bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 dark:hover:bg-primary/30">
                  <span className="max-w-[200px] truncate">{c.text}</span>
                  <button type="button" onClick={c.onRemove} className="inline-flex h-4 w-4 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100 hover:bg-primary/20" aria-label={`${c.text} 제거`}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
            <div className="flex items-center gap-3">
              {hasSearched ? (
                <>
                  <Badge variant="secondary" className="rounded-lg bg-primary/10 text-primary dark:bg-primary/20 px-3 py-1 font-semibold">
                    {total.toLocaleString()}개
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    페이지 {page} / {totalPages}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">필터를 선택하고 검색 버튼을 눌러주세요</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasSearched && (
                <Select
                  value={applied.sort}
                  onValueChange={(v) => {
                    const ok = SORT_OPTIONS.some((o) => o.value === (v as SortKey));
                    if (!ok) return;
                    applyNow({ ...applied, sort: v as SortKey });
                  }}
                >
                  <SelectTrigger className="w-[160px] bg-background/80 dark:bg-muted/30 focus:ring-primary/50">
                    <SelectValue placeholder="정렬" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!hasSearched || page <= 1}
                  onClick={() => {
                    const nextPage = Math.max(1, page - 1);
                    setPage(nextPage);
                    syncUrl(applied, nextPage);
                  }}
                  className="h-9 w-9 rounded-r-none"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!hasSearched || page >= totalPages}
                  onClick={() => {
                    const nextPage = Math.min(totalPages, page + 1);
                    setPage(nextPage);
                    syncUrl(applied, nextPage);
                  }}
                  className="h-9 w-9 rounded-l-none"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {error && <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">조회 중 오류가 발생했습니다.</div>}

          {!hasSearched ? (
            <div className="rounded-2xl bg-muted/30 dark:bg-muted/10 ring-1 ring-muted/50 dark:ring-muted/20 p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/20">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">검색을 시작해보세요</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                왼쪽 필터에서 원하는 스펙 범위를 설정하고 <span className="font-medium text-foreground">검색하기</span> 버튼을 눌러주세요. 정확도 모드를 활성화하면 스펙 정보가 누락된 라켓은 제외됩니다.
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-muted/30 dark:bg-muted/10 p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-28 w-28 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-48" />
                      <div className="grid grid-cols-2 gap-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-destructive/10 p-6 text-center">
              <p className="text-sm text-destructive">데이터를 불러오지 못했습니다. 콘솔/네트워크 탭에서 응답을 확인해주세요.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl bg-muted/30 dark:bg-muted/10 ring-1 ring-muted/50 dark:ring-muted/20 p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">검색 결과 없음</h3>
              <p className="text-sm text-muted-foreground">조건에 맞는 라켓이 없습니다. 필터 범위를 완화하거나 정확도 모드를 끄고 다시 시도해보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((r) => (
                <FinderRacketCard key={r.id} racket={r} />
              ))}
            </div>
          )}
        </div>
      </div>
      <RacketCompareTray />
    </div>
  );
}
