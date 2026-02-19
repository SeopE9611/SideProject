'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Clock3, Truck, Store, Package, Box, BadgeDollarSign, ReceiptText, Ticket } from 'lucide-react';

type CollectionMethod = 'self_ship' | 'courier_pickup' | 'visit';

interface PriceSummaryProps {
  preferredDate?: string;
  preferredTime?: string;
  collectionMethod?: CollectionMethod;
  stringTypes: string[];
  stringIncluded?: boolean; // 스트링 금액이 결제에 포함되는지(주문 기반/핸드오프 등)
  usingPackage: boolean;
  base: number;
  pickupFee: number;
  total: number;
  racketPrice?: number; // 라켓 금액(정보용)
  rentalDeposit?: number; // 대여 보증금(정보용)
  rentalFee?: number; // 대여료(정보용)
  stringPrice?: number; // 스트링 상품 금액(정보용)
  totalLabel?: string; // 합계 라벨 커스터마이징
  headerHint?: string; // 헤더 하단 안내문(대여/주문 기반에서 혼선 제거용)
}

const won = (n: number) => n.toLocaleString('ko-KR') + '원';

export default function PriceSummaryCard({
  preferredDate,
  preferredTime,
  collectionMethod,
  stringTypes,
  stringIncluded = false,
  usingPackage,
  base,
  pickupFee,
  total,
  racketPrice = 0,
  rentalDeposit = 0,
  rentalFee = 0,
  stringPrice = 0,
  totalLabel,
  headerHint,
}: PriceSummaryProps) {
  const isCustom = stringTypes.includes('custom');
  const isRentalBreakdown = Number(rentalDeposit) > 0 || Number(rentalFee) > 0;

  const MethodIcon = collectionMethod === 'courier_pickup' ? Truck : collectionMethod === 'visit' ? Store : Box;
  const methodText = collectionMethod === 'courier_pickup' ? '기사 방문(+3,000원)' : collectionMethod === 'visit' ? '매장 방문' : '자가 발송';

  return (
    <Card className="overflow-hidden border border-border dark:border-border shadow-sm">
      {/* Header */}
      <div className="bg-primary from-slate-900 via-slate-800 to-slate-700 dark:from-slate-800 dark:via-slate-700 dark:to-slate-600 text-foreground px-4 py-3">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4" />
          <p className="text-sm font-semibold">요금 요약</p>
        </div>
        <p className="text-[11px] text-muted-foreground dark:text-muted-foreground mt-1">{headerHint ?? '입력에 따라 실시간 반영됩니다'}</p>
      </div>

      <CardContent className="pt-5">
        {/* 선택 요약 */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>희망일</span>
            </div>
            <span className="tabular-nums">{preferredDate || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              <span>시간대</span>
            </div>
            <span className="tabular-nums">{preferredTime || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
              <MethodIcon className="h-4 w-4" />
              <span>수거 방식</span>
            </div>
            <span>{methodText}</span>
          </div>
        </div>

        <div className="border-t my-3" />

        {/* 금액 라인 */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <BadgeDollarSign className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">교체비</p>
                <p className="text-xs text-muted-foreground">{isCustom ? '보유/커스텀 스트링: 장착비만' : stringIncluded ? '스트링 상품 선택: 스트링 포함' : '스트링 상품 선택: 별도 구매 필요'}</p>
              </div>
            </div>

            <p className="text-sm">{won(base)}</p>
          </div>
          {/* 대여 기반이면: 보증금/대여료를 분리 표시 */}
          {isRentalBreakdown ? (
            <>
              {rentalDeposit > 0 && (
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                    <p className="text-sm font-medium">보증금</p>
                  </div>
                  <p className="text-sm">{won(rentalDeposit)}</p>
                </div>
              )}

              {rentalFee > 0 && (
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                    <p className="text-sm font-medium">대여료</p>
                  </div>
                  <p className="text-sm">{won(rentalFee)}</p>
                </div>
              )}
            </>
          ) : (
            /* 구매(주문) 기반이면: 라켓 금액 */
            racketPrice > 0 && (
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Box className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                  <p className="text-sm font-medium">라켓 금액</p>
                </div>
                <p className="text-sm">{won(racketPrice)}</p>
              </div>
            )
          )}

          {stringPrice > 0 && (
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                <p className="text-sm font-medium">스트링 금액</p>
              </div>
              <p className="text-sm">{won(stringPrice)}</p>
            </div>
          )}

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">수거비(택배 기사 방문)</p>
                <p className="text-xs text-muted-foreground">후정산</p>
              </div>
            </div>
            <p className="text-sm">{pickupFee > 0 ? `+ ${won(pickupFee)}` : '—'}</p>
          </div>

          {usingPackage && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary dark:text-emerald-500" />
                <p className="text-sm font-medium">패키지 적용</p>
              </div>
              <p className="text-sm text-primary dark:text-emerald-500">교체비 0원</p>
            </div>
          )}

          <div className="border-t my-2" />

          {/* 합계 강조 */}
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">{totalLabel ?? '예상 결제 금액'}</p>
            <p className="text-base font-bold tabular-nums rounded-md px-2 py-1 ring-1 ring-inset ring-slate-200 dark:ring-slate-700" aria-live="polite">
              {won(total)}
            </p>
          </div>

          {/* 안내 */}
          {collectionMethod === 'courier_pickup' && <p className="mt-3 text-[11px] text-muted-foreground">※ 기사 방문 수거 시 수거비 3,000원은 후정산됩니다.</p>}
          {usingPackage && <p className="mt-1 text-[11px] text-muted-foreground">※ 패키지 적용 시 교체비는 0원으로 처리됩니다.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
