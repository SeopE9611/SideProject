'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = { orderId: string; show?: boolean };

export default function DevMarkPaidButton({ orderId, show = false }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!show) return null;

  async function markPaid() {
    try {
      setLoading(true);
      const res = await fetch(`/api/package-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '결제완료' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      // 패스 발급 후 패키지 탭으로 이동
      router.push('/mypage?tab=passes');
      router.refresh();
    } catch (e: any) {
      alert(`결제완료 처리 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={markPaid} disabled={loading} className="mt-6" variant="destructive">
      {loading ? '처리 중…' : '(개발용) 이 주문 결제완료 처리'}
    </Button>
  );
}
