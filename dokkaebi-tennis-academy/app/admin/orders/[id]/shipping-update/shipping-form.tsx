'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

interface ShippingFormProps {
  initialShippingMethod?: string;
  initialEstimatedDelivery?: string;
  initialCourier?: string;
  initialTrackingNumber?: string;
  orderId?: string;
  onSuccess?: () => void;
}

export default function ShippingForm({ initialShippingMethod, initialEstimatedDelivery, initialCourier, initialTrackingNumber, orderId, onSuccess }: ShippingFormProps) {
  // 빈 문자열로 초기화해서 Controlled 컴포넌트로 통일
  const [shippingMethod, setShippingMethod] = useState<string>(initialShippingMethod || '');
  // prop 변경에 반응하도록
  useEffect(() => {
    setShippingMethod(initialShippingMethod || '');
  }, [initialShippingMethod]);

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
    if (shippingMethod !== 'delivery') {
      setCourier('');
      setTrackingNumber('');
    }
  }, [shippingMethod]);

  // console.log('initialShippingMethod:', initialShippingMethod);

  // 기존 값이 하나라도 있으면 "수정", 아무것도 없으면 "등록"
  const isRegistered = Boolean(String(initialShippingMethod ?? '').trim() || String(initialEstimatedDelivery ?? '').trim() || String(initialCourier ?? '').trim() || String(initialTrackingNumber ?? '').trim());
  const formTitle = isRegistered ? '배송 정보 수정' : '배송 정보 등록';
  /**
   * ---- 이탈(탭 닫기/새로고침/뒤로가기/링크이동) 보호 ----
   * - baseline은 "초기 props" 기준으로 잡는다.
   * - 택배배송이 아닌 경우(courier/tracking은 의미 없으므로) 비교 시 ''로 정규화한다.
   */
  const baseline = useMemo(() => {
    const baseMethod = String(initialShippingMethod ?? '').trim();
    const baseEstimated = initialEstimatedDelivery ? new Date(initialEstimatedDelivery).toISOString().split('T')[0] : '';

    // 택배배송이 아니면 택배정보는 의미 없으므로 baseline에서도 ''로 맞춘다
    const baseCourier = baseMethod === 'delivery' ? String(initialCourier ?? '') : '';
    const baseTracking = baseMethod === 'delivery' ? String(initialTrackingNumber ?? '') : '';

    return {
      shippingMethod: baseMethod,
      estimatedDelivery: baseEstimated,
      courier: baseCourier,
      trackingNumber: baseTracking,
    };
  }, [initialShippingMethod, initialEstimatedDelivery, initialCourier, initialTrackingNumber]);

  const isDirty = useMemo(() => {
    const curCourier = shippingMethod === 'delivery' ? courier : '';
    const curTracking = shippingMethod === 'delivery' ? trackingNumber : '';

    return (
      baseline.shippingMethod !== shippingMethod ||
      baseline.estimatedDelivery !== estimatedDelivery ||
      baseline.courier !== curCourier ||
      baseline.trackingNumber !== curTracking
    );
  }, [baseline, shippingMethod, estimatedDelivery, courier, trackingNumber]);

  // 저장 중에는 굳이 경고 띄우지 않도록(UX)
  useUnsavedChangesGuard(isDirty && !isSubmitting);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shippingMethod) {
      showErrorToast('배송 방법을 선택해주세요');
      return;
    }

    if (!estimatedDelivery) {
      showErrorToast('예상 수령일을 입력해주세요');
      return;
    }

    if (shippingMethod === 'delivery') {
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
      const res = await fetch(`/api/orders/${orderId}/shipping`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          shippingMethod: shippingMethod, // 공통 필드
          estimatedDate: estimatedDelivery, // 공통 필드
          courier:
            shippingMethod === 'delivery'
              ? courier // 택배 선택 시 입력값
              : '', // 그 외는 빈 문자열로 초기화
          trackingNumber: shippingMethod === 'delivery' ? trackingNumber : '',
        }),
      });

      // console.log('배송 정보 업데이트 응답:', res);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        showErrorToast(body?.message ?? '배송 정보 업데이트에 실패했습니다.');
        return;
      }

      showSuccessToast('배송 정보가 업데이트되었습니다');

      router.refresh();

      if (onSuccess) {
        onSuccess();
      }
      router.push(`/admin/orders/${orderId}`);
    } catch (error) {
      showErrorToast('배송 정보 업데이트 중 문제가 발생했습니다. 다시 시도해주세요');
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
            <Label htmlFor="shipping-method">배송 방법</Label>
            <Select value={shippingMethod} onValueChange={setShippingMethod}>
              <SelectTrigger id="shipping-method">
                <SelectValue placeholder="배송 방법을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delivery">택배 배송</SelectItem>
                <SelectItem value="quick">퀵 배송 (당일)</SelectItem>
                <SelectItem value="visit">방문 수령</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated-delivery">예상 수령일</Label>
            <Input id="estimated-delivery" type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} min={new Date().toISOString().split('T')[0]} />
          </div>

          {shippingMethod === 'delivery' && (
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
