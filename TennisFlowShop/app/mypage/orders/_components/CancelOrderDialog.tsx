'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getRefundBankLabel, REFUND_ACCOUNT_BANKS } from '@/lib/cancel-request/refund-account';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { mutate } from 'swr';

// props: 주문 ID만 전달받음
interface CancelOrderDialogProps {
  orderId: string;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CancelOrderDialog = ({ orderId, children, open, onOpenChange }: CancelOrderDialogProps) => {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  /**
   * 이 컴포넌트는
   * 1) 목록 페이지에서는 controlled(open/onOpenChange 사용)
   * 2) 상세 페이지에서는 uncontrolled(children trigger만 사용)
   * 두 방식이 모두 존재한다.
   *
   * 그래서 실제 열림 상태는 "props open 우선, 없으면 internalOpen"으로 합쳐서 써야 한다.
   */
  const dialogOpen = typeof open === 'boolean' ? open : internalOpen;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    // uncontrolled 사용처 대응
    if (typeof open !== 'boolean') {
      setInternalOpen(nextOpen);
    }

    // controlled 사용처 대응
    onOpenChange?.(nextOpen);
  };

  //  로컬 상태: 사유 선택값, 기타 입력값, 제출 중 여부
  const [selectedReason, setSelectedReason] = useState<string | undefined>();
  const [otherReason, setOtherReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refundBank, setRefundBank] = useState<string>('');
  const [refundAccount, setRefundAccount] = useState('');
  const [refundHolder, setRefundHolder] = useState('');

  // 교체 신청 동시 취소 확인 단계 여부 / 신청 개수
  const [confirmWithStringing, setConfirmWithStringing] = useState(false);
  const [linkedCount, setLinkedCount] = useState<number | null>(null);

  /**
   * 이탈 경고(Unsaved Changes Guard)
   * - 다이얼로그가 열린 상태에서 입력/선택이 있으면 경고
   * - 409로 “연결된 신청 함께 취소” 확인 단계로 들어간 상태도 dirty로 간주
   */
  const isDirty = dialogOpen && (selectedReason !== undefined || otherReason.trim().length > 0 || refundBank !== '' || refundAccount.trim().length > 0 || refundHolder.trim().length > 0 || confirmWithStringing || linkedCount !== null);
  useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    if (!dialogOpen) {
      setSelectedReason(undefined);
      setOtherReason('');
      setRefundBank('');
      setRefundAccount('');
      setRefundHolder('');
      setConfirmWithStringing(false);
      setLinkedCount(null);
    }
  }, [dialogOpen]);

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

    const refundAccountDigits = refundAccount.replace(/\D/g, '');
    if (!refundBank || !refundAccountDigits || !refundHolder.trim()) {
      showErrorToast('환불 은행, 계좌번호, 예금주를 입력해주세요.');
      return;
    }
    if (refundAccountDigits.length < 8 || refundAccountDigits.length > 20) {
      showErrorToast('계좌번호는 -를 제외한 숫자 8~20자리로 입력해주세요.');
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
          refundAccount: {
            bank: refundBank,
            account: refundAccountDigits,
            holder: refundHolder.trim(),
          },
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
      handleDialogOpenChange(false);
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
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
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
            <div className="mb-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground">
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
          <Select value={selectedReason} onValueChange={setSelectedReason}>
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
          <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">환불 계좌 정보</p>
              <p className="text-xs text-muted-foreground mt-1">취소 승인 후 환불 처리 시 사용할 계좌입니다.</p>
            </div>

            <div className="space-y-2">
              <Label>환불 은행</Label>
              <Select value={refundBank} onValueChange={setRefundBank}>
                <SelectTrigger>
                  <SelectValue placeholder="은행 선택" />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_ACCOUNT_BANKS.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {getRefundBankLabel(bank)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>환불 계좌번호</Label>
              <Input value={refundAccount} onChange={(e) => setRefundAccount(e.target.value)} placeholder="숫자만 입력 가능" />
            </div>

            <div className="space-y-2">
              <Label>예금주</Label>
              <Input value={refundHolder} onChange={(e) => setRefundHolder(e.target.value)} placeholder="예금주명을 입력해주세요" />
            </div>
          </div>
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
