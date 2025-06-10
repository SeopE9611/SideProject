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
}) {
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { items } = useCartStore();
  const { clearCart } = useCartStore();

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    getMyInfo()
      .then(({ user }) => setUser(user))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [token, router]);

  if (!user) return null;

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
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // 토큰 추가
        },
        body: JSON.stringify(orderData),
      });
      // '배송지 저장' 체크 시 회원 정보 업데이트
      if (user && saveAddress) {
        await fetch('/api/users/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`, // 토큰 추가
          },
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
