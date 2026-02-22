'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CartItem, useCartStore } from '@/app/store/cartStore';
import { useState, useEffect, useRef } from 'react';
import type { User } from '@/app/store/authStore';
import { getMyInfo } from '@/lib/auth.client';
import { showErrorToast } from '@/lib/toast';
import { CreditCard, Loader2 } from 'lucide-react';

// 제출 직전 최종 유효성 가드
type Bank = 'shinhan' | 'kookmin' | 'woori';
const ALLOWED_BANKS = new Set<Bank>(['shinhan', 'kookmin', 'woori']);
const ALLOWED_DELIVERY = new Set(['택배수령', '방문수령'] as const);
const ALLOWED_SERVICE_PICKUP = new Set(['SELF_SEND', 'COURIER_VISIT', 'SHOP_VISIT'] as const);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: string) => String(v ?? '').replace(/\D/g, '');
const isValidKoreanPhone = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11;
};

// checkout/page.tsx 의 input id를 활용해 첫 오류 필드로 포커스 이동
const focusFirst = (ids: string[]) => {
  if (typeof document === 'undefined') return;
  for (const id of ids) {
    const el = document.getElementById(id) as HTMLElement | null;
    if (!el) continue;
    // 일부 컴포넌트(예: Radix)에서는 focus가 가능한 요소가 내부에 있을 수 있어,
    // 우선 자기 자신에 focus 시도 후 실패하면 input/textarea를 찾아봅니다.
    (el as any).focus?.();
    const active = document.activeElement;
    if (active === el) {
      el.scrollIntoView?.({ block: 'center' });
      return;
    }
    const inner = el.querySelector?.('input,textarea,select,button') as HTMLElement | null;
    if (inner) {
      (inner as any).focus?.();
      inner.scrollIntoView?.({ block: 'center' });
      return;
    }
  }
};

// res.json() 파싱 실패(빈 응답/HTML 응답 등)에도 죽지 않도록 방어
const readJsonSafe = async (res: Response) => {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// idemKey 재시도 안전장치
// - 같은 cart(시그니처)로 "재시도"할 땐 동일 idemKey를 재사용해야 중복 주문을 방지할 수 있음
// - 성공 시에는 즉시 삭제하여, 다음 주문은 새 idemKey를 쓰게 함
const IDEM_STORE_KEY = 'checkout.idem.v1';
const IDEM_TTL_MS = 15 * 60 * 1000; // 15분(너무 길면 의도치 않은 재사용 가능)

const cartSignature = (items: CartItem[]) => {
  // 순서 바뀌어도 동일 서명이 되도록 정렬
  return items
    .map((it) => `${it.kind ?? 'product'}:${String(it.id)}:${Number(it.quantity ?? 0)}`)
    .sort()
    .join('|');
};

const getOrCreateIdemKey = (sig: string) => {
  // SSR/빌드 환경 보호
  if (typeof window === 'undefined') return crypto.randomUUID();
  try {
    const raw = window.sessionStorage.getItem(IDEM_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { key?: string; sig?: string; ts?: number };
      const fresh = typeof parsed.ts === 'number' && Date.now() - parsed.ts < IDEM_TTL_MS;
      if (fresh && parsed.sig === sig && typeof parsed.key === 'string' && parsed.key) return parsed.key;
    }
    const key = crypto.randomUUID();
    window.sessionStorage.setItem(IDEM_STORE_KEY, JSON.stringify({ key, sig, ts: Date.now() }));
    return key;
  } catch {
    // sessionStorage/JSON 에러가 나도 주문은 진행 가능해야 함
    return crypto.randomUUID();
  }
};

const clearIdemKey = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(IDEM_STORE_KEY);
  } catch {}
};

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
  serviceTargetIds = [],
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
  serviceTargetIds?: string[];
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
    if (disabled) {
      focusFirst(['agree-all', 'recipient-name']);
      showErrorToast('필수 입력값/약관 동의 항목을 확인해주세요.');
      return;
    }

    // 번들(라켓+교체서비스) 수량 불일치 선제 차단
    // - 라켓 수량과 “장착비 대상 스트링” 수량이 다르면, 서버에서도 BUNDLE_QTY_MISMATCH로 거절
    // - 여기서는 사용자에게 즉시 원인을 알려주고 결제를 중단.
    if (withStringService && Array.isArray(serviceTargetIds) && serviceTargetIds.length > 0) {
      const racketQty = items.reduce((sum, it) => (it.kind === 'racket' ? sum + (it.quantity ?? 0) : sum), 0);
      const targetSet = new Set(serviceTargetIds.map((v) => String(v)));

      const serviceQty = items.reduce((sum, it) => {
        const kind = it.kind ?? 'product';
        if (kind !== 'product') return sum;

        const id = String(it.id);
        if (!targetSet.has(id)) return sum;

        return sum + (it.quantity ?? 0);
      }, 0);

      if (racketQty > 0 && serviceQty > 0 && racketQty !== serviceQty) {
        showErrorToast(`라켓(${racketQty}개)과 스트링(${serviceQty}개) 수량이 일치하지 않습니다. 스트링 선택 화면에서 수량을 수정해주세요.`);
        return;
      }
    }

    // 동시 클릭 즉시 차단 (상태 업데이트 지연에도 안전)
    if (submittingRef.current) return;
    let success = false;

    try {
      // 제출 직전 최종 검증 + 정규화
      const nameTrim = name.trim();
      const phoneDigits = onlyDigits(phone);
      const emailTrim = email.trim().toLowerCase();
      const postalDigits = onlyDigits(postalCode).trim();
      const addressTrim = address.trim();
      const addressDetailTrim = addressDetail.trim();
      const depositorTrim = depositor.trim();
      const deliveryRequestTrim = deliveryRequest.trim();

      const needsShippingAddress = deliveryMethod === '택배수령';

      if (!ALLOWED_DELIVERY.has(deliveryMethod)) {
        showErrorToast('수령 방법 값이 올바르지 않습니다. 다시 선택해주세요.');
        return;
      }

      // 기본 필수
      if (!nameTrim || !phoneDigits) {
        focusFirst(!nameTrim ? ['recipient-name'] : ['recipient-phone']);
        showErrorToast('수령인 이름/연락처를 입력해주세요.');
        return;
      }
      if (nameTrim.length < 2) {
        focusFirst(['recipient-name']);
        showErrorToast('수령인 이름은 2자 이상 입력해주세요.');
        return;
      }
      if (!isValidKoreanPhone(phoneDigits)) {
        focusFirst(['recipient-phone']);
        showErrorToast('연락처는 숫자 10~11자리로 입력해주세요.');
        return;
      }

      // 게스트 주문: 이메일 필수
      // - 이 컴포넌트 내부 user 로딩이 아직 끝나지 않았을 수 있으니,
      //   loading이 true면(미확정) "필수" 강제는 하지 않고, 입력 시 형식만 체크
      if (!loading && !user) {
        if (!emailTrim) {
          focusFirst(['recipient-email']);
          showErrorToast('비회원 주문은 이메일이 필요합니다.');
          return;
        }
        if (!EMAIL_RE.test(emailTrim)) {
          focusFirst(['recipient-email']);
          showErrorToast('이메일 형식을 확인해주세요.');
          return;
        }
      } else if (emailTrim && !EMAIL_RE.test(emailTrim)) {
        showErrorToast('이메일 형식을 확인해주세요.');
        return;
      }

      // 택배수령일 때만 주소 필수 + 형식
      if (needsShippingAddress) {
        if (!POSTAL_RE.test(postalDigits)) {
          focusFirst(['address-postal']);
          showErrorToast('우편번호(5자리)를 확인해주세요.');
          return;
        }
        if (!addressTrim) {
          focusFirst(['address-postal']);
          showErrorToast('기본 주소를 입력해주세요.');
          return;
        }
        if (!addressDetailTrim) {
          focusFirst(['address-detail']);
          showErrorToast('상세 주소를 입력해주세요.');
          return;
        }
      }

      // 무통장 입금: 입금자명 필수
      if (!depositorTrim) {
        focusFirst(['depositor-name']);
        showErrorToast('입금자명을 입력해주세요.');
        return;
      }
      if (depositorTrim.length < 2) {
        focusFirst(['depositor-name']);
        showErrorToast('입금자명은 2자 이상 입력해주세요.');
        return;
      }

      // 은행 값 화이트리스트
      const bank = (selectedBank ?? '').trim() as Bank;
      if (!ALLOWED_BANKS.has(bank)) {
        focusFirst(['bank-transfer']);
        showErrorToast('은행 선택 값이 올바르지 않습니다. 다시 선택해주세요.');
        return;
      }

      // 서비스 픽업 방식 값 방어(서비스 ON일 때만)
      if (withStringService && !ALLOWED_SERVICE_PICKUP.has(servicePickupMethod)) {
        showErrorToast('교체 서비스 수거 방식 값이 올바르지 않습니다. 다시 선택해주세요.');
        return;
      }

      // 아이템 최소 방어
      if (!Array.isArray(items) || items.length === 0) {
        showErrorToast('주문 상품이 비어있습니다.');
        return;
      }
      for (const it of items) {
        const q = Number(it?.quantity ?? 0);
        if (!Number.isFinite(q) || q <= 0) {
          showErrorToast('주문 수량이 올바르지 않습니다.');
          return;
        }
      }

      // 모든 검증 통과 후에만 lock + 로딩 ON
      submittingRef.current = true;
      setIsSubmitting(true);

      const shippingInfo = {
        name: nameTrim,
        phone: phoneDigits,
        address: addressTrim,
        addressDetail: addressDetailTrim,
        postalCode: postalDigits,
        depositor: depositorTrim,
        deliveryRequest: deliveryRequestTrim,
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
          bank,
        },
        totalPrice, // (gross) 상품+배송+서비스 포함
        shippingFee,
        serviceFee,
        pointsToUse: safePointsToUse,
        guestInfo: !user ? { name: nameTrim, phone: phoneDigits, email: emailTrim } : undefined,
        isStringServiceApplied: withStringService,
        servicePickupMethod,
      };

      const sig = cartSignature(items);
      const idemKey = getOrCreateIdemKey(sig);

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
        body: JSON.stringify(orderData),
        credentials: 'include',
      });

      const data = await readJsonSafe(res);

      if (!data) {
        showErrorToast(res.ok ? '주문 응답을 처리할 수 없습니다. 다시 시도해주세요.' : '주문 실패: 서버 응답을 처리할 수 없습니다.');
        return;
      }

      if (data?.orderId) {
        // 성공한 주문은 idemKey를 즉시 제거(다음 주문은 새 키)
        clearIdemKey();
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
          </div>,
        );
      } else if (data?.error === 'BUNDLE_QTY_MISMATCH') {
        showErrorToast(
          <div>
            <p>라켓 수량과 스트링(장착) 수량이 일치하지 않습니다.</p>
            <p>
              라켓: {data?.racketQty ?? '-'}개, 스트링/교체: {data?.serviceQty ?? '-'}개
            </p>
            <p className="mt-1 text-sm text-muted-foreground">이전 단계(스트링 선택)에서 ‘번들 수량’을 다시 맞춰주세요.</p>
          </div>,
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
        className="w-full h-14 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl transition-all duration-300"
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
        <div className="fixed inset-0 z-[60] bg-overlay/10 backdrop-blur-[2px] cursor-wait">
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex items-center gap-3 rounded-xl bg-card/90 px-4 py-3 shadow">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">주문을 처리하고 있어요…</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
