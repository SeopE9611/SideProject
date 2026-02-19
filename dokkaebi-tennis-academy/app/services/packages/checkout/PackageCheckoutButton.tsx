'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import type { User } from '@/app/store/authStore';
import { getMyInfo } from '@/lib/auth.client';
import { showErrorToast } from '@/lib/toast';
import { CreditCard, Loader2 } from 'lucide-react';

// 제출 직전 최종 가드(우회 방지)용 유효성
// - PackageCheckoutClient에서 disabled로 1차 차단을 하지만,
//   devtools로 disabled를 무시하거나 handleSubmit을 직접 호출할 수 있으니
//   버튼 컴포넌트에서도 최종 검증실시.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: string) => String(v ?? '').replace(/\D/g, '');
const isValidKoreanPhone = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11;
};

// idemKey 재시도 안전장치
const IDEM_STORE_KEY = 'package-checkout.idem.v1';
const IDEM_TTL_MS = 15 * 60 * 1000;
const fnv1a32 = (str: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
};
const getOrCreateIdemKey = (sig: string) => {
  try {
    const raw = window.sessionStorage.getItem(IDEM_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { key?: string; sig?: string; ts?: number };
      const fresh = typeof parsed.ts === 'number' && Date.now() - parsed.ts < IDEM_TTL_MS;
      if (fresh && parsed.sig === sig && parsed.key) return parsed.key;
    }
    const key = crypto.randomUUID();
    window.sessionStorage.setItem(IDEM_STORE_KEY, JSON.stringify({ key, sig, ts: Date.now() }));
    return key;
  } catch {
    return crypto.randomUUID();
  }
};
const clearIdemKey = () => {
  try {
    window.sessionStorage.removeItem(IDEM_STORE_KEY);
  } catch {}
};

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
    // 0) 중복 클릭 방지
    if (submittingRef.current || isSubmitting) return;

    // 1) 사용자 정보 확인 중에는 클릭 차단
    //    (loading 중 클릭되면, 로그인 유저인데도 guestInfo로 처리될 수 있음)
    if (loading) {
      showErrorToast('사용자 정보를 확인 중입니다. 잠시만 기다려주세요.');
      return;
    }

    // 2) disabled 우회 방지: devtools로 버튼 활성화/직접 호출해도 여기서 막힘
    //    - disabled에는 약관 동의 + 필수값 검증(canSubmit)이 들어가 있음
    if (disabled) {
      showErrorToast('필수 입력값/약관 동의를 확인해주세요.');
      return;
    }

    // 3) 제출 직전 최종 검증(클라)
    //    - Client에서 이미 막고 있지만, 최종 안전장치
    const nameTrim = name.trim();
    if (!nameTrim || nameTrim.length < 2) {
      showErrorToast('신청자 이름을 확인해주세요. (2자 이상)');
      return;
    }

    const emailTrim = email.trim();
    if (!emailTrim || !EMAIL_RE.test(emailTrim)) {
      showErrorToast('이메일 형식을 확인해주세요.');
      return;
    }

    const phoneDigits = onlyDigits(phone);
    if (!phoneDigits || !isValidKoreanPhone(phoneDigits)) {
      showErrorToast('연락처는 숫자 10~11자리로 입력해주세요.');
      return;
    }

    const depositorTrim = depositor.trim();
    if (!depositorTrim || depositorTrim.length < 2) {
      showErrorToast('입금자명을 확인해주세요. (2자 이상)');
      return;
    }

    if (!selectedBank) {
      showErrorToast('입금 은행을 선택해주세요.');
      return;
    }

    if (serviceMethod === '출장서비스') {
      const postalTrim = postalCode.trim();
      if (!postalTrim || !POSTAL_RE.test(postalTrim)) {
        showErrorToast('우편번호(5자리)를 확인해주세요.');
        return;
      }
      if (!address.trim()) {
        showErrorToast('기본 주소를 입력해주세요.');
        return;
      }
      if (!addressDetail.trim()) {
        showErrorToast('상세 주소를 입력해주세요.');
        return;
      }
    }

    // 검증 통과 후에만 제출 플래그 ON
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const serviceInfo = {
        name: nameTrim,
        phone: phoneDigits,
        email: emailTrim,
        address: serviceMethod === '출장서비스' ? address : '',
        addressDetail: serviceMethod === '출장서비스' ? addressDetail : '',
        postalCode: serviceMethod === '출장서비스' ? postalCode : '',
        depositor: depositorTrim,
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
        guestInfo: !user ? { name: nameTrim, phone: phoneDigits, email: emailTrim } : undefined,
      };

      const sig = `v1:${fnv1a32(JSON.stringify(packageOrderData))}`;
      const idemKey = getOrCreateIdemKey(sig);

      const res = await fetch('/api/packages/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
        body: JSON.stringify(packageOrderData),
        credentials: 'include',
      });

      // 응답 파싱 (서버 에러에서도 json이 올 수 있어 안전하게 처리)
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      // 서버가 실패를 반환했으면 즉시 종료
      if (!res.ok) {
        showErrorToast(data?.error ?? '패키지 주문 실패: 서버 오류');
        return;
      }

      if (data?.packageOrderId) {
        // 성공 시에는 다음 주문을 위해 제거
        clearIdemKey();
        // 주문 성공 후에만 (선택적으로) 회원 정보 저장
        if (user && saveInfo) {
          try {
            await fetch('/api/users/me', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                name: nameTrim,
                phone: phoneDigits,
                email: emailTrim,
                address: serviceMethod === '출장서비스' ? address : undefined,
                postalCode: serviceMethod === '출장서비스' ? postalCode : undefined,
                addressDetail: serviceMethod === '출장서비스' ? addressDetail : undefined,
              }),
            });
          } catch {
            // 저장 실패는 주문 성공을 막지 않음(UX 우선)
          }
        }
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
        className="w-full h-14 text-lg font-semibold bg-primary  to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl transition-all duration-300"
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
            <div className="flex items-center gap-3 rounded-xl bg-card/90 px-4 py-3 shadow">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">패키지 주문을 처리하고 있어요…</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
