'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Truck, Package, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

interface ShippingFormProps {
  applicationId: string;
  initialShippingMethod?: string;
  initialEstimatedDelivery?: string;
  initialCourier?: string;
  initialTrackingNumber?: string;
  onSuccess?: () => void;
}

export default function ShippingForm({ applicationId, initialShippingMethod, initialEstimatedDelivery, initialCourier, initialTrackingNumber, onSuccess }: ShippingFormProps) {
  const [shippingMethod, setShippingMethod] = useState<string>(initialShippingMethod || '');

  useEffect(() => {
    setShippingMethod(initialShippingMethod || '');
  }, [initialShippingMethod]);

  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(initialEstimatedDelivery ? new Date(initialEstimatedDelivery).toISOString().split('T')[0] : '');
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const isEdit = Boolean(initialShippingMethod || initialEstimatedDelivery || initialCourier || initialTrackingNumber);
  useEffect(() => {
    setCourier(initialCourier || '');
  }, [initialCourier]);

  useEffect(() => {
    setTrackingNumber(initialTrackingNumber || '');
  }, [initialTrackingNumber]);

  useEffect(() => {
    if (shippingMethod !== 'delivery') {
      setCourier('');
      setTrackingNumber('');
    }
  }, [shippingMethod]);

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
      const res = await fetch(`/api/applications/stringing/${applicationId}/shipping`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          shippingInfo: {
            shippingMethod: shippingMethod,
            estimatedDate: estimatedDelivery,
            invoice: {
              courier: shippingMethod === 'delivery' ? courier : '',
              trackingNumber: shippingMethod === 'delivery' ? trackingNumber : '',
            },
          },
        }),
      });

      if (!res.ok) {
        // 서버가 message를 내려주는 경우를 우선 사용
        const body = await res.json().catch(() => null);
        showErrorToast(body?.message ?? '배송 정보 업데이트에 실패했습니다.');
        return;
      }

      showSuccessToast('배송 정보가 업데이트되었습니다');

      router.refresh();

      if (onSuccess) {
        onSuccess();
      }
      router.push(`/admin/applications/stringing/${applicationId}`);
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
        <CardTitle>{isEdit ? '배송 정보 수정' : '배송 정보 등록'}</CardTitle>
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
                <Label htmlFor="courier">택배사</Label>
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
