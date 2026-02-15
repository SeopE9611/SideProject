'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { fallbackReason, parsePointRefKey, pointTxStatusLabel, pointTxTypeLabel, safeLocalDateTime } from '@/lib/points.display';
import { Badge } from '@/components/ui/badge';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { adminFetcher, adminMutator } from '@/lib/admin/adminFetcher';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  userName?: string;
};

type TxItem = {
  id: string;
  amount: number;
  type: string;
  status: string;
  reason: string | null;
  createdAt: string;
  refKey: string | null;
};

type UserPointHistoryResponse = {
  balance?: number;
  items?: TxItem[];
  total?: number;
};

function safeDateLabel(iso: string) {
  return safeLocalDateTime(iso);
}

export default function UserPointsDialog({ open, onOpenChange, userId, userName }: Props) {
  const [page, setPage] = useState(1);
  // 유저가 바뀌거나 다이얼로그를 다시 열면 1페이지부터 보여주기
  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [userId, open]);
  const limit = 10;

  const historyUrl = useMemo(() => {
    if (!userId) return null;
    return `/api/admin/users/${userId}/points/history?page=${page}&limit=${limit}`;
  }, [userId, page]);

  const { data, mutate, isLoading } = useSWR<UserPointHistoryResponse>(historyUrl, (url: string) => adminFetcher<UserPointHistoryResponse>(url, { cache: 'no-store' }));

  const balance = typeof data?.balance === 'number' ? data.balance : 0;
  const items: TxItem[] = Array.isArray(data?.items) ? data.items : [];
  const total = typeof data?.total === 'number' ? data.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // 조정 폼
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [refKey, setRefKey] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 입력 중 이탈 방지(dirty): 입력칸에 뭐라도 있으면 보호
  const isDirty = open && (amount.trim().length > 0 || reason.trim().length > 0 || refKey.trim().length > 0);
  useUnsavedChangesGuard(isDirty);

  // 오버레이/ESC/닫기 등 “다이얼로그 자체 닫기”에서도 입력 유실 방지
  const handleOpenChange = (nextOpen: boolean) => {
    // 열기
    if (nextOpen) return onOpenChange(true);

    // 제출 중이면 사용자가 실수로 닫지 못하게 보호(기존 UX 유지 목적)
    if (submitting) return;

    // 닫기: dirty면 confirm
    if (isDirty) {
      const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
      if (!ok) return;
    }

    // 닫기 확정 → 입력 상태 초기화
    setAmount('');
    setReason('');
    setRefKey('');
    setShowAdvanced(false);
    onOpenChange(false);
  };

  async function onAdjust(delta: number) {
    if (!userId) return;
    setSubmitting(true);
    try {
      const json = await adminMutator<{ ok?: boolean; error?: string }>('/api/admin/points/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: delta,
          reason: reason.trim() || undefined,
          refKey: refKey.trim() || undefined,
        }),
      });

      if (!json?.ok) {
        const code = json?.error || 'INTERNAL_ERROR';

        // 케이스별 메시지
        if (code === 'INSUFFICIENT_POINTS') {
          showErrorToast('포인트가 부족합니다.');
          return;
        }
        if (code === 'USER_NOT_FOUND') {
          showErrorToast('사용자를 찾을 수 없습니다.');
          return;
        }

        showErrorToast(code);
        return;
      }

      // 성공 처리
      showSuccessToast('포인트가 반영되었습니다.');

      // 조정 성공 후: 현재 다이얼로그 데이터(잔액/히스토리)만 새로고침
      await mutate();
      setAmount('');
      setReason('');
      setRefKey('');
    } catch {
      showErrorToast('포인트 반영에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  const amountNum = Number(amount);
  const canSubmit = Number.isFinite(amountNum) && amountNum !== 0 && !!userId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            포인트 관리{userName ? ` - ${userName}` : ''} {userId ? `(잔액: ${balance.toLocaleString()}P)` : ''}
          </DialogTitle>
        </DialogHeader>

        {/* 조정 폼 */}
        <div className="grid gap-2">
          <div className="text-sm text-muted-foreground">
            amount는 <span className="font-medium">양수(지급)</span> / <span className="font-medium">음수(차감)</span>입니다. ‘중복 방지 키(고급)’는 같은 요청이 두 번 들어와도 <span className="font-medium">1번만 반영</span>되게 막고 싶을 때만
            사용합니다.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액 (예: 1000 또는 -500)" inputMode="numeric" />
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유(선택) — 예: 이벤트 지급" />
          </div>

          <div className="flex items-center justify-between">
            <button type="button" className="text-xs text-muted-foreground underline underline-offset-4" onClick={() => setShowAdvanced((v) => !v)}>
              {showAdvanced ? '고급 옵션 닫기' : '고급 옵션(중복 방지 키)'}
            </button>
            <div className="text-xs text-muted-foreground">
              예: <span className="font-mono">order:&lt;주문ID&gt;:manual</span>
            </div>
          </div>

          {showAdvanced ? <Input value={refKey} onChange={(e) => setRefKey(e.target.value)} placeholder="중복 방지 키(선택) — 예: order:694e...:manual" /> : null}

          <div className="flex gap-2">
            <Button disabled={!canSubmit || submitting} onClick={() => onAdjust(amountNum)}>
              적용
            </Button>
            <Button variant="secondary" disabled={submitting} onClick={() => mutate()}>
              새로고침
            </Button>
          </div>
        </div>

        {/* 히스토리 */}
        <div className="mt-4 border rounded-md">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="font-medium">포인트 히스토리</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                이전
              </Button>
              <div className="text-sm">
                {page} / {totalPages}
              </div>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                다음
              </Button>
            </div>
          </div>

          <div className="p-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">불러오는 중...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">내역이 없습니다.</div>
            ) : (
              <div className="grid gap-2">
                {items.map((tx) => (
                  <div key={tx.id} className="flex items-start justify-between border rounded-md p-2">
                    <div className="grid gap-1">
                      <div className="text-sm">
                        <span className={tx.amount >= 0 ? 'font-semibold' : 'font-semibold'}>
                          {tx.amount >= 0 ? '+' : ''}
                          {tx.amount.toLocaleString()}P
                        </span>
                        <span className="ml-2 inline-flex flex-wrap items-center gap-1">
                          <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                            {pointTxTypeLabel(tx.type)}
                          </Badge>
                          <Badge variant="outline" className="h-5 px-2 text-[10px]">
                            {pointTxStatusLabel(tx.status)}
                          </Badge>
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{tx.reason && tx.reason.trim().length >= 2 ? tx.reason : (fallbackReason(tx.type) ?? '-')}</div>
                      {(() => {
                        const ref = parsePointRefKey(tx.refKey);
                        if (!ref) return null;

                        if (ref.kind === 'order') {
                          return (
                            <div className="text-[11px] text-muted-foreground">
                              주문 ID: <span className="font-mono">{ref.orderId}</span>
                              {ref.suffix ? <span className="ml-1">({ref.suffix})</span> : null}
                            </div>
                          );
                        }

                        if (ref.kind === 'review') {
                          return (
                            <div className="text-[11px] text-muted-foreground">
                              리뷰 ID: <span className="font-mono">{ref.reviewId}</span>
                            </div>
                          );
                        }

                        return (
                          <div className="text-[11px] text-muted-foreground">
                            중복 방지 키: <span className="font-mono">{ref.raw}</span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">{safeDateLabel(tx.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
