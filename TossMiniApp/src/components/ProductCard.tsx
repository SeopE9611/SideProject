import type { Product } from "../types/product";

type ProductCardProps = {
  product: Product;
};

function isEnabledFlag(value: boolean | string | number | undefined) {
  return value === true || value === "true" || value === 1;
}

function getProductImage(product: Product) {
  return product.images?.[0] ?? product.image ?? product.imageUrl ?? product.thumbnail ?? null;
}

function formatPrice(price: number | undefined) {
  if (typeof price !== "number" || !Number.isFinite(price)) {
    return "가격 정보 없음";
  }

  return `${price.toLocaleString("ko-KR")}원`;
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

export function ProductCard({ product }: ProductCardProps) {
  const image = getProductImage(product);
  const isNew = isEnabledFlag(product.inventory?.isNew) || isEnabledFlag(product.isNew);

  const isFeatured = isEnabledFlag(product.inventory?.isFeatured);

  const regularPrice = toFiniteNumber(product.price);
  const salePrice = toFiniteNumber(product.inventory?.salePrice);

  const isSale =
    isEnabledFlag(product.inventory?.isSale) &&
    regularPrice !== null &&
    salePrice !== null &&
    salePrice > 0 &&
    salePrice < regularPrice;

  const displayPrice = isSale ? salePrice : regularPrice;

  const rating = product.ratingAvg ?? product.ratingAverage ?? 0;

  const ratingCount = product.ratingCount ?? 0;

  return (
    <article className="product-card">
      <div className="product-image-area">
        {image ? (
          <img className="product-image" src={image} alt={product.name ?? "스트링 상품"} loading="lazy" />
        ) : (
          <div className="product-image-placeholder" aria-hidden="true">
            이미지 준비 중
          </div>
        )}

        {(isNew || isFeatured || isSale) && (
          <div className="product-badges">
            {isNew && <span className="product-badge">NEW</span>}
            {isFeatured && <span className="product-badge">추천</span>}
            {isSale && <span className="product-badge">할인</span>}
          </div>
        )}
      </div>

      <div className="product-content">
        {product.brand && <p className="product-brand">{product.brand}</p>}

        <h3 className="product-name">{product.name ?? "상품명 정보 없음"}</h3>

        <div className="product-price-row">
          <p className="product-price">{formatPrice(displayPrice ?? undefined)}</p>

          {isSale && regularPrice !== null && (
            <span className="product-regular-price">{formatPrice(regularPrice)}</span>
          )}
        </div>

        {ratingCount > 0 && (
          <p className="product-rating">
            ★ {rating.toFixed(1)} ({ratingCount})
          </p>
        )}
      </div>
    </article>
  );
}
