'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

interface Props {
  orderId: string;
  initialData: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RequestEditForm({ orderId, initialData, onSuccess, onCancel }: Props) {
  const [deliveryRequest, setDeliveryRequest] = useState(initialData);
  // 폼이 열린 시점의 초기값(baseline)을 고정해서 dirty 비교
  // (props initialData가 나중에 바뀌더라도, "내가 편집 시작한 기준"은 흔들리지 않게)
  const [baseline, setBaseline] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const isDirty = deliveryRequest !== baseline;
  useUnsavedChangesGuard(isDirty);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryRequest }),
      });
      if (!res.ok) throw new Error(await res.text());
      showSuccessToast('배송 요청사항이 수정되었습니다.');
      // 저장 성공 시 baseline 갱신 → 같은 화면에 남아있어도 경고가 꺼지게
      // (상위에서 닫지 않고 그대로 유지하는 UX에서도 안전)
      setBaseline(deliveryRequest);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      showErrorToast('수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle>배송 요청사항 수정</CardTitle>
      </CardHeader>
      <CardContent>
        <textarea rows={4} value={deliveryRequest} onChange={(e) => setDeliveryRequest(e.target.value)} className="w-full rounded border p-2" />
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          취소
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          저장
        </Button>
      </CardFooter>
    </>
  );
}
