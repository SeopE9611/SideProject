'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ExternalLink, Info, Maximize2, Circle, Weight, Ruler, Activity, Grid3X3, Tag, Scale } from 'lucide-react';

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

const SPEC_ICONS: Record<string, typeof Circle> = {
  headSize: Maximize2,
  weight: Weight,
  balance: Scale,
  lengthIn: Ruler,
  swingWeight: Activity,
  stiffnessRa: Activity,
  pattern: Grid3X3,
  price: Tag,
};

function HintIcon({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-5 w-5 items-center justify-center rounded-full',
            'text-muted-foreground/70 transition-colors duration-200',
            'hover:bg-primary/10 hover:text-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          )}
          aria-label="해석 힌트"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className={cn('max-w-[280px] text-xs leading-relaxed', 'bg-card text-card-foreground shadow-lg', 'rounded-lg px-3 py-2')}>{text}</TooltipContent>
    </Tooltip>
  );
}

function SpecRow({ specKey, label, value, isLast }: { specKey: string; label: string; value: string; isLast: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = SPEC_ICONS[specKey] || Circle;

  return (
    <div
      className={cn('group flex items-center justify-between gap-3 px-3 py-2.5 bp-sm:px-4 bp-sm:py-3', 'transition-colors duration-200', 'hover:bg-muted/50', !isLast && 'border-b border-muted/60')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2 bp-sm:gap-3">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-md bp-sm:h-8 bp-sm:w-8', 'bg-muted/60 transition-all duration-200', 'group-hover:bg-primary/10', isHovered && 'scale-105')}>
          <IconComponent className={cn('h-3.5 w-3.5 bp-sm:h-4 bp-sm:w-4', 'text-muted-foreground transition-colors duration-200', 'group-hover:text-primary')} />
        </div>
        <span className={cn('text-xs font-medium bp-sm:text-sm', 'text-muted-foreground transition-colors duration-200', 'group-hover:text-foreground')}>{label}</span>
        {SPEC_HINTS[specKey] ? <HintIcon text={SPEC_HINTS[specKey]} /> : null}
      </div>
      <div className={cn('text-sm font-semibold tabular-nums bp-sm:text-base', 'text-foreground transition-colors duration-200', specKey === 'price' && value !== '-' && 'text-primary')}>{value}</div>
    </div>
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
    [racket],
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={cn('text-left font-semibold transition-colors duration-200', 'text-foreground hover:text-primary', 'focus-visible:outline-none focus-visible:text-primary')}>
            {racket.model}
          </button>
        )}
      </DialogTrigger>

      <DialogContent className={cn('w-[calc(100%-24px)] p-0 overflow-hidden bg-card shadow-2xl', 'max-w-[920px] bp-md:max-w-[1040px] bp-lg:max-w-[1120px]', 'bp-sm:w-[calc(100%-48px)]')}>
        <div className="relative">
          <div className={cn('absolute inset-x-0 top-0 h-1', 'bg-gradient-to-r from-primary/80 via-primary to-primary/80')} />
          <DialogHeader className="px-4 pt-5 pb-3 bp-sm:px-6 bp-sm:pt-6 bp-sm:pb-4">
            <DialogTitle className="flex flex-wrap items-center gap-2 bp-sm:gap-3">
              <span className="text-base font-bold text-foreground bp-sm:text-lg">{racket.model}</span>
              <span className="text-xs text-muted-foreground bp-sm:text-sm">{brandText}</span>
              <div className="flex items-center gap-1.5">
                {racket.year ? (
                  <Badge variant="secondary" className={cn('h-5 px-2 text-[10px] font-medium', 'bg-secondary/80 text-secondary-foreground', 'transition-colors duration-200')}>
                    {racket.year}
                  </Badge>
                ) : null}
                {racket.condition ? (
                  <Badge variant="outline" className={cn('h-5 px-2 text-[10px] font-medium', 'border-muted-foreground/30 text-muted-foreground', 'transition-colors duration-200')}>
                    {racket.condition}
                  </Badge>
                ) : null}
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-4 pb-4 bp-sm:px-6 bp-sm:pb-6">
          <div className="grid gap-4 bp-md:grid-cols-[240px_1fr] bp-md:gap-8">
            {/* 이미지 */}
            <div className="flex justify-center bp-md:justify-start">
              <div
                className={cn(
                  'group relative h-[180px] w-[180px] overflow-hidden bp-sm:h-[200px] bp-sm:w-[200px] bp-md:h-[240px] bp-md:w-[240px]',
                  'rounded-xl bg-gradient-to-br from-muted/50 to-muted',
                  'ring-1 ring-muted-foreground/10',
                  'transition-all duration-300',
                  'hover:ring-primary/30 hover:shadow-lg',
                  !racket.image && 'flex items-center justify-center',
                )}
              >
                {racket.image ? (
                  <>
                    <Image src={racket.image || '/placeholder.svg'} alt={`${brandText} ${racket.model}`} fill className={cn('object-cover transition-transform duration-500', 'group-hover:scale-105')} unoptimized />
                    <div className={cn('absolute inset-0 bg-gradient-to-t from-black/20 to-transparent', 'opacity-0 transition-opacity duration-300', 'group-hover:opacity-100')} />
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">No Image</span>
                )}
              </div>
            </div>

            {/* 스펙 */}
            <TooltipProvider delayDuration={120}>
              <div className="space-y-3 bp-sm:space-y-4">
                {/* Info notice */}
                <div className={cn('flex items-start gap-2 rounded-lg px-3 py-2.5', 'bg-muted/40 text-xs leading-relaxed text-muted-foreground', 'bp-sm:text-sm')}>
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  <span>
                    스펙은 <span className="font-medium text-foreground">비교 목록에 담을 때의 스냅샷</span>입니다.
                    <span className="hidden bp-sm:inline"> (최신 값은 상세 페이지에서 확인)</span>
                  </span>
                </div>

                <div className={cn('overflow-hidden rounded-xl', 'bg-background ring-1 ring-muted-foreground/10', 'transition-shadow duration-300', 'hover:ring-muted-foreground/20 hover:shadow-sm')}>
                  {specRows.map((row, index) => (
                    <SpecRow key={row.key} specKey={row.key} label={row.label} value={row.value} isLast={index === specRows.length - 1} />
                  ))}
                </div>

                <div className="flex flex-col gap-2 pt-1 bp-sm:flex-row bp-sm:items-center bp-sm:gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className={cn('inline-flex items-center justify-center gap-2', 'border-muted-foreground/20 bg-transparent', 'transition-all duration-200', 'hover:border-primary/50 hover:bg-primary/5 hover:text-primary', 'bp-sm:flex-1')}
                  >
                    <Link href={`/rackets/${racket.id}`} target="_blank" rel="noopener noreferrer">
                      상세 페이지 열기
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Button asChild className={cn('inline-flex items-center justify-center gap-2', 'bg-primary text-primary-foreground', 'shadow-sm transition-all duration-200', 'hover:bg-primary/90 hover:shadow-md', 'bp-sm:flex-1')}>
                    <Link href={`/rackets/${racket.id}/select-string`}>구매하기</Link>
                  </Button>
                </div>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
