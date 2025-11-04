'use client';

import { useEffect } from 'react';
import Link from 'next/link';

type Props = {
  data: { id: string; period: 7 | 15 | 30; fee: number; deposit: number; status: string; racket: { brand: string; model: string; condition: 'A' | 'B' | 'C' } | null };
};

export default function RentalsSuccessClient({ data }: Props) {
  // 뒤로가기 방지(간단 가드) — 기존 /checkout/success 패턴과 유사
  useEffect(() => {
    try {
      sessionStorage.setItem('rentals-success', '1');
      const onPop = (e: PopStateEvent) => {
        if (sessionStorage.getItem('rentals-success') === '1') {
          history.pushState(null, '', location.href); // 뒤로가기를 중립화
        }
      };
      window.addEventListener('popstate', onPop);
      return () => {
        window.removeEventListener('popstate', onPop);
        sessionStorage.removeItem('rentals-success');
      };
    } catch {}
  }, []);

  const total = data.fee + data.deposit;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">대여 결제가 완료되었습니다 🎉</h1>

      <div className="rounded-lg border p-4 space-y-2">
        <div className="text-sm text-gray-500">대여 번호</div>
        <div className="font-mono text-sm">{data.id}</div>

        <div className="grid grid-cols-2 gap-2 text-sm pt-2">
          <div className="text-gray-500">라켓</div>
          <div>{data.racket ? `${data.racket.brand} ${data.racket.model} · ${data.racket.condition}` : '-'}</div>
          <div className="text-gray-500">대여 기간</div>
          <div>{data.period}일</div>
        </div>

        <div className="border-t pt-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span>대여 수수료</span>
            <span>{data.fee.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between">
            <span>보증금</span>
            <span>{data.deposit.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-1">
            <span>결제 금액</span>
            <span>{total.toLocaleString()}원</span>
          </div>
          <div className="text-xs text-gray-500 pt-1">* 반납 완료 후 보증금 환불(연체/파손 시 차감)</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Link href="/mypage?tab=rentals" className="h-10 px-4 rounded-lg border inline-flex items-center">
          마이페이지로
        </Link>
        <Link href="/rackets" className="h-10 px-4 rounded-lg bg-emerald-600 text-white inline-flex items-center">
          다른 라켓 보기
        </Link>
      </div>
    </div>
  );
}
