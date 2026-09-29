import { Top } from "@toss/tds-mobile";
import { useCallback, useEffect, useState } from "react";

import { getStringingCheckoutQuote } from "../api/stringing";
import { formatGaugeLabel, formatPrice, getStringColorLabel } from "../lib/product-labels";
import type {
  StringingApplicantDraft,
  StringingCheckoutQuote,
  StringingCollectionMethod,
  StringingShippingDraft,
  StringingWorkDraft,
} from "../types/stringing";

type StringingApplicationStepFourProps = {
  productId: string;
  selectedColor: string;
  selectedGauge: string;
  applicant: StringingApplicantDraft;
  collectionMethod: StringingCollectionMethod;
  shipping: StringingShippingDraft;
  work: StringingWorkDraft;
  onBack: () => void;
  onContinue: () => void;
};

type QuoteLoadState = "loading" | "success" | "error";

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function StringingApplicationStepFour({
  productId,
  selectedColor,
  selectedGauge,
  applicant,
  collectionMethod,
  shipping,
  work,
  onBack,
  onContinue,
}: StringingApplicationStepFourProps) {
  const [quote, setQuote] = useState<StringingCheckoutQuote | null>(null);

  const [loadState, setLoadState] = useState<QuoteLoadState>("loading");

  const [errorMessage, setErrorMessage] = useState("");

  const loadQuote = useCallback(
    async (signal?: AbortSignal) => {
      setLoadState("loading");
      setErrorMessage("");

      try {
        const result = await getStringingCheckoutQuote(productId, collectionMethod, signal);

        if (signal?.aborted) {
          return;
        }

        setQuote(result);
        setLoadState("success");
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        console.error("[주문 내용 확인 금액 조회 실패]", error);

        setQuote(null);

        setErrorMessage(error instanceof Error ? error.message : "주문 금액을 확인하지 못했습니다.");

        setLoadState("error");
      }
    },
    [collectionMethod, productId],
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadQuote(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadQuote]);

  const isVisit = collectionMethod === "visit";

  const collectionLabel = isVisit ? "매장 방문 접수" : "자가 발송";

  const optionLabel = [getStringColorLabel(selectedColor), formatGaugeLabel(selectedGauge)].filter(Boolean).join(" · ");

  const shippingAddress = [shipping.address, shipping.addressDetail].filter(Boolean).join(" ");

  return (
    <main className="min-h-dvh w-full bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
      <section className="pt-[calc(16px+env(safe-area-inset-top))]">
        <Top
          title={<Top.TitleParagraph size={22}>교체서비스 포함 주문</Top.TitleParagraph>}
          subtitleBottom={<Top.SubtitleParagraph size={17}>4 / 5 · 주문 내용 확인</Top.SubtitleParagraph>}
        />
      </section>

      <section className="px-6 max-[359px]:px-5" aria-labelledby="order-review-title">
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">STEP 04</p>

          <h1 id="order-review-title" className="m-0 text-[22px] leading-[1.35] font-extrabold tracking-[-0.02em]">
            주문 내용 확인
          </h1>

          <p className="mt-2 mb-0 break-keep text-sm leading-[1.6] text-[#6b7684]">
            입력한 정보와 현재 서버 기준 주문 금액을 확인해주세요.
          </p>
        </div>

        {loadState === "loading" && (
          <div className="rounded-[20px] bg-[#f7f8fa] px-5 py-8 text-center text-sm text-[#6b7684]" role="status">
            최신 주문 금액을 확인하고 있어요.
          </div>
        )}

        {loadState === "error" && (
          <div className="rounded-[20px] bg-[#fff4f2] px-5 py-6 text-center" role="alert">
            <strong className="block text-sm font-extrabold text-[#d92d20]">주문 금액을 확인하지 못했어요.</strong>

            <p className="mt-2 mb-0 break-keep text-[13px] leading-[1.55] text-[#6b7684]">{errorMessage}</p>

            <button
              className="mt-4 min-h-11 rounded-xl bg-[#191f28] px-5 text-sm font-bold text-white"
              type="button"
              onClick={() => void loadQuote()}
            >
              다시 시도
            </button>
          </div>
        )}

        {loadState === "success" && quote && (
          <div className="flex flex-col gap-4">
            <section className="rounded-[20px] border border-[#e5e8eb] p-[18px]">
              <p className="m-0 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">PRODUCT</p>

              <strong className="mt-2 block break-keep text-base font-extrabold text-[#191f28]">
                {quote.item?.name ?? "스트링 상품"}
              </strong>

              <p className="mt-1.5 mb-0 text-sm text-[#6b7684]">{optionLabel}</p>

              <p className="mt-1 mb-0 text-[13px] text-[#8b95a1]">수량 1개</p>
            </section>

            <section className="rounded-[20px] border border-[#e5e8eb] p-[18px]">
              <strong className="block text-base font-extrabold text-[#191f28]">신청자 정보</strong>

              <dl className="mt-4 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
                <dt className="text-[#8b95a1]">이름</dt>
                <dd className="m-0 break-all text-[#333d4b]">{applicant.name}</dd>

                <dt className="text-[#8b95a1]">연락처</dt>
                <dd className="m-0 break-all text-[#333d4b]">{applicant.phone}</dd>

                <dt className="text-[#8b95a1]">이메일</dt>
                <dd className="m-0 break-all text-[#333d4b]">{applicant.email}</dd>
              </dl>
            </section>

            <section className="rounded-[20px] border border-[#e5e8eb] p-[18px]">
              <strong className="block text-base font-extrabold text-[#191f28]">전달·수령 정보</strong>

              <dl className="mt-4 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
                <dt className="text-[#8b95a1]">전달 방법</dt>
                <dd className="m-0 text-[#333d4b]">{collectionLabel}</dd>

                {!isVisit && (
                  <>
                    <dt className="text-[#8b95a1]">우편번호</dt>
                    <dd className="m-0 text-[#333d4b]">{shipping.postalCode}</dd>

                    <dt className="text-[#8b95a1]">주소</dt>
                    <dd className="m-0 break-keep text-[#333d4b]">{shippingAddress}</dd>
                  </>
                )}
              </dl>
            </section>

            <section className="rounded-[20px] border border-[#e5e8eb] p-[18px]">
              <strong className="block text-base font-extrabold text-[#191f28]">라켓·텐션 정보</strong>

              <dl className="mt-4 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
                <dt className="text-[#8b95a1]">라켓명</dt>
                <dd className="m-0 break-keep text-[#333d4b]">{work.racketType}</dd>

                <dt className="text-[#8b95a1]">메인</dt>
                <dd className="m-0 text-[#333d4b]">
                  {work.tensionMain}
                  LB
                </dd>

                <dt className="text-[#8b95a1]">크로스</dt>
                <dd className="m-0 text-[#333d4b]">
                  {work.tensionCross}
                  LB
                </dd>

                {work.note.trim() && (
                  <>
                    <dt className="text-[#8b95a1]">요청사항</dt>
                    <dd className="m-0 whitespace-pre-line break-keep text-[#333d4b]">{work.note}</dd>
                  </>
                )}

                {isVisit && (
                  <>
                    <dt className="text-[#8b95a1]">방문 예약</dt>
                    <dd className="m-0 text-[#333d4b]">
                      {work.preferredDate} {work.preferredTime}
                    </dd>
                  </>
                )}
              </dl>
            </section>

            <section className="rounded-[20px] border border-[#e5e8eb] p-[18px]">
              <strong className="block text-base font-extrabold text-[#191f28]">예상 결제 금액</strong>

              <dl className="mt-4 flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#6b7684]">상품 판매가</dt>
                  <dd className="m-0 font-semibold text-[#333d4b]">{formatPrice(quote.subtotal)}</dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#6b7684]">배송비</dt>
                  <dd className="m-0 font-semibold text-[#333d4b]">
                    {quote.shippingFee > 0 ? formatPrice(quote.shippingFee) : "무료"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#6b7684]">교체서비스 비용</dt>
                  <dd className="m-0 font-semibold text-[#333d4b]">{formatPrice(quote.serviceFee)}</dd>
                </div>

                <div className="mt-1 border-t border-[#e5e8eb] pt-4">
                  <div className="flex items-end justify-between gap-3">
                    <dt className="font-extrabold text-[#191f28]">결제 예정 금액</dt>
                    <dd className="m-0 text-xl font-extrabold text-[#688d00]">{formatPrice(quote.payableAmount)}</dd>
                  </div>
                </div>
              </dl>
            </section>

            <aside className="rounded-[18px] bg-[#f2f4f6] p-4">
              <strong className="block text-sm font-extrabold text-[#333d4b]">
                아직 실제 주문이나 결제는 발생하지 않습니다.
              </strong>

              <p className="mt-1.5 mb-0 break-keep text-[13px] leading-[1.55] text-[#6b7684]">
                다음 단계에서 Toss Pay 결제 인증 후 서버 승인 및 주문 접수가 진행됩니다.
              </p>
            </aside>
            <aside className="rounded-[18px] border border-[#e5e8eb] p-4">
              <strong className="block text-sm font-extrabold text-[#333d4b]">스트링 교체서비스 취소/환불</strong>
              <ul className="mt-2 mb-0 list-disc space-y-1 pl-5 break-keep text-[13px] leading-[1.55] text-[#6b7684]">
                <li>신청 접수 후 작업 시작 전에는 취소 요청이 가능합니다.</li>
                <li>스트링 장착 작업이 시작된 이후에는 취소/환불이 제한될 수 있습니다.</li>
                <li>고객 요청 스펙 기반 서비스 특성상 작업 완료 후 단순 변심 환불은 제한될 수 있습니다.</li>
              </ul>
            </aside>
          </div>
        )}
      </section>

      <section className="mt-6 px-6 max-[359px]:px-5">
        <div className="grid grid-cols-[0.72fr_1.28fr] gap-2.5">
          <button
            className="min-h-[52px] rounded-2xl border border-[#d1d6db] bg-white px-4 text-base font-bold text-[#4e5968]"
            type="button"
            onClick={onBack}
          >
            이전
          </button>

          <button
            className="min-h-[52px] rounded-2xl bg-[#191f28] px-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#e5e8eb] disabled:text-[#8b95a1]"
            type="button"
            disabled={loadState !== "success" || !quote}
            onClick={onContinue}
          >
            주문 정보 확인
          </button>
        </div>

      </section>
    </main>
  );
}

export default StringingApplicationStepFour;
