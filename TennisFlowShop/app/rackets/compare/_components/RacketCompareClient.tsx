'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { X, ArrowLeft, Trash2, Info, Scale, AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { gripSizeLabel, racketBrandLabel, stringPatternLabel } from '@/lib/constants';
import { useRacketCompareStore, type CompareRacketItem } from '@/app/store/racketCompareStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import RacketSpecQuickViewDialog from '@/app/rackets/compare/_components/RacketSpecQuickViewDialog';
import { useRouter } from 'next/navigation';

function fmtNum(n?: number | null, suffix = '') {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return `${n}${suffix}`;
}
function fmtPrice(n?: number | null) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return `${n.toLocaleString()}원`;
}

const toNum = (v: unknown): number | null => {
  if (typeof v !== 'number') return null;
  return Number.isFinite(v) ? v : null;
};

const minMax = (nums: Array<number | null>) => {
  const arr = nums.filter((n): n is number => n !== null);
  if (arr.length < 2) return null;
  return { min: Math.min(...arr), max: Math.max(...arr) };
};

const ratio01 = (v: number, min: number, max: number) => {
  if (max === min) return 0.5;
  return (v - min) / (max - min);
};
const fmtFixed = (n: number, decimals = 0) => (decimals > 0 ? n.toFixed(decimals) : String(Math.round(n)));

// finder에서 마지막으로 사용한 URL(쿼리 포함)을 저장해두었다가, 비교 페이지에서 돌아갈 때 복원합니다.
const FINDER_LAST_URL_KEY = 'racketFinder.lastUrl.v1';
const readFinderLastUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(FINDER_LAST_URL_KEY);
  } catch {
    return null;
  }
};

type Row =
  | { key: string; label: string; hint?: string; kind: 'text'; get: (r: CompareRacketItem) => string }
  | {
      key: string;
      label: string;
      hint?: string;
      kind: 'num';
      unit?: string;
      decimals?: number;
      isPrice?: boolean;
      get: (r: CompareRacketItem) => number | null | undefined;
    };

export default function RacketCompareClient() {
  const { items, remove, clear } = useRacketCompareStore();

  const router = useRouter();

  // 파인더로 돌아갈 때: (1) 비교 목록 비우기 → 파인더에서 비교 버튼 비활성, (2) 마지막 Finder URL(쿼리 포함)로 복원
  const goBackToFinder = () => {
    // clear();
    const last = readFinderLastUrl();
    router.push(last || '/rackets/finder');
  };

  // 비교 페이지를 떠날 때도 비교 목록을 비움(파인더의 비교 UI 상태가 남지 않도록)
  // useEffect(() => {
  //   return () => clear();
  // }, [clear]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 브라우저 뒤로가기(popstate)로 빠져나갈 때도 비교 목록을 비움
  useEffect(() => {
    const onPop = () => clear();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [clear]);

  const list = mounted ? items : [];
  const canCompare = list.length >= 2;

  const rows: Row[] = useMemo(
    () => [
      { key: 'brand', label: '브랜드', kind: 'text', get: (r) => racketBrandLabel(r.brand) },
      { key: 'model', label: '모델', kind: 'text', get: (r) => r.model },
      { key: 'year', label: '연식', kind: 'text', get: (r) => (r.year ? String(r.year) : '-') },
      { key: 'condition', label: '컨디션', kind: 'text', get: (r) => (r.condition ? String(r.condition) : '-') },
      {
        key: 'price',
        label: '가격',
        kind: 'num',
        isPrice: true,
        get: (r) => r.price,
        hint: '첫 번째(기준) 라켓 대비 ±차이/퍼센트도 함께 표시됩니다.',
      },
      {
        key: 'head',
        label: 'Head',
        kind: 'num',
        unit: ' sq.in',
        decimals: 0,
        get: (r) => r.spec?.headSize,
        hint: '헤드가 클수록 관용성(스윗스팟)이 커지는 경향.',
      },
      {
        key: 'weight',
        label: 'Weight',
        kind: 'num',
        unit: ' g',
        decimals: 0,
        get: (r) => r.spec?.weight,
        hint: '무거울수록 안정감/파워 경향, 가벼울수록 조작성 경향.',
      },
      {
        key: 'balance',
        label: 'Balance',
        kind: 'num',
        unit: ' mm',
        decimals: 0,
        get: (r) => r.spec?.balance,
        hint: '수치↑=헤드헤비 경향, 수치↓=헤드라이트 경향.',
      },
      {
        key: 'length',
        label: 'Length',
        kind: 'num',
        unit: ' in',
        decimals: 1,
        get: (r) => r.spec?.lengthIn,
        hint: '길수록 리치/서브 파워 경향(스윙이 무거워질 수 있음).',
      },
      {
        key: 'sw',
        label: 'SwingWeight',
        kind: 'num',
        decimals: 0,
        get: (r) => r.spec?.swingWeight,
        hint: 'SW↑=임팩트 안정/플로스루, SW↓=빠른 스윙/조작성.',
      },
      {
        key: 'ra',
        label: 'Stiffness(RA)',
        kind: 'num',
        decimals: 0,
        get: (r) => r.spec?.stiffnessRa,
        hint: 'RA↑=반발/파워 경향(충격↑ 가능), RA↓=타구감/컨트롤 경향.',
      },
      {
        key: 'pattern',
        label: 'Pattern',
        kind: 'text',
        // 비교 표도 raw 값 대신 공통 라벨 함수로 표시 방식 통일
        get: (r) => (r.spec?.pattern ? stringPatternLabel(String(r.spec?.pattern)) : '-'),
        hint: '오픈(16x19)=스핀 경향, 덴스(18x20)=컨트롤 경향.',
      },
      {
        key: 'gripSize',
        label: 'Grip',
        kind: 'text',
        // g2/G2/과거 자유입력값이 와도 사람이 읽기 쉬운 라벨로 노출
        get: (r) => (r.spec?.gripSize ? gripSizeLabel(String(r.spec?.gripSize)) : '-'),
        hint: '그립 두께(사이즈) 비교 항목입니다.',
      },
    ],
    [],
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <div className="flex flex-col bp-sm:flex-row bp-sm:items-start bp-sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl bp-sm:text-2xl font-bold">라켓 비교</h1>
              <p className="text-sm text-muted-foreground mt-0.5">최소 2개 ~ 최대 4개까지 스펙을 표로 비교합니다.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-lg bg-transparent" onClick={goBackToFinder}>
              <span className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                파인더로
              </span>
            </Button>
            <Button variant="outline" onClick={() => clear()} disabled={list.length === 0} className="inline-flex items-center gap-2 rounded-lg text-muted-foreground hover:text-destructive hover:ring-destructive/30">
              <Trash2 className="h-4 w-4" />
              모두 삭제
            </Button>
          </div>
        </div>

        {/* 로딩 상태 */}
        {!mounted ? (
          <div className="rounded-xl bg-muted/30 dark:bg-muted/20 ring-1 ring-border/10 p-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm">비교 목록을 불러오는 중...</span>
            </div>
          </div>
        ) : !canCompare ? (
          /* 비교 불가 상태 개선 */
          <div className="rounded-xl bg-card/80 ring-1 ring-ring overflow-hidden">
            <div className="bg-muted px-4 py-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">비교할 라켓이 부족합니다</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">비교는 최소 2개부터 가능합니다. (현재 {list.length}개)</p>

              {list.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium">현재 선택된 라켓</div>
                  <div className="flex flex-wrap gap-2">
                    {list.map((r, idx) => (
                      <div key={r.id} className={cn('group flex items-center gap-3 rounded-lg p-2 pr-3', 'bg-muted/30', 'ring-1 ring-border/10', 'transition-all duration-200', 'hover:ring-primary/30')}>
                        <div className={cn('relative h-12 w-12 overflow-hidden rounded-md bg-muted/50', 'ring-1 ring-border/10')}>
                          {r.image ? (
                            <Image src={r.image || '/placeholder.svg'} alt={`${racketBrandLabel(r.brand)} ${r.model}`} fill className="object-cover" unoptimized />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">No Image</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/rackets/${r.id}`} className="text-sm font-medium hover:text-primary hover:underline">
                              {r.model}
                            </Link>
                            {idx === 0 && (
                              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-primary/10 text-primary dark:bg-primary/20">
                                기준
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{racketBrandLabel(r.brand)}</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="h-7 w-7 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" aria-label="비교에서 제거">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={goBackToFinder} className="rounded-lg gap-2">
                라켓 고르러 가기
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary dark:bg-primary/20 rounded-lg px-3 py-1">
                선택 {list.length} / 4
              </Badge>
              <span className="text-sm text-muted-foreground">각 열 상단의 X로 개별 제거 가능합니다.</span>
            </div>

            <div className="overflow-x-auto rounded-xl bg-card/80 ring-1 ring-border/10 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 dark:bg-muted/20">
                    <th className="p-4 text-left text-muted-foreground w-[160px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">항목</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors" aria-label="표 해석 힌트">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px] text-xs leading-relaxed">배경 막대는 현재 비교 대상들 내에서의 상대 위치(최소~최대)입니다. ±는 첫 번째(기준) 라켓 대비 차이입니다.</TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                    {list.map((r, idx) => (
                      <th key={r.id} className="p-4 text-left align-top min-w-[220px]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <RacketSpecQuickViewDialog
                                racket={r}
                                trigger={
                                  <button type="button" className="font-semibold hover:text-primary transition-colors text-left">
                                    {r.model}
                                  </button>
                                }
                              />
                              {idx === 0 && (
                                <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-primary/10 text-primary dark:bg-primary/20">
                                  기준
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-normal">{racketBrandLabel(r.brand)}</div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="h-7 w-7 -mr-1 text-muted-foreground hover:text-destructive" aria-label="비교에서 제거">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <div className={cn('relative h-14 w-14 overflow-hidden rounded-lg bg-muted/50', 'ring-1 ring-border/10', !r.image && 'flex items-center justify-center')}>
                            {r.image ? <Image src={r.image || '/placeholder.svg'} alt={`${racketBrandLabel(r.brand)} ${r.model}`} fill className="object-cover" unoptimized /> : <span className="text-[10px] text-muted-foreground">No Image</span>}
                          </div>
                          <div className="text-xs text-muted-foreground font-normal">
                            {r.year ? `${r.year}년` : '-'} / {r.condition ? r.condition : '-'}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-muted/50 dark:divide-muted/30">
                  {rows.map((row) => {
                    const baseItem = list[0];
                    const baseNum = row.kind === 'num' ? toNum(row.get(baseItem)) : null;
                    const mm = row.kind === 'num' ? minMax(list.map((it) => toNum(row.get(it)))) : null;

                    return (
                      <tr key={row.key} className="hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors">
                        <td className="p-4 font-medium text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>{row.label}</span>
                            {row.hint ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors" aria-label={`${row.label} 해석 힌트`}>
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[260px] text-xs leading-relaxed">{row.hint}</TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </td>

                        {list.map((r, idx) => {
                          if (row.kind === 'text') {
                            return (
                              <td key={r.id + row.key} className="p-4 font-medium">
                                {row.get(r)}
                              </td>
                            );
                          }

                          const n = toNum(row.get(r));
                          const decimals = row.decimals ?? 0;

                          const valueText = n === null ? '-' : row.isPrice ? `${Math.round(n).toLocaleString()}원` : `${fmtFixed(n, decimals)}${row.unit ?? ''}`;

                          const delta = n !== null && baseNum !== null ? n - baseNum : null;

                          const deltaAbsText = delta === null ? null : row.isPrice ? `${Math.abs(Math.round(delta)).toLocaleString()}원` : `${fmtFixed(Math.abs(delta), decimals)}${row.unit ?? ''}`;

                          const sign = delta === null ? '' : delta > 0 ? '+' : delta < 0 ? '-' : '';

                          const pct = delta !== null && baseNum !== null && baseNum !== 0 ? (delta / baseNum) * 100 : null;

                          const pctText = pct === null ? null : `${pct > 0 ? '+' : pct < 0 ? '-' : ''}${Math.abs(pct).toFixed(1)}%`;

                          const t = mm && n !== null ? ratio01(n, mm.min, mm.max) : null;
                          const isBaseCol = idx === 0;

                          const deltaClass = isBaseCol || delta === null ? 'text-muted-foreground' : delta > 0 ? 'text-primary' : delta < 0 ? 'text-destructive' : 'text-muted-foreground';

                          const barClass = delta === null ? 'bg-primary/10 dark:bg-primary/20' : delta > 0 ? 'bg-primary/10 dark:bg-primary/20' : delta < 0 ? 'bg-destructive/10 dark:bg-destructive/20' : 'bg-muted/30';

                          return (
                            <td key={r.id + row.key} className="p-4 relative overflow-hidden">
                              {t !== null && <div className={cn('absolute inset-y-0 left-0 transition-all duration-300', barClass)} style={{ width: `${Math.round(t * 100)}%` }} />}

                              <div className="relative z-10 tabular-nums">
                                <div className="font-semibold">{valueText}</div>

                                {!isBaseCol && delta !== null && (
                                  <div className={cn('mt-0.5 text-[11px] font-medium', deltaClass)}>
                                    {sign}
                                    {deltaAbsText}
                                    {pctText ? ` (${pctText})` : ''}
                                  </div>
                                )}

                                {!isBaseCol && delta === null && <div className="mt-0.5 text-[11px] text-muted-foreground">비교 불가</div>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
