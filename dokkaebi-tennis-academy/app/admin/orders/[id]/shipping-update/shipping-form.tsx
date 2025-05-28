'use client';

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ShippingFormProps {
  initialShippingMethod?: string;
  initialEstimatedDelivery?: string;
  orderId?: string;
  onSuccess?: () => void;
}

export function ShippingForm({ initialShippingMethod = '', initialEstimatedDelivery = '', orderId = '', onSuccess }: ShippingFormProps) {
  const [shippingMethod, setShippingMethod] = useState(initialShippingMethod);
  const [estimatedDelivery, setEstimatedDelivery] = useState(initialEstimatedDelivery ? new Date(initialEstimatedDelivery).toISOString().split('T')[0] : '');
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shippingMethod) {
      toast.error('배송 방법을 선택해주세요');
      return;
    }

    if (!estimatedDelivery) {
      toast.error('예상 수령일을 입력해주세요');
      return;
    }

    if (shippingMethod === 'delivery') {
      if (!courier) {
        toast.error('택배사를 선택해주세요');
        return;
      }
      if (!trackingNumber) {
        toast.error('운송장 번호를 입력해주세요');
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
        body: JSON.stringify({
          shippingMethod,
          estimatedDate: estimatedDelivery,
          ...(shippingMethod === 'delivery' && {
            courier,
            trackingNumber,
          }),
        }),
      });

      console.log('배송 정보 업데이트 응답:', res);

      toast.success('배송 정보가 업데이트되었습니다');
      if (onSuccess) {
        onSuccess();
      }
      router.push(`/admin/orders/${orderId}`);
    } catch (error) {
      toast.error('배송 정보 업데이트 중 문제가 발생했습니다. 다시 시도해주세요');
      console.error('배송 정보 업데이트 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>배송 정보 수정</CardTitle>
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
