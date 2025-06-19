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
  const [isCustom, setIsCustom] = useState(false); // '직접입력' 모드인지 여부

  // 셀렉트 변경 시
  // selected 값이 'custom'일 때 isCustom을 true로 자동 반영
  useEffect(() => {
    setIsCustom(selected === 'custom');
  }, [selected]);

  // 입력창에서 직접 입력할 때 외부로 값 전달
  useEffect(() => {
    if (isCustom) {
      onSelect(customInput); // 커스텀 입력값 외부에 전달
    }
  }, [customInput]);

  // 셀렉트 선택 시 분기 처리
  const handleSelect = (value: string) => {
    if (value === 'custom') {
      onSelect('custom'); //  selected를 'custom'으로 유지
    } else {
      setCustomInput(''); // 이전 입력값 초기화
      onSelect(value);
    }
  };
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

      {/* selected가 custom이거나, isCustom이 true이면 입력창 표시 */}
      {isCustom && <Input className="mt-2" placeholder="직접 입력한 스트링 이름" value={customInput} onChange={(e) => setCustomInput(e.target.value)} />}
    </div>
  );
}
