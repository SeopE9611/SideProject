'use client';

import { useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface Props {
  items: { name: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

export default function StringSelector({ items, selected, onSelect }: Props) {
  // 직접 입력값을 저장하는 상태
  const [customInput, setCustomInput] = useState('');

  //  '직접입력' 모드인지 여부를 별도로 관리
  // '직접 입력하기' 선택 시 true, 다른 preset 선택 시 false
  const [showCustomInput, setShowCustomInput] = useState(selected === 'custom');

  // 셀렉트에서 값이 변경되었을 때 호출
  const handleSelect = (value: string) => {
    if (value === 'custom') {
      // '직접 입력하기'를 선택한 경우
      setShowCustomInput(true);
      onSelect('custom'); // selected에 특별한 키 전달
    } else {
      // preset 스트링 선택한 경우
      setShowCustomInput(false);
      setCustomInput(''); // 입력값 초기화
      onSelect(value); // 선택한 스트링 값 외부로 전달
    }
  };

  //  Enter 키를 눌렀을 때만 custom 입력값을 전달 (onBlur 사용 안함)
  const handleCustomConfirm = () => {
    const trimmed = customInput.trim();
    if (trimmed) {
      onSelect(trimmed); // 외부 상태에 직접 입력값 전달
    }
  };

  return (
    <div className="space-y-2">
      {/* 스트링 선택 셀렉트 */}
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
          {/* 직접 입력 옵션 */}
          <SelectItem value="custom">직접 입력하기</SelectItem>
        </SelectContent>
      </Select>

      {/*  직접 입력 모드일 때만 렌더링되는 입력창 */}
      {showCustomInput && (
        <Input
          className="mt-2"
          placeholder="직접 입력한 스트링 이름"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCustomConfirm(); // Enter로만 값 커밋
            }
          }}
        />
      )}
    </div>
  );
}
