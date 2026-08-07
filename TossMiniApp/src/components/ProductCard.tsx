import type { MouseEvent } from "react";

import { formatPrice, getStringBrandLabel, isEnabledFlag, toFiniteNumber } from "../lib/product-labels";
import type { Product } from "../types/product";

type ProductCardProps = {
  product: Product;
  onSelect: (productId: string) => void;
};

function getProductImage(product: Product) {
  return product.images?.[0] ?? product.image ?? product.imageUrl ?? product.thumbnail ?? null;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
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

  const detailHref = `?productId=${encodeURIComponent(product._id)}`;

  return (
    <article className="product-card">
      <a
        className="product-card-link"
        href={detailHref}
        aria-label={`${product.name ?? "스트링 상품"} 상세 보기`}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          onSelect(product._id);
        }}
      >
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
          {product.brand && <p className="product-brand">{getStringBrandLabel(product.brand)}</p>}

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
      </a>
    </article>
  );
}
