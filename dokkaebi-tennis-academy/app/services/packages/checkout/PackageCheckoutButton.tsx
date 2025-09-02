'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import type { User } from '@/app/store/authStore';
import { getMyInfo } from '@/lib/auth.client';
import { showErrorToast } from '@/lib/toast';
import { CreditCard, Loader2 } from 'lucide-react';

interface PackageInfo {
  id: string;
  title: string;
  sessions: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  popular?: boolean;
  features: string[];
  benefits: string[];
  color: string;
  description: string;
  validityPeriod: string;
}

export default function PackageCheckoutButton({
  disabled,
  packageInfo,
  name,
  phone,
  email,
  postalCode,
  address,
  addressDetail,
  depositor,
  selectedBank,
  serviceRequest,
  saveInfo,
  serviceMethod,
}: {
  disabled: boolean;
  packageInfo: PackageInfo;
  name: string;
  phone: string;
  email: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  depositor: string;
  selectedBank: string;
  serviceRequest: string;
  saveInfo: boolean;
  serviceMethod: '방문이용' | '출장서비스';
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    getMyInfo({ quiet: true })
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (submittingRef.current || isSubmitting) return;
    submittingRef.current = true;
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const serviceInfo = {
        name,
        phone,
        email,
        address: serviceMethod === '출장서비스' ? address : '',
        addressDetail: serviceMethod === '출장서비스' ? addressDetail : '',
        postalCode: serviceMethod === '출장서비스' ? postalCode : '',
        depositor,
        serviceRequest,
        serviceMethod,
      };

      const packageOrderData = {
        packageInfo: {
          id: packageInfo.id,
          title: packageInfo.title,
          sessions: packageInfo.sessions,
          price: packageInfo.price,
          validityPeriod: packageInfo.validityPeriod,
        },
        serviceInfo,
        paymentInfo: {
          method: '무통장입금',
          bank: selectedBank,
        },
        totalPrice: packageInfo.price,
        guestInfo: !user ? { name, phone, email } : undefined,
      };

      const idemKey = crypto.randomUUID();

      const res = await fetch('/api/packages/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
        body: JSON.stringify(packageOrderData),
        credentials: 'include',
      });

      // 회원이면 정보 저장
      if (user && saveInfo) {
        await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            email,
            address: serviceMethod === '출장서비스' ? address : undefined,
            postalCode: serviceMethod === '출장서비스' ? postalCode : undefined,
            addressDetail: serviceMethod === '출장서비스' ? addressDetail : undefined,
          }),
        });
      }

      const data = await res.json();

      if (data?.packageOrderId) {
        router.push(`/services/packages/success?packageOrderId=${data.packageOrderId}`);
        router.refresh();
        return;
      }

      showErrorToast(data?.error ?? '패키지 주문 실패: 서버 오류');
    } catch (e) {
      showErrorToast('패키지 주문 처리 중 오류가 발생했습니다.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleSubmit}
        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl transition-all duration-300"
        size="lg"
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            패키지 주문 처리중...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-3" />
            패키지 주문 완료하기
          </>
        )}
      </Button>

      {/* 제출 중 전체 오버레이 */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[60] bg-black/10 backdrop-blur-[2px] cursor-wait">
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex items-center gap-3 rounded-xl bg-white/90 px-4 py-3 shadow">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">패키지 주문을 처리하고 있어요…</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
