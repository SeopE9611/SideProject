import { Top } from "@toss/tds-mobile";
import { useCallback, useEffect, useState } from "react";

import { getProductDetail } from "../api/products";
import { formatGaugeLabel, formatPrice, getStringColorLabel, toFiniteNumber } from "../lib/product-labels";
import type { Product } from "../types/product";
import type { StringingApplicantDraft } from "../types/stringing";
import ApplicantFields from "./ApplicantFields";

type LoadState = "loading" | "success" | "error";

type StringingApplicationStepOneProps = {
  productId: string;
  selectedColor: string;
  selectedGauge: string;
  applicant: StringingApplicantDraft;
  onApplicantChange: (applicant: StringingApplicantDraft) => void;
  showValidationErrors?: boolean;
  onContinue: () => void;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getProductImage(product: Product) {
  return product.images?.[0] ?? product.image ?? product.imageUrl ?? product.thumbnail ?? null;
}

function StringingApplicationStepOne({
  productId,
  selectedColor,
  selectedGauge,
  applicant,
  onApplicantChange,
  showValidationErrors = false,
  onContinue,
}: StringingApplicationStepOneProps) {
  const [product, setProduct] = useState<Product | null>(null);

  const [loadState, setLoadState] = useState<LoadState>("loading");

  const [applicantValid, setApplicantValid] = useState(false);
  const [validationRequest, setValidationRequest] = useState(0);

  const loadProduct = useCallback(
    async (signal?: AbortSignal) => {
      setLoadState("loading");

      try {
        const data = await getProductDetail(productId, signal);

        if (signal?.aborted) {
          return;
        }

        setProduct(data.product);
        setLoadState("success");
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        console.error("[교체서비스 신청 상품 조회 실패]", error);

        setProduct(null);
        setLoadState("error");
      }
    },
    [productId],
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadProduct(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadProduct]);

  const selectedVariant = product?.variantInventories?.find(
    (row) => row.colorValue === selectedColor && row.gaugeValue === selectedGauge,
  );

  const selectedColorRow = product?.colorInventories?.find((row) => row.value === selectedColor);

  const selectedGaugeRow = product?.gaugeInventories?.find((row) => row.value === selectedGauge);

  const selectedColorLabel = selectedColor
    ? getStringColorLabel(selectedColorRow?.label || selectedVariant?.colorLabel || selectedColor)
    : "";

  const selectedColorImage =
    selectedColorRow?.image?.trim() ||
    selectedVariant?.colorImage?.trim() ||
    (product ? getProductImage(product) : null);

  const hasVariantInventories = Boolean(product?.variantInventories?.length);

  const hasColorOptions = Boolean(product?.colorInventories?.length || product?.colorOptions?.length || product?.color);

  const hasGaugeOptions = Boolean(product?.gaugeInventories?.length || product?.gaugeOptions?.length || product?.gauge);

  const selectedVariantUnavailable = Boolean(
    hasVariantInventories &&
    (!selectedVariant || selectedVariant.isSoldOut === true || Number(selectedVariant.stock ?? 0) <= 0),
  );

  const selectedColorUnavailable = Boolean(
    !hasVariantInventories &&
    selectedColorRow &&
    (selectedColorRow.isSoldOut === true || Number(selectedColorRow.stock ?? 0) <= 0),
  );

  const selectedGaugeUnavailable = Boolean(
    !hasVariantInventories &&
    selectedGaugeRow &&
    (selectedGaugeRow.isSoldOut === true || Number(selectedGaugeRow.stock ?? 0) <= 0),
  );

  const selectionInvalid =
    (hasColorOptions && !selectedColor) ||
    (hasGaugeOptions && !selectedGauge) ||
    selectedVariantUnavailable ||
    selectedColorUnavailable ||
    selectedGaugeUnavailable;

  const mountingFee = toFiniteNumber(product?.mountingFee);

  const handleValidateStep = () => {
    setValidationRequest((current) => current + 1);
    if (!applicantValid) return;
    onContinue();
  };

  if (loadState === "loading") {
    return (
      <main className="min-h-dvh w-full bg-white px-6 pt-[calc(24px+env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28] max-[359px]:px-5">
        <div className="h-7 w-2/3 rounded-lg bg-[#f2f4f6]" />
        <div className="mt-3 h-4 w-full rounded-lg bg-[#f2f4f6]" />
        <div className="mt-8 h-28 w-full rounded-[20px] bg-[#f2f4f6]" />
        <div className="mt-5 h-64 w-full rounded-[20px] bg-[#f2f4f6]" />
      </main>
    );
  }

  if (loadState === "error" || !product) {
    return (
      <main className="min-h-dvh w-full bg-white px-6 pt-[calc(24px+env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28] max-[359px]:px-5">
        <div className="rounded-[20px] bg-[#f2f4f6] px-5 py-7 text-center" role="alert">
          <strong className="block text-base font-bold text-[#333d4b]">신청할 상품 정보를 불러오지 못했어요.</strong>

          <p className="mt-2 mb-0 text-sm leading-[1.55] text-[#6b7684]">
            네트워크 상태를 확인한 뒤 다시 시도해주세요.
          </p>

          <button
            className="mt-5 min-h-11 rounded-xl bg-[#e9f6c9] px-5 text-sm font-bold text-[#344700]"
            type="button"
            onClick={() => void loadProduct()}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  if (selectionInvalid) {
    return (
      <main className="min-h-dvh w-full bg-white px-6 pt-[calc(24px+env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28] max-[359px]:px-5">
        <div className="rounded-[20px] bg-[#fff4f2] px-5 py-7 text-center" role="alert">
          <strong className="block text-base font-bold text-[#d92d20]">상품 옵션을 다시 선택해주세요.</strong>

          <p className="mt-2 mb-0 text-sm leading-[1.55] text-[#6b7684]">
            선택한 색상·게이지 조합을 현재 신청할 수 없습니다.
          </p>

          <button
            className="mt-5 min-h-11 rounded-xl bg-[#191f28] px-5 text-sm font-bold text-white"
            type="button"
            onClick={() => window.history.back()}
          >
            상품 상세로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh w-full bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
      <section className="pt-[calc(16px+env(safe-area-inset-top))]">
        <Top
          title={<Top.TitleParagraph size={22}>교체서비스 포함 주문</Top.TitleParagraph>}
          subtitleBottom={<Top.SubtitleParagraph size={17}>1 / 5 · 신청자 정보</Top.SubtitleParagraph>}
        />
      </section>

      <section className="px-6 max-[359px]:px-5" aria-label="선택한 스트링">
        <div className="flex gap-3 rounded-[20px] bg-[#f7f8fa] p-4">
          <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-white">
            {selectedColorImage ? (
              <img
                className="h-full w-full object-contain"
                src={selectedColorImage}
                alt={product.name ?? "선택한 스트링"}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-[#8b95a1]">
                이미지 준비 중
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="m-0 text-xs font-bold text-[#8b95a1]">선택한 스트링</p>

            <strong className="mt-1 block break-keep text-[15px] leading-[1.4] font-extrabold text-[#191f28]">
              {product.name ?? "상품명 정보 없음"}
            </strong>

            <p className="mt-1.5 mb-0 text-[13px] leading-[1.45] text-[#6b7684]">
              {[selectedColorLabel, selectedGauge ? formatGaugeLabel(selectedGauge) : ""].filter(Boolean).join(" · ")}
            </p>

            {mountingFee !== null && (
              <p className="mt-1 mb-0 text-[13px] font-semibold text-[#4e5968]">장착비 {formatPrice(mountingFee)}</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 px-6 max-[359px]:px-5" aria-labelledby="applicant-title">
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">STEP 01</p>

          <h1 id="applicant-title" className="m-0 text-[22px] leading-[1.35] font-extrabold tracking-[-0.02em]">
            신청자 정보
          </h1>

          <p className="mt-2 mb-0 break-keep text-sm leading-[1.6] text-[#6b7684]">
            접수 상태와 작업 진행 안내에 사용할 정보를 입력해주세요.
          </p>
        </div>

        <ApplicantFields
          applicant={applicant}
          onChange={onApplicantChange}
          showValidationErrors={showValidationErrors}
          validationRequest={validationRequest}
          onValidityChange={setApplicantValid}
        />
      </section>

      <section className="mt-6 px-6 max-[359px]:px-5">
        <button
          className="min-h-[52px] w-full rounded-2xl bg-[#191f28] px-5 text-base font-extrabold text-white outline-none transition active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#688d00] focus-visible:ring-offset-2"
          type="button"
          onClick={handleValidateStep}
        >
          다음: 라켓 전달 방법
        </button>
      </section>
    </main>
  );
}

export default StringingApplicationStepOne;
