'use client';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { adminMutator, getAdminErrorMessage } from '@/lib/admin/adminFetcher';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useState, useTransition } from 'react';

type Props = {
  orderId: string;
  currentStatus: string;
  onUpdated?: () => void;
  disabled?: boolean;
};

const PAYMENT_STATUS_OPTIONS = ['결제대기', '결제완료', '결제취소'] as const;

const badgeClass: Record<string, string> = {
  결제완료: 'bg-primary/10 text-primary border border-border rounded-md px-2 py-1 text-xs font-medium dark:bg-primary/20',
  결제대기: 'bg-warning/10 text-warning border border-border rounded-md px-2 py-1 text-xs font-medium dark:bg-warning/15',
  결제취소: 'bg-destructive/10 text-destructive border border-destructive/30 rounded-md px-2 py-1 text-xs font-medium dark:bg-destructive/15',
  취소: 'bg-destructive/10 text-destructive border border-destructive/30 rounded-md px-2 py-1 text-xs font-medium dark:bg-destructive/15',
};

export default function PackagePaymentStatusSelect({ orderId, currentStatus, onUpdated, disabled }: Props) {
  // 서버가 취소 줄수도있으니 대비
  const normalize = (s?: string) => (s === '취소' ? '결제취소' : s || '결제대기');

  const [selected, setSelected] = useState<string>(normalize(currentStatus));
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  // 결제 상태 변경 모달 상태
  const [showDialog, setShowDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'결제대기' | '결제완료' | '결제취소' | null>(null);

  // 사유 입력
  const [reasonType, setReasonType] = useState<string>(''); // 셀렉트로 고르는 기본 사유
  const [reasonText, setReasonText] = useState<string>(''); // 추가 메모(자유 입력)

  async function submitPaymentStatus(next: '결제대기' | '결제완료' | '결제취소', reason: string) {
    try {
      setSaving(true);
      await adminMutator(`/api/admin/package-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, reason }),
      });

      showSuccessToast('상태가 변경되었습니다.');
      onUpdated?.();
    } catch (e: any) {
      showErrorToast(getAdminErrorMessage(e));
      // 실패 시 값 되돌리기 (초기값으로 복귀)
      setSelected(normalize(currentStatus));
    } finally {
      setSaving(false);
      setShowDialog(false);
      setPendingStatus(null);
      setReasonType('');
      setReasonText('');
    }
  }

  const onChange = (next: string) => {
    // 동일 값이면 무시
    if (next === selected) return;

    // 1) 결제취소로 변경 → 모달 (사유 필수)
    if (next === '결제취소') {
      setPendingStatus('결제취소');
      setShowDialog(true);
      return;
    }

    // 2) 현재가 결제취소인데 → 결제대기/결제완료로 복구 → 모달 (사유 선택)
    if (selected === '결제취소' && (next === '결제대기' || next === '결제완료')) {
      setPendingStatus(next as '결제대기' | '결제완료');
      setShowDialog(true);
      return;
    }

    // 3) 나머지는 모달 없이 바로 저장
    setSelected(next);
    // 사유 없음으로 저장
    submitPaymentStatus(next as '결제대기' | '결제완료', '');
  };

  return (
    <>
      <Select value={selected} onValueChange={onChange} disabled={disabled || isPending || saving}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="상태 선택" />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              <div className={badgeClass[s] || ''}>{s}</div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 모달 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingStatus === '결제취소' ? '결제 취소 사유 입력' : '결제 상태 복구 사유(선택)'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>사유 선택</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={reasonType} onChange={(e) => setReasonType(e.target.value)}>
                <option value="">사유를 선택하세요</option>
                {pendingStatus === '결제취소' ? (
                  <>
                    <option value="입금 미확인">입금 미확인</option>
                    <option value="고객 요청 취소">고객 요청 취소</option>
                    <option value="중복 주문">중복 주문</option>
                    <option value="테스트 주문">테스트 주문</option>
                    <option value="기타">기타</option>
                  </>
                ) : (
                  <>
                    <option value="오결제 정정">오결제 정정</option>
                    <option value="관리자 복구">관리자 복구</option>
                    <option value="기타">기타</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>추가 메모 {pendingStatus === '결제취소' ? '(필요 시)' : '(선택)'}</Label>
              <Textarea placeholder="세부 사유를 메모하세요" value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={4} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              className="px-3 py-2 text-sm rounded-md border"
              onClick={() => {
                setShowDialog(false);
                setPendingStatus(null);
                setReasonType('');
                setReasonText('');
              }}
              disabled={saving}
            >
              취소
            </button>
            <button
              className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground"
              onClick={() => {
                if (!pendingStatus) return;

                const base = reasonType || '';
                const memo = reasonText?.trim() ? ` - ${reasonText.trim()}` : '';
                const reason = `${base}${memo}`.trim();

                // 결제취소는 사유 선택 필수
                if (pendingStatus === '결제취소' && !reasonType) {
                  showErrorToast('결제 취소 사유를 선택해주세요.');
                  return;
                }

                setSelected(pendingStatus);
                setSaving(true);
                startTransition(async () => {
                  try {
                    const res = await fetch(`/api/package-orders/${orderId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ status: pendingStatus, reason }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err?.error || '상태 변경에 실패했습니다.');
                    }
                    showSuccessToast('상태가 변경되었습니다.');
                    onUpdated?.();
                  } catch (e: any) {
                    showErrorToast(e?.message || '상태 변경 중 오류가 발생했습니다.');
                    setSelected(normalize(currentStatus));
                  } finally {
                    setSaving(false);
                    setShowDialog(false);
                    setPendingStatus(null);
                    setReasonType('');
                    setReasonText('');
                  }
                });
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
