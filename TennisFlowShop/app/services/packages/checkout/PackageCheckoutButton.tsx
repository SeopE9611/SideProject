"use client";

import type { PackageVariant } from "@/app/services/packages/_lib/packageVariant";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/lib/toast";
import { CreditCard, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

// 제출 직전 최종 가드(우회 방지)용 유효성
// - PackageCheckoutClient에서 disabled로 1차 차단을 하지만,
//   devtools로 disabled를 무시하거나 handleSubmit을 직접 호출할 수 있으니
//   버튼 컴포넌트에서도 최종 검증실시.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: string) => String(v ?? "").replace(/\D/g, "");
const isValidKoreanPhone = (v: string) => /^010\d{8}$/.test(onlyDigits(v));

// idemKey 재시도 안전장치
const IDEM_STORE_KEY = "package-checkout.idem.v1";
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
      const parsed = JSON.parse(raw) as {
        key?: string;
        sig?: string;
        ts?: number;
      };
      const fresh =
        typeof parsed.ts === "number" && Date.now() - parsed.ts < IDEM_TTL_MS;
      if (fresh && parsed.sig === sig && parsed.key) return parsed.key;
    }
    const key = crypto.randomUUID();
    window.sessionStorage.setItem(
      IDEM_STORE_KEY,
      JSON.stringify({ key, sig, ts: Date.now() }),
    );
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
  variant: PackageVariant;
  description: string;
  validityPeriod: string;
}

export default function PackageCheckoutButton({
  disabled,
  ownershipBlockedMessage,
  packageInfo,
  name,
  phone,
  email,
  depositor,
  selectedBank,
  serviceRequest,
  saveInfo,
  isLoggedIn,
  onSubmittingChange,
}: {
  disabled: boolean;
  ownershipBlockedMessage: string | null;
  packageInfo: PackageInfo;
  name: string;
  phone: string;
  email: string;
  depositor: string;
  selectedBank: string;
  serviceRequest: string;
  saveInfo: boolean;
  // 로그인 상태는 checkout 서버/상위 클라이언트에서 이미 알고 있으므로
  // 버튼은 이 값을 재사용해 mount 시 중복 사용자 조회를 제거한다.
  isLoggedIn: boolean;
  onSubmittingChange?: (submitting: boolean) => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const setSubmitting = (submitting: boolean) => {
    setIsSubmitting(submitting);
    onSubmittingChange?.(submitting);
  };

  const handleSubmit = async () => {
    // 0) 중복 클릭 방지
    if (submittingRef.current || isSubmitting) return;

    // 1) disabled 우회 방지: devtools로 버튼 활성화/직접 호출해도 여기서 막힘
    //    - disabled에는 약관 동의 + 필수값 검증(canSubmit)이 들어가 있음
    if (disabled) {
      showErrorToast(
        ownershipBlockedMessage ?? "필수 입력값/약관 동의를 확인해주세요.",
      );
      return;
    }

    // 2) 제출 직전 최종 검증(클라)
    //    - Client에서 이미 막고 있지만, 최종 안전장치
    const nameTrim = name.trim();
    if (!nameTrim || nameTrim.length < 2) {
      showErrorToast("신청자 이름을 확인해주세요. (2자 이상)");
      return;
    }

    const emailTrim = email.trim();
    if (!emailTrim || !EMAIL_RE.test(emailTrim)) {
      showErrorToast("이메일 형식을 확인해주세요.");
      return;
    }

    const phoneDigits = onlyDigits(phone);
    if (!phoneDigits || !isValidKoreanPhone(phoneDigits)) {
      showErrorToast("올바른 연락처 형식(01012345678)으로 입력해주세요.");
      return;
    }

    const depositorTrim = depositor.trim();
    if (!depositorTrim || depositorTrim.length < 2) {
      showErrorToast("입금자명을 확인해주세요. (2자 이상)");
      return;
    }

    if (!selectedBank) {
      showErrorToast("입금 은행을 선택해주세요.");
      return;
    }
    // 성공 시에는 페이지 이동이 끝날 때까지 로딩을 유지하기 위한 플래그
    let success = false;

    // 검증 통과 후에만 제출 플래그 ON
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const serviceInfo = {
        name: nameTrim,
        phone: phoneDigits,
        email: emailTrim,
        depositor: depositorTrim,
        serviceRequest,
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
          provider: "manual_bank_transfer",
          method: "무통장입금",
          bank: selectedBank,
        },
        totalPrice: packageInfo.price,
        // checkout/page.tsx + PackageCheckoutClient.tsx에서 이미 로그인 사용자 정보를 선조회한다.
        // 그래서 버튼 mount 시 getMyInfo()를 다시 부르는 것은 중복 fetch이며, 이 값으로 충분히 분기할 수 있다.
        // 결과적으로 첫 진입 시 버튼 초기화가 단순해지고, 불필요한 확인 로딩 없이 바로 제출 가능 상태를 유지한다.
        guestInfo: !isLoggedIn
          ? { name: nameTrim, phone: phoneDigits, email: emailTrim }
          : undefined,
      };

      const sig = `v1:${fnv1a32(JSON.stringify(packageOrderData))}`;
      const idemKey = getOrCreateIdemKey(sig);

      const res = await fetch("/api/packages/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idemKey,
        },
        body: JSON.stringify(packageOrderData),
        credentials: "include",
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
        if (res.status === 409 && data?.code === "PACKAGE_ALREADY_OWNED") {
          showErrorToast(
            data?.error ??
              "이미 보유 중인 패키지가 있어 추가 구매할 수 없습니다.",
          );
          return;
        }
        showErrorToast(data?.error ?? "패키지 주문 실패: 서버 오류");
        return;
      }

      if (data?.packageOrderId) {
        // 성공 시에는 다음 주문을 위해 제거
        clearIdemKey();

        // 상위에서 전달한 로그인 상태를 기준으로 기존 의미를 그대로 유지한다.
        // 즉, 로그인 사용자 + 저장 동의인 경우에만 회원 정보 PATCH를 시도한다.
        // (로그인 판단/버튼 가드의 동작 의미는 기존과 동일)
        if (isLoggedIn && saveInfo) {
          try {
            await fetch("/api/users/me", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: nameTrim,
                phone: phoneDigits,
                email: emailTrim,
              }),
            });
          } catch {
            // 저장 실패는 주문 성공을 막지 않음(UX 우선)
          }
        }

        success = true; // 성공했으므로 현재 페이지에서 로딩을 풀지 않음
        router.push(
          `/services/packages/success?packageOrderId=${data.packageOrderId}`,
        );
        router.refresh();
        return;
      }

      showErrorToast(data?.error ?? "패키지 주문 실패: 서버 오류");
    } catch (e) {
      showErrorToast("패키지 주문 처리 중 오류가 발생했습니다.");
    } finally {
      // 실패한 경우에만 잠금 해제
      // 성공한 경우는 success 페이지로 이동하는 동안 로딩 유지
      if (!success) {
        submittingRef.current = false;
        setSubmitting(false);
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
            패키지 주문 처리중...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-3" />
            패키지 주문 완료하기
          </>
        )}
      </Button>
    </>
  );
}
