'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RACKET_BRANDS, racketBrandLabel, STRING_PATTERNS } from '@/lib/constants';
import RacketCard from '@/app/rackets/_components/RacketCard';
import { Input } from '@/components/ui/input';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import FinderRacketCard, { FinderRacket } from '@/app/rackets/finder/_components/FinderRacketCard';
import { X } from 'lucide-react';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

type Range = [number, number];
type Filters = {
  q: string; // 모델명/키워드 검색
  brand: string; // 단일 브랜드(초기 버전)
  condition: string; // '', 'A','B','C'
  price: Range; // won
  headSize: Range; // sq.in
  weight: Range; // g
  patterns: string[]; // '16x19' ...
  // 상세(2단계에서 같이)
  balance: Range; // mm
  lengthIn: Range; // inch
  stiffnessRa: Range; // RA
  swingWeight: Range; // SW
  strict: boolean; // 스펙 누락 제외(정확도 모드)
};

const DEFAULT: Filters = {
  q: '',
  brand: '',
  condition: '',
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

  sp.set('minPrice', String(f.price[0]));
  sp.set('maxPrice', String(f.price[1]));

  sp.set('minHeadSize', String(f.headSize[0]));
  sp.set('maxHeadSize', String(f.headSize[1]));

  sp.set('minWeight', String(f.weight[0]));
  sp.set('maxWeight', String(f.weight[1]));

  // 상세
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
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value[0]}
          {suffix ?? ''} ~ {value[1]}
          {suffix ?? ''}
        </span>
      </div>
      <Slider value={value} min={min} max={max} step={step} onValueChange={(v) => onChange([v[0], v[1]])} />
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

  // /rackets → /rackets/finder 로 넘어올 때 쿼리(brand/condition/q/가격 등) 프리필 + 자동검색
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
    syncUrl(next, 1); // 검색 누르는 순간 URL에 저장
  };
  const reset = () => {
    setDraft(DEFAULT);
    setApplied(DEFAULT);
    setPage(1);
    setHasSearched(false);
    router.replace(pathname, { scroll: false });
  };

  const applyNow = (next: Filters) => {
    // 상단 요약 칩(X) 제거는 "즉시 적용" UX로 동작하게 처리
    // - applied/draft를 동시에 맞춤
    // - 페이지를 1로 리셋
    // - URL도 같은 조건으로 동기화.
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

    // 텍스트 검색(q)
    if (applied.q.trim()) add('q', `키워드: ${applied.q.trim()}`, { ...applied, q: '' });
    // 브랜드/컨디션
    if (applied.brand) add('brand', `브랜드: ${racketBrandLabel(applied.brand)}`, { ...applied, brand: '' });
    if (applied.condition) add('condition', `컨디션: ${applied.condition}`, { ...applied, condition: '' });
    // 정확도 모드
    if (applied.strict) add('strict', '정확도 모드: ON', { ...applied, strict: false });

    // 범위형 필터(기본값과 다를 때만 표시)
    if (!rangeEq(applied.price, DEFAULT.price)) add('price', `가격: ${fmtWon(applied.price[0])} ~ ${fmtWon(applied.price[1])}`, { ...applied, price: DEFAULT.price });
    if (!rangeEq(applied.headSize, DEFAULT.headSize)) add('head', `헤드: ${applied.headSize[0]} ~ ${applied.headSize[1]} sq.in`, { ...applied, headSize: DEFAULT.headSize });
    if (!rangeEq(applied.weight, DEFAULT.weight)) add('weight', `무게: ${applied.weight[0]} ~ ${applied.weight[1]} g`, { ...applied, weight: DEFAULT.weight });
    if (!rangeEq(applied.balance, DEFAULT.balance)) add('balance', `밸런스: ${applied.balance[0]} ~ ${applied.balance[1]} mm`, { ...applied, balance: DEFAULT.balance });
    if (!rangeEq(applied.lengthIn, DEFAULT.lengthIn)) add('length', `길이: ${fmtNum(applied.lengthIn[0])} ~ ${fmtNum(applied.lengthIn[1])} in`, { ...applied, lengthIn: DEFAULT.lengthIn });
    if (!rangeEq(applied.stiffnessRa, DEFAULT.stiffnessRa)) add('ra', `강성(RA): ${applied.stiffnessRa[0]} ~ ${applied.stiffnessRa[1]}`, { ...applied, stiffnessRa: DEFAULT.stiffnessRa });
    if (!rangeEq(applied.swingWeight, DEFAULT.swingWeight)) add('sw', `스윙웨이트(SW): ${applied.swingWeight[0]} ~ ${applied.swingWeight[1]}`, { ...applied, swingWeight: DEFAULT.swingWeight });

    // 스트링 패턴은 개별 칩으로 노출(개별 제거)
    for (const p of applied.patterns) {
      const display = STRING_PATTERNS.find((x) => normalizePattern(x) === p) ?? p;
      add(`pattern:${p}`, `패턴: ${display}`, { ...applied, patterns: applied.patterns.filter((x) => x !== p) });
    }

    return list;
  }, [applied, hasSearched]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">라켓 파인더</h1>
        <p className="text-sm text-muted-foreground mt-1">스펙 범위(헤드/무게/밸런스/RA/SW 등)로 중고 라켓을 빠르게 좁혀보는 화면입니다.</p>
      </div>

      <div className="bp-lg:grid bp-lg:grid-cols-[340px_1fr] bp-lg:gap-6 space-y-6 bp-lg:space-y-0">
        {/* Filter */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">필터</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 텍스트 검색(q) */}
            <div className="space-y-2">
              <div className="text-sm font-medium">모델/키워드</div>
              <Input value={draft.q} onChange={(e) => setDraft((p) => ({ ...p, q: e.target.value }))} placeholder="예) ezone, vcore, blade, 라켓모델1 ..." />
              <div className="text-xs text-muted-foreground">모델명 또는 등록한 검색 키워드(searchKeywords)를 기준으로 찾습니다.</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">브랜드</div>
                <Select value={draft.brand || undefined} onValueChange={(v) => setDraft((p) => ({ ...p, brand: v === ALL ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
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
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">컨디션</div>
                <Select value={draft.condition || undefined} onValueChange={(v) => setDraft((p) => ({ ...p, condition: v === ALL ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>전체</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <RangeField label="가격" value={draft.price} min={0} max={600000} step={10000} suffix="원" onChange={(v) => setDraft((p) => ({ ...p, price: v }))} />
            <RangeField label="헤드 사이즈" value={draft.headSize} min={80} max={120} step={1} suffix="" onChange={(v) => setDraft((p) => ({ ...p, headSize: v }))} />
            <RangeField label="무게" value={draft.weight} min={200} max={380} step={1} suffix="g" onChange={(v) => setDraft((p) => ({ ...p, weight: v }))} />

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">스트링 패턴</div>
              <div className="grid grid-cols-2 gap-2">
                {STRING_PATTERNS.map((p) => {
                  const key = normalizePattern(p);
                  const checked = draft.patterns.includes(key);
                  return (
                    <label key={p} className="flex items-center gap-2 text-sm">
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
                      {p}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t space-y-3">
              <div className="text-sm font-medium">상세 검색</div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={draft.strict} onCheckedChange={(v) => setDraft((p) => ({ ...p, strict: !!v }))} />
                스펙 누락 상품 제외(정확도 모드)
              </label>
              <RangeField label="밸런스" value={draft.balance} min={280} max={380} step={1} suffix="mm" onChange={(v) => setDraft((p) => ({ ...p, balance: v }))} />
              <RangeField label="길이" value={draft.lengthIn} min={25} max={29} step={0.1} suffix="in" onChange={(v) => setDraft((p) => ({ ...p, lengthIn: v }))} />
              <RangeField label="강성(RA)" value={draft.stiffnessRa} min={45} max={80} step={1} suffix="" onChange={(v) => setDraft((p) => ({ ...p, stiffnessRa: v }))} />
              <RangeField label="스윙웨이트(SW)" value={draft.swingWeight} min={250} max={390} step={1} suffix="" onChange={(v) => setDraft((p) => ({ ...p, swingWeight: v }))} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={apply}>
                검색
              </Button>
              <Button variant="outline" onClick={reset}>
                초기화
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
                    {hasSearched && chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <div key={c.id} className="inline-flex items-center rounded-full border border-transparent bg-secondary/80 px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  <span className="max-w-[240px] truncate">{c.text}</span>
                  <button
                    type="button"
                    onClick={c.onRemove}
                    className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                    aria-label={`${c.text} 제거`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">총 {total}개</Badge>
              {hasSearched ? (
                <>
                  <span className="font-medium text-foreground">총 {total.toLocaleString()}개</span> / {page} / {totalPages} 페이지
                </>
              ) : (
                <span>
                  필터를 선택한 뒤 <span className="font-medium text-foreground">검색</span>을 눌러 결과를 확인하세요.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!hasSearched || page <= 1}
                onClick={() => {
                  const nextPage = Math.max(1, page - 1);
                  setPage(nextPage);
                  syncUrl(applied, nextPage);
                }}
              >
                이전
              </Button>
              <Button
                variant="outline"
                disabled={!hasSearched || page >= totalPages}
                onClick={() => {
                  const nextPage = Math.min(totalPages, page + 1);
                  setPage(nextPage);
                  syncUrl(applied, nextPage);
                }}
              >
                다음
              </Button>
            </div>
          </div>

          {error && (
            <Card>
              <CardContent className="p-4 text-sm text-red-500">조회 중 오류가 발생했습니다.</CardContent>
            </Card>
          )}

          {/* 검색 전 안내 */}
          {!hasSearched ? (
            <Card>
              <CardHeader>
                <CardTitle>검색 전입니다</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div>
                  왼쪽에서 스펙 범위를 잡고 <span className="font-medium text-foreground">검색</span>을 눌러주세요.
                </div>
                <div>- “정확도 모드”를 켜면 스펙 누락 라켓이 제외됩니다.</div>
                <div>- 데이터가 범위 밖이면(예: 무게 100g) 당연히 결과에서 제외됩니다.</div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-28 w-28 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-5 w-56" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-8 w-40" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-4 text-sm text-destructive">데이터를 불러오지 못했습니다. 콘솔/네트워크 탭에서 응답을 확인해주세요.</CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">조건에 맞는 라켓이 없습니다. 필터 범위를 완화하거나 “정확도 모드”를 끄고 다시 시도해보세요.</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {items.map((r) => (
                <FinderRacketCard key={r.id} racket={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
