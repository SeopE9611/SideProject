'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// props로 전달받을 타입 정의
interface WithdrawalReasonSelectProps {
  onSubmit: (reason: string, detail?: string | null) => void; // 최종 사유를 상위 컴포넌트로 전달하는 콜백
}

export default function WithdrawalReasonSelect({ onSubmit }: WithdrawalReasonSelectProps) {
  // 선택한 사유를 저장하는 상태
  const [selectedReason, setSelectedReason] = useState<string>('');
  // '기타'를 선택했을 경우 텍스트 입력 필드를 제어할 상태
  const [customReason, setCustomReason] = useState<string>('');

  // 제출 버튼 클릭 시 호출되는 함수
  const handleSubmit = () => {
    if (selectedReason === '기타') {
      const detail = customReason.trim();
      // detail이 비어 있으면 null 전달
      onSubmit(selectedReason, detail === '' ? null : detail);
    } else {
      // 기타가 아니면 detail은 undefined로 넘김
      onSubmit(selectedReason, undefined);
    }
  };

  return (
    <div className="space-y-4">
      {/* 셀렉트 레이블 */}
      <Label>탈퇴 사유 (선택)</Label>

      {/* 셀렉트 박스 */}
      <Select value={selectedReason} onValueChange={(value) => setSelectedReason(value)}>
        <SelectTrigger>
          <SelectValue placeholder="사유 선택" />
        </SelectTrigger>
        <SelectContent>
          {/* 항목 목록 */}
          <SelectItem value="서비스 사용이 불편해서">서비스 사용이 불편해서</SelectItem>
          <SelectItem value="재가입 예정">재가입 예정</SelectItem>
          <SelectItem value="개인정보 걱정">개인정보 걱정</SelectItem>
          <SelectItem value="상품이 너무 별로여서">상품이 별로여서</SelectItem>
          <SelectItem value="기타">기타</SelectItem>
        </SelectContent>
      </Select>

      {/* '기타' 선택 시만 보이는 입력창 */}
      {selectedReason === '기타' && <Textarea value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="자세한 사유를 입력해주세요 (선택사항)" />}

      {/* 제출 버튼 */}
      <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md">
        탈퇴하기
      </button>
    </div>
  );
}
