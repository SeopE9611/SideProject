'use client';

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Props {
  value: string;
  onChange: (value: string) => void;
}
export function OrderTypeFilter({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-9 text-xs">
        <SelectValue placeholder="주문 유형 전체" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">주문 유형 전체</SelectItem>
        <SelectItem value="상품">상품</SelectItem>
        <SelectItem value="서비스">서비스</SelectItem>
        <SelectItem value="클래스">클래스</SelectItem>
      </SelectContent>
    </Select>
  );
}
