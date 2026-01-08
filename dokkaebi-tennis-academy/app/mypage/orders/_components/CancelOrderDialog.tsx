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
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CancelOrderDialog = ({ orderId, children, open, onOpenChange }: CancelOrderDialogProps) => {
  const router = useRouter();

  //  로컬 상태: 사유 선택값, 기타 입력값, 제출 중 여부
  const [selectedReason, setSelectedReason] = useState<string | undefined>();
  const [otherReason, setOtherReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 교체 신청 동시 취소 확인 단계 여부 / 신청 개수
  const [confirmWithStringing, setConfirmWithStringing] = useState(false);
  const [linkedCount, setLinkedCount] = useState<number | null>(null);

  //  제출 처리 함수
  const handleSubmit = async () => {
    // 이미 제출 중이면 중복 요청 방지
    if (isSubmitting) return;

    // 기본 유효성 검사
    if (!selectedReason) {
      showErrorToast('취소 사유를 선택해주세요.');
      return;
    }
    if (selectedReason === '기타' && !otherReason.trim()) {
      showErrorToast('기타 사유를 입력해주세요.');
      return;
    }

    const finalReason = selectedReason;

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/orders/${orderId}/cancel-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          // reasonCode: 셀렉트 박스 라벨(예: '단순 변심', '다른 상품으로 대체')
          reasonCode: finalReason,
          // 기타 사유 텍스트
          reasonText: selectedReason === '기타' ? otherReason.trim() : undefined,
          // 연결된 교체 서비스 신청도 함께 취소되도록 요청하는지 여부
          withStringing: confirmWithStringing ? true : false,
        }),
      });

      // 409: 비즈니스 룰 위반 (연결된 신청 존재 등)
      if (!res.ok && res.status === 409) {
        let payload: any = null;
        try {
          payload = await res.json();
        } catch {
          // json 파싱 실패 시에는 아래 일반 에러 처리
        }

        if (payload?.errorCode === 'STRINGING_IN_PROGRESS') {
          // 이미 작업 중/완료라 취소 요청 자체가 불가한 경우
          showErrorToast(payload.message || '이미 작업 중이거나 완료된 교체 서비스 신청이 있어 주문 취소 요청을 할 수 없습니다.');
          setIsSubmitting(false);
          return;
        }

        if (payload?.errorCode === 'STRINGING_APPS_EXIST') {
          // 취소 가능한 신청이 있어서, 한 번 더 확인해야 하는 경우
          const count = payload.data?.count ?? null;
          setLinkedCount(typeof count === 'number' ? count : null);
          setConfirmWithStringing(true);

          showErrorToast(payload.message || '이 주문으로 접수된 교체 서비스 신청이 있습니다. 한 번 더 확인 후 취소 요청을 진행해 주세요.');

          setIsSubmitting(false);
          return;
        }

        // 그 외 409는 일반 에러로 처리
        const message = await res.text().catch(() => '');
        throw new Error(message || '취소 요청 처리 중 오류가 발생했습니다.');
      }

      // 409 외 일반 에러
      if (!res.ok) {
        const message = await res.text().catch(() => '');
        throw new Error(message || '취소 요청 처리 중 오류가 발생했습니다.');
      }

      // 여기까지 왔으면:
      // - 연결된 신청이 없거나
      // - 있더라도 사용자가 "신청도 함께 취소되도록" 동의(withStringing: true)한 상태
      showSuccessToast(confirmWithStringing ? '주문과 연결된 교체 서비스 신청을 함께 취소 요청했습니다. 관리자 확인 후 처리됩니다.' : '취소 요청이 접수되었습니다. 관리자 확인 후 처리됩니다.');
      onOpenChange?.(false);
      // status 전용 버튼/Badge 갱신 (OrderStatusBadge가 /api/orders/{orderId}/status 를 SWR로 가져오는 경우)
      await mutate(`/api/orders/${orderId}/status`, undefined, { revalidate: true });

      // 처리 이력 갱신 (OrderHistory가 /api/orders/{orderId}/history를 SWR로 가져오는 경우)
      await mutate(`/api/orders/${orderId}/history`, undefined, { revalidate: true });

      //  마이페이지 목록 갱신 (OrderList가 /api/users/me/orders를 SWR로 가져오는 경우)
      await mutate('/api/users/me/orders', undefined, { revalidate: true });

      //  주문 전체 데이터 (/api/orders/{orderId}) 갱신 : OrderDetailClient가 이 키로 데이터를 가져오기 때문
      await mutate(`/api/orders/${orderId}`, undefined, { revalidate: true });
      // router.refresh(); //   주문 상세 UI 갱신

      // 다이얼로그 닫기/상태 초기화는 여기서 처리할지,
      // 상위에서 open state를 제어하는지에 따라 다름.
      // 이 컴포넌트는 내부에서 Dialog open 상태를 들고 있지 않으므로
      // 일단 confirmWithStringing, linkedCount 만 초기화해 둔다.
      setConfirmWithStringing(false);
      setLinkedCount(null);
    } catch (err: any) {
      console.error(err);
      showErrorToast(err.message || '주문 취소 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}

      {/*  다이얼로그 본문 */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>주문 취소 요청을 보내시겠습니까?</DialogTitle>
        </DialogHeader>

        {/*  사유 선택 */}
        <div className="space-y-2 py-4">
          {/* 연결된 교체 서비스 신청 경고 메시지 */}
          {confirmWithStringing && (
            <div className="mb-2 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <div className="mb-1 font-semibold">교체 서비스 신청도 함께 취소됩니다.</div>
              <p>
                이 주문으로 접수된 교체 서비스 신청
                {linkedCount && linkedCount > 1 ? ` ${linkedCount}건` : '이'} 있습니다.
                <br />
                계속 진행하면 해당 신청도 함께 취소되도록 요청됩니다. 정말 진행하시겠습니까?
              </p>
            </div>
          )}

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
            {isSubmitting ? '요청 처리 중...' : '취소 요청하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelOrderDialog;
