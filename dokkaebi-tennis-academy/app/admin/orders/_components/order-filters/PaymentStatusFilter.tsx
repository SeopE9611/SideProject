'use client';

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Props {
  value: string;
  onChange: (value: string) => void;
}
export function PaymentStatusFilter({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[110px] h-9 text-xs">
        <SelectValue placeholder="결제 상태 전체" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">결제 상태 전체</SelectItem>
        <SelectItem value="결제완료">결제완료</SelectItem>
        <SelectItem value="결제대기">결제대기</SelectItem>
        <SelectItem value="결제실패">결제실패</SelectItem>
        <SelectItem value="결제취소">결제취소</SelectItem>
        <SelectItem value="환불">환불</SelectItem>
      </SelectContent>
    </Select>
  );
}
