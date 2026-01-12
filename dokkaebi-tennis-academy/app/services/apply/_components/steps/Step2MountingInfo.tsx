'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, DollarSign, Ticket, Zap } from 'lucide-react';

import TimeSlotSelector from '@/app/services/_components/TimeSlotSelector';
import StringCheckboxes from '@/app/services/_components/StringCheckboxes';
import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Props = {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleInputChange: (e: any) => void;

  fromPDP: boolean;
  orderId: string | null | undefined;
  rentalId?: string | null | undefined;
  rentalRacketId?: string | null;
  rentalDays?: number | null;
  pdpProductId: string | null | undefined;
  isLoadingPdpProduct: boolean;
  pdpProduct: any;

  orderRemainingSlots?: number | null;
  orderStringService: any;
  isOrderSlotBlocked: boolean;
  order: any;

  lineCount: number;
  price: number;
  priceView: any;

  handleStringTypesChange: (next: any) => void;
  handleCustomInputChange: (next: any) => void;
  handleUseQtyChange: (stringTypeId: string, qty: number) => void;

  lockedStringStock?: number | null;
  lockedRacketQuantity?: number | null;
  maxNonOrderQty?: number | null;

  selectedOrderItem: any;
  isCombinedPdpMode: boolean;
  pdpStringPrice: number;
  racketPrice: number | null;
  won: (n: number) => string;

  packagePreview: any;
  canApplyPackage: boolean;
  packageInsufficient: boolean;
  packageRemaining: number;
  requiredPassCount: number;

  linesForSubmit: any[];
  handleLineFieldChange: (idx: number, field: any, value: any) => void;

  timeSlots: any[];
  disabledTimes: any[];
  slotsLoading: boolean;
  hasCacheForDate: boolean;
  slotsError: string | null | undefined;
  visitSlotCountUi: number;
  visitDurationMinutesUi: number | null;
  visitTimeRange: any;
};

export default function Step2MountingInfo(props: Props) {
  const {
    formData,
    setFormData,
    handleInputChange,
    fromPDP,
    orderId,
    rentalId,
    rentalRacketId,
    rentalDays,
    pdpProductId,
    isLoadingPdpProduct,
    pdpProduct,
    orderRemainingSlots,
    orderStringService,
    isOrderSlotBlocked,
    order,
    lineCount,
    price,
    priceView,
    handleStringTypesChange,
    handleCustomInputChange,
    handleUseQtyChange,
    lockedStringStock,
    lockedRacketQuantity,
    maxNonOrderQty,
    selectedOrderItem,
    isCombinedPdpMode,
    pdpStringPrice,
    racketPrice,
    won,
    packagePreview,
    canApplyPackage,
    packageInsufficient,
    packageRemaining,
    requiredPassCount,
    linesForSubmit,
    handleLineFieldChange,
    timeSlots,
    disabledTimes,
    slotsLoading,
    hasCacheForDate,
    slotsError,
    visitSlotCountUi,
    visitDurationMinutesUi,
    visitTimeRange,
  } = props;

  // 주문(orderId)이 아닌데도 스트링이 이미 확정된 흐름(PDP/대여)에서는
  // - 체크박스/직접입력 UI를 잠그고(보기 전용)
  // - 선택된 스트링 1개를 대표 아이템으로 노출
  const isLockedNonOrder = !orderId && (fromPDP || Boolean(rentalId));
  const lockedStringId = Array.isArray(formData.stringTypes) ? formData.stringTypes[0] : null;
  const lockedMountingFee = typeof priceView?.base === 'number' ? priceView.base : lineCount > 0 ? Math.round(price / lineCount) : 0;
  // 비-주문 기반에서(대여/PDP) 보통 스트링 1개가 고정이므로 첫 번째 id를 사용
  const lockedId = formData.stringTypes?.[0];
  const isNonOrderLocked = !orderId && (Boolean(rentalId) || Boolean(fromPDP));
  const canShowQty = isNonOrderLocked && lockedId && lockedId !== 'custom';
  const currentQty = lockedId ? formData.stringUseCounts?.[lockedId] ?? 1 : 1;
  const shouldHideStringSelection = Boolean(rentalId) && isLockedNonOrder && lockedStringId && lockedStringId !== 'custom';
  const rentalSelectStringHref = rentalId && rentalRacketId ? `/rentals/${encodeURIComponent(String(rentalRacketId))}/select-string?period=${encodeURIComponent(String(rentalDays ?? 7))}` : null;

  const limitReasons: string[] = [];
  if (typeof lockedStringStock === 'number') limitReasons.push(`스트링 재고 ${lockedStringStock}개`);
  if (typeof lockedRacketQuantity === 'number') limitReasons.push(`라켓 수량 ${lockedRacketQuantity}자루`);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-blue-600 mb-4">
          <ClipboardList className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">장착 정보</h2>
        <p className="text-muted-foreground">라켓과 스트링 정보를 선택해주세요</p>
      </div>

      <div className="space-y-6">
        {/* <div className="space-y-2">
          <Label htmlFor="racketType" className="text-sm font-medium">
            라켓 종류 <span className="text-red-500">*</span>
          </Label>
          <Input id="racketType" name="racketType" value={formData.racketType} onChange={handleInputChange} placeholder="예: 윌슨 프로 스태프 97" className="focus:ring-2 focus:ring-green-500 transition-all duration-200" />
        </div> */}

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">
              스트링 종류 <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2 space-y-2">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Zap className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700 dark:text-red-200">
                    <p className="font-medium mb-1">⚠️ 중요 안내</p>
                    {rentalId ? (
                      <>
                        <p>• 대여 신청에서 선택한 스트링/교체 옵션 기준으로 신청이 진행됩니다.</p>
                        <p>• 스트링 변경은 대여 신청 단계에서 다시 선택해 주세요.</p>
                        {rentalSelectStringHref && (
                          <div className="mt-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={rentalSelectStringHref}>스트링 변경하기</Link>
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p>• 스트링을 구매하시고 난 후 신청서를 작성하셔야 구매한 스트링 종류가 나옵니다.</p>
                        <p>• 고객님께서 보유하고 계신 스트링으로 단일 신청서를 작성하시려는 경우 "직접 입력하기" 를 클릭하여 신청해주세요.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* PDP에서 이어졌을 때 노출되는 스트링 정보 카드 */}
          {isLockedNonOrder && lockedStringId && lockedStringId !== 'custom' && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/70 p-3">
              {isLoadingPdpProduct ? (
                // 로딩 중에는 간단한 안내 문구만 표시
                <div className="text-xs text-blue-700">선택한 스트링 정보를 불러오는 중입니다...</div>
              ) : (
                <div className="flex items-center gap-3">
                  {/* 상품 이미지 */}
                  {pdpProduct?.image && (
                    <div className="relative h-16 w-16 overflow-hidden rounded-md bg-white shadow-sm">
                      <img src={pdpProduct.image} alt={pdpProduct.name} className="h-full w-full object-cover" />
                    </div>
                  )}

                  {/* 상품 텍스트 정보 */}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-blue-700">{rentalId ? '대여 신청에서 선택한 스트링' : '상품 상세에서 선택한 스트링'}</span>
                    <span className="text-sm font-medium text-gray-900">{pdpProduct?.name ?? '선택한 스트링으로 신청 중입니다.'}</span>
                    <span className="mt-1 text-xs text-gray-600">{rentalId ? '대여 신청 시 선택한 스트링 기준으로 진행됩니다.' : '이 신청서는 위 스트링을 기준으로 장착 서비스가 진행됩니다.'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* 주문 기반 진입 시 안내 문구 */}
          {orderId && typeof orderRemainingSlots === 'number' && (
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">이 주문에서 남은 교체 가능 횟수</span>
                <span className="font-semibold">{orderRemainingSlots}회</span>
                {typeof orderStringService?.totalSlots === 'number' && typeof orderStringService?.usedSlots === 'number' && (
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    (총 {orderStringService.totalSlots} / 사용 {orderStringService.usedSlots})
                  </span>
                )}
              </div>

              {isOrderSlotBlocked && <p className="mt-1 text-xs text-red-600 dark:text-red-400">이 주문은 더 이상 교체 신청을 진행할 수 없습니다. 추가 스트링 구매 후 다시 시도해 주세요.</p>}
            </div>
          )}
          {orderId && (
            <p className="mb-2 text-xs text-muted-foreground">
              이번 신청서는 <span className="font-semibold">여러 자루 라켓</span>을 한 번에 접수할 수 있습니다. 장착을 원하는 스트링 상품만 체크해 주세요. 선택한 개수만큼 라켓 장착이 진행되며, 장착비는{' '}
              <span className="font-semibold">1자루 기준 금액 × 선택한 스트링 개수</span>로 계산됩니다.
            </p>
          )}

          {!shouldHideStringSelection && (
            <div className={isLockedNonOrder ? 'pointer-events-none opacity-60' : ''}>
              <StringCheckboxes
                items={
                  orderId && order
                    ? (order?.items ?? [])
                        // 모든 상품 중 mountingFee가 있는 것만 (kind 체크 제거)
                        .filter((i: any) => typeof i.mountingFee === 'number' && i.mountingFee > 0)
                        .map((i: any) => ({
                          id: i.id,
                          name: i.name,
                          mountingFee: i.mountingFee,
                        }))
                    : // 주문이 없더라도(PDP/대여) 이미 확정된 스트링은 1개 아이템으로 노출
                    isLockedNonOrder && lockedStringId && lockedStringId !== 'custom'
                    ? [
                        {
                          id: lockedStringId,
                          name: pdpProduct?.name ?? '선택된 스트링',
                          mountingFee: lockedMountingFee,
                        },
                      ]
                    : [] // 단독 신청(직접 입력) 등은 빈 배열
                }
                stringTypes={formData.stringTypes}
                customInput={formData.customStringType}
                hideCustom={Boolean(orderId) || isLockedNonOrder}
                disabled={isLockedNonOrder}
                onChange={handleStringTypesChange}
                onCustomInputChange={handleCustomInputChange}
              />
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              예상 장착 비용
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 bg-blue-50/70 dark:border-blue-700">
                <span className="text-sm text-gray-600 dark:text-gray-300">{rentalId ? '교체비' : '기본 장착비'}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formData.stringTypes.includes('custom') ? '15,000원' : order && lineCount > 0 ? price.toLocaleString('ko-KR') + '원' : (priceView.base * Math.max(lineCount, 1)).toLocaleString('ko-KR') + '원'}
                </span>
              </div>

              {/* 주문 기반 진입 + 스트링 선택 완료 시 상세 안내 */}
              {orderId && order && lineCount > 0 && (
                <div className="mt-3 space-y-2 text-xs text-blue-700/90 dark:text-blue-100/90">
                  <p>
                    이번 신청에서 장착할 라켓 수: <span className="font-semibold">{lineCount}자루</span>
                  </p>

                  {/* 선택된 각 스트링별로 "구매 수량 vs 이번 신청 수량" 노출 + 수정 */}
                  <div className="space-y-1">
                    {formData.stringTypes.map((id: string) => {
                      if (id === 'custom') {
                        const useQty = formData.stringUseCounts['custom'] ?? 1;
                        return (
                          <div key={id} className="flex items-center justify-between gap-2">
                            <span className="truncate">• 직접 입력 스트링</span>
                            <div className="flex items-center gap-1">
                              <Label htmlFor="useQty-custom" className="sr-only">
                                사용할 개수
                              </Label>
                              <Input
                                id="useQty-custom"
                                type="number"
                                className="h-7 w-16 px-2 py-1 text-right text-xs border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500"
                                min={0}
                                max={99}
                                value={useQty}
                                onChange={(e) => handleUseQtyChange('custom', Number(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        );
                      }

                      const item = order.items.find((it: any) => it.id === id);
                      if (!item) return null;

                      const orderQty = item.quantity ?? 1;
                      const useQty = formData.stringUseCounts[id] ?? orderQty;

                      return (
                        <div key={id} className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            • {item.name} <span className="text-[11px] text-blue-800/80 dark:text-blue-100/80">(구매 {orderQty}개 중)</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <Label htmlFor={`useQty-${id}`} className="sr-only">
                              사용할 개수
                            </Label>
                            <Input
                              id={`useQty-${id}`}
                              type="number"
                              className="h-7 w-16 px-2 py-1 text-right text-xs border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500"
                              min={0}
                              max={orderQty}
                              value={useQty}
                              onChange={(e) => handleUseQtyChange(id, Number(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p>
                    이번 신청으로 추가 납부할 교체비 합계: <span className="font-semibold text-foreground">{price.toLocaleString('ko-KR')}원</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    스트링 상품 금액은 주문 결제 시 이미 지불하셨다면, 이번 신청에서는 <span className="font-semibold">교체비만 입금</span>하시면 됩니다.
                  </p>
                </div>
              )}

              {/* 주문 기반 진입 + 스트링 1개만 선택 시 상세 안내 */}
              {orderId && selectedOrderItem && lineCount === 1 && (
                <div className="mt-1 text-[11px] text-muted-foreground space-y-1">
                  {(() => {
                    // 스트링 금액: PDP 통합모드면 pdpStringPrice 우선, 아니면 주문 item 가격 사용
                    const stringPrice = isCombinedPdpMode ? (Number.isFinite(pdpStringPrice) && pdpStringPrice > 0 ? pdpStringPrice : Number(selectedOrderItem.price ?? 0)) : Number(selectedOrderItem.price ?? 0);

                    // 합계: 통합모드면 라켓 포함
                    const total = (isCombinedPdpMode ? Number(racketPrice ?? 0) : 0) + stringPrice + Number(priceView.base ?? 0);

                    return isCombinedPdpMode ? (
                      <>
                        <p>
                          라켓 {won(Number(racketPrice ?? 0))} + 스트링 {won(stringPrice)} + 교체비 {won(Number(priceView.base ?? 0))} = 총 {won(total)} <span className="text-muted-foreground">(주문 기준 총액)</span>
                        </p>
                        <p>
                          결제 성공 페이지를 건너뛴 경우, <span className="font-semibold">위 합계가 이번 주문의 총 입금 금액</span>입니다.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          스트링 상품 가격(이미 결제) {won(Number(selectedOrderItem.price ?? 0))} + 교체비 {won(Number(priceView.base ?? 0))} = 총 {won(Number(selectedOrderItem.price ?? 0) + Number(priceView.base ?? 0))}{' '}
                          <span className="text-muted-foreground">(참고용)</span>
                        </p>
                        <p>
                          스트링 상품 금액은 주문 결제 시 이미 지불하셨다면, 이번 신청에서는 <span className="font-semibold">교체비만 입금</span>하시면 됩니다.
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* (대여/PDP) 가용 수량 표기 + 수량 입력 (max 제한) */}
        {canShowQty && (
          <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">사용 수량</div>
                <div className="mt-1 text-xs text-slate-500">
                  {typeof maxNonOrderQty === 'number' ? `현재 가용 수량: ${maxNonOrderQty}개${limitReasons.length ? ` (기준: ${limitReasons.join(', ')})` : ''}` : '현재 가용 수량 정보를 불러오는 중이거나, 재고 관리가 꺼져 있습니다.'}
                </div>
              </div>
            </div>

            {typeof maxNonOrderQty === 'number' && maxNonOrderQty <= 1 ? (
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">1개 (고정)</div>
            ) : (
              <>
                <input
                  className="h-10 w-24 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm"
                  type="number"
                  min={1}
                  max={typeof maxNonOrderQty === 'number' ? maxNonOrderQty : undefined}
                  value={currentQty}
                  onChange={(e) => handleUseQtyChange(String(lockedId), Number(e.target.value))}
                />
                {typeof maxNonOrderQty === 'number' && <span className="text-xs text-slate-500">최대 {maxNonOrderQty}개</span>}
              </>
            )}
          </div>
        )}

        {/* 패키지 요약 - 장착 정보 단계 */}
        {!rentalId && (
          <div className="mt-4">
            <div
              className={
                packagePreview?.has
                  ? canApplyPackage
                    ? 'rounded-xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/40 px-4 py-3'
                    : 'rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-800/60 dark:bg-amber-950/40 px-4 py-3'
                  : 'rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-950/40 px-4 py-3'
              }
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Ticket className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div className="flex-1 text-[12px] leading-relaxed">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-50">패키지 사용 가능 여부</span>

                    {packagePreview?.has ? (
                      canApplyPackage ? (
                        <Badge className="h-5 rounded-full border-emerald-300/60 bg-emerald-100 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100">자동 적용 대상</Badge>
                      ) : (
                        <Badge className="h-5 rounded-full border-amber-300/60 bg-amber-100 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-100">이번 구성에는 적용 불가</Badge>
                      )
                    ) : (
                      <Badge className="h-5 rounded-full border-slate-300/60 bg-slate-100 text-xs font-medium text-slate-700 dark:bg-slate-900/40 dark:text-slate-100">보유 패키지 없음</Badge>
                    )}
                  </div>

                  {packagePreview?.has ? (
                    packageInsufficient ? (
                      <p className="text-sm text-amber-800 dark:text-amber-100">
                        현재 남은 횟수는 <span className="font-semibold">{packageRemaining}회</span>이고, 이번 신청에는 <span className="font-semibold">{requiredPassCount}회</span>가 필요하여 패키지가 자동 적용되지 않습니다.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-700 dark:text-slate-100">
                        이번 신청에는 패키지로 <span className="font-semibold">{requiredPassCount}회</span>가 필요합니다. 현재 남은 횟수는 <span className="font-semibold">{packageRemaining}회</span>
                        이며, 결제 단계에서 사용 여부를 선택할 수 있습니다.
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-200">현재 보유 중인 패키지가 없어 이번 신청은 일반 교체비 기준으로 결제됩니다.</p>
                  )}

                  {packagePreview?.has && (
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-200">
                      <span>필요 {requiredPassCount}회</span>
                      <span className="h-3 w-px bg-slate-300/60 dark:bg-slate-700/80" />
                      <span>잔여 {packageRemaining}회</span>
                      {packagePreview.expiresAt && (
                        <>
                          <span className="h-3 w-px bg-slate-300/60 dark:bg-slate-700/80" />
                          <span>만료일 {new Date(packagePreview.expiresAt).toLocaleDateString('ko-KR')}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* 라켓/라인 세부 입력 (선택 사항) */}
        {lineCount > 0 && (
          <Card className="border-none bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-slate-800/30 dark:to-slate-900/40 shadow-sm">
            <CardHeader className="pb-4 space-y-1">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">라켓별 세부 장착 정보</CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                위에서 선택한 <span className="font-semibold text-blue-600 dark:text-blue-400">"사용 개수"</span> 기준으로 라인이 자동 생성되어 있습니다. 각 라켓의 이름/별칭과 텐션, 메모를 입력하면 신청서에 함께 저장됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {linesForSubmit.map((line, index) => (
                <div key={line.id ?? index} className="group relative rounded-xl bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                  {/* 헤더 영역: 라켓 N, 스트링 이름 */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-700/30 dark:to-slate-800/30 border-b border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{line.racketType?.trim() || `라켓 ${index + 1}`}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate max-w-[200px]">{line.stringName}</span>
                    </div>
                  </div>

                  {/* 라켓 이름 + 텐션 */}
                  <div className="p-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">라켓 이름/별칭</Label>
                        <Input
                          value={line.racketType ?? ''}
                          onChange={(e) => handleLineFieldChange(index, 'racketType', e.target.value)}
                          placeholder="예: 라켓1"
                          className="h-9 text-sm border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">메인 텐션(kg)</Label>
                        <Input
                          value={line.tensionMain ?? ''}
                          onChange={(e) => handleLineFieldChange(index, 'tensionMain', e.target.value)}
                          placeholder="예: 24"
                          className="h-9 text-sm border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">크로스 텐션(kg)</Label>
                        <Input
                          value={line.tensionCross ?? ''}
                          onChange={(e) => handleLineFieldChange(index, 'tensionCross', e.target.value)}
                          placeholder="예: 23"
                          className="h-9 text-sm border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                        />
                      </div>
                    </div>

                    {/* 라켓별 메모 */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">라켓별 메모 (선택)</Label>
                      <Textarea
                        value={line.note ?? ''}
                        onChange={(e) => handleLineFieldChange(index, 'note', e.target.value)}
                        rows={2}
                        className="text-sm resize-none border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                        placeholder="요청사항을 적어 두셔도 좋습니다."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {normalizeCollection(formData.collectionMethod) === 'visit' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preferredDate" className="text-sm font-medium">
                장착 희망일 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="preferredDate"
                name="preferredDate"
                type="date"
                value={formData.preferredDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className="focus:ring-2 focus:ring-green-500 transition-all duration-200"
              />
              {formData.preferredDate && formData.preferredTime && visitSlotCountUi > 0 && visitDurationMinutesUi && (
                <div className="mt-3 text-xs md:text-[13px] text-slate-700 dark:text-slate-100 bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                  <p className="font-medium">
                    이번 방문 예상 소요 시간: {visitTimeRange ? `${visitTimeRange.start} ~ ${visitTimeRange.end}` : `약 ${visitDurationMinutesUi}분`} ({visitSlotCountUi}슬롯)
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed">선택하신 시간부터 연속으로 작업이 진행되며,&nbsp; 해당 시간대에는 다른 예약이 불가능합니다.</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                희망 시간대<span className="text-red-500">*</span>
              </Label>
              <TimeSlotSelector
                selected={formData.preferredTime}
                selectedDate={formData.preferredDate}
                onSelect={(value) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    preferredTime: prev.preferredTime === value ? '' : value,
                  }))
                }
                times={timeSlots}
                disabledTimes={disabledTimes}
                isLoading={slotsLoading && !hasCacheForDate}
                errorMessage={slotsError}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
