'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function DevMarkPaidButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  if (process.env.NODE_ENV === 'production') return null; // 운영에서 자동 숨김

  return (
    <Button onClick={markPaid} disabled={loading} className="mt-6">
      {loading ? '처리 중…' : '(개발용) 이 주문 결제완료 처리'}
    </Button>
  );
}
