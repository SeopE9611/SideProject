'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { racketBrandLabel } from '@/lib/constants';
import RentDialog from '@/app/rackets/[id]/_components/RentDialog';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useRacketCompareStore, type CompareRacketItem } from '@/app/store/racketCompareStore';
import { useMemo } from 'react';

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
  // A(최상) / B(상) / C(보통)
  if (!condition) return null;
  const c = condition.toUpperCase();
  if (c === 'A') return { label: '최상', className: 'bg-emerald-600 text-white' };
  if (c === 'B') return { label: '상', className: 'bg-blue-600 text-white' };
  if (c === 'C') return { label: '보통', className: 'bg-amber-600 text-white' };
  return { label: c, className: 'bg-slate-600 text-white' };
}

function fmt(n: number | null | undefined, suffix?: string) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return `${n}${suffix ?? ''}`;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground tabular-nums">{value}</span>
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

  // 비교 담기(최대 4개)
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
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
            {img ? <Image src={img} alt={`${brandText} ${racket.model}`} fill className="object-cover" unoptimized /> : <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No Image</div>}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground whitespace-nowrap">{brandText}</div>
                <div className="mt-0.5 truncate text-base font-semibold">
                  {racket.model}
                  {racket.year ? <span className="ml-1 text-sm font-normal text-muted-foreground">({racket.year})</span> : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {cond ? <Badge className={cn('h-6 px-2', cond.className)}>{cond.label}</Badge> : null}
                {rentalEnabled ? (
                  <Badge variant="secondary" className="h-6">
                    대여 가능
                  </Badge>
                ) : (
                  <Badge variant="outline" className="h-6">
                    대여 불가
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
              <SpecRow label="Head" value={fmt(spec.headSize, ' sq.in')} />
              <SpecRow label="Weight" value={fmt(spec.weight, ' g')} />
              <SpecRow label="Balance" value={fmt(spec.balance, ' mm')} />
              <SpecRow label="Length" value={fmt(spec.lengthIn, ' in')} />
              <SpecRow label="SwingWeight" value={fmt(spec.swingWeight, ' g')} />
              <SpecRow label="Stiffness" value={fmt(spec.stiffnessRa, ' Ra')} />
              <SpecRow label="Pattern" value={spec.pattern ? String(spec.pattern) : '-'} />
              <SpecRow label="Price" value={racket.price ? `${racket.price.toLocaleString()}원` : '-'} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/rackets/${racket.id}`}>상세 스펙</Link>
              </Button>
              {/* 비교 버튼(토글) */}
              <Button
                type="button"
                size="sm"
                variant={selected ? 'default' : 'secondary'}
                className={cn(selected && 'bg-primary text-primary-foreground hover:bg-primary/90')}
                onClick={() => {
                  // 이미 선택된 건 해제 가능, 새로 담을 때만 4개 제한
                  if (!selected && compareItems.length >= 4) {
                    showErrorToast('라켓 비교는 최대 4개까지 담을 수 있습니다.');
                    return;
                  }
                  const res = toggle(compareItem);
                  if (!res.ok) {
                    showErrorToast(res.message);
                    return;
                  }
                  // 토스트는 원하면 제거해도 됨(UX 취향)
                  if (res.action === 'added') showSuccessToast('비교 목록에 담았습니다.');
                  if (res.action === 'removed') showSuccessToast('비교 목록에서 제거했습니다.');
                }}
              >
                {selected ? '비교 선택됨' : '라켓 비교'}
              </Button>
              <Button asChild size="sm">
                <Link href={`/rackets/${racket.id}/select-string`}>구매하기</Link>
              </Button>
              {rentalEnabled ? (
                <RentDialog id={racket.id} rental={racket.rental} brand={racket.brand} model={racket.model} size="sm" preventCardNav={true} full={false} />
              ) : (
                <Button size="sm" variant="secondary" disabled title={rentalDisabledReason ?? undefined}>
                  대여 불가
                </Button>
              )}

              {rentalDisabledReason ? <span className="text-xs text-muted-foreground self-center">({rentalDisabledReason})</span> : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function isolateSpecFallback(spec: any) {
  return spec ?? {};
}
