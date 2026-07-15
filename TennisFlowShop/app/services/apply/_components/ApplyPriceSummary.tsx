"use client";

import { useState } from "react";
import PriceSummaryCard from "@/app/services/_components/PriceSummaryCard";
import { Button } from "@/components/ui/button";

/**
 * Apply 페이지에서 사용되는 요금 요약 UI를 "표현(UI)만" 분리한 컴포넌트
 * - 모바일/태블릿: compact 요약 + 펼침 상세
 * - 데스크탑: grid 우측 sticky rail
 */

type PriceSummaryCommonProps = {
  preferredDate: string | undefined;
  preferredTime: string | undefined;

  collectionMethod: any;
  stringTypes: any;

  stringIncluded?: boolean;
  headerHint?: string;

  usingPackage: boolean;
  base: number;
  pickupFee: number;
  total: number;

  racketPrice: number;
  rentalDeposit?: number;
  rentalFee?: number;
  stringPrice: number;
  totalLabel: string;
  summaryTitle?: string;
  workLines?: Array<{
    racketType?: string;
    stringName?: string;
    tensionMain?: string;
    tensionCross?: string;
    mountingFee?: number;
  }>;
};

function collectionLabel(collectionMethod: any) {
  if (collectionMethod === "visit") return "방문 접수";
  if (collectionMethod === "courier_pickup") return "택배 픽업";
  if (collectionMethod === "self_ship") return "택배 발송";
  return "전달 방법 미선택";
}

function won(value: number) {
  return `${Number(value || 0).toLocaleString()}원`;
}

export function ApplyPriceSummaryMobile(props: PriceSummaryCommonProps) {
  const [open, setOpen] = useState(false);
  const racketCount = props.workLines?.length || props.stringTypes?.length || 0;

  return (
    <div className="mt-5 bp-lg:hidden">
      <div className="rounded-panel border border-border bg-card p-4 shadow-soft">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-ui-body-sm font-semibold text-foreground">
              라켓 {racketCount || "-"}대 · {collectionLabel(props.collectionMethod)} · {won(props.total)}
            </p>
            <p className="mt-1 text-ui-label text-muted-foreground">신청 요약을 접어 두고 입력을 이어갈 수 있습니다.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="shrink-0"
          >
            {open ? "닫기" : "내용 보기"}
          </Button>
        </div>
        {open ? (
          <div className="mt-4 border-t border-border pt-4">
            <PriceSummaryCard {...props} preferredDate={props.preferredDate ?? undefined} preferredTime={props.preferredTime ?? undefined} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

type DesktopProps = PriceSummaryCommonProps & {
  stickyTop: number;
};

export function ApplyPriceSummaryDesktop({ stickyTop, ...props }: DesktopProps) {
  return (
    <aside className="hidden min-w-0 bp-lg:block">
      <div className="sticky" style={{ top: Math.max(88, stickyTop) }}>
        <PriceSummaryCard {...props} />
      </div>
    </aside>
  );
}
