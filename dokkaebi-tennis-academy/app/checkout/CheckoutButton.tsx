'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/stores/cart';

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
  const { data: session } = useSession();
  const { items } = useCartStore();
  const { clearCart } = useCartStore();

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
      guestInfo: !session?.user
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      // '배송지 저장' 체크 시 회원 정보 업데이트
      if (session?.user && saveAddress) {
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
