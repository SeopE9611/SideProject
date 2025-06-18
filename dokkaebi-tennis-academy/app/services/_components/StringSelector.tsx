'use client';

import { useState, useEffect } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface Props {
  items: { name: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

export default function StringSelector({ items, selected, onSelect }: Props) {
  const [customInput, setCustomInput] = useState('');

  // 셀렉트 변경 시
  const handleSelect = (value: string) => {
    onSelect(value);
    if (value !== 'custom') {
      setCustomInput('');
    }
  };

  // 직접입력 값이 바뀔 때
  useEffect(() => {
    if (selected === 'custom') {
      onSelect(customInput);
    }
  }, [customInput]);

  return (
    <div className="space-y-2">
      <Select onValueChange={handleSelect} value={selected || undefined}>
        <SelectTrigger>
          <SelectValue placeholder="주문한 스트링 종류를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item, index) => (
            <SelectItem key={index} value={item.name}>
              {item.name}
            </SelectItem>
          ))}
          <SelectItem value="custom">직접 입력하기</SelectItem>
        </SelectContent>
      </Select>

      {selected === 'custom' && <Input className="mt-2" placeholder="직접 입력한 스트링 이름" value={customInput} onChange={(e) => setCustomInput(e.target.value)} />}
    </div>
  );
}
