'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardFooter, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

interface Props {
  orderId: string;
  initialData: { total: number };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentEditForm({ orderId, initialData, onSuccess, onCancel }: Props) {
  const [total, setTotal] = useState(initialData.total);
  const [baselineTotal] = useState(initialData.total);

  // 입력값이 초기값과 달라지면 이탈 경고(뒤로가기/링크이동/탭닫기)
  const isDirty = total !== baselineTotal;
  useUnsavedChangesGuard(isDirty);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment: { total } }),
      });
      if (!res.ok) throw new Error(await res.text());
      showSuccessToast('결제 금액이 수정되었습니다.');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      showErrorToast('결제 금액 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle>결제 금액 수정</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <label className="font-medium">총 결제 금액 (원)</label>
          <input type="number" value={total} onChange={(e) => setTotal(Number(e.target.value))} className="w-full rounded border px-2 py-1" />
        </div>
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
