'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Clock3, Truck, Store, Package, Box, BadgeDollarSign, ReceiptText, Ticket } from 'lucide-react';

type CollectionMethod = 'self_ship' | 'courier_pickup' | 'visit';

interface PriceSummaryProps {
  preferredDate?: string;
  preferredTime?: string;
  collectionMethod?: CollectionMethod;
  stringTypes: string[];
  usingPackage: boolean;
  base: number;
  pickupFee: number;
  total: number;
}

const won = (n: number) => n.toLocaleString('ko-KR') + '원';

export default function PriceSummaryCard({ preferredDate, preferredTime, collectionMethod = 'self_ship', stringTypes, usingPackage, base, pickupFee, total }: PriceSummaryProps) {
  const isCustom = stringTypes.includes('custom');

  const MethodIcon = collectionMethod === 'courier_pickup' ? Truck : collectionMethod === 'visit' ? Store : Box;
  const methodText = collectionMethod === 'courier_pickup' ? '기사 방문(+3,000원)' : collectionMethod === 'visit' ? '매장 방문' : '자가 발송';

  return (
    <Card className="overflow-hidden border border-slate-200/70 dark:border-slate-700/70 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-800 dark:via-slate-700 dark:to-slate-600 text-white px-4 py-3">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4" />
          <p className="text-sm font-semibold">요금 요약</p>
        </div>
        <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-1">입력에 따라 실시간 반영됩니다</p>
      </div>

      <CardContent className="pt-5">
        {/* 선택 요약 */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <CalendarDays className="h-4 w-4" />
              <span>희망일</span>
            </div>
            <span className="tabular-nums">{preferredDate || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Clock3 className="h-4 w-4" />
              <span>시간대</span>
            </div>
            <span className="tabular-nums">{preferredTime || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
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
              <BadgeDollarSign className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">교체비</p>
                <p className="text-xs text-muted-foreground">{isCustom ? '보유/커스텀 스트링: 장착비만' : '스트링 상품 선택: 스트링 포함'}</p>
              </div>
            </div>
            <p className="text-sm">{won(base)}</p>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500 dark:text-slate-400" />
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
                <Ticket className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                <p className="text-sm font-medium">패키지 적용</p>
              </div>
              <p className="text-sm text-emerald-600 dark:text-emerald-500">교체비 0원</p>
            </div>
          )}

          <div className="border-t my-2" />

          {/* 합계 강조 */}
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">예상 결제 금액</p>
            <p className="text-base font-bold tabular-nums rounded-lg px-2 py-1 bg-slate-100 dark:bg-slate-800 ring-1 ring-inset ring-slate-200 dark:ring-slate-700" aria-live="polite">
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
