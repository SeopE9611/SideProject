'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Rental = {
  id: string;
  brand: string;
  model: string;
  days: number;
  status: 'created' | 'paid' | 'out' | 'returned';
  amount?: { fee?: number; deposit?: number; total?: number };
  createdAt?: string;
  dueAt?: string | null;
};

export default function RentalsDetailClient({ id }: { id: string }) {
  const [data, setData] = useState<Rental | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/me/rentals/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error((await res.json()).message || '조회 실패');
        setData(await res.json());
      } catch (e: any) {
        setErr(e.message ?? '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-6">불러오는 중…</div>;
  if (err) return <div className="p-6 text-red-600">에러: {err}</div>;
  if (!data) return <div className="p-6">존재하지 않는 대여 건입니다.</div>;

  const fee = data.amount?.fee ?? 0;
  const deposit = data.amount?.deposit ?? 0;
  const total = data.amount?.total ?? fee + deposit;

  return (
    <div className="p-0 space-y-4">
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="text-sm text-muted-foreground">대여 번호</div>
          <div className="font-mono text-sm">{data.id}</div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-muted-foreground">라켓</div>
              <div className="font-medium">
                {data.brand} {data.model}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">기간</div>
              <div>{data.days}일</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">상태</div>
              <div className="uppercase">{data.status}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">반납 예정</div>
              <div>{data.dueAt ? new Date(data.dueAt).toLocaleDateString() : '-'}</div>
            </div>
          </div>

          <div className="mt-4 border-t pt-3 grid grid-cols-3 gap-3 text-right">
            <div>
              <div className="text-xs text-muted-foreground">수수료</div>
              <div>{fee.toLocaleString()}원</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">보증금</div>
              <div>{deposit.toLocaleString()}원</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">결제 금액</div>
              <div className="font-semibold">{total.toLocaleString()}원</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Link href="/mypage?tab=rentals">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    </div>
  );
}
