'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showErrorToast } from '@/lib/toast';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

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

// 제출 직전 최종 유효성 가드
const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: string) => String(v ?? '').replace(/\D/g, '');
const isValidKoreanPhone = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11;
};
const ALLOWED_BANKS = new Set<Bank>(['shinhan', 'kookmin', 'woori']);
const ALLOWED_PICKUP = new Set<PickupMethod>(['courier', 'visit']);

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

  const shippingFee = useMemo(() => {
    // 방문 수령이면 배송비 0
    if (pickupMethod === 'visit') return 0;
    // 택배: 30,000원 이상 무료배송, 미만 3,000원
    return racket.price >= 30000 ? 0 : 3000;
  }, [pickupMethod, racket.price]);
  const totalPrice = useMemo(() => racket.price + shippingFee, [racket.price, shippingFee]);

  // const canSubmit = racket.status === 'available' && agree && !submitting && name.trim() && phone.trim() && address.trim() && postalCode.trim() && depositor.trim();
  // canSubmit은 boolean으로 유지(기존은 && 체인 때문에 string이 될 수 있음)
  const canSubmit = racket.status === 'available' && agree && !submitting && Boolean(name.trim() && phone.trim() && address.trim() && postalCode.trim() && depositor.trim());

  /**
   * 입력 이탈 경고(Unsaved Changes Guard)
   * - 초기값 대비 “뭐라도” 바뀌면 dirty=true
   * - 입력했다가 다시 초기값으로 되돌리면 dirty=false로 복귀
   */
  const isDirty = useMemo(() => {
    const hasText = Boolean(name) || Boolean(phone) || Boolean(address) || Boolean(addressDetail) || Boolean(postalCode) || Boolean(depositor) || Boolean(deliveryRequest);
    const hasNonDefault = pickupMethod !== 'courier' || bank !== 'shinhan' || agree !== false;
    return hasText || hasNonDefault;
  }, [name, phone, address, addressDetail, postalCode, depositor, deliveryRequest, pickupMethod, bank, agree]);

  useUnsavedChangesGuard(isDirty);

  async function onSubmit() {
    // 0) 중복 클릭 방지
    if (submitting) return;

    // 1) disabled 우회 방지: devtools로 버튼을 강제로 눌러도 여기서 차단
    if (!canSubmit) {
      showErrorToast('필수 입력값/동의 항목을 확인해주세요.');
      return;
    }

    // 2) 제출 직전 최종 검증 + 정규화
    const nameTrim = name.trim();
    const phoneDigits = onlyDigits(phone);
    const postalTrim = onlyDigits(postalCode).trim();
    const addressTrim = address.trim();
    const addressDetailTrim = addressDetail.trim();
    const depositorTrim = depositor.trim();
    const deliveryRequestTrim = deliveryRequest.trim();

    // 재고/상태 가드(동시성)
    if (racket.status !== 'available') {
      showErrorToast('현재 판매 가능한 라켓이 아닙니다.');
      return;
    }

    if (nameTrim.length < 2) {
      showErrorToast('수령인 이름은 2자 이상 입력해주세요.');
      return;
    }
    if (!isValidKoreanPhone(phoneDigits)) {
      showErrorToast('연락처는 숫자 10~11자리로 입력해주세요.');
      return;
    }
    if (!POSTAL_RE.test(postalTrim)) {
      showErrorToast('우편번호(5자리)를 확인해주세요.');
      return;
    }
    if (!addressTrim) {
      showErrorToast('주소를 입력해주세요.');
      return;
    }
    if (depositorTrim.length < 2) {
      showErrorToast('입금자명은 2자 이상 입력해주세요.');
      return;
    }
    if (!ALLOWED_PICKUP.has(pickupMethod)) {
      showErrorToast('접수 방식 값이 올바르지 않습니다. 다시 선택해주세요.');
      return;
    }
    if (!ALLOWED_BANKS.has(bank)) {
      showErrorToast('은행 선택 값이 올바르지 않습니다. 다시 선택해주세요.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        items: [{ productId: racket.id, quantity: 1, kind: 'racket' as const }],
        shippingInfo: {
          name: nameTrim,
          phone: phoneDigits,
          address: addressTrim,
          addressDetail: addressDetailTrim,
          postalCode: postalTrim,
          depositor: depositorTrim,
          deliveryRequest: deliveryRequestTrim,
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
        showErrorToast(json?.error ?? '주문 생성 실패');
        return;
      }

      router.push(`/racket-orders/${json.orderId}/select-string`);
    } catch (e) {
      showErrorToast('주문 처리 중 오류가 발생했습니다.');
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
