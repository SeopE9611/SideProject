'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/stores/cart';
import { useState, useEffect } from 'react';
import { useAuthStore, User } from '@/lib/stores/auth-store';
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
  const token = useAuthStore((state) => state.accessToken);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { items } = useCartStore();
  const { clearCart } = useCartStore();

  useEffect(() => {
    if (!token) {
      // 비회원이면 그냥 user는 null로 두고 통과
      setUser(null);
      setLoading(false);
      return;
    }

    getMyInfo()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null)) // 비회원 주문 가능
      .finally(() => setLoading(false));
  }, [token]);

  // if (!user) return null;

  const handleSubmit = async () => {
    const orderData = {
      items,
      shippingInfo: {
        name,
        phone,
        address: `${address} ${addressDetail}`,
        postalCode,
        depositor,
        deliveryRequest,
        deliveryMethod,
        withStringService,
      },
      paymentInfo: {
        method: '무통장입금',
        bank: selectedBank,
      },
      totalPrice,
      shippingFee,
      guestInfo: !user
        ? {
            name,
            phone,
            email,
          }
        : undefined,
      isStringServiceApplied: withStringService,
    };

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData),
      });
      // '배송지 저장' 체크 시 회원 정보 업데이트
      if (user && saveAddress) {
        const patchHeaders: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          patchHeaders['Authorization'] = `Bearer ${token}`;
        }

        await fetch('/api/users/me', {
          method: 'PATCH',
          headers: patchHeaders,
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
