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
    <article className="min-w-0">
      <a
        className="block rounded-[18px] text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#688d00] focus-visible:ring-offset-4"
        href={detailHref}
        aria-label={`${product.name ?? "스트링 상품"} 상세 보기`}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          onSelect(product._id);
        }}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-[#f2f4f6]">
          {image ? (
            <img
              className="block h-full w-full object-contain"
              src={image}
              alt={product.name ?? "스트링 상품"}
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-[#8b95a1]"
              aria-hidden="true"
            >
              이미지 준비 중
            </div>
          )}

          {(isNew || isFeatured || isSale) && (
            <div className="absolute top-[9px] left-[9px] flex flex-wrap gap-[5px]">
              {isNew && (
                <span className="inline-flex min-h-[23px] items-center rounded-full bg-[rgba(239,248,216,0.94)] px-[7px] py-1 text-[10px] leading-none font-extrabold text-[#344700]">
                  NEW
                </span>
              )}

              {isFeatured && (
                <span className="inline-flex min-h-[23px] items-center rounded-full bg-[rgba(239,248,216,0.94)] px-[7px] py-1 text-[10px] leading-none font-extrabold text-[#344700]">
                  추천
                </span>
              )}

              {isSale && (
                <span className="inline-flex min-h-[23px] items-center rounded-full bg-[rgba(239,248,216,0.94)] px-[7px] py-1 text-[10px] leading-none font-extrabold text-[#344700]">
                  할인
                </span>
              )}
            </div>
          )}
        </div>

        <div className="px-0.5 pt-[11px]">
          {product.brand && (
            <p className="mb-1 truncate text-xs leading-[1.4] font-semibold text-[#8b95a1]">
              {getStringBrandLabel(product.brand)}
            </p>
          )}

          <h3 className="m-0 line-clamp-2 min-h-[42px] break-keep text-[15px] leading-[1.4] font-bold tracking-[-0.015em] text-[#191f28]">
            {product.name ?? "상품명 정보 없음"}
          </h3>

          <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
            <p className="m-0 text-base leading-[1.4] font-extrabold text-[#191f28]">
              {formatPrice(displayPrice ?? undefined)}
            </p>

            {isSale && regularPrice !== null && (
              <span className="text-xs leading-[1.4] text-[#8b95a1] line-through">{formatPrice(regularPrice)}</span>
            )}
          </div>

          {ratingCount > 0 && (
            <p className="mt-[5px] mb-0 text-xs leading-[1.4] text-[#6b7684]">
              ★ {rating.toFixed(1)} ({ratingCount})
            </p>
          )}
        </div>
      </a>
    </article>
  );
}
