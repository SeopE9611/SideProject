import { Top } from "@toss/tds-mobile";
import { useEffect, useState } from "react";

import { AppsAuthApiError } from "../api/auth";
import { AppsPaymentApiError, getAppsPaymentIntent, prepareAppsPayment } from "../api/payments";
import { AppsLoginBridgeError, useAppsInTossAuth } from "../auth/AppsInTossAuthContext";
import type {
  StringingApplicantDraft,
  StringingCollectionMethod,
  StringingShippingDraft,
  StringingWorkDraft,
} from "../types/stringing";

type StringingApplicationStepFiveProps = {
  productId: string;
  selectedColor: string;
  selectedGauge: string;
  applicant: StringingApplicantDraft;
  collectionMethod: StringingCollectionMethod;
  shipping: StringingShippingDraft;
  work: StringingWorkDraft;
  paymentAttemptId: string | null;
  onPaymentAttemptIdChange: (attemptId: string | null) => void;
  onBack: () => void;
};

function getPaymentErrorMessage(error: AppsPaymentApiError): string {
  switch (error.code) {
    case "INVALID_REQUEST":
      return "입력한 주문 정보를 다시 확인해주세요. 이전 단계로 돌아가 정보를 확인해주세요.";
    case "INVALID_PAYMENT_AMOUNT":
      return "결제 금액을 확인하지 못했어요. 주문 정보를 다시 확인해주세요.";
    case "AUTH_REQUIRED":
      return "로그인 정보가 만료됐어요. 다시 로그인해주세요.";
    case "PAYMENT_INTENT_EXPIRED":
      return "결제 준비 시간이 만료됐어요. 다시 확인해주세요.";
    case "ATTEMPT_PAYLOAD_MISMATCH":
      return "주문 정보가 변경됐어요. 다시 결제 준비를 확인해주세요.";
    case "ATTEMPT_CONFLICT":
      return "결제 준비 정보를 다시 확인해주세요.";
    case "VISIT_SLOT_UNAVAILABLE":
      return "선택한 방문 시간이 더 이상 예약 가능하지 않아요. 이전 단계에서 시간을 다시 선택해주세요.";
    case "VARIANT_SOLD_OUT":
    case "VARIANT_INSUFFICIENT_STOCK":
      return "선택한 상품 옵션의 재고를 다시 확인해주세요.";
    case "PRODUCT_NOT_AVAILABLE":
    case "VARIANT_NOT_FOUND":
      return "선택한 상품 옵션을 다시 확인해주세요.";
    case "PAYMENT_CONFIGURATION_MISSING":
      return "결제 준비 서버 설정을 확인하지 못했습니다.";
    case "PAYMENT_CREATION_IN_PROGRESS":
      return "결제 준비를 처리하고 있어요. 잠시 후 다시 확인해주세요.";
    case "PAYMENT_CREATION_FAILED":
    case "TOSS_PAY_UNAVAILABLE":
    case "TOSS_PAY_MAKE_FAILED":
      return "결제 준비에 실패했어요. 다시 시도해주세요.";
    default:
      return "결제 준비 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요.";
  }
}

function StringingApplicationStepFive({
  productId,
  selectedColor,
  selectedGauge,
  applicant,
  collectionMethod,
  shipping,
  work,
  paymentAttemptId,
  onPaymentAttemptIdChange,
  onBack,
}: StringingApplicationStepFiveProps) {
  const auth = useAppsInTossAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const sessionExpiresAt = auth.status === "authenticated" ? auth.expiresAt : null;

  useEffect(() => {
    if (sessionExpiresAt && Date.parse(sessionExpiresAt) <= Date.now()) {
      auth.clearSession();
    }
  }, [auth.clearSession, sessionExpiresAt]);

  const handleLogin = async () => {
    if (isLoggingIn || auth.status === "authenticated") return;

    setIsLoggingIn(true);
    setErrorMessage("");

    try {
      await auth.login();
    } catch (error) {
      if (
        error instanceof AppsAuthApiError &&
        (error.code === "INVALID_AUTHORIZATION_CODE" || error.status === 409)
      ) {
        setErrorMessage("로그인 정보가 만료됐어요. 다시 시도해주세요.");
      } else if (error instanceof AppsLoginBridgeError) {
        setErrorMessage("토스 로그인이 취소되었거나 완료되지 않았어요. 다시 시도해주세요.");
      } else {
        setErrorMessage("로그인에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePreparePayment = async () => {
    if (isPreparingPayment || auth.status !== "authenticated") return;

    if (Date.parse(auth.expiresAt) <= Date.now()) {
      auth.clearSession();
      setErrorMessage("로그인 정보가 만료됐어요. 다시 로그인해주세요.");
      return;
    }

    const attemptId = paymentAttemptId ?? crypto.randomUUID();
    if (!paymentAttemptId) {
      onPaymentAttemptIdChange(attemptId);
    }

    setIsPreparingPayment(true);
    setIsPaymentConfirmed(false);
    setErrorMessage("");

    try {
      const prepared = await prepareAppsPayment({
        sessionToken: auth.sessionToken,
        attemptId,
        productId,
        selectedColor,
        selectedGauge,
        applicant,
        collectionMethod,
        shipping,
        work,
      });

      if (prepared.attemptId !== attemptId) {
        throw new AppsPaymentApiError("결제 준비 식별자를 확인하지 못했습니다.", 0);
      }

      const intent = await getAppsPaymentIntent(auth.sessionToken, attemptId);
      if (intent.attemptId !== attemptId || intent.attemptId !== prepared.attemptId) {
        throw new AppsPaymentApiError("결제 준비 식별자를 확인하지 못했습니다.", 0);
      }

      if (intent.state !== "awaiting_authorization" || intent.expired || !intent.paymentReady) {
        throw new AppsPaymentApiError("결제 준비 상태를 확인하지 못했습니다.", 0);
      }

      setIsPaymentConfirmed(true);
    } catch (error) {
      if (error instanceof AppsPaymentApiError) {
        if (error.status === 401 || error.code === "AUTH_REQUIRED") {
          auth.clearSession();
        }
        if (
          error.code === "PAYMENT_INTENT_EXPIRED" ||
          error.code === "ATTEMPT_PAYLOAD_MISMATCH" ||
          error.code === "ATTEMPT_CONFLICT" ||
          error.code === "PAYMENT_CREATION_FAILED" ||
          error.code === "TOSS_PAY_UNAVAILABLE" ||
          error.code === "TOSS_PAY_MAKE_FAILED"
        ) {
          onPaymentAttemptIdChange(null);
        }
        setErrorMessage(getPaymentErrorMessage(error));
      } else {
        setErrorMessage("결제 준비 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsPreparingPayment(false);
    }
  };

  return (
    <main className="min-h-dvh w-full bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
      <section className="pt-[calc(16px+env(safe-area-inset-top))]">
        <Top
          title={<Top.TitleParagraph size={22}>교체서비스 포함 주문</Top.TitleParagraph>}
          subtitleBottom={<Top.SubtitleParagraph size={17}>5 / 5 · 로그인 확인</Top.SubtitleParagraph>}
        />
      </section>

      <section className="px-6 max-[359px]:px-5" aria-labelledby="login-confirm-title">
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">STEP 05</p>
          <h1 id="login-confirm-title" className="m-0 text-[22px] leading-[1.35] font-extrabold tracking-[-0.02em]">
            토스 로그인 및 결제 준비 확인
          </h1>
        </div>

        {auth.status === "authenticated" ? (
          <div>
            <div className="rounded-[20px] bg-[#f4f9e8] p-5" role="status">
              <strong className="block text-base font-extrabold text-[#344700]">
                {isPaymentConfirmed ? "결제 준비가 완료됐어요." : "로그인이 완료됐어요."}
              </strong>
              <p className="mt-2 mb-0 break-keep text-sm leading-[1.6] text-[#59636e]">
                {isPaymentConfirmed
                  ? "서버에서 주문 정보를 다시 확인하고 토스페이 Sandbox 결제 건을 생성했습니다."
                  : `${auth.user.name}님으로 로그인했습니다.`}
              </p>
              <p className="mt-2 mb-0 break-keep text-[13px] leading-[1.55] text-[#6b7684]">
                현재 테스트 단계에서는 실제 승인이나 결제가 발생하지 않습니다.
              </p>
            </div>
            <button
              className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] px-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#e5e8eb] disabled:text-[#8b95a1]"
              type="button"
              disabled={isPreparingPayment}
              onClick={() => void handlePreparePayment()}
            >
              {isPreparingPayment ? "결제 준비 확인 중..." : "결제 준비 확인하기"}
            </button>
            {errorMessage && <p className="mt-3 mb-0 text-sm leading-[1.55] text-[#d92d20]" role="alert">{errorMessage}</p>}
          </div>
        ) : (
          <div className="rounded-[20px] border border-[#e5e8eb] p-5">
            <strong className="block text-base font-extrabold text-[#191f28]">결제 전에 로그인이 필요해요.</strong>
            <p className="mt-2 mb-0 break-keep text-sm leading-[1.6] text-[#6b7684]">
              주문자를 안전하게 확인하기 위해 토스 로그인을 진행해주세요.
            </p>
            <button
              className="mt-5 min-h-[52px] w-full rounded-2xl bg-[#191f28] px-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#e5e8eb] disabled:text-[#8b95a1]"
              type="button"
              disabled={isLoggingIn}
              onClick={() => void handleLogin()}
            >
              {isLoggingIn ? "로그인 중..." : "토스로 로그인하기"}
            </button>
            {errorMessage && <p className="mt-3 mb-0 text-sm leading-[1.55] text-[#d92d20]" role="alert">{errorMessage}</p>}
          </div>
        )}
      </section>

      <section className="mt-6 px-6 max-[359px]:px-5">
        <button
          className="min-h-[52px] w-full rounded-2xl border border-[#d1d6db] bg-white px-4 text-base font-bold text-[#4e5968]"
          type="button"
          onClick={onBack}
        >
          이전
        </button>
      </section>
    </main>
  );
}

export default StringingApplicationStepFive;
