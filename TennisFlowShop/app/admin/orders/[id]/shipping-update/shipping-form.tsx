'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminMutator, getAdminErrorMessage } from '@/lib/admin/adminFetcher';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { normalizeOrderShippingMethod } from '@/lib/order-shipping';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

interface ShippingFormProps {
  initialShippingMethod?: string;
  initialEstimatedDelivery?: string;
  initialCourier?: string;
  initialTrackingNumber?: string;
  orderId?: string;
  onSuccess?: () => void;
  isVisitPickupOrder?: boolean;
}

export default function ShippingForm({ initialShippingMethod, initialEstimatedDelivery, initialCourier, initialTrackingNumber, orderId, onSuccess, isVisitPickupOrder = false }: ShippingFormProps) {
  // 빈 문자열로 초기화해서 Controlled 컴포넌트로 통일
  const normalizedInitialShippingMethod = normalizeOrderShippingMethod(initialShippingMethod) ?? String(initialShippingMethod ?? '').trim();
  const fixedVisitMethod = 'visit';

  const [shippingMethod, setShippingMethod] = useState<string>(isVisitPickupOrder ? fixedVisitMethod : normalizedInitialShippingMethod || '');
  // prop 변경에 반응하도록
  useEffect(() => {
    const normalized = normalizeOrderShippingMethod(initialShippingMethod) ?? String(initialShippingMethod ?? '').trim();
    setShippingMethod(isVisitPickupOrder ? fixedVisitMethod : normalized || '');
  }, [initialShippingMethod, isVisitPickupOrder]);

  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(initialEstimatedDelivery ? new Date(initialEstimatedDelivery).toISOString().split('T')[0] : '');
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // courier / trackingNumber 초기값 세팅
  // prop 변경 시 동기화
  useEffect(() => {
    setCourier(initialCourier || '');
  }, [initialCourier]);
  useEffect(() => {
    setTrackingNumber(initialTrackingNumber || '');
  }, [initialTrackingNumber]);

  // 배송 수단이 바뀔 때, 택배 정보 초기화
  useEffect(() => {
    if (!['delivery', 'courier'].includes(shippingMethod)) {
      setCourier('');
      setTrackingNumber('');
    }
  }, [shippingMethod]);

  // console.log('initialShippingMethod:', initialShippingMethod);

  // 기존 값이 하나라도 있으면 "수정", 아무것도 없으면 "등록"
  const isRegistered = Boolean(String(initialShippingMethod ?? '').trim() || String(initialEstimatedDelivery ?? '').trim() || String(initialCourier ?? '').trim() || String(initialTrackingNumber ?? '').trim());
  const formTitle = isVisitPickupOrder ? (isRegistered ? '방문 수령 정보 수정' : '방문 수령 정보 등록') : isRegistered ? '배송 정보 수정' : '배송 정보 등록';
  /**
   * ---- 이탈(탭 닫기/새로고침/뒤로가기/링크이동) 보호 ----
   * - baseline은 "초기 props" 기준으로 잡는다.
   * - 택배배송이 아닌 경우(courier/tracking은 의미 없으므로) 비교 시 ''로 정규화한다.
   */
  const baseline = useMemo(() => {
    const normalizedBaseMethod = normalizeOrderShippingMethod(initialShippingMethod) ?? String(initialShippingMethod ?? '').trim();
    const baseMethod = isVisitPickupOrder ? fixedVisitMethod : normalizedBaseMethod;
    const baseEstimated = initialEstimatedDelivery ? new Date(initialEstimatedDelivery).toISOString().split('T')[0] : '';

    // 택배배송이 아니면 택배정보는 의미 없으므로 baseline에서도 ''로 맞춘다
    const baseCourier = baseMethod === 'delivery' || baseMethod === 'courier' ? String(initialCourier ?? '') : '';
    const baseTracking = baseMethod === 'delivery' || baseMethod === 'courier' ? String(initialTrackingNumber ?? '') : '';

    return {
      shippingMethod: baseMethod,
      estimatedDelivery: baseEstimated,
      courier: baseCourier,
      trackingNumber: baseTracking,
    };
  }, [initialShippingMethod, initialEstimatedDelivery, initialCourier, initialTrackingNumber, isVisitPickupOrder]);

  const isDirty = useMemo(() => {
    const currentMethod = isVisitPickupOrder ? fixedVisitMethod : shippingMethod;
    const curCourier = currentMethod === 'delivery' || currentMethod === 'courier' ? courier : '';
    const curTracking = currentMethod === 'delivery' || currentMethod === 'courier' ? trackingNumber : '';

    return baseline.shippingMethod !== currentMethod || baseline.estimatedDelivery !== estimatedDelivery || baseline.courier !== curCourier || baseline.trackingNumber !== curTracking;
  }, [baseline, shippingMethod, estimatedDelivery, courier, trackingNumber, isVisitPickupOrder]);

  // 저장 중에는 굳이 경고 띄우지 않도록(UX)
  useUnsavedChangesGuard(isDirty && !isSubmitting);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shippingMethod && !isVisitPickupOrder) {
      showErrorToast('배송 방법을 선택해주세요');
      return;
    }

    if (!estimatedDelivery) {
      showErrorToast('예상 수령일을 입력해주세요');
      return;
    }

    const effectiveMethod = isVisitPickupOrder ? fixedVisitMethod : shippingMethod;

    if (effectiveMethod === 'delivery' || effectiveMethod === 'courier') {
      if (!courier) {
        showErrorToast('택배사를 선택해주세요');
        return;
      }
      if (!trackingNumber) {
        showErrorToast('운송장 번호를 입력해주세요');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await adminMutator(`/api/admin/orders/${orderId}/shipping`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          shippingMethod: effectiveMethod, // 공통 필드
          estimatedDate: estimatedDelivery, // 공통 필드
          courier:
            effectiveMethod === 'delivery' || effectiveMethod === 'courier'
              ? courier // 택배 선택 시 입력값
              : '', // 그 외는 빈 문자열로 초기화
          trackingNumber: effectiveMethod === 'delivery' || effectiveMethod === 'courier' ? trackingNumber : '',
        }),
      });

      showSuccessToast(isVisitPickupOrder ? '방문 수령 정보가 업데이트되었습니다' : '배송 정보가 업데이트되었습니다');

      router.refresh();

      if (onSuccess) {
        onSuccess();
      }
      router.push(`/admin/orders/${orderId}`);
    } catch (error) {
      showErrorToast(getAdminErrorMessage(error));
      console.error('배송 정보 업데이트 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{formTitle}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shipping-method">{isVisitPickupOrder ? '수령 방법' : '배송 방법'}</Label>
            {isVisitPickupOrder ? (
              <Input id="shipping-method" value="방문 수령" readOnly disabled />
            ) : (
              <Select value={shippingMethod} onValueChange={setShippingMethod}>
                <SelectTrigger id="shipping-method">
                  <SelectValue placeholder="배송 방법을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="courier">택배 배송</SelectItem>
                  <SelectItem value="quick">퀵 배송 (당일)</SelectItem>
                  <SelectItem value="visit">방문 수령</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated-delivery">예상 수령일</Label>
            <Input id="estimated-delivery" type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} min={new Date().toISOString().split('T')[0]} />
          </div>

          {!isVisitPickupOrder && (shippingMethod === 'delivery' || shippingMethod === 'courier') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="delivery">택배사</Label>
                <Select value={courier} onValueChange={setCourier}>
                  <SelectTrigger id="courier">
                    <SelectValue placeholder="택배사를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cj">CJ 대한통운</SelectItem>
                    <SelectItem value="hanjin">한진택배</SelectItem>
                    <SelectItem value="logen">로젠택배</SelectItem>
                    <SelectItem value="post">우체국택배</SelectItem>
                    <SelectItem value="etc">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracking-number">운송장 번호</Label>
                <Input id="tracking-number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="예: 1234567890" />
              </div>
            </>
          )}
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
