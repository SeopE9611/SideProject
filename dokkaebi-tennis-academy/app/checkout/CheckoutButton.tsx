'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/stores/cart';
import { useState, useEffect } from 'react';
import { User } from '@/lib/stores/auth-store';
import { getMyInfo } from '@/lib/auth.client';

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
}) {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyInfo()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    const shippingInfo = {
      name,
      phone,
      address: `${address} ${addressDetail}`,
      postalCode,
      depositor,
      deliveryRequest,
      deliveryMethod,
      withStringService,
    };
    const orderData = {
      items,
      shippingInfo,
      paymentInfo: {
        method: '무통장입금',
        bank: selectedBank,
      },
      totalPrice,
      shippingFee,
      guestInfo: !user ? { name, phone, email } : undefined,
      isStringServiceApplied: withStringService,
    };

    console.log('주문 요청 데이터', {
      items,
      shippingInfo,
      totalPrice,
      shippingFee,
    });

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
        credentials: 'include',
      });

      // 회원이면 배송지 저장
      if (user && saveAddress) {
        await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            address,
            postalCode,
            addressDetail,
          }),
        });
      }

      const data = await res.json();

      if (data?.orderId) {
        clearCart();
        router.push(`/checkout/success?orderId=${data.orderId}`);
      } else {
        alert('주문 실패: 서버 오류');
      }
    } catch (error) {
      console.error('주문 실패:', error);
      alert('주문 중 문제가 발생했습니다.');
    }
  };

  return (
    <Button onClick={handleSubmit} className="w-full" size="lg" disabled={disabled}>
      주문 완료하기
    </Button>
  );
}
