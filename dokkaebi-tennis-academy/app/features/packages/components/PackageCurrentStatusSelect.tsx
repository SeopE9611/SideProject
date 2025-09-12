'use client';

import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

/**
 * 패키지 "현재 상태" 직접 변경 셀렉트
 * - UI(활성/비활성/취소) → 서버 결제 상태(결제완료/결제대기/결제취소)로 매핑하여 PATCH
 * - '취소'로 변경 시: "취소 사유 입력" 모달
 * - '취소'에서 복구 시: "상태 복구 사유(선택)" 모달  ← 요청사항 반영
 */
type CurrentStatusUI = '활성' | '비활성' | '취소';
type PassStatus = '활성' | '대기' | '만료' | '취소';
type PaymentStatus = '결제대기' | '결제완료' | '결제취소';

type Props = {
  orderId: string;
  passStatus: PassStatus; // API의 passStatusKo
  paymentStatus: PaymentStatus | null | undefined; // API의 paymentStatus
  onUpdated?: () => void;
  disabled?: boolean;
};

const uiToPayment: Record<CurrentStatusUI, PaymentStatus> = {
  활성: '결제완료',
  비활성: '결제대기',
  취소: '결제취소',
};

const BADGE_CLASS: Record<CurrentStatusUI, string> = {
  활성: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 rounded px-2 py-0.5 text-xs',
  비활성: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded px-2 py-0.5 text-xs',
  취소: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200 rounded px-2 py-0.5 text-xs',
};

export default function PackageCurrentStatusSelect({ orderId, passStatus, paymentStatus, onUpdated, disabled }: Props) {
  // passStatus(활성/대기/만료/취소) → UI선택값(활성/비활성/취소)
  const initialUI: CurrentStatusUI | null = useMemo(() => {
    if (passStatus === '만료') return null; // 만료는 변경 불가
    if (passStatus === '대기') return '비활성';
    if (passStatus === '활성') return '활성';
    if (passStatus === '취소') return '취소';
    return '비활성';
  }, [passStatus]);

  const [selected, setSelected] = useState<CurrentStatusUI | ''>(initialUI ?? '');
  const [saving, setSaving] = useState(false);

  // 모달 상태
  const [showDialog, setShowDialog] = useState(false);
  const [isRestoreDialog, setIsRestoreDialog] = useState(false);
  const [pendingNext, setPendingNext] = useState<CurrentStatusUI | null>(null);
  const [reasonType, setReasonType] = useState('');
  const [reasonText, setReasonText] = useState('');

  const isExpired = passStatus === '만료';

  function openCancelDialog(next: CurrentStatusUI) {
    setIsRestoreDialog(false);
    setPendingNext(next);
    setShowDialog(true);
  }

  function openRestoreDialog(next: CurrentStatusUI) {
    setIsRestoreDialog(true);
    setPendingNext(next);
    setShowDialog(true);
  }

  async function submit(next: CurrentStatusUI, reason: string) {
    try {
      setSaving(true);
      const res = await fetch(`/api/package-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: uiToPayment[next], reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || '상태 변경에 실패했습니다.');
      }
      showSuccessToast('상태가 변경되었습니다.');
      onUpdated?.();
    } catch (e: any) {
      showErrorToast(e?.message || '상태 변경 중 오류가 발생했습니다.');
      setSelected(initialUI ?? '');
    } finally {
      setSaving(false);
      setShowDialog(false);
      setPendingNext(null);
      setReasonType('');
      setReasonText('');
    }
  }

  function onValueChange(next: CurrentStatusUI) {
    if (next === selected) return;

    // '취소'에서 복구 → 복구 사유 모달
    const wasCancelled = passStatus === '취소' || paymentStatus === '결제취소';
    if (wasCancelled && next !== '취소') {
      openRestoreDialog(next);
      return;
    }

    // '취소'로 변경 → 취소 사유 모달
    if (next === '취소') {
      openCancelDialog(next);
      return;
    }

    // 활성/비활성 전환은 즉시
    setSelected(next);
    submit(next, '');
  }

  const disabledMessage = isExpired ? '만료된 패키지는 상태를 바꿀 수 없습니다.' : undefined;

  return (
    <>
      <Select value={selected || undefined} onValueChange={(v) => onValueChange(v as CurrentStatusUI)} disabled={disabled || saving || isExpired}>
        <SelectTrigger className="w-[140px]" title={disabledMessage}>
          <SelectValue placeholder={isExpired ? '만료됨' : '상태 선택'} />
        </SelectTrigger>
        <SelectContent>
          {(['활성', '비활성', '취소'] as CurrentStatusUI[]).map((s) => (
            <SelectItem key={s} value={s}>
              <div className={BADGE_CLASS[s]}>{s}</div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 사유 입력 모달 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isRestoreDialog ? '상태 복구 사유(선택)' : '취소 사유 입력'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>사유 선택</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={reasonType} onChange={(e) => setReasonType(e.target.value)} disabled={saving}>
                <option value="">사유를 선택하세요</option>
                {isRestoreDialog ? (
                  <>
                    <option value="입금 확인됨">입금 확인됨</option>
                    <option value="관리자 승인">관리자 승인</option>
                    <option value="오류 복구">오류 복구</option>
                    <option value="기타">기타</option>
                  </>
                ) : (
                  <>
                    <option value="입금 미확인">입금 미확인</option>
                    <option value="고객 요청 취소">고객 요청 취소</option>
                    <option value="중복 주문">중복 주문</option>
                    <option value="테스트 주문">테스트 주문</option>
                    <option value="기타">기타</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>추가 메모 (선택)</Label>
              <Textarea placeholder="세부 사유를 메모하세요" value={reasonText} onChange={(e) => setReasonText(e.target.value)} disabled={saving} />
            </div>
          </div>

          <DialogFooter>
            <button className="inline-flex items-center rounded-md border px-3 py-2 text-sm" onClick={() => setShowDialog(false)} disabled={saving}>
              취소
            </button>
            <button
              className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm"
              onClick={() => {
                const reason = [reasonType, reasonText].filter(Boolean).join(' / ');
                if (!isRestoreDialog) setSelected('취소');
                submit(pendingNext || '비활성', reason);
              }}
              disabled={saving}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
