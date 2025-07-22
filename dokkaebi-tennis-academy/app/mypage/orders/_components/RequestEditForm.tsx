'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface Props {
  initialData: string;
  orderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RequestEditForm({ initialData, orderId, onSuccess, onCancel }: Props) {
  const [value, setValue] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliveryRequest: value }),
      credentials: 'include',
    });
    setLoading(false);
    if (res.ok) onSuccess();
    else alert('저장에 실패했습니다.');
  };

  return (
    <>
      <CardContent>
        <textarea className="w-full border rounded p-2" rows={4} value={value} onChange={(e) => setValue(e.target.value)} />
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? '저장 중…' : '저장'}
        </Button>
      </CardFooter>
    </>
  );
}
