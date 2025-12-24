'use client';

import PriceSummaryCard from '@/app/services/_components/PriceSummaryCard';

/**
 * Apply 페이지에서 사용되는 요금 요약 UI를 "표현(UI)만" 분리한 컴포넌트
 * - 모바일/태블릿: 폼 내부에 인라인으로 렌더
 * - 데스크탑(xl 이상): 우측 sticky 카드로 렌더
 *
 */

type PriceSummaryCommonProps = {
  preferredDate: string | undefined;
  preferredTime: string | undefined;

  collectionMethod: any;
  stringTypes: any;

  usingPackage: boolean;
  base: number;
  pickupFee: number;
  total: number;

  racketPrice: number;
  stringPrice: number;
  totalLabel: string;
};

export function ApplyPriceSummaryMobile({ preferredDate, preferredTime, collectionMethod, stringTypes, usingPackage, base, pickupFee, total, racketPrice, stringPrice, totalLabel }: PriceSummaryCommonProps) {
  return (
    <div className="mt-8 xl:hidden">
      <PriceSummaryCard
        preferredDate={preferredDate ?? undefined}
        preferredTime={preferredTime ?? undefined}
        collectionMethod={collectionMethod}
        stringTypes={stringTypes}
        usingPackage={usingPackage}
        base={base}
        pickupFee={pickupFee}
        total={total}
        racketPrice={racketPrice}
        stringPrice={stringPrice}
        totalLabel={totalLabel}
      />
    </div>
  );
}

type DesktopProps = PriceSummaryCommonProps & {
  stickyTop: number;
};

export function ApplyPriceSummaryDesktop({ stickyTop, preferredDate, preferredTime, collectionMethod, stringTypes, usingPackage, base, pickupFee, total, racketPrice, stringPrice, totalLabel }: DesktopProps) {
  return (
    <div
      className="hidden xl:block"
      style={{
        position: 'absolute',
        width: '320px',
        left: 'calc(50% + 400px + 24px)',
        top: 0,
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <div className="sticky pointer-events-auto" style={{ top: stickyTop }}>
        <PriceSummaryCard
          preferredDate={preferredDate}
          preferredTime={preferredTime}
          collectionMethod={collectionMethod}
          stringTypes={stringTypes}
          usingPackage={usingPackage}
          base={base}
          pickupFee={pickupFee}
          total={total}
          racketPrice={racketPrice}
          stringPrice={stringPrice}
          totalLabel={totalLabel}
        />
      </div>
    </div>
  );
}
