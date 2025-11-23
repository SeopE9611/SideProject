'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { mutate } from 'swr';
import { XCircle } from 'lucide-react';

interface CancelRentalDialogProps {
  rentalId: string;
  onSuccess?: () => void | Promise<void>;
  // 버튼을 노출하되 클릭만 막고 싶을 때 사용
  disabled?: boolean;
}

const CancelRentalDialog = ({ rentalId, onSuccess, disabled = false }: CancelRentalDialogProps) => {
  // 모달 열림/닫힘 상태
  const [open, setOpen] = useState(false);
  // 선택된 기본 사유
  const [selectedReason, setSelectedReason] = useState<string | undefined>();
  // "기타" 선택 시 추가 입력 사유
  const [otherReason, setOtherReason] = useState('');
  // API 호출 중 여부
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!selectedReason) {
      showErrorToast('취소 사유를 선택해주세요.');
      return;
    }
    if (selectedReason === '기타' && !otherReason.trim()) {
      showErrorToast('기타 사유를 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        // DB에는 사용자가 선택한 옵션 그대로 저장 (단순 변심 / 배송 지연 / 기타 …)
        reasonCode: selectedReason,
        // "기타"일 때만 입력한 텍스트 저장, 나머지는 공란
        reasonText: selectedReason === '기타' ? otherReason.trim() : '',
      };

      const res = await fetch(`/api/rentals/${rentalId}/cancel-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || '대여 취소 요청 처리 중 오류가 발생했습니다.');
      }

      showSuccessToast('대여 취소 요청이 접수되었습니다. 관리자 확인 후 처리됩니다.');

      // 상세 데이터 갱신 (혹시 다른 곳에서 SWR로 쓰고 있을 수도 있으니 유지)
      await mutate(`/api/rentals/${rentalId}`, undefined, { revalidate: true });
      // 마이페이지 상세에 맞춰주려면 이 줄도 추가해 두면 좋음
      await mutate(`/api/me/rentals/${rentalId}`, undefined, { revalidate: true });

      // 마이페이지 목록 갱신
      await mutate((key: string) => key?.startsWith('/api/me/rentals'), undefined, { revalidate: true });

      // 모달 닫기
      setOpen(false);
      if (onSuccess) {
        await onSuccess();
      }
    } catch (e) {
      console.error(e);
      showErrorToast('대여 취소 요청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // 제출 중에는 강제로 닫히지 않도록 보호 + 비활성 상태에서는 열리지 않음
        if (isSubmitting || disabled) return;
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isSubmitting || disabled} className={`gap-2 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
          <XCircle className="mr-2 h-4 w-4" />
          대여 취소 요청
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>대여 취소 요청</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>취소 사유</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="취소 사유를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="단순 변심">단순 변심</SelectItem>
                <SelectItem value="일정 변경">일정 변경</SelectItem>
                <SelectItem value="예약 실수">예약 실수</SelectItem>
                <SelectItem value="기타">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedReason === '기타' && (
            <div className="space-y-2">
              <Label>기타 사유</Label>
              <Textarea rows={3} value={otherReason} onChange={(e) => setOtherReason(e.target.value)} placeholder="취소 요청 사유를 입력해주세요." />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" disabled={isSubmitting} onClick={() => setOpen(false)}>
            닫기
          </Button>
          <Button variant="destructive" type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : '취소 요청하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelRentalDialog;
