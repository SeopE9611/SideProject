'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type RacketView = {
  id: string;
  brand: string;
  model: string;
  price: number;
  images: string[];
  status: 'available' | 'sold' | 'rented' | 'inactive';
};

type PickupMethod = 'courier' | 'visit';
type Bank = 'shinhan' | 'kookmin' | 'woori';

export default function RacketPurchaseCheckoutClient({ racket }: { racket: RacketView }) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [depositor, setDepositor] = useState('');
  const [deliveryRequest, setDeliveryRequest] = useState('');

  const [pickupMethod, setPickupMethod] = useState<PickupMethod>('courier');
  const [bank, setBank] = useState<Bank>('shinhan');

  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const shippingFee = useMemo(() => 0, []); // TODO:  프로젝트 배송비 정책 붙일 자리
  const totalPrice = useMemo(() => racket.price + shippingFee, [racket.price, shippingFee]);

  const canSubmit = racket.status === 'available' && agree && !submitting && name.trim() && phone.trim() && address.trim() && postalCode.trim() && depositor.trim();

  async function onSubmit() {
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);

      const payload = {
        items: [{ productId: racket.id, quantity: 1, kind: 'racket' as const }],
        shippingInfo: {
          name,
          phone,
          address,
          addressDetail,
          postalCode,
          depositor,
          deliveryRequest,
          shippingMethod: pickupMethod === 'visit' ? 'visit' : 'courier',
        },
        totalPrice,
        shippingFee,
        paymentInfo: { bank }, // 서버 createOrder가 body.paymentInfo?.bank 읽음
        servicePickupMethod: pickupMethod, // 서버에서 (order as any).servicePickupMethod로 저장 중
      };

      // 멱등 키(Idempotency-Key): 같은 요청의 중복 주문 방지
      const idemKey = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idemKey,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.orderId) {
        alert(json?.error ?? '주문 생성 실패');
        return;
      }

      router.push(`/racket-orders/${json.orderId}/select-string`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="rounded-lg border p-4">
        <div className="text-lg font-semibold">라켓 구매</div>
        <div className="mt-2 text-sm text-slate-600">
          {racket.brand} {racket.model}
        </div>
        <div className="mt-1 text-sm">가격: {racket.price.toLocaleString()}원</div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-semibold">라켓 접수 방식</div>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="pickup" checked={pickupMethod === 'courier'} onChange={() => setPickupMethod('courier')} />
          택배 발송/수령
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="pickup" checked={pickupMethod === 'visit'} onChange={() => setPickupMethod('visit')} />
          오프라인 매장 방문
        </label>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-semibold">배송 정보</div>

        <input className="w-full rounded border p-2 text-sm" placeholder="수령인" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full rounded border p-2 text-sm" placeholder="연락처" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="w-full rounded border p-2 text-sm" placeholder="우편번호" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        <input className="w-full rounded border p-2 text-sm" placeholder="주소" value={address} onChange={(e) => setAddress(e.target.value)} />
        <input className="w-full rounded border p-2 text-sm" placeholder="상세주소(선택)" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
        <input className="w-full rounded border p-2 text-sm" placeholder="입금자명" value={depositor} onChange={(e) => setDepositor(e.target.value)} />
        <input className="w-full rounded border p-2 text-sm" placeholder="배송 요청사항(선택)" value={deliveryRequest} onChange={(e) => setDeliveryRequest(e.target.value)} />
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-semibold">결제 정보</div>

        <label className="block text-sm">
          은행 선택
          <select className="mt-1 w-full rounded border p-2 text-sm" value={bank} onChange={(e) => setBank(e.target.value as any)}>
            <option value="shinhan">신한</option>
            <option value="kookmin">국민</option>
            <option value="woori">우리</option>
          </select>
        </label>

        <div className="text-sm">
          결제 금액: <span className="font-semibold">{totalPrice.toLocaleString()}원</span>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          주문/결제/개인정보 제공에 동의합니다.
        </label>

        <button className="w-full rounded bg-black px-4 py-2 text-sm text-white disabled:bg-slate-300" disabled={!canSubmit || submitting} onClick={onSubmit}>
          {submitting ? '처리 중...' : '스트링 선택으로 이동'}
        </button>

        {racket.status !== 'available' && <div className="text-sm text-red-600">현재 판매 가능한 라켓이 아닙니다. (status: {racket.status})</div>}
      </div>
    </div>
  );
}
