'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';

const CANCEL_REASONS = ['상품 품절', '고객 요청', '배송 지연', '결제 오류', '기타'];

interface Props {
  orderId: string;
  disabled?: boolean;
}

export default function AdminCancelOrderDialog({ orderId, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error('취소 사유를 선택해주세요.');
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: '취소',
        reason: selectedReason,
        detail: selectedReason === '기타' ? detail : undefined,
      }),
    });

    if (!res.ok) {
      toast.error('주문 취소에 실패했습니다.');
    } else {
      toast.success('주문이 취소되었습니다.');
      await mutate(`/api/orders/${orderId}/status`, undefined, { revalidate: true });
      await mutate(`/api/orders/${orderId}/history`, undefined, { revalidate: true });
      router.refresh();
      setOpen(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={disabled} size="sm">
          주문 취소
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>주문 취소</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label>취소 사유</Label>
          <Select onValueChange={setSelectedReason} value={selectedReason}>
            <SelectTrigger>
              <SelectValue placeholder="사유 선택" />
            </SelectTrigger>
            <SelectContent>
              {CANCEL_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedReason === '기타' && <Textarea className="mt-2" placeholder="기타 사유 입력" value={detail} onChange={(e) => setDetail(e.target.value)} />}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || !selectedReason}>
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
