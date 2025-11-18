'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast } from '@/lib/toast';

interface CancelStringingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (params: { reasonCode: string; reasonText?: string }) => void;
  isSubmitting?: boolean;
}

const CancelStringingDialog = ({ open, onOpenChange, onConfirm, isSubmitting = false }: CancelStringingDialogProps) => {
  // 로컬 상태: 사유 선택값, 기타 입력값
  const [selectedReason, setSelectedReason] = useState<string | undefined>();
  const [otherReason, setOtherReason] = useState('');

  // 모달이 닫힐 때마다 선택값 초기화
  useEffect(() => {
    if (!open) {
      setSelectedReason(undefined);
      setOtherReason('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!selectedReason) {
      showErrorToast('취소 사유를 선택해주세요.');
      return;
    }
    if (selectedReason === '기타' && !otherReason.trim()) {
      showErrorToast('기타 사유를 입력해주세요.');
      return;
    }

    onConfirm({
      reasonCode: selectedReason,
      reasonText: selectedReason === '기타' ? otherReason.trim() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>신청 취소 요청을 보내시겠습니까?</DialogTitle>
        </DialogHeader>

        {/* 사유 선택 */}
        <div className="space-y-2 py-4">
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

          {selectedReason === '기타' && <Textarea className="mt-2" placeholder="기타 사유를 입력해주세요" value={otherReason} onChange={(e) => setOtherReason(e.target.value)} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            닫기
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '요청 처리 중...' : '취소 요청하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelStringingDialog;
