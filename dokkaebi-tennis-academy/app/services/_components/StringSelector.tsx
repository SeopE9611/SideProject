'use client';

import { useState, useEffect } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface Props {
  items: { name: string }[];
  selected: string; // formData.stringType
  customInput: string; // formData.customStringType
  onSelect: (value: string) => void; // stringType 설정용
  onCustomInputChange: (value: string) => void; // customStringType 설정용
}

export default function StringSelector({ items, selected, customInput, onSelect, onCustomInputChange }: Props) {
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (selected === 'custom') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
    }
  }, [selected]);

  const handleSelect = (value: string) => {
    if (value === 'custom') {
      onSelect('custom'); // stringType을 'custom'으로 고정
    } else {
      onSelect(value); // stringType = 선택한 preset
      onCustomInputChange(''); // 직접입력값 초기화
    }
  };

  return (
    <div className="space-y-2">
      <Select onValueChange={handleSelect} value={selected}>
        <SelectTrigger>
          <SelectValue placeholder="주문한 스트링 종류를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item, i) => (
            <SelectItem key={i} value={item.name}>
              {item.name}
            </SelectItem>
          ))}
          <SelectItem value="custom">직접 입력하기</SelectItem>
        </SelectContent>
      </Select>

      {showCustomInput && <Input className="mt-2" placeholder="직접 입력한 스트링 이름" value={customInput} onChange={(e) => onCustomInputChange(e.target.value)} />}
    </div>
  );
}
