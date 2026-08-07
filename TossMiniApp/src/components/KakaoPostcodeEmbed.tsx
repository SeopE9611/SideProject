import { useEffect, useRef, useState } from "react";

import { getKakaoPostcodeConstructor, loadKakaoPostcode, type KakaoPostcodeData } from "../lib/loadKakaoPostcode";

type KakaoPostcodeEmbedProps = {
  onComplete: (data: KakaoPostcodeData) => void;
  onClose: () => void;
};

type PostcodeLoadState = "loading" | "ready" | "error";

function KakaoPostcodeEmbed({ onComplete, onClose }: KakaoPostcodeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [loadState, setLoadState] = useState<PostcodeLoadState>("loading");

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;

    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";

    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;

      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const mountPostcode = async () => {
      setLoadState("loading");

      try {
        await loadKakaoPostcode();

        if (cancelled) {
          return;
        }

        const Postcode = getKakaoPostcodeConstructor();

        if (!Postcode) {
          throw new Error("Kakao postcode is unavailable");
        }

        container.innerHTML = "";

        const postcode = new Postcode({
          oncomplete: (data) => {
            if (cancelled) {
              return;
            }

            onComplete(data);
          },

          width: "100%",
          height: "100%",
          maxSuggestItems: 5,
        });

        postcode.embed(container);

        setLoadState("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("[우편번호 검색 로드 실패]", error);

        setLoadState("error");
      }
    };

    void mountPostcode();

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [onComplete, retryKey]);

  return (
    <section
      className="fixed inset-y-0 left-1/2 z-[100] flex h-dvh w-full max-w-[480px] -translate-x-1/2 flex-col bg-white"
      aria-label="주소 검색"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-[#e5e8eb] bg-white px-5 pt-[calc(12px+env(safe-area-inset-top))] pb-3">
        <div>
          <p className="m-0 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">ADDRESS</p>

          <h2 className="mt-1 mb-0 text-xl font-extrabold text-[#191f28]">주소 검색</h2>
        </div>

        <button
          className="min-h-10 rounded-xl px-3 text-sm font-bold text-[#6b7684] outline-none focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#688d00]"
          type="button"
          onClick={onClose}
        >
          닫기
        </button>
      </header>

      <div className="relative min-h-0 flex-1 bg-white">
        {loadState === "loading" && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-white px-5 text-center text-sm text-[#6b7684]"
            role="status"
          >
            주소 검색을 불러오고 있어요.
          </div>
        )}

        {loadState === "error" && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white px-6 text-center"
            role="alert"
          >
            <strong className="block text-base font-extrabold text-[#333d4b]">주소 검색을 불러오지 못했어요.</strong>

            <p className="mt-2 mb-0 text-sm leading-[1.55] text-[#6b7684]">
              네트워크 상태를 확인한 뒤 다시 시도해주세요.
            </p>

            <button
              className="mt-5 min-h-11 rounded-xl bg-[#191f28] px-5 text-sm font-bold text-white outline-none focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#688d00]"
              type="button"
              onClick={() => setRetryKey((current) => current + 1)}
            >
              다시 시도
            </button>
          </div>
        )}

        <div ref={containerRef} className="h-full min-h-0 w-full" />
      </div>

      <div className="shrink-0 bg-white pb-[env(safe-area-inset-bottom)]" />
    </section>
  );
}

export default KakaoPostcodeEmbed;
