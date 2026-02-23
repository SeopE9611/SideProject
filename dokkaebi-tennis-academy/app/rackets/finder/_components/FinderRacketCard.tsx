'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { racketBrandLabel } from '@/lib/constants';
import RentDialog from '@/app/rackets/[id]/_components/RentDialog';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useRacketCompareStore, type CompareRacketItem } from '@/app/store/racketCompareStore';
import { useMemo } from 'react';
import { Scale, ShoppingCart, Info } from 'lucide-react';
import RacketSpecQuickViewDialog from '@/app/rackets/compare/_components/RacketSpecQuickViewDialog';

type RacketSpec = {
  headSize?: number | null;
  weight?: number | null;
  balance?: number | null;
  lengthIn?: number | null;
  swingWeight?: number | null;
  stiffnessRa?: number | null;
  pattern?: string | null;
};

type RentalInfo = {
  enabled?: boolean;
  deposit?: number;
  fee?: { d7: number; d15: number; d30: number };
  disabledReason?: string | null;
};

export type FinderRacket = {
  id: string;
  brand: string;
  model: string;
  year?: number | null;
  price?: number | null;
  images?: string[];
  condition?: string | null;
  status?: string | null;
  rental?: RentalInfo | null;
  spec?: RacketSpec | null;
};

function conditionLabel(condition?: string | null) {
  if (!condition) return null;
  const c = condition.toUpperCase();
  if (c === 'A')
    return {
      label: 'A',
      desc: '최상',
      className: 'bg-primary/10 text-primary ring-1 ring-ring',
    };
  if (c === 'B')
    return {
      label: 'B',
      desc: '상',
      className: 'bg-primary/10 text-primary ring-1 ring-ring',
    };
  if (c === 'C')
    return {
      label: 'C',
      desc: '보통',
      className: 'bg-muted text-primary ring-1 ring-ring',
    };
  return { label: c, desc: '', className: 'bg-muted text-muted-foreground ring-1 ring-muted' };
}

function fmt(n: number | null | undefined, suffix?: string) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return `${n}${suffix ?? ''}`;
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export default function FinderRacketCard({ racket }: { racket: FinderRacket }) {
  const brandText = racketBrandLabel(racket.brand);
  const spec = (racket.spec ?? {}) as RacketSpec;
  const cond = conditionLabel(racket.condition);

  const img = racket.images?.[0];
  const rentalEnabled = !!racket.rental?.enabled;
  const rentalDisabledReason = racket.rental?.disabledReason ?? null;

  const { items: compareItems, toggle } = useRacketCompareStore();
  const selected = compareItems.some((x) => x.id === racket.id);

  const compareItem: CompareRacketItem = useMemo(
    () => ({
      id: racket.id,
      brand: racket.brand,
      model: racket.model,
      year: racket.year ?? null,
      price: racket.price ?? null,
      image: img ?? null,
      condition: racket.condition ?? null,
      spec: {
        headSize: spec.headSize ?? null,
        weight: spec.weight ?? null,
        balance: spec.balance ?? null,
        lengthIn: spec.lengthIn ?? null,
        swingWeight: spec.swingWeight ?? null,
        stiffnessRa: spec.stiffnessRa ?? null,
        pattern: spec.pattern ?? null,
      },
    }),
    [racket.id, racket.brand, racket.model, racket.year, racket.price, racket.condition, img, spec]
  );

  return (
    <article className="group relative overflow-hidden rounded-2xl bg-card ring-1 ring-muted/40 dark:ring-muted/20 transition-all duration-200 hover:ring-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="p-4 bp-sm:p-5">
        <div className="flex flex-col bp-sm:flex-row gap-4">
          {/* 이미지 영역 */}
          <div className="relative h-32 w-full bp-sm:h-36 bp-sm:w-36 shrink-0 overflow-hidden rounded-xl bg-muted/50 dark:bg-muted/30">
            {img ? (
              <Image src={img || '/placeholder.svg'} alt={`${brandText} ${racket.model}`} fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No Image</div>
            )}
            {/* 컨디션 뱃지 - 이미지 위에 표시 */}
            {cond && <div className={cn('absolute top-2 left-2 rounded-lg px-2 py-1 text-xs font-bold', cond.className)}>{cond.label}</div>}
          </div>

          {/* 정보 영역 */}
          <div className="min-w-0 flex-1 flex flex-col">
            {/* 헤더: 브랜드, 모델명, 상태 뱃지 */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{brandText}</span>
                <h3 className="mt-0.5 text-lg font-bold text-foreground leading-tight truncate">
                  {racket.model}
                  {racket.year && <span className="ml-1.5 text-sm font-normal text-muted-foreground">({racket.year})</span>}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {rentalEnabled ? (
                  <Badge className="bg-primary/10 text-primary ring-1 ring-ring hover:bg-primary/15 dark:hover:bg-primary/25">대여 가능</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-muted/80 text-muted-foreground">
                    대여 불가
                  </Badge>
                )}
              </div>
            </div>

            {/* 스펙 그리드 */}
            <div className="grid grid-cols-4 gap-3 py-3 px-3 rounded-xl bg-muted/30 dark:bg-muted/10 mb-4">
              <SpecItem label="Head" value={fmt(spec.headSize, '')} />
              <SpecItem label="Weight" value={fmt(spec.weight, 'g')} />
              <SpecItem label="Balance" value={fmt(spec.balance, 'mm')} />
              <SpecItem label="SW" value={fmt(spec.swingWeight, '')} />
              <SpecItem label="Length" value={fmt(spec.lengthIn, 'in')} />
              <SpecItem label="RA" value={fmt(spec.stiffnessRa, '')} />
              <SpecItem label="Pattern" value={spec.pattern ? String(spec.pattern) : '-'} />
              <SpecItem label="Price" value={racket.price ? `${(racket.price / 10000).toFixed(0)}만` : '-'} />
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-wrap items-center gap-2 mt-auto">
               <RacketSpecQuickViewDialog
                racket={compareItem}
                trigger={
                  <Button type="button" variant="outline" size="sm" className="rounded-lg bg-transparent">
                    <Info className="mr-1.5 h-3.5 w-3.5" />
                    상세 스펙
                  </Button>
                }
              />

              <Button
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                className={cn('rounded-lg', selected && 'bg-primary text-primary-foreground')}
                onClick={() => {
                  if (!selected && compareItems.length >= 4) {
                    showErrorToast('라켓 비교는 최대 4개까지 담을 수 있습니다.');
                    return;
                  }
                  const res = toggle(compareItem);
                  if (!res.ok) {
                    showErrorToast(res.message);
                    return;
                  }
                  if (res.action === 'added') showSuccessToast('비교 목록에 담았습니다.');
                  if (res.action === 'removed') showSuccessToast('비교 목록에서 제거했습니다.');
                }}
              >
                <Scale className="mr-1.5 h-3.5 w-3.5" />
                {selected ? '비교 선택됨' : '비교하기'}
              </Button>

              <Button asChild size="sm" className="rounded-lg">
                <Link href={`/rackets/${racket.id}/select-string`}>
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                  구매하기
                </Link>
              </Button>

              {rentalEnabled ? (
                <RentDialog id={racket.id} rental={racket.rental} brand={racket.brand} model={racket.model} size="sm" preventCardNav={true} full={false} />
              ) : (
                <Button size="sm" variant="secondary" disabled title={rentalDisabledReason ?? undefined} className="rounded-lg opacity-50">
                  대여 불가
                </Button>
              )}

              {rentalDisabledReason && <span className="text-[11px] text-muted-foreground">({rentalDisabledReason})</span>}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function isolateSpecFallback(spec: any) {
  return spec ?? {};
}
