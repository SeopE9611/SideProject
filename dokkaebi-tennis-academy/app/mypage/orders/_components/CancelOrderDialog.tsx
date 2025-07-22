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
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { XCircle } from 'lucide-react';

// props: 주문 ID만 전달받음
interface CancelOrderDialogProps {
  orderId: string;
}

const CancelOrderDialog = ({ orderId }: CancelOrderDialogProps) => {
  const router = useRouter();

  //  로컬 상태: 사유 선택값, 기타 입력값, 제출 중 여부
  const [selectedReason, setSelectedReason] = useState<string | undefined>();
  const [otherReason, setOtherReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  //  제출 처리 함수
  const handleSubmit = async () => {
    if (!selectedReason) {
      showErrorToast('취소 사유를 선택해주세요.');
      return;
    }

    const finalReason = selectedReason === '기타' ? otherReason.trim() : selectedReason;

    if (selectedReason === '기타' && !finalReason) {
      showErrorToast('기타 사유를 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: '취소',
          cancelReason: finalReason,
          detail: selectedReason === '기타' ? otherReason.trim() : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('서버 응답 실패');
      }

      showSuccessToast('주문이 성공적으로 취소되었습니다.');
      // status 전용 버튼/Badge 갱신 (OrderStatusBadge가 /api/orders/{orderId}/status 를 SWR로 가져오는 경우)
      await mutate(`/api/orders/${orderId}/status`, undefined, { revalidate: true });

      // 처리 이력 갱신 (OrderHistory가 /api/orders/{orderId}/history를 SWR로 가져오는 경우)
      await mutate(`/api/orders/${orderId}/history`, undefined, { revalidate: true });

      //  마이페이지 목록 갱신 (OrderList가 /api/users/me/orders를 SWR로 가져오는 경우)
      await mutate('/api/users/me/orders', undefined, { revalidate: true });

      //  주문 전체 데이터 (/api/orders/{orderId}) 갱신 : OrderDetailClient가 이 키로 데이터를 가져오기 때문
      await mutate(`/api/orders/${orderId}`, undefined, { revalidate: true });
      // router.refresh(); //   주문 상세 UI 갱신
    } catch (err) {
      console.error(err);
      showErrorToast('주문 취소 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog>
      {/*  다이얼로그 트리거 버튼 */}
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="mr-2 h-4 w-4" />
          주문 취소
        </Button>
      </DialogTrigger>

      {/*  다이얼로그 본문 */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>주문을 취소하시겠습니까?</DialogTitle>
        </DialogHeader>

        {/*  사유 선택 */}
        <div className="space-y-2 py-4">
          <Label>취소 사유</Label>
          <Select onValueChange={setSelectedReason}>
            <SelectTrigger>
              <SelectValue placeholder="사유 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="단순 변심">단순 변심</SelectItem>
              <SelectItem value="상품 정보와 다름">상품 정보와 다름</SelectItem>
              <SelectItem value="배송 지연">배송 지연</SelectItem>
              <SelectItem value="다른 상품으로 대체">다른 상품으로 대체</SelectItem>
              <SelectItem value="기타">기타</SelectItem>
            </SelectContent>
          </Select>

          {/*  기타 선택 시 textarea 활성화 */}
          {selectedReason === '기타' && <Textarea className="mt-2" placeholder="기타 사유를 입력해주세요" value={otherReason} onChange={(e) => setOtherReason(e.target.value)} />}
        </div>

        {/*  제출 버튼 */}
        <DialogFooter>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : '확인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelOrderDialog;
