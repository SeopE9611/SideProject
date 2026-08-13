import { Top } from "@toss/tds-mobile";
import { useEffect, useMemo, useState } from "react";

import { validateShipping } from "../lib/stringing-application-validation";
import type { StringingCollectionMethod, StringingShippingDraft } from "../types/stringing";

type StringingApplicationStepTwoProps = {
  mode?: "stringing" | "racket-purchase";
  errorMessage?: string;
  collectionMethod: StringingCollectionMethod;
  onCollectionMethodChange: (method: StringingCollectionMethod) => void;
  shipping: StringingShippingDraft;
  onShippingChange: (shipping: StringingShippingDraft) => void;
  showValidationErrors?: boolean;
  onBack: () => void;
  onContinue: () => void;
};

const VISIBLE_COLLECTION_METHODS = [
  {
    value: "self_ship",
    title: "자가 발송",
    description: "편의점·우체국 등을 이용해 라켓을 직접 발송해요.",
  },
  {
    value: "visit",
    title: "매장 방문 접수",
    description: "예약 가능한 날짜와 시간을 선택해 직접 방문해요.",
  },
] as const;

const RACKET_PURCHASE_COLLECTION_METHODS = [
  {
    value: "self_ship",
    title: "택배 배송",
    description: "입력한 주소로 완성된 라켓을 안전하게 배송해요.",
  },
  {
    value: "visit",
    title: "매장 방문 수령",
    description: "예약 가능한 날짜와 시간을 선택해 매장에서 직접 받아요.",
  },
] as const;

function StringingApplicationStepTwo({
  mode = "stringing",
  errorMessage = "",
  collectionMethod,
  onCollectionMethodChange,
  shipping,
  onShippingChange,
  showValidationErrors = false,
  onBack,
  onContinue,
}: StringingApplicationStepTwoProps) {
  const [touched, setTouched] = useState({
    postalCode: false,
    address: false,
    addressDetail: false,
  });

  const isSelfShip = collectionMethod === "self_ship";
  const isRacketPurchase = mode === "racket-purchase";
  const methods = isRacketPurchase ? RACKET_PURCHASE_COLLECTION_METHODS : VISIBLE_COLLECTION_METHODS;

  const errors = useMemo(() => validateShipping(collectionMethod, shipping), [collectionMethod, shipping]);

  useEffect(() => {
    if (!showValidationErrors) return;
    const field = (["postalCode", "address", "addressDetail"] as const).find((key) => errors[key]);
    if (field) requestAnimationFrame(() => document.getElementById(`shipping-${field}`)?.focus());
  }, [errors, showValidationErrors]);

  const handleMethodChange = (method: "self_ship" | "visit") => {
    onCollectionMethodChange(method);
  };

  const updateShipping = (field: keyof StringingShippingDraft, value: string) => {
    onShippingChange({
      ...shipping,
      [field]: value,
    });
  };

  const handleConfirm = () => {
    if (isSelfShip) {
      setTouched({
        postalCode: true,
        address: true,
        addressDetail: true,
      });

      if (Object.keys(errors).length > 0) {
        const firstInvalidField = (["postalCode", "address", "addressDetail"] as const).find((field) => errors[field]);
        if (firstInvalidField) {
          requestAnimationFrame(() => document.getElementById(`shipping-${firstInvalidField}`)?.focus());
        }
        return;
      }
    }

    onContinue();
  };

  return (
    <main className="min-h-dvh w-full bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
      <section className="pt-[calc(16px+env(safe-area-inset-top))]">
        <Top
          title={<Top.TitleParagraph size={22}>{isRacketPurchase ? "라켓 구매" : "교체서비스 포함 주문"}</Top.TitleParagraph>}
          subtitleBottom={<Top.SubtitleParagraph size={17}>{isRacketPurchase ? "3 / 6 · 수령 방법·배송지" : "2 / 5 · 전달·수령 정보"}</Top.SubtitleParagraph>}
        />
      </section>

      <section className="px-6 max-[359px]:px-5" aria-labelledby="collection-method-title">
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">STEP 02</p>

          <h1 id="collection-method-title" className="m-0 text-[22px] leading-[1.35] font-extrabold tracking-[-0.02em]">
            {isRacketPurchase ? "라켓 수령 방법" : "라켓 전달 방법"}
          </h1>

          <p className="mt-2 mb-0 break-keep text-sm leading-[1.6] text-[#6b7684]">
            {isRacketPurchase ? "스트링 장착이 끝난 라켓을 받을 방법을 선택해주세요." : "스트링 교체를 위해 라켓을 전달할 방법을 선택해주세요."}
          </p>
        </div>

        {errorMessage ? <p role="alert" className="rounded-2xl bg-[#fff4f2] p-4 text-sm font-semibold text-[#d92d20]">{errorMessage}</p> : null}

        <div className="flex flex-col gap-3" role="radiogroup" aria-label="라켓 전달 방법">
          {methods.map((method) => {
            const isSelected = collectionMethod === method.value;

            return (
              <button
                key={method.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleMethodChange(method.value)}
                className={`min-h-[104px] w-full rounded-[20px] border p-[18px] text-left outline-none transition focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#688d00] ${
                  isSelected ? "border-[#688d00] bg-[#f4f9e8] ring-1 ring-[#dcebba]" : "border-[#e5e8eb] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <strong className="block text-base font-extrabold text-[#191f28]">{method.title}</strong>

                    <p className="mt-2 mb-0 break-keep text-sm leading-[1.55] text-[#6b7684]">{method.description}</p>
                  </div>

                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      isSelected ? "border-[#688d00] bg-[#688d00]" : "border-[#b0b8c1] bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {collectionMethod === "visit" && (
          <div className="mt-4 rounded-2xl bg-[#f7f8fa] p-4">
            <strong className="block text-sm font-extrabold text-[#333d4b]">매장 방문 접수 안내</strong>

            <p className="mt-1.5 mb-0 break-keep text-[13px] leading-[1.55] text-[#6b7684]">
              {isRacketPurchase ? "매장 방문 수령은 주소 입력이 필요하지 않습니다." : "방문 접수는 주소 입력이 필요하지 않습니다."} 방문 날짜와 시간은 다음 단계에서 선택합니다.
            </p>
          </div>
        )}

        {isSelfShip && (
          <>
            <div className="mt-4 rounded-2xl bg-[#f7f8fa] p-4">
              <strong className="block text-sm font-extrabold text-[#333d4b]">{isRacketPurchase ? "택배 배송 안내" : "자가 발송 안내"}</strong>

              <p className="mt-1.5 mb-0 break-keep text-[13px] leading-[1.55] text-[#6b7684]">
                {isRacketPurchase ? "입력한 배송지로 스트링 장착을 마친 라켓을 보내드립니다." : "편의점·우체국 등을 이용해 직접 발송할 수 있습니다."}
              </p>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#e5e8eb] p-[18px]">
              <div className="mb-4">
                <strong className="block text-base font-extrabold text-[#191f28]">주소 정보</strong>

                <p className="mt-1.5 mb-0 break-keep text-[13px] leading-[1.55] text-[#6b7684]">
                  {isRacketPurchase ? "라켓을 받을 배송지를 입력해주세요." : "라켓 발송 및 반송에 사용할 주소를 등록해주세요."}
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#333d4b]">우편번호 *</span>

                <input
                  id="shipping-postalCode"
                  className={`min-h-12 w-full rounded-xl border bg-white px-3.5 text-base text-[#191f28] outline-none transition placeholder:text-[#b0b8c1] focus:ring-2 focus:ring-[#dcebba] ${
                    (touched.postalCode || showValidationErrors) && errors.postalCode
                      ? "border-[#d92d20]"
                      : "border-[#d1d6db] focus:border-[#688d00]"
                  }`}
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={shipping.postalCode}
                  placeholder="5자리 우편번호"
                  onChange={(event) => updateShipping("postalCode", event.target.value.replace(/\D/g, "").slice(0, 5))}
                  onBlur={() =>
                    setTouched((current) => ({
                      ...current,
                      postalCode: true,
                    }))
                  }
                />

                {(touched.postalCode || showValidationErrors) && errors.postalCode && (
                  <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.postalCode}</span>
                )}
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-bold text-[#333d4b]">주소 *</span>

                <input
                  id="shipping-address"
                  className={`min-h-12 w-full rounded-xl border bg-white px-3.5 text-base text-[#191f28] outline-none transition placeholder:text-[#b0b8c1] focus:ring-2 focus:ring-[#dcebba] ${
                    (touched.address || showValidationErrors) && errors.address ? "border-[#d92d20]" : "border-[#d1d6db] focus:border-[#688d00]"
                  }`}
                  type="text"
                  maxLength={200}
                  value={shipping.address}
                  placeholder="도로명 주소를 입력해주세요"
                  onChange={(event) => updateShipping("address", event.target.value)}
                  onBlur={() =>
                    setTouched((current) => ({
                      ...current,
                      address: true,
                    }))
                  }
                />

                {(touched.address || showValidationErrors) && errors.address && (
                  <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.address}</span>
                )}
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-bold text-[#333d4b]">상세 주소 *</span>

                <input
                  id="shipping-addressDetail"
                  className={`min-h-12 w-full rounded-xl border bg-white px-3.5 text-base text-[#191f28] outline-none transition placeholder:text-[#b0b8c1] focus:ring-2 focus:ring-[#dcebba] ${
                    (touched.addressDetail || showValidationErrors) && errors.addressDetail
                      ? "border-[#d92d20]"
                      : "border-[#d1d6db] focus:border-[#688d00]"
                  }`}
                  type="text"
                  maxLength={200}
                  value={shipping.addressDetail}
                  autoComplete="street-address"
                  placeholder="상세 주소를 입력해주세요"
                  onChange={(event) => updateShipping("addressDetail", event.target.value)}
                  onBlur={() =>
                    setTouched((current) => ({
                      ...current,
                      addressDetail: true,
                    }))
                  }
                />

                {(touched.addressDetail || showValidationErrors) && errors.addressDetail && (
                  <span className="mt-1.5 block text-xs font-semibold text-[#d92d20]">{errors.addressDetail}</span>
                )}
              </label>

 
            </div>
          </>
        )}
      </section>

      <section className="mt-6 px-6 max-[359px]:px-5">
        <div className="grid grid-cols-[0.72fr_1.28fr] gap-2.5">
          <button
            className="min-h-[52px] rounded-2xl border border-[#d1d6db] bg-white px-4 text-base font-bold text-[#4e5968] outline-none transition active:scale-[0.99] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#688d00]"
            type="button"
            onClick={onBack}
          >
            이전
          </button>

          <button
            className="min-h-[52px] rounded-2xl bg-[#191f28] px-4 text-base font-extrabold text-white outline-none transition active:scale-[0.99] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#688d00]"
            type="button"
            onClick={handleConfirm}
          >
            {isRacketPurchase ? "다음: 장력·작업 요청" : "다음: 라켓·텐션 정보"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default StringingApplicationStepTwo;
