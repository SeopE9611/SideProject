import { useCallback, useEffect, useState } from "react";

import { getProductDetail } from "../api/products";
import {
  formatPrice,
  getStringBrandLabel,
  getStringMaterialLabel,
  isEnabledFlag,
  normalizeFeatureScoreTo100,
  toFiniteNumber,
} from "../lib/product-labels";
import type { Product } from "../types/product";

type DetailLoadState = "loading" | "success" | "error";

type ProductDetailProps = {
  productId: string;
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

function ProductDetail({ productId }: ProductDetailProps) {
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

  const image = getProductImage(product);

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
          색상·게이지 선택과 교체서비스 신청은 다음 단계에서 연결합니다.
        </strong>

        <p className="mt-1.5 mb-0 text-[13px] leading-[1.55] text-[#6b7684]">
          이번 단계에서는 상품 상세 조회와 앱 내 뒤로가기 흐름을 먼저 검증합니다.
        </p>
      </aside>
    </main>
  );
}

export default ProductDetail;
