import { useCallback, useEffect, useState } from "react";

import { getProductDetail } from "../api/products";
import { useProductDetailOptions } from "../hooks/useProductDetailOptions";
import {
  formatGaugeLabel,
  formatPrice,
  getStringBrandLabel,
  getStringColorLabel,
  getStringMaterialLabel,
  isEnabledFlag,
  normalizeFeatureScoreTo100,
  toFiniteNumber,
} from "../lib/product-labels";
import type { Product } from "../types/product";
import { StringingStartSelection } from "../types/stringing";

type DetailLoadState = "loading" | "success" | "error";

type ProductDetailProps = {
  productId: string;
  initialSelectedColor?: string;
  initialSelectedGauge?: string;
  onStartStringing: (selection: StringingStartSelection) => void;
};

const FEATURE_ITEMS = [
  { key: "power", label: "반발력" },
  { key: "control", label: "컨트롤" },
  { key: "spin", label: "스핀" },
  { key: "durability", label: "내구성" },
  { key: "comfort", label: "편안함" },
] as const;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getProductImage(product: Product) {
  return product.images?.[0] ?? product.image ?? product.imageUrl ?? product.thumbnail ?? null;
}

function ProductDetail({
  productId,
  initialSelectedColor,
  initialSelectedGauge,
  onStartStringing,
}: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);

  const [loadState, setLoadState] = useState<DetailLoadState>("loading");

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

        console.error("[스트링 상품 상세 조회 실패]", error);

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

  const {
    hasVariantInventories,
    isSellableVariant,
    getVariantsByColor,
    visibleColorRows,
    selectedColor,
    setSelectedColor,
    selectedColorRow,
    colorImage,
    hideGaugeStock,
    gaugeRows,
    gaugeOptions,
    selectedGauge,
    setSelectedGauge,
    selectedGaugeRow,
    selectedVariantSoldOut,
    variantHasNoSellableGauge,
    effectiveStock,
  } = useProductDetailOptions(product, {
    selectedColor: initialSelectedColor,
    selectedGauge: initialSelectedGauge,
  });

  if (loadState === "loading") {
    return (
      <main
        className="min-h-dvh w-full bg-white pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]"
        aria-label="상품 상세 정보를 불러오는 중"
      >
        <div className="mx-6 aspect-square rounded-3xl bg-[#f2f4f6] max-[359px]:mx-5" />

        <div className="px-6 pt-[26px] max-[359px]:px-5">
          <div className="h-[17px] w-[30%] rounded-lg bg-[#f2f4f6]" />
          <div className="mt-3 h-[17px] w-full rounded-lg bg-[#f2f4f6]" />
          <div className="mt-5 h-6 w-[46%] rounded-lg bg-[#f2f4f6]" />
        </div>
      </main>
    );
  }

  if (loadState === "error" || !product) {
    return (
      <main className="min-h-dvh w-full bg-white pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
        <div className="mx-6 rounded-[20px] bg-[#f2f4f6] px-5 py-7 text-center max-[359px]:mx-5" role="alert">
          <strong className="block text-base leading-[1.45] font-bold text-[#333d4b]">
            상품 상세 정보를 불러오지 못했어요.
          </strong>

          <p className="mt-[7px] text-sm leading-[1.55] text-[#6b7684]">네트워크 상태를 확인한 뒤 다시 시도해주세요.</p>

          <button
            className="mt-[18px] min-h-11 cursor-pointer rounded-xl border-0 bg-[#e9f6c9] px-[18px] text-sm font-bold text-[#344700]"
            type="button"
            onClick={() => void loadProduct()}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  const image = colorImage || getProductImage(product);

  const selectedColorLabel = selectedColorRow
    ? getStringColorLabel(selectedColorRow.label || selectedColorRow.value)
    : "";

  const selectedColorUnavailable =
    !hasVariantInventories && Boolean(selectedColorRow && (selectedColorRow.isSoldOut || selectedColorRow.stock <= 0));

  const selectedGaugeUnavailable = Boolean(
    selectedGaugeRow && (selectedGaugeRow.isSoldOut || selectedGaugeRow.stock <= 0),
  );

  const selectedOptionUnavailable = hasVariantInventories
    ? selectedVariantSoldOut
    : selectedColorUnavailable || selectedGaugeUnavailable;

  const colorSelectionRequired = visibleColorRows.length > 0;

  const gaugeSelectionRequired = gaugeRows.length > 0;

  const canStartStringing =
    (!colorSelectionRequired || Boolean(selectedColor)) &&
    (!gaugeSelectionRequired || Boolean(selectedGauge)) &&
    !selectedOptionUnavailable &&
    !variantHasNoSellableGauge &&
    (!hasVariantInventories || effectiveStock > 0);

  const regularPrice = toFiniteNumber(product.price);

  const salePrice = toFiniteNumber(product.inventory?.salePrice);

  const isSale =
    isEnabledFlag(product.inventory?.isSale) &&
    regularPrice !== null &&
    salePrice !== null &&
    salePrice > 0 &&
    salePrice < regularPrice;

  const displayPrice = isSale ? salePrice : regularPrice;

  const mountingFee = toFiniteNumber(product.mountingFee);

  const shippingFee = toFiniteNumber(product.shippingFee);

  const featureEntries = FEATURE_ITEMS.map((item) => ({
    ...item,
    value: normalizeFeatureScoreTo100(product.features?.[item.key]),
  })).filter((item) => item.value > 0);

  return (
    <main className="min-h-dvh w-full bg-white pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
      <section className="px-6 max-[359px]:px-5" aria-label="상품 이미지">
        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl bg-[#f2f4f6]">
          {image ? (
            <img className="h-full w-full object-contain" src={image} alt={product.name ?? "스트링 상품"} />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-[#8b95a1]">
              이미지 준비 중
            </div>
          )}
        </div>
      </section>

      <section className="px-6 pt-[26px] max-[359px]:px-5">
        {product.brand && (
          <p className="mb-[7px] text-[13px] font-bold text-[#8b95a1]">{getStringBrandLabel(product.brand)}</p>
        )}

        <h1 className="m-0 break-keep text-[25px] leading-[1.3] font-extrabold tracking-[-0.025em] text-[#191f28]">
          {product.name ?? "상품명 정보 없음"}
        </h1>

        {product.shortDescription && (
          <p className="mt-[13px] mb-0 break-keep text-[15px] leading-[1.65] text-[#6b7684]">
            {product.shortDescription}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-baseline gap-2">
          <strong className="text-2xl font-extrabold">{formatPrice(displayPrice ?? undefined)}</strong>

          {isSale && regularPrice !== null && (
            <span className="text-sm text-[#8b95a1] line-through">{formatPrice(regularPrice)}</span>
          )}
        </div>

        {(product.ratingCount ?? 0) > 0 && (
          <p className="mt-2 mb-0 text-[13px] text-[#6b7684]">
            ★ {(product.ratingAvg ?? product.ratingAverage ?? 0).toFixed(1)} ({product.ratingCount})
          </p>
        )}

        <dl className="mt-[22px] grid grid-cols-2 gap-2.5">
          {product.material && (
            <div className="min-w-0 rounded-2xl bg-[#f7f8fa] p-3.5">
              <dt className="mb-[5px] text-xs font-semibold text-[#8b95a1]">소재</dt>

              <dd className="m-0 text-sm font-bold text-[#333d4b]">{getStringMaterialLabel(product.material)}</dd>
            </div>
          )}

          {mountingFee !== null && (
            <div className="min-w-0 rounded-2xl bg-[#f7f8fa] p-3.5">
              <dt className="mb-[5px] text-xs font-semibold text-[#8b95a1]">장착비</dt>

              <dd className="m-0 text-sm font-bold text-[#333d4b]">{formatPrice(mountingFee)}</dd>
            </div>
          )}

          {shippingFee !== null && (
            <div className="min-w-0 rounded-2xl bg-[#f7f8fa] p-3.5">
              <dt className="mb-[5px] text-xs font-semibold text-[#8b95a1]">배송비</dt>

              <dd className="m-0 text-sm font-bold text-[#333d4b]">
                {shippingFee > 0 ? formatPrice(shippingFee) : "무료배송"}
              </dd>
            </div>
          )}
        </dl>
      </section>
      {(visibleColorRows.length > 0 || gaugeRows.length > 0) && (
        <section className="mt-8 px-6 max-[359px]:px-5" aria-labelledby="detail-options-title">
          <div className="mb-[15px]">
            <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">OPTIONS</p>

            <h2 id="detail-options-title" className="m-0 text-xl leading-[1.35] font-extrabold">
              상품 옵션
            </h2>
          </div>

          <div className="flex flex-col gap-4 rounded-[20px] border border-[#e5e8eb] p-[18px]">
            {visibleColorRows.length > 0 && (
              <div>
                <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm font-bold text-[#333d4b]">색상 선택</strong>

                  {selectedColorLabel && (
                    <span className="min-w-0 text-[13px] text-[#6b7684]">현재 색상: {selectedColorLabel}</span>
                  )}
                </div>

                <div className="flex snap-x gap-2 overflow-x-auto pb-1">
                  {visibleColorRows.map((row) => {
                    const label = getStringColorLabel(row.label || row.value);

                    const variants = getVariantsByColor(row.value);

                    const soldOut = hasVariantInventories
                      ? !variants.some((variant) => isSellableVariant(variant))
                      : row.isSoldOut || row.stock <= 0;

                    const isSelected = selectedColor === row.value;

                    const swatchImage =
                      row.image?.trim() || variants.find((variant) => variant.colorImage?.trim())?.colorImage?.trim();

                    const colorHex = row.colorHex?.trim();

                    return (
                      <button
                        key={row.value}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${label} 색상 선택`}
                        disabled={soldOut}
                        onClick={() => setSelectedColor(row.value)}
                        className={`relative flex h-16 w-16 shrink-0 snap-start items-center justify-center overflow-hidden rounded-xl border bg-white text-xs font-semibold text-[#333d4b] outline-none transition focus-visible:ring-2 focus-visible:ring-[#688d00] focus-visible:ring-offset-2 ${
                          isSelected ? "border-[#688d00] ring-2 ring-[#dcebba]" : "border-[#e5e8eb]"
                        } ${soldOut ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
                      >
                        {swatchImage ? (
                          <img className="h-full w-full object-cover" src={swatchImage} alt={label} />
                        ) : colorHex ? (
                          <span
                            className="h-7 w-7 rounded-full border border-[#d1d6db]"
                            style={{
                              backgroundColor: colorHex,
                            }}
                          />
                        ) : (
                          <span className="line-clamp-2 px-1 text-center leading-tight break-keep">{label}</span>
                        )}

                        {soldOut && (
                          <span className="absolute right-0 bottom-0 left-0 bg-white/90 py-0.5 text-[10px] font-bold text-[#6b7684]">
                            품절
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {gaugeRows.length > 0 && (
              <div className="border-t border-[#e5e8eb] pt-4">
                <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm font-bold text-[#333d4b]">게이지(굵기) 선택</strong>

                  {gaugeOptions.length === 1 && <span className="text-[13px] text-[#6b7684]">자동 선택</span>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {gaugeRows.map((row) => {
                    const soldOut = row.isSoldOut || row.stock <= 0;

                    const isSelected = selectedGauge === row.value;

                    const displayLabel = row.label?.trim() || formatGaugeLabel(row.value);

                    return (
                      <button
                        key={row.value}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={soldOut}
                        onClick={() => setSelectedGauge(row.value)}
                        className={`min-h-[54px] rounded-xl border px-3 py-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#688d00] focus-visible:ring-offset-2 ${
                          isSelected
                            ? "border-[#688d00] bg-[#f4f9e8] ring-1 ring-[#dcebba]"
                            : "border-[#e5e8eb] bg-white"
                        } ${soldOut ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
                      >
                        <span className="block text-sm font-bold text-[#333d4b]">{displayLabel}</span>

                        <span className="mt-1 block text-xs text-[#6b7684]">
                          {soldOut
                            ? "품절"
                            : hideGaugeStock
                              ? "선택 가능"
                              : `재고 ${Math.max(0, Number(row.stock ?? 0))}개`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {hasVariantInventories && variantHasNoSellableGauge && (
                  <p className="mt-2 mb-0 text-[13px] font-semibold text-[#d92d20]">
                    선택 가능한 게이지(굵기)가 없습니다.
                  </p>
                )}
              </div>
            )}

            {(selectedColor || selectedGauge) && (
              <div className="rounded-xl bg-[#f7f8fa] p-3.5">
                <p className="m-0 text-[13px] font-bold text-[#333d4b]">선택 옵션</p>

                <p className="mt-1.5 mb-0 break-keep text-sm leading-[1.55] text-[#6b7684]">
                  {[selectedColorLabel, selectedGauge ? formatGaugeLabel(selectedGauge) : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <p
                  className={`mt-1 mb-0 text-[13px] font-semibold ${
                    selectedOptionUnavailable || variantHasNoSellableGauge ? "text-[#d92d20]" : "text-[#4e5968]"
                  }`}
                >
                  {selectedOptionUnavailable || variantHasNoSellableGauge
                    ? "선택한 옵션은 현재 품절입니다."
                    : hideGaugeStock
                      ? "선택 가능한 옵션입니다."
                      : `구매 가능 재고 ${effectiveStock}개`}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {mountingFee !== null && (
        <section className="mt-8 px-6 max-[359px]:px-5" aria-label="교체서비스 신청">
          <button
            className={`min-h-[54px] w-full rounded-2xl px-5 text-base font-extrabold transition ${
              canStartStringing
                ? "cursor-pointer bg-[#191f28] text-white active:scale-[0.99]"
                : "cursor-not-allowed bg-[#e5e8eb] text-[#8b95a1]"
            }`}
            type="button"
            disabled={!canStartStringing}
            onClick={() =>
              onStartStringing({
                productId: product._id,
                selectedColor,
                selectedGauge,
              })
            }
          >
            교체서비스 신청하기
          </button>

          <p className="mt-2 mb-0 break-keep text-center text-xs leading-[1.55] text-[#8b95a1]">
            선택한 색상·게이지를 그대로 신청 단계로 전달합니다.
          </p>
        </section>
      )}

      {featureEntries.length > 0 && (
        <section className="mt-8 px-6 max-[359px]:px-5" aria-labelledby="detail-features-title">
          <div className="mb-[15px]">
            <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">PERFORMANCE</p>

            <h2 id="detail-features-title" className="m-0 text-xl leading-[1.35] font-extrabold">
              스트링 성능
            </h2>
          </div>

          <div className="flex flex-col gap-[15px] rounded-[20px] border border-[#e5e8eb] p-[18px]">
            {featureEntries.map((feature) => (
              <div key={feature.key}>
                <div className="mb-[7px] flex justify-between gap-3 text-sm text-[#4e5968]">
                  <span>{feature.label}</span>

                  <strong className="text-[13px] text-[#333d4b]">{feature.value}</strong>
                </div>

                <div className="h-[7px] overflow-hidden rounded-full bg-[#f2f4f6]" aria-hidden="true">
                  <span
                    className="block h-full rounded-[inherit] bg-[#9ace22]"
                    style={{
                      width: `${feature.value}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {product.description && (
        <section className="mt-8 px-6 max-[359px]:px-5" aria-labelledby="detail-description-title">
          <div className="mb-[15px]">
            <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">DETAIL</p>

            <h2 id="detail-description-title" className="m-0 text-xl leading-[1.35] font-extrabold">
              상품 설명
            </h2>
          </div>

          <p className="m-0 whitespace-pre-line break-keep rounded-[20px] bg-[#f7f8fa] p-[18px] text-sm leading-[1.75] text-[#4e5968]">
            {product.description}
          </p>
        </section>
      )}

      <aside className="mx-6 mt-8 rounded-[18px] bg-[#f2f4f6] p-[18px] max-[359px]:mx-5">
        <strong className="block text-sm leading-[1.45] font-extrabold text-[#333d4b]">
          색상과 게이지별 실제 재고를 확인할 수 있어요.
        </strong>

        <p className="mt-1.5 mb-0 text-[13px] leading-[1.55] text-[#6b7684]">
          선택한 옵션으로 교체서비스 신청을 시작할 수 있어요.
        </p>
      </aside>
    </main>
  );
}

export default ProductDetail;
