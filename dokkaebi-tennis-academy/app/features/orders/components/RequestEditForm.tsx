'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

interface Props {
  orderId: string;
  initialData: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RequestEditForm({ orderId, initialData, onSuccess, onCancel }: Props) {
  const [deliveryRequest, setDeliveryRequest] = useState(initialData);
  const [loading, setLoading] = useState(false);

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
