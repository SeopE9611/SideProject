'use client';
import { useMemo, useState } from 'react';
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

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

type Range = [number, number];
type Filters = {
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
  const [draft, setDraft] = useState<Filters>(DEFAULT);
  const [applied, setApplied] = useState<Filters>(DEFAULT);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const ALL = '__all__';
  const qs = useMemo(() => buildQuery(applied, page, pageSize), [applied, page]);
  const { data, isLoading, error } = useSWR(`/api/rackets/finder?${qs}`, fetcher);

  const items = (data?.items ?? []) as any[];
  const total = Number(data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const apply = () => {
    setApplied(draft);
    setPage(1);
  };
  const reset = () => {
    setDraft(DEFAULT);
    setApplied(DEFAULT);
    setPage(1);
  };

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
                    <SelectValue placeholder="전체" />
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
                <Checkbox
                  checked={draft.strict}
                  onCheckedChange={(v) => setDraft((p) => ({ ...p, strict: !!v }))}
                />
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">총 {total}개</Badge>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages} 페이지
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                이전
              </Button>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                다음
              </Button>
            </div>
          </div>

          {error && (
            <Card>
              <CardContent className="p-4 text-sm text-red-500">조회 중 오류가 발생했습니다.</CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 bp-md:grid-cols-3 bp-lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 bp-md:grid-cols-3 bp-lg:grid-cols-4 gap-4">
              {items.map((r) => (
                <RacketCard key={r.id} racket={r} viewMode="grid" brandLabel={racketBrandLabel(r.brand)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
