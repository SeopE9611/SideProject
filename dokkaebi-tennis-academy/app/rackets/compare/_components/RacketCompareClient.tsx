'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { X, ArrowLeft, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { racketBrandLabel } from '@/lib/constants';
import { useRacketCompareStore, type CompareRacketItem } from '@/app/store/racketCompareStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

type Row =
  | { key: string; label: string; hint?: string; kind: 'text'; get: (r: CompareRacketItem) => string }
  | {
      key: string;
      label: string;
      hint?: string;
      kind: 'num';
      unit?: string;
      decimals?: number; // length 같이 소수 필요한 행
      isPrice?: boolean; // 가격은 로케일 포맷
      get: (r: CompareRacketItem) => number | null | undefined;
    };

export default function RacketCompareClient() {
  const { items, remove, clear } = useRacketCompareStore();

  // zustand persist(로컬스토리지) rehydrate 전에는 items가 비어 보일 수 있어
  //  hydration 깜빡임 방지용으로 mounted gate
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const list = mounted ? items : [];
  const canCompare = list.length >= 2;

  const rows: Row[] = useMemo(
    () => [
      { key: 'brand', label: '브랜드', kind: 'text', get: (r) => racketBrandLabel(r.brand) },
      { key: 'model', label: '모델', kind: 'text', get: (r) => r.model },
      { key: 'year', label: '연식', kind: 'text', get: (r) => (r.year ? String(r.year) : '-') },
      { key: 'condition', label: '컨디션', kind: 'text', get: (r) => (r.condition ? String(r.condition) : '-') },

      { key: 'price', label: '가격', kind: 'num', isPrice: true, get: (r) => r.price, hint: '첫 번째(기준) 라켓 대비 ±차이/퍼센트도 함께 표시됩니다.' },

      { key: 'head', label: 'Head', kind: 'num', unit: ' sq.in', decimals: 0, get: (r) => r.spec?.headSize, hint: '헤드가 클수록 관용성(스윗스팟)이 커지는 경향.' },
      { key: 'weight', label: 'Weight', kind: 'num', unit: ' g', decimals: 0, get: (r) => r.spec?.weight, hint: '무거울수록 안정감/파워 경향, 가벼울수록 조작성 경향.' },
      { key: 'balance', label: 'Balance', kind: 'num', unit: ' mm', decimals: 0, get: (r) => r.spec?.balance, hint: '수치↑=헤드헤비 경향, 수치↓=헤드라이트 경향.' },
      { key: 'length', label: 'Length', kind: 'num', unit: ' in', decimals: 1, get: (r) => r.spec?.lengthIn, hint: '길수록 리치/서브 파워 경향(스윙이 무거워질 수 있음).' },
      { key: 'sw', label: 'SwingWeight', kind: 'num', decimals: 0, get: (r) => r.spec?.swingWeight, hint: 'SW↑=임팩트 안정/플로스루, SW↓=빠른 스윙/조작성.' },
      { key: 'ra', label: 'Stiffness(RA)', kind: 'num', decimals: 0, get: (r) => r.spec?.stiffnessRa, hint: 'RA↑=반발/파워 경향(충격↑ 가능), RA↓=타구감/컨트롤 경향.' },

      { key: 'pattern', label: 'Pattern', kind: 'text', get: (r) => (r.spec?.pattern ? String(r.spec?.pattern) : '-'), hint: '오픈(16x19)=스핀 경향, 덴스(18x20)=컨트롤 경향.' },
    ],
    []
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">라켓 비교</h1>
            <p className="text-sm text-muted-foreground mt-1">최소 2개 ~ 최대 4개까지 스펙을 표로 비교합니다.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/rackets/finder" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                파인더로
              </Link>
            </Button>
            <Button variant="outline" onClick={() => clear()} disabled={list.length === 0} className="inline-flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              모두 삭제
            </Button>
          </div>
        </div>

        {/* 안내(2개 미만) */}
        {!mounted ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">비교 목록을 불러오는 중...</CardContent>
          </Card>
        ) : !canCompare ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">비교할 라켓이 부족합니다</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>비교는 최소 2개부터 가능합니다. (현재 {list.length}개)</div>

              {list.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-foreground">현재 선택된 라켓</div>
                  <div className="flex flex-wrap gap-2">
                    {list.map((r, idx) => (
                      <th key={r.id} className="p-3 text-left align-top min-w-[240px]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link href={`/rackets/${r.id}`} className="font-semibold hover:underline">
                                {r.model}
                              </Link>
                              {idx === 0 && (
                                <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                                  기준
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{racketBrandLabel(r.brand)}</div>
                          </div>

                          <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="비교에서 제거">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <div className={cn('relative h-16 w-16 overflow-hidden rounded-md bg-muted', !r.image && 'flex items-center justify-center')}>
                            {r.image ? <Image src={r.image} alt={`${racketBrandLabel(r.brand)} ${r.model}`} fill className="object-cover" unoptimized /> : <span className="text-[10px] text-muted-foreground">No Image</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.year ? `${r.year}` : '-'} / {r.condition ? r.condition : '-'}
                          </div>
                        </div>
                      </th>
                    ))}
                  </div>
                </div>
              )}

              <Button asChild>
                <Link href="/rackets/finder">라켓 고르러 가기</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 상태 */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary">선택 {list.length} / 4</Badge>
              <span className="text-sm text-muted-foreground">각 열 상단의 X로 개별 제거 가능합니다.</span>
            </div>

            {/* 비교 테이블 */}
            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left text-muted-foreground w-[160px]">
                      <div className="flex items-center gap-2">
                        <span>항목</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground/70 hover:text-muted-foreground" aria-label="표 해석 힌트">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px] text-xs leading-relaxed">배경 막대는 현재 비교 대상들 내에서의 상대 위치(최소~최대)입니다. ±는 첫 번째(기준) 라켓 대비 차이입니다.</TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                    {list.map((r) => (
                      <th key={r.id} className="p-3 text-left align-top min-w-[240px]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={`/rackets/${r.id}`} className="font-semibold hover:underline">
                              {r.model}
                            </Link>
                            <div className="text-xs text-muted-foreground">{racketBrandLabel(r.brand)}</div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="비교에서 제거">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <div className={cn('relative h-16 w-16 overflow-hidden rounded-md bg-muted', !r.image && 'flex items-center justify-center')}>
                            {r.image ? <Image src={r.image} alt={`${racketBrandLabel(r.brand)} ${r.model}`} fill className="object-cover" unoptimized /> : <span className="text-[10px] text-muted-foreground">No Image</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.year ? `${r.year}` : '-'} / {r.condition ? r.condition : '-'}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => {
                    const baseItem = list[0];
                    const baseNum = row.kind === 'num' ? toNum(row.get(baseItem)) : null;

                    const mm = row.kind === 'num' ? minMax(list.map((it) => toNum(row.get(it)))) : null;

                    return (
                      <tr key={row.key} className="border-b last:border-b-0">
                        <td className="p-3 font-medium text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>{row.label}</span>
                            {row.hint ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="text-muted-foreground/70 hover:text-muted-foreground" aria-label={`${row.label} 해석 힌트`}>
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[260px] text-xs leading-relaxed">{row.hint}</TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </td>

                        {list.map((r, idx) => {
                          // text row
                          if (row.kind === 'text') {
                            return (
                              <td key={r.id + row.key} className="p-3">
                                {row.get(r)}
                              </td>
                            );
                          }

                          // num row
                          const n = toNum(row.get(r));
                          const decimals = row.decimals ?? 0;

                          const valueText = n === null ? '-' : row.isPrice ? `${Math.round(n).toLocaleString()}원` : `${fmtFixed(n, decimals)}${row.unit ?? ''}`;

                          // 기준 대비 계산
                          const delta = n !== null && baseNum !== null ? n - baseNum : null;

                          const deltaAbsText = delta === null ? null : row.isPrice ? `${Math.abs(Math.round(delta)).toLocaleString()}원` : `${fmtFixed(Math.abs(delta), decimals)}${row.unit ?? ''}`;

                          const sign = delta === null ? '' : delta > 0 ? '+' : delta < 0 ? '-' : '';

                          const pct = delta !== null && baseNum !== null && baseNum !== 0 ? (delta / baseNum) * 100 : null;

                          const pctText = pct === null ? null : `${pct > 0 ? '+' : pct < 0 ? '-' : ''}${Math.abs(pct).toFixed(1)}%`;

                          // 배경 막대(행 내 min~max 기준)
                          const t = mm && n !== null ? ratio01(n, mm.min, mm.max) : null;

                          // 기준 열(첫 번째)은 delta 숨김
                          const isBaseCol = idx === 0;

                          // delta에 따라 색상(직관성)
                          const deltaClass = isBaseCol || delta === null ? 'text-muted-foreground' : delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground';

                          const barClass = delta === null ? 'bg-primary/10' : delta > 0 ? 'bg-emerald-500/10' : delta < 0 ? 'bg-rose-500/10' : 'bg-muted/30';

                          return (
                            <td key={r.id + row.key} className="p-3 relative overflow-hidden">
                              {/* 배경 막대 */}
                              {t !== null && <div className={cn('absolute inset-y-0 left-0', barClass)} style={{ width: `${Math.round(t * 100)}%` }} />}

                              <div className="relative z-10 tabular-nums">
                                <div className="font-medium">{valueText}</div>

                                {/* 기준 대비 ±차이 + % */}
                                {!isBaseCol && delta !== null && (
                                  <div className={cn('mt-0.5 text-[11px]', deltaClass)}>
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
