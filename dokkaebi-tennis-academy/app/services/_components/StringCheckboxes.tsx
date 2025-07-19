'use client';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  items: { id: string; name: string; mountingFee?: number }[];
  stringTypes: string[]; // 선택된 ID 배열
  customInput: string; // 직접 입력값
  onChange: (ids: string[]) => void; // 배열로 넘겨줌
  onCustomInputChange: (val: string) => void;
}

export default function StringCheckboxes({ items, stringTypes, customInput, onChange, onCustomInputChange }: Props) {
  const toggle = (id: string) => {
    const next = stringTypes.includes(id) ? stringTypes.filter((x) => x !== id) : [...stringTypes, id];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <label key={item.id} className="flex items-center gap-2">
          <input type="checkbox" className="checkbox" checked={stringTypes.includes(item.id)} onChange={() => toggle(item.id)} />
          <span>
            {item.name} ({item.mountingFee?.toLocaleString()}원)
          </span>
        </label>
      ))}
      {/* “직접 입력” 체크박스 */}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={stringTypes.includes('custom')} onChange={() => toggle('custom')} />
        <span>직접 입력하기</span>
      </label>
      {/* 직접 입력 필드 */}
      {stringTypes.includes('custom') && <Input placeholder="직접 입력한 스트링 이름" value={customInput} onChange={(e) => onCustomInputChange(e.target.value)} className="mt-2" />}
    </div>
  );
}
