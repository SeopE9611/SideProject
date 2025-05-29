'use client';

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function OrderStatusFilter({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-9 text-xs">
        <SelectValue placeholder="주문 상태 전체" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">주문 상태 전체</SelectItem>
        <SelectItem value="대기중">대기중</SelectItem>
        <SelectItem value="처리중">처리중</SelectItem>
        <SelectItem value="결제완료">결제완료</SelectItem>
        <SelectItem value="배송중">배송중</SelectItem>
        <SelectItem value="배송완료">배송완료</SelectItem>
        <SelectItem value="취소">취소</SelectItem>
        <SelectItem value="환불">환불</SelectItem>
      </SelectContent>
    </Select>
  );
}
