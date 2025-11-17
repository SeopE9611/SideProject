'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { XCircle } from 'lucide-react';

const CANCEL_REASONS = ['상품 품절', '고객 요청', '배송 지연', '결제 오류', '기타'];

interface Props {
  orderId: string;
  disabled?: boolean;
  /**
   * 취소가 성공했을 때 호출할 콜백
   * (OrderDetailClient로부터 내려받은 mutateOrder/ mutateHistory를 쓸 수도 있지만,
   * 여기서는 전역 mutate(...) 방식을 사용)
   */
  onCancelSuccess?: () => Promise<void>;
}

export default function AdminCancelOrderDialog({
  orderId,
  disabled,
  onCancelSuccess,
}: {
  orderId: string;
  disabled?: boolean;
  /**
   * 취소했을 때 호출될 콜백:
   *   reason: 사용자가 선택한 사유
   *   detail?: 선택 사유이 '기타'일 때 추가 입력
   */
  onCancelSuccess?: (reason: string, detail?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      showErrorToast('취소 사유를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 서버에 관리자 취소 승인 요청
      const res = await fetch(`/api/orders/${orderId}/cancel-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          // 관리자 선택 사유 → reasonCode
          reasonCode: selectedReason,
          // 기타 선택 시만 상세 사유 전달
          reasonText: selectedReason === '기타' ? detail : undefined,
        }),
      });

      if (!res.ok) {
        const message = await res.text().catch(() => '');
        throw new Error(message || '서버 오류');
      }

      showSuccessToast('주문 취소 처리가 완료되었습니다.');

      // ─ SWR 캐시 재검증 ─
      // 주문 상태 뱃지
      await mutate(`/api/orders/${orderId}/status`);
      // 주문 상세
      await mutate(`/api/orders/${orderId}`);
      // 처리 이력 (무한스크롤 키 전체)
      await mutate((key: string) => typeof key === 'string' && key.startsWith(`/api/orders/${orderId}/history`));
      // 관리자 주문 목록
      await mutate('/api/orders');

      // OrderDetailClient 쪽에서 넘겨 준 옵티미스틱 콜백이 있다면 호출
      if (onCancelSuccess) {
        await onCancelSuccess(selectedReason, detail);
      }

      // 이력 페이지 번호 리셋 이벤트 (이미 사용 중인 패턴 유지)
      window.dispatchEvent(new Event('order-history-page-reset'));

      // 모달 닫기
      setOpen(false);
    } catch (err: any) {
      console.error('취소 처리 중 오류:', err);
      showErrorToast(`주문 취소 처리에 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={disabled || loading} size="sm">
          <XCircle className="mr-2 h-4 w-4" />
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
