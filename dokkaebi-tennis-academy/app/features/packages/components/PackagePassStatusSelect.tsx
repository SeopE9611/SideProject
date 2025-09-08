'use client';

import { useState, useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type PassRaw = 'active' | 'paused' | 'cancelled';
type PassKo = '활성' | '일시정지' | '취소';

const koToRaw: Record<PassKo, PassRaw> = { 활성: 'active', 일시정지: 'paused', 취소: 'cancelled' };
const rawToKo: Record<PassRaw, PassKo> = { active: '활성', paused: '일시정지', cancelled: '취소' };

type Props = {
  orderId: string;
  currentKo: PassKo | '만료' | '대기'; // 화면에 보이는 passStatus
  onUpdated?: () => void;
  disabled?: boolean;
};

export default function PackagePassStatusSelect({ orderId, currentKo, onUpdated, disabled }: Props) {
  // '만료'나 '대기'면 일단 '활성'을 기본값으로 보여주되, 선택 시 서버에 반영됨
  const initial: PassKo = (['활성', '일시정지', '취소'] as PassKo[]).includes(currentKo as any) ? (currentKo as PassKo) : '활성';

  const [selected, setSelected] = useState<PassKo>(initial);
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const handleChange = (nextKo: PassKo) => {
    setSelected(nextKo);
    setSaving(true);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/package-orders/${orderId}/pass-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: koToRaw[nextKo] }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || '패스 상태 변경에 실패했습니다.');
        }
        showSuccessToast(`패스 상태가 '${nextKo}'로 변경되었습니다.`);
        onUpdated?.();
      } catch (e: any) {
        showErrorToast(e?.message || '패스 상태 변경 중 오류가 발생했습니다.');
        setSelected(initial); // 롤백
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <Select value={selected} onValueChange={handleChange} disabled={disabled || isPending || saving}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="상태 선택" />
      </SelectTrigger>
      <SelectContent>
        {(Object.values(rawToKo) as PassKo[]).map((ko) => (
          <SelectItem key={ko} value={ko}>
            {ko}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
