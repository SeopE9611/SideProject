'use client';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  items: { id: string; name: string; mountingFee: number }[];
  stringTypes: string[]; // 선택된 ID 배열
  customInput: string; // 직접 입력값
  onChange: (value: string[]) => void; // 배열로 넘겨줌
  onCustomInputChange: (value: string) => void;
  disabled?: boolean;
}

export default function StringCheckboxes({ items, stringTypes, customInput, onChange, onCustomInputChange, disabled = false }: Props) {
  const toggle = (id: string) => {
    if (disabled) return;
    // custom 체크박스를 토글할 때는 오직 ['custom'] 만 남기고 모두 해제
    if (id === 'custom') {
      const next = stringTypes.includes('custom') ? [] : ['custom'];
      onChange(next);
      return;
    }

    // 일반 옵션 토글 시, custom 이 있으면 먼저 제거
    const withoutCustom = stringTypes.filter((x) => x !== 'custom');
    const next = withoutCustom.includes(id)
      ? // 이미 체크된 항목이면 해제
        withoutCustom.filter((x) => x !== id)
      : // 체크되지 않은 항목이면 추가
        [...withoutCustom, id];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {/* 상품 리스트 항목 */}
      {items.map((item) => {
        const isChecked = stringTypes.includes(item.id);
        const isDisabled = stringTypes.includes('custom');

        return (
          <label
            key={item.id}
            className={cn(
              'flex items-center justify-between border rounded-lg px-4 py-2 cursor-pointer transition-all',
              'hover:border-primary',
              isChecked ? 'border-primary bg-primary/10' : 'border-muted',
              isDisabled ? 'opacity-50 pointer-events-none' : ''
            )}
          >
            <div className="flex items-center gap-2">
              <input type="checkbox" className="form-checkbox" checked={isChecked} onChange={() => toggle(item.id)} disabled={isDisabled} />
              <span className="font-medium">{item.name}</span>
            </div>
            <span className="text-sm text-muted-foreground">{item.mountingFee?.toLocaleString()}원</span>
          </label>
        );
      })}

      {/* 직접 입력 항목 */}
      <label className={cn('flex flex-col gap-2 border rounded-lg px-4 py-2 cursor-pointer transition-all', stringTypes.includes('custom') ? 'border-primary bg-primary/10' : 'border-muted')}>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={stringTypes.includes('custom')} onChange={() => toggle('custom')} />
          <span className="font-medium">직접 입력하기</span>
        </div>
        {/* 직접 입력 필드 */}
        {stringTypes.includes('custom') && <Input placeholder="직접 입력한 스트링 이름" value={customInput} onChange={(e) => onCustomInputChange(e.target.value)} />}
      </label>
    </div>
  );
}
