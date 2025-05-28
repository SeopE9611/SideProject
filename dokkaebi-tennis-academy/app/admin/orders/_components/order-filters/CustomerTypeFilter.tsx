'use client';

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function CustomerTypeFilter({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[100px] h-9 text-xs">
        <SelectValue placeholder="고객 유형 전체" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">고객 유형 전체</SelectItem>
        <SelectItem value="member">회원</SelectItem>
        <SelectItem value="guest">비회원</SelectItem>
      </SelectContent>
    </Select>
  );
}
