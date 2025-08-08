// MaterialFilter.tsx
'use client';

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Filter } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[]; // ex) ["polyester", "multifilament", ...]
}

const MATERIAL_LABEL: Record<string, string> = {
  polyester: '폴리에스터',
  multifilament: '멀티필라멘트',
  natural_gut: '천연 거트',
  synthetic_gut: '합성 거트',
  hybrid: '하이브리드',
};

export default function MaterialFilter({ value, onChange, options }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-9 text-xs">
        <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="재질 전체" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">재질 전체</SelectItem>
        {options.map((m) => (
          <SelectItem key={m} value={m}>
            {MATERIAL_LABEL[m] ?? m}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
