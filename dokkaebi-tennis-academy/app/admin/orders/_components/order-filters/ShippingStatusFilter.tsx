'use client';

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Props {
  value: string;
  onChange: (value: string) => void;
}
export function ShippingStatusFilter({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-9 text-xs">
        <SelectValue placeholder="운송장 상태 전체" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">운송장 상태 전체</SelectItem>
        <SelectItem value="등록됨">등록됨</SelectItem>
        <SelectItem value="미등록">미등록</SelectItem>
        <SelectItem value="방문수령">방문수령</SelectItem>
        <SelectItem value="퀵배송">퀵배송</SelectItem>
        <SelectItem value="미입력">미입력</SelectItem>
      </SelectContent>
    </Select>
  );
}
