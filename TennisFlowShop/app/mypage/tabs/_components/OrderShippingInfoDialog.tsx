'use client';

import { Copy, Store, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AsyncState from '@/components/system/AsyncState';
import { getMypageUserStatusLabel } from '@/app/mypage/_lib/status-label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { authenticatedSWRFetcher } from '@/lib/fetchers/authenticatedSWRFetcher';
import { trackingSWRFetcher, type TrackingSWRFetcherError } from '@/lib/fetchers/trackingSWRFetcher';
import { getOrderDeliveryInfoTitle, getOrderStatusLabelForDisplay, isVisitPickupOrder } from '@/lib/order-shipping';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
type CourierCode = 'cj' | 'hanjin' | 'logen' | 'lotte' | 'post' | 'daesin' | 'ilogen' | 'kr' | 'etc' | string;

type OrderDetail = {
  status?: string;
  shippingInfo?: {
    shippingMethod?: string;
    deliveryMethod?: string;
    estimatedDate?: string;
    name?: string;
    phone?: string;
    address?: string;
    addressDetail?: string;
    postalCode?: string;
    deliveryRequest?: string;
    invoice?: {
      courier?: CourierCode;
      trackingNumber?: string;
      updatedAt?: string;
    };
  };
};

type OrderTrackingResponse =
  | {
      success: true;
      supported: true;
      displayStatus: string;
      linkUrl: string;
      lastEvent: {
        time: string | null;
        statusText: string | null;
        locationName: string | null;
        description: string | null;
      } | null;
    }
  | {
      success: true;
      supported: false;
      reason: 'unsupported_courier';
      message: string;
    }
  | {
      success: false;
      errorCode?: 'NOT_FOUND' | 'BAD_REQUEST' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'INTERNAL' | 'UNKNOWN';
      message: string;
    };

function courierLabel(code?: CourierCode) {
  switch (code) {
    case 'cj':
      return 'CJ대한통운';
    case 'hanjin':
      return '한진택배';
    case 'logen':
      return '로젠택배';
    case 'lotte':
      return '롯데택배';
    case 'post':
      return '우체국택배';
    case 'daesin':
      return '대신택배';
    case 'ilogen':
      return '일로젠';
    case 'kr':
      return '대한통운(구)';
    case 'etc':
      return '기타';
    default:
      return code || '-';
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    showSuccessToast('복사했습니다.');
  } catch {
    showErrorToast('복사에 실패했습니다.');
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return '미정';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '미정';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTrackingFailureMessage = (tracking: Extract<OrderTrackingResponse, { success: false }>) => {
  if (tracking.errorCode === 'UNAUTHENTICATED' || tracking.errorCode === 'FORBIDDEN') {
    return '배송조회 서비스 설정을 확인해주세요.';
  }
  if (tracking.errorCode === 'BAD_REQUEST') {
    return '운송장 번호 형식이 올바르지 않습니다.';
  }
  return tracking.message || '배송조회 정보를 불러오지 못했습니다.';
};

const getTrackingErrorMessage = (trackingData: OrderTrackingResponse | undefined, trackingError: unknown) => {
  if (trackingData && !trackingData.success && trackingData.message) {
    return trackingData.message;
  }
  const message = (trackingError as TrackingSWRFetcherError | undefined)?.message;
  return message || '배송조회 정보를 불러오지 못했습니다.';
};

/**
 * 전체내역(Activity) 카드에서 운송장/배송 정보를 빠르게 확인하기 위한 모달
 * - Activity API에는 invoice가 없으므로, 모달이 열릴 때만 주문 상세 API를 호출합니다.
 */
export default function OrderShippingInfoDialog({
  orderId,
  className,
  triggerLabel,
  shippingMethod,
  open,
  onOpenChange,
  hideTrigger,
}: {
  orderId: string;
  className?: string;
  triggerLabel?: string;
  shippingMethod?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = typeof open === 'boolean' ? open : internalOpen;
  const [cachedData, setCachedData] = useState<OrderDetail | null>(null);
  const { data, isLoading, error, mutate } = useSWR<OrderDetail>(dialogOpen ? `/api/orders/${orderId}` : null, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (typeof open !== 'boolean') {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  /**
   * 모달을 닫는 순간 open=false가 되면서 SWR key가 null로 바뀌어
   * data가 먼저 사라지고, Dialog 닫힘 애니메이션 동안 fallback 문구가
   * 한 프레임 보일 수 있습니다.
   *
   * 마지막으로 성공 조회한 데이터를 로컬에 캐시해
   * 닫히는 동안에도 잠깐 유지되도록 처리합니다.
   */
  useEffect(() => {
    if (data) {
      setCachedData(data);
    }
  }, [data]);

  /**
   * orderId가 바뀌는 특수 케이스에 대비해 캐시를 초기화합니다.
   * (일반적인 현재 구조에서는 거의 고정이지만 안전장치로 둡니다.)
   */
  useEffect(() => {
    setCachedData(null);
  }, [orderId]);

  const displayData = data ?? cachedData;

  const invoice = displayData?.shippingInfo?.invoice;
  const isVisitPickup = isVisitPickupOrder(displayData?.shippingInfo ?? { shippingMethod });
  const infoTitle = getOrderDeliveryInfoTitle(displayData?.shippingInfo ?? { shippingMethod });
  const resolvedTriggerLabel = triggerLabel ?? (isVisitPickup ? '방문 수령 정보 확인' : '배송정보 확인');
  const TriggerIcon = isVisitPickup ? Store : Truck;
  const asyncResourceName = isVisitPickup ? '방문 수령 정보' : '배송 정보';
  const courier = invoice?.courier;
  const trackingNumber = invoice?.trackingNumber;
  const hasInvoice = Boolean(courier || trackingNumber);
  const rawStatusLabel = getMypageUserStatusLabel(displayData?.status);
  const displayStatusLabel = getOrderStatusLabelForDisplay(rawStatusLabel, displayData?.shippingInfo);
  const canTrackDelivery = dialogOpen && !isVisitPickup && Boolean(trackingNumber);
  const { data: trackingData, isLoading: isTrackingLoading, error: trackingError } = useSWR<OrderTrackingResponse>(
    canTrackDelivery ? `/api/orders/${orderId}/tracking` : null,
    trackingSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const shouldShowTrackingSummarySkeleton = isTrackingLoading && !trackingData && !trackingError;
  const shouldShowTrackingStatusNotice = Boolean(
    trackingData &&
      trackingData.success &&
      trackingData.supported &&
      trackingData.displayStatus &&
      trackingData.displayStatus.trim() !== (displayStatusLabel || '').trim(),
  );

  const addressText = useMemo(() => {
    const s = displayData?.shippingInfo;
    const line1 = [s?.address, s?.addressDetail].filter(Boolean).join(' ');
    const line2 = s?.postalCode ? `(${s.postalCode})` : '';
    return [line1, line2].filter(Boolean).join(' ');
  }, [displayData]);

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {!hideTrigger ? (
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline" className={className}>
            <TriggerIcon className="mr-2 h-4 w-4" />
            {resolvedTriggerLabel}
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{infoTitle}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-36 rounded-full" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : error && !displayData ? (
          <AsyncState
            kind="error"
            variant="inline"
            resourceName={asyncResourceName}
            onAction={() => mutate()}
          />
        ) : isVisitPickup ? (
          <div className="space-y-4">
            <div className="space-y-1 text-sm">
              <div className="font-medium">수령 방법</div>
              <div className="text-muted-foreground">방문 수령</div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="font-medium">예상 수령일</div>
              <div className="text-muted-foreground">{formatDate(displayData?.shippingInfo?.estimatedDate)}</div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="font-medium">현재 상태</div>
              <div className="text-muted-foreground">{displayStatusLabel || '상태 미정'}</div>
            </div>

            <Separator />

            <p className="text-sm text-muted-foreground">방문 수령 주문입니다. 준비 완료 후 매장에서 수령해주세요.</p>
          </div>
        ) : !hasInvoice ? (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">아직 운송장(택배사/운송장번호) 정보가 등록되지 않았습니다.</p>
            <p className="text-muted-foreground">관리자가 운송장 입력 후 배송 상태를 변경하면 이곳에서 확인할 수 있습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{courierLabel(courier)}</Badge>
              {trackingNumber ? <Badge variant="outline">{trackingNumber}</Badge> : null}
              {trackingNumber ? (
                <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => copyToClipboard(trackingNumber)}>
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">운송장 번호 복사</span>
                </Button>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="font-medium">수령인</div>
              <div className="text-muted-foreground">{[displayData?.shippingInfo?.name, displayData?.shippingInfo?.phone].filter(Boolean).join(' / ') || '-'}</div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="font-medium">주소</div>
              <div className="text-muted-foreground">{addressText || '-'}</div>
            </div>

            {displayData?.shippingInfo?.deliveryRequest ? (
              <div className="space-y-1 text-sm">
                <div className="font-medium">배송 요청사항</div>
                <div className="text-muted-foreground">{displayData.shippingInfo.deliveryRequest}</div>
              </div>
            ) : null}

            {shouldShowTrackingSummarySkeleton ? (
              <div className="space-y-2 rounded-md border border-border bg-muted/50 p-3 text-sm">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </div>
            ) : null}

            {!isTrackingLoading && !trackingError && trackingData ? (
              <div className="space-y-2 rounded-md border border-border bg-muted/50 p-3 text-sm">
                {trackingData.success && trackingData.supported ? (
                  <>
                    <p className="text-foreground">
                      <span className="text-muted-foreground">실시간 배송 상태:</span> {trackingData.displayStatus}
                    </p>
                    {trackingData.lastEvent?.locationName ? (
                      <p className="text-foreground">
                        <span className="text-muted-foreground">최근 위치:</span> {trackingData.lastEvent.locationName}
                      </p>
                    ) : null}
                    {trackingData.lastEvent?.time ? (
                      <p className="text-foreground">
                        <span className="text-muted-foreground">최근 갱신:</span> {formatDateTime(trackingData.lastEvent.time)}
                      </p>
                    ) : null}
                    {shouldShowTrackingStatusNotice ? (
                      <div className="space-y-0.5 rounded-md bg-background/70 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground">
                        <p>실시간 배송 상태는 택배사 기준이며,</p>
                        <p>주문 상태와 다를 수 있습니다.</p>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(trackingData.linkUrl, '_blank', 'noopener,noreferrer')}
                    >
                      배송조회
                    </Button>
                  </>
                ) : trackingData.success && !trackingData.supported ? (
                  <p className="text-muted-foreground">{trackingData.message}</p>
                ) : (
                  <p className="text-destructive">{getTrackingFailureMessage(trackingData)}</p>
                )}
              </div>
            ) : null}

            {trackingError ? <p className="text-sm text-destructive">{getTrackingErrorMessage(trackingData, trackingError)}</p> : null}

            {invoice?.updatedAt ? <div className="text-xs text-muted-foreground">운송장 업데이트: {new Date(invoice.updatedAt).toLocaleString()}</div> : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
