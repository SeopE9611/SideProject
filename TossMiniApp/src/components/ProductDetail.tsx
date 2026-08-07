import {
  useCallback,
  useEffect,
  useState,
} from "react";

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
import "./ProductDetail.css";

type DetailLoadState =
  | "loading"
  | "success"
  | "error";

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
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

function getProductImage(product: Product) {
  return (
    product.images?.[0] ??
    product.image ??
    product.imageUrl ??
    product.thumbnail ??
    null
  );
}

function ProductDetail({
  productId,
}: ProductDetailProps) {
  const [product, setProduct] =
    useState<Product | null>(null);

  const [loadState, setLoadState] =
    useState<DetailLoadState>("loading");

  const loadProduct = useCallback(
    async (signal?: AbortSignal) => {
      setLoadState("loading");

      try {
        const data = await getProductDetail(
          productId,
          signal,
        );

        if (signal?.aborted) {
          return;
        }

        setProduct(data.product);
        setLoadState("success");
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        console.error(
          "[스트링 상품 상세 조회 실패]",
          error,
        );

        setProduct(null);
        setLoadState("error");
      }
    },
    [productId],
  );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadProduct(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadProduct]);

  if (loadState === "loading") {
    return (
      <main
        className="product-detail-page"
        aria-label="상품 상세 정보를 불러오는 중"
      >
        <div className="detail-skeleton-image" />

        <div className="detail-skeleton-copy">
          <div className="detail-skeleton-line detail-skeleton-line-short" />
          <div className="detail-skeleton-line" />
          <div className="detail-skeleton-line detail-skeleton-line-price" />
        </div>
      </main>
    );
  }

  if (
    loadState === "error" ||
    !product
  ) {
    return (
      <main className="product-detail-page">
        <div
          className="product-state-card detail-error-card"
          role="alert"
        >
          <strong>
            상품 상세 정보를 불러오지 못했어요.
          </strong>

          <p>
            네트워크 상태를 확인한 뒤 다시
            시도해주세요.
          </p>

          <button
            className="retry-button"
            type="button"
            onClick={() =>
              void loadProduct()
            }
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  const image = getProductImage(product);

  const regularPrice = toFiniteNumber(
    product.price,
  );

  const salePrice = toFiniteNumber(
    product.inventory?.salePrice,
  );

  const isSale =
    isEnabledFlag(
      product.inventory?.isSale,
    ) &&
    regularPrice !== null &&
    salePrice !== null &&
    salePrice > 0 &&
    salePrice < regularPrice;

  const displayPrice = isSale
    ? salePrice
    : regularPrice;

  const mountingFee = toFiniteNumber(
    product.mountingFee,
  );

  const shippingFee = toFiniteNumber(
    product.shippingFee,
  );

  const featureEntries =
    FEATURE_ITEMS.map((item) => ({
      ...item,
      value: normalizeFeatureScoreTo100(
        product.features?.[item.key],
      ),
    })).filter(
      (item) => item.value > 0,
    );

  return (
    <main className="product-detail-page">
      <section
        className="detail-gallery"
        aria-label="상품 이미지"
      >
        <div className="detail-main-image-area">
          {image ? (
            <img
              className="detail-main-image"
              src={image}
              alt={
                product.name ??
                "스트링 상품"
              }
            />
          ) : (
            <div className="product-image-placeholder">
              이미지 준비 중
            </div>
          )}
        </div>
      </section>

      <section className="detail-summary-section">
        {product.brand && (
          <p className="detail-brand">
            {getStringBrandLabel(
              product.brand,
            )}
          </p>
        )}

        <h1 className="detail-product-name">
          {product.name ??
            "상품명 정보 없음"}
        </h1>

        {product.shortDescription && (
          <p className="detail-short-description">
            {product.shortDescription}
          </p>
        )}

        <div className="detail-price-row">
          <strong className="detail-price">
            {formatPrice(
              displayPrice ?? undefined,
            )}
          </strong>

          {isSale &&
            regularPrice !== null && (
              <span className="detail-regular-price">
                {formatPrice(regularPrice)}
              </span>
            )}
        </div>

        {(product.ratingCount ?? 0) >
          0 && (
          <p className="detail-rating">
            ★{" "}
            {(
              product.ratingAvg ??
              product.ratingAverage ??
              0
            ).toFixed(1)}{" "}
            ({product.ratingCount})
          </p>
        )}

        <dl className="detail-info-grid">
          {product.material && (
            <div>
              <dt>소재</dt>
              <dd>
                {getStringMaterialLabel(
                  product.material,
                )}
              </dd>
            </div>
          )}

          {mountingFee !== null && (
            <div>
              <dt>장착비</dt>
              <dd>
                {formatPrice(
                  mountingFee,
                )}
              </dd>
            </div>
          )}

          {shippingFee !== null && (
            <div>
              <dt>배송비</dt>
              <dd>
                {shippingFee > 0
                  ? formatPrice(
                      shippingFee,
                    )
                  : "무료배송"}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {featureEntries.length > 0 && (
        <section
          className="detail-section"
          aria-labelledby="detail-features-title"
        >
          <div className="detail-section-heading">
            <p className="section-eyebrow">
              PERFORMANCE
            </p>

            <h2 id="detail-features-title">
              스트링 성능
            </h2>
          </div>

          <div className="detail-feature-list">
            {featureEntries.map(
              (feature) => (
                <div
                  className="detail-feature-row"
                  key={feature.key}
                >
                  <div className="detail-feature-label-row">
                    <span>
                      {feature.label}
                    </span>

                    <strong>
                      {feature.value}
                    </strong>
                  </div>

                  <div
                    className="detail-feature-track"
                    aria-hidden="true"
                  >
                    <span
                      style={{
                        width: `${feature.value}%`,
                      }}
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {product.description && (
        <section
          className="detail-section"
          aria-labelledby="detail-description-title"
        >
          <div className="detail-section-heading">
            <p className="section-eyebrow">
              DETAIL
            </p>

            <h2 id="detail-description-title">
              상품 설명
            </h2>
          </div>

          <p className="detail-description">
            {product.description}
          </p>
        </section>
      )}

      <aside className="detail-service-notice">
        <strong>
          색상·게이지 선택과 교체서비스
          신청은 다음 단계에서 연결합니다.
        </strong>

        <p>
          이번 단계에서는 상품 상세 조회와
          앱 내 뒤로가기 흐름을 먼저
          검증합니다.
        </p>
      </aside>
    </main>
  );
}

export default ProductDetail;
