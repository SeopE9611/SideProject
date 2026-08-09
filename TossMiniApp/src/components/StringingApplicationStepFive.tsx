import { Top } from "@toss/tds-mobile";
import { useEffect, useState } from "react";

import { AppsAuthApiError } from "../api/auth";
import { AppsLoginBridgeError, useAppsInTossAuth } from "../auth/AppsInTossAuthContext";

type StringingApplicationStepFiveProps = {
  onBack: () => void;
};

function StringingApplicationStepFive({ onBack }: StringingApplicationStepFiveProps) {
  const auth = useAppsInTossAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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
          <div className="rounded-[20px] bg-[#f4f9e8] p-5" role="status">
            <strong className="block text-base font-extrabold text-[#344700]">로그인이 완료됐어요.</strong>
            <p className="mt-2 mb-0 break-keep text-sm leading-[1.6] text-[#59636e]">
              {auth.user.name}님으로 로그인했습니다.
            </p>
            <p className="mt-2 mb-0 break-keep text-[13px] leading-[1.55] text-[#6b7684]">
              결제 연결은 다음 구현 단계에서 진행됩니다. 현재는 실제 주문이나 결제를 생성하지 않아요.
            </p>
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
