'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Initial = {
  id: string;
  period: 7 | 15 | 30;
  fee: number;
  deposit: number;
  status: string;
  shipping: any;
  racket: { id: string; brand: string; model: string; image: string | null; condition: 'A' | 'B' | 'C' } | null;
};

export default function RentalsCheckoutClient({ initial }: { initial: Initial }) {
  const router = useRouter();

  // 배송지 폼(기존 체크아웃 UI 느낌으로 구성)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostal] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [deliveryRequest, setRequest] = useState('');
  const [loading, setLoading] = useState(false);

  const total = initial.fee + initial.deposit;

  const onPay = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rentals/${initial.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping: { name, phone, postalCode, address, addressDetail, deliveryRequest },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.message ?? '결제 처리에 실패했습니다.');
        return;
      }
      // 결제 완료 → 마이페이지/주문목록 또는 임시 성공 페이지로 이동
      router.push(`/rentals/success?id=${json.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      <h1 className="text-2xl font-semibold mb-4">대여 결제</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* 좌측: 배송지/요청사항 (2열 중 2칸) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">수령인 정보</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">이름</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
              </div>
              <div>
                <Label htmlFor="phone">연락처</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" />
              </div>
              <div>
                <Label htmlFor="postal">우편번호</Label>
                <Input id="postal" value={postalCode} onChange={(e) => setPostal(e.target.value)} placeholder="00000" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="addr">주소</Label>
                <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="도로명 주소" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="addr2">상세 주소</Label>
                <Input id="addr2" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="동/호수 등" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">요청사항</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={deliveryRequest} onChange={(e) => setRequest(e.target.value)} placeholder="요청사항을 입력하세요." />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <button onClick={onPay} disabled={loading} className={cn('h-11 px-6 rounded-lg bg-emerald-600 text-white font-semibold', loading && 'opacity-50 cursor-not-allowed')}>
              {loading ? '처리 중…' : '결제하기'}
            </button>
          </div>
        </div>

        {/* 우측: 주문 요약 (2열 중 1칸) */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">주문 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 상품 요약행 */}
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-gray-100 relative rounded overflow-hidden">{initial.racket?.image ? <Image src={initial.racket.image} alt="racket" fill className="object-cover" /> : null}</div>
                <div className="flex-1">
                  <div className="text-sm text-gray-500">중고 라켓</div>
                  <div className="font-medium">
                    {initial.racket?.brand} {initial.racket?.model} · 상태 {initial.racket?.condition}
                  </div>
                  <div className="text-xs text-gray-500">대여 기간 {initial.period}일</div>
                </div>
              </div>

              {/* 금액 표 */}
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>대여 수수료</span>
                  <span>{initial.fee.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>보증금</span>
                  <span>{initial.deposit.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1">
                  <span>결제 금액</span>
                  <span>{total.toLocaleString()}원</span>
                </div>
                <div className="text-xs text-gray-500 pt-1">* 반납 완료 시 보증금 환불(연체/파손 시 차감)</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
