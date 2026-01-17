'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ExternalLink, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { racketBrandLabel } from '@/lib/constants';

import type { CompareRacketItem } from '@/app/store/racketCompareStore';

type Props = {
  racket: CompareRacketItem;
  /**
   * Trigger를 자유롭게 커스터마이즈하고 싶을 때 사용.
   * (기본값은 '모델명' 텍스트 버튼)
   */
  trigger?: ReactNode;
};

function fmtFixed(n: number, decimals = 0) {
  return decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
}

function fmtNum(n?: number | null, unit = '', decimals = 0) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return `${fmtFixed(n, decimals)}${unit}`;
}

const SPEC_HINTS: Record<string, string> = {
  headSize: '헤드가 클수록 관용성/파워가 늘고, 작을수록 컨트롤이 쉬운 경향이 있습니다.',
  weight: '무게가 높을수록 안정감/파워는 늘지만, 스윙이 무거워질 수 있습니다.',
  balance: '수치가 높을수록 헤드 쪽(헤드 헤비), 낮을수록 손쪽(헤드 라이트)인 경향이 있습니다.',
  lengthIn: '길이가 길수록 리치/파워는 늘지만, 조작성은 떨어질 수 있습니다.',
  swingWeight: '스윙웨이트가 높을수록 임팩트 안정감/플로우스루가 늘지만, 휘두르기 무거울 수 있습니다.',
  stiffnessRa: 'RA가 높을수록 단단(파워)하지만 충격이 커질 수 있고, 낮을수록 편안한 편입니다.',
  pattern: '패턴이 오픈(예: 16x19)이면 스핀/파워, 덴스(예: 18x20)이면 컨트롤/내구성 경향이 있습니다.',
  price: '가격은 등록/업데이트 시점에 따라 변동될 수 있습니다.',
};

function HintIcon({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="해석 힌트"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-xs leading-relaxed">{text}</TooltipContent>
    </Tooltip>
  );
}

export default function RacketSpecQuickViewDialog({ racket, trigger }: Props) {
  const brandText = racketBrandLabel(racket.brand);

  const specRows = useMemo(
    () => [
      { key: 'headSize', label: 'Head', value: fmtNum(racket.spec?.headSize, ' sq.in', 0) },
      { key: 'weight', label: 'Weight', value: fmtNum(racket.spec?.weight, ' g', 0) },
      { key: 'balance', label: 'Balance', value: fmtNum(racket.spec?.balance, ' mm', 0) },
      { key: 'lengthIn', label: 'Length', value: fmtNum(racket.spec?.lengthIn, ' in', 1) },
      { key: 'swingWeight', label: 'SwingWeight', value: fmtNum(racket.spec?.swingWeight, '', 0) },
      { key: 'stiffnessRa', label: 'Stiffness(RA)', value: fmtNum(racket.spec?.stiffnessRa, '', 0) },
      { key: 'pattern', label: 'Pattern', value: racket.spec?.pattern ? String(racket.spec.pattern) : '-' },
      { key: 'price', label: 'Price', value: racket.price ? `${Math.round(racket.price).toLocaleString()}원` : '-' },
    ],
    [racket]
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className="text-left font-semibold hover:underline">
            {racket.model}
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{racket.model}</span>
            <span className="text-sm text-muted-foreground">{brandText}</span>
            {racket.year ? (
              <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                {racket.year}
              </Badge>
            ) : null}
            {racket.condition ? (
              <Badge variant="outline" className="h-5 px-2 text-[10px]">
                {racket.condition}
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 bp-md:grid-cols-[220px_1fr]">
          {/* 이미지 */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'relative h-[200px] w-[200px] overflow-hidden rounded-lg bg-muted',
                !racket.image && 'flex items-center justify-center'
              )}
            >
              {racket.image ? (
                <Image
                  src={racket.image}
                  alt={`${brandText} ${racket.model}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-xs text-muted-foreground">No Image</span>
              )}
            </div>
          </div>

          {/* 스펙 */}
          <TooltipProvider delayDuration={120}>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                스펙은 <span className="font-medium text-foreground">비교 목록에 담을 때의 스냅샷</span>입니다.
                (최신 값은 상세 페이지에서 확인)
              </div>

              <div className="rounded-lg border bg-background">
                <div className="grid grid-cols-1 divide-y">
                  {specRows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="min-w-[110px]">{row.label}</span>
                        {SPEC_HINTS[row.key] ? <HintIcon text={SPEC_HINTS[row.key]} /> : null}
                      </div>
                      <div className="text-sm font-medium tabular-nums">{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="inline-flex items-center gap-2">
                  <Link href={`/rackets/${racket.id}`}>
                    상세 페이지 열기
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>

                <Button asChild className="inline-flex items-center gap-2">
                  <Link href={`/rackets/${racket.id}/select-string`}>구매하기</Link>
                </Button>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
