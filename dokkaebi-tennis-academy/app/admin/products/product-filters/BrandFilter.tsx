// BrandFilter.tsx
'use client';

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Filter } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[]; // ex) ["babolat", "wilson", "head"]
}

// 간단 라벨 매핑 (ProductsClient.tsx의 BRAND_LABEL에서 복붙 or import)
const BRAND_LABEL: Record<string, string> = {
  babolat: '바볼랏',
  wilson: '윌슨',
  head: '헤드',
  yonex: '요넥스',
  luxilon: '럭실론',
  technifibre: '테크니파이버',
  solinco: '솔린코',
  dunlop: '던롭',
};

export default function BrandFilter({ value, onChange, options }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-9 text-xs">
        <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="브랜드 전체" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">브랜드 전체</SelectItem>
        {options.map((b) => (
          <SelectItem key={b} value={b}>
            {BRAND_LABEL[b] ?? b}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
