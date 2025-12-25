'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

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

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json());

function safeDateLabel(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '-';
  return d.toLocaleString('ko-KR');
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

  const { data, mutate, isLoading } = useSWR(historyUrl, fetcher);

  const balance = typeof data?.balance === 'number' ? data.balance : 0;
  const items: TxItem[] = Array.isArray(data?.items) ? data.items : [];
  const total = typeof data?.total === 'number' ? data.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // 조정 폼
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [refKey, setRefKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onAdjust(delta: number) {
    if (!userId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/points/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: delta,
          reason: reason.trim() || undefined,
          refKey: refKey.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
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
      await mutate(); // 잔액/히스토리 새로고침
      
      // 조정 성공 후: 현재 다이얼로그 데이터(잔액/히스토리)만 새로고침
      await mutate();
      setAmount('');
      setReason('');
      setRefKey('');
    } finally {
      setSubmitting(false);
    }
  }

  const amountNum = Number(amount);
  const canSubmit = Number.isFinite(amountNum) && amountNum !== 0 && !!userId;

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            포인트 관리{userName ? ` - ${userName}` : ''} {userId ? `(잔액: ${balance.toLocaleString()}P)` : ''}
          </DialogTitle>
        </DialogHeader>

        {/* 조정 폼 */}
        <div className="grid gap-2">
          <div className="text-sm text-muted-foreground">amount는 양수(지급) / 음수(차감). refKey는 “중복 방지(멱등)”가 필요한 경우만.</div>

          <div className="grid grid-cols-3 gap-2">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="예: 1000 또는 -500" />
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유(선택)" />
            <Input value={refKey} onChange={(e) => setRefKey(e.target.value)} placeholder="refKey(선택)" />
          </div>

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
                        <span className="ml-2 text-xs text-muted-foreground">
                          {tx.type} / {tx.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tx.reason ?? '-'} {tx.refKey ? `(${tx.refKey})` : ''}
                      </div>
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
