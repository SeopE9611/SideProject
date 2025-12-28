'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CartItem, useCartStore } from '@/app/store/cartStore';
import { useState, useEffect, useRef } from 'react';
import type { User } from '@/app/store/authStore';
import { getMyInfo } from '@/lib/auth.client';
import { showErrorToast } from '@/lib/toast';
import { CreditCard, Loader2 } from 'lucide-react';

export default function CheckoutButton({
  disabled,
  name,
  phone,
  email,
  postalCode,
  address,
  addressDetail,
  depositor,
  totalPrice,
  shippingFee,
  selectedBank,
  deliveryRequest,
  saveAddress,
  deliveryMethod,
  withStringService,
  servicePickupMethod,
  items,
  serviceFee = 0,
  pointsToUse = 0,
}: {
  disabled: boolean;
  name: string;
  phone: string;
  email: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  depositor: string;
  totalPrice: number;
  shippingFee: number;
  selectedBank: string;
  deliveryRequest: string;
  saveAddress: boolean;
  deliveryMethod: '택배수령' | '방문수령';
  withStringService: boolean;
  servicePickupMethod: 'SELF_SEND' | 'COURIER_VISIT' | 'SHOP_VISIT';
  items: CartItem[];
  serviceFee?: number;
  pointsToUse?: number;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false); // 동시 클릭 락 ref

  useEffect(() => {
    getMyInfo({ quiet: true })
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    // 동시 클릭 즉시 차단 (상태 업데이트 지연에도 안전)
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    let success = false;

    try {
      const shippingInfo = {
        name,
        phone,
        address,
        addressDetail,
        postalCode,
        depositor,
        deliveryRequest,
        deliveryMethod,
        withStringService,
      };

      // 포인트 사용값: 로그인 유저만 + 정수 + 100단위 보정(서버에서도 재검증 필수)
      const raw = Number(pointsToUse) || 0;
      const normalized = Math.floor(Math.max(0, raw) / 100) * 100;
      const safePointsToUse = user ? normalized : 0;

      const orderData = {
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          kind: item.kind ?? 'product',
        })),
        shippingInfo,
        paymentInfo: {
          method: '무통장입금',
          bank: selectedBank,
        },
        totalPrice, // (gross) 상품+배송+서비스 포함
        shippingFee,
        serviceFee,
        pointsToUse: safePointsToUse,
        guestInfo: !user ? { name, phone, email } : undefined,
        isStringServiceApplied: withStringService,
        servicePickupMethod,
      };

      const idemKey = crypto.randomUUID();

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
        body: JSON.stringify(orderData),
        credentials: 'include',
      });

      const data = await res.json();

      if (data?.orderId) {
        // 주문 성공한 경우에만 배송지 저장
        if (user && saveAddress) {
          await fetch('/api/users/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, address, postalCode, addressDetail }),
          });
        }

        success = true;
        const qs = withStringService ? `orderId=${data.orderId}&autoApply=1` : `orderId=${data.orderId}`;
        router.push(`/checkout/success?${qs}`);
        router.refresh();
        return;
      }

      if (data?.error === 'INSUFFICIENT_STOCK') {
        const isRentalReserved = data?.reason === 'RENTAL_RESERVED';
        showErrorToast(
          <div>
            <p>
              <strong>"{data.productName}"</strong> 상품의 재고가 부족합니다.
            </p>
            <p>{isRentalReserved ? '현재 대여중인 수량이 있어, 판매 가능한 재고가 없습니다.' : '수량을 다시 확인해주세요.'}</p>
            <p>현재 재고: {data.currentStock}개</p>
          </div>
        );
      } else {
        showErrorToast(data?.error ?? '주문 실패: 서버 오류');
      }
    } catch {
      showErrorToast('주문 처리 중 오류가 발생했습니다.');
    } finally {
      // 실패한 경우에만 락/로딩 해제 (성공 시엔 페이지 이동 중 유지)
      if (!success) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  return (
    <>
      <Button
        onClick={handleSubmit}
        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl transition-all duration-300"
        size="lg"
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            주문 처리중...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-3" />
            주문 완료하기
          </>
        )}
      </Button>

      {/* 제출 중 전체 오버레이 */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[60] bg-black/10 backdrop-blur-[2px] cursor-wait">
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex items-center gap-3 rounded-xl bg-white/90 px-4 py-3 shadow">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">주문을 처리하고 있어요…</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
