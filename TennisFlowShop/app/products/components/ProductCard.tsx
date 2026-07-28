"use client";

import { getProductPriceDisplayMeta } from "@/lib/product-pricing";

import { useWishlist } from "@/app/features/wishlist/useWishlist";
import { useBuyNowStore } from "@/app/store/buyNowStore";
import { usePdpBundleStore } from "@/app/store/pdpBundleStore";
import { CatalogCardFrame, CatalogPrice, CatalogRating } from "@/components/commerce";
import { SemanticBadge } from "@/components/badges/SemanticBadge";
import { Button } from "@/components/ui/button";
import { commerceBadgeSpecs } from "@/lib/badge-style";
import { isMountableStringByFee } from "@/lib/orders/string-mounting-policy";
import { ENABLE_STRING_STANDALONE_ORDER } from "@/lib/orders/string-standalone-policy";
import { normalizeFeatureScoreTo100 } from "@/lib/product-feature-score";
import { isStringProductSoldOut } from "@/lib/products/string-stock";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Eye, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

// 제품 타입 (필요시 공통으로 뺄 수도 있음)
export type Product = {
  _id: string;
  name: string;
  brand: string;
  price: number;
  images?: string[];
  features?: Record<string, number>;
  isNew?: boolean;
  mountingFee?: number; // 교체(장착) 공임(1자루 기준)
  ratingAvg?: number; // reviews API가 업데이트하는 필드
  ratingCount?: number; // 리뷰 개수
  ratingAverage?: number; // 레거시/호환(maintenance에서 쓰던 키)
  gaugeOptions?: string[];
  gaugeInventories?: unknown[];
  color?: string;
  colorOptions?: string[];
  colorInventories?: unknown[];
  variantInventories?: unknown[];
  inventory?: {
    stock?: number;
    status?: "instock" | "outofstock" | "backorder" | string;
    manageStock?: boolean;
    allowBackorder?: boolean;
    isSale?: boolean | string | number;
    isFeatured?: boolean | string | number;
    isNew?: boolean | string | number;
    salePrice?: number | string | null;
  };
};

// 한글 라벨 매핑
const keyMap: Record<string, string> = {
  power: "반발력",
  durability: "내구성",
  spin: "스핀",
  control: "컨트롤",
  comfort: "편안함",
};

const FEATURE_ORDER = ["power", "control", "spin", "durability", "comfort"] as const;

function getFeatureEntries(features?: Record<string, number>) {
  return FEATURE_ORDER.map((key) => {
    const rawValue = Number(features?.[key] ?? 0);
    const value = normalizeFeatureScoreTo100(rawValue);
    return { key, label: keyMap[key], value };
  }).filter((item) => item.value > 0);
}

function PerformanceSummary({ entries }: { entries: ReturnType<typeof getFeatureEntries> }) {
  if (entries.length === 0) return null;

  return (
    <section className="border-t border-border/60 pt-2.5 bp-md:rounded-xl bp-md:border bp-md:bg-muted/20 bp-md:px-3 bp-md:py-2.5">
      <p className="mb-1.5 text-ui-micro font-ui-medium tracking-wide text-muted-foreground">
        성능 요약
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-ui-caption bp-sm:text-ui-label">
        {entries.map((feature, index) => (
          <div
            key={feature.key}
            className={cn(
              "flex min-w-0 items-baseline justify-between gap-1 border-b border-border/40 pb-1",
              index >= entries.length - (entries.length % 2 === 0 ? 2 : 1) && "border-b-0 pb-0",
            )}
          >
            <span className="text-muted-foreground">{feature.label}</span>
            <strong className="tabular-nums text-foreground">{feature.value}</strong>
          </div>
        ))}
        {entries.length % 2 === 1 && <div aria-hidden="true" />}
      </div>
    </section>
  );
}

function WishButton({
  inWish,
  disabled = false,
  onToggle,
  size = "md",
}: {
  inWish: boolean;
  disabled?: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
}) {
  const iconDim = size === "sm" ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-3.5 h-3.5 sm:w-4 sm:h-4";

  return (
    <Button
      type="button"
      variant="favorite"
      size={size === "sm" ? "iconSm" : "icon"}
      onClick={onToggle}
      disabled={disabled}
      aria-disabled={disabled}
      aria-pressed={inWish}
      aria-label={inWish ? "위시리스트에서 제거" : "위시리스트에 추가"}
      title={
        disabled ? "위시리스트 상태 확인 중" : inWish ? "위시리스트에서 제거" : "위시리스트에 추가"
      }
      className="h-11 w-11 flex-shrink-0 bp-md:h-9 bp-md:w-9"
    >
      <Heart
        className={cn(
          iconDim,
          "transition-colors duration-200 mx-auto",
          inWish ? "fill-current scale-110" : "scale-100",
        )}
      />
    </Button>
  );
}

type Props = {
  product: Product;
  viewMode: "grid" | "list";
  brandLabel: string;
  isApplyFlow?: boolean;
  ensureNewBadge?: boolean;
};

const ProductCard = React.memo(
  function ProductCard({
    product,
    viewMode,
    brandLabel,
    isApplyFlow = false,
    ensureNewBadge = false,
  }: Props) {
    const router = useRouter();
    const ratingAvg = Number(product.ratingAvg ?? product.ratingAverage ?? 0);
    const ratingCount = Number(product.ratingCount ?? 0);
    const { has, toggle } = useWishlist();
    const wishState = has(product._id);
    const inWish = wishState === true;
    // unknown(null)에서는 false 외형으로 단정하지 않기 위해 버튼을 비활성화한다.
    const isWishUnknown = wishState === null;

    const inventory = product.inventory;
    const regularPrice = Number(product.price ?? 0);
    const salePrice = Number(inventory?.salePrice ?? 0);
    const isSale =
      (inventory?.isSale === true || inventory?.isSale === "true" || inventory?.isSale === 1) &&
      salePrice > 0 &&
      salePrice < regularPrice;
    const displayPrice = isSale ? salePrice : regularPrice;
    const stockRaw = typeof inventory?.stock === "number" ? inventory.stock : null;
    const isSoldOut = isStringProductSoldOut(product);
    const stockForItem = typeof stockRaw === "number" ? stockRaw : undefined;
    const canCheckoutWithService = isMountableStringByFee(product.mountingFee);
    const featureEntries = getFeatureEntries(product.features);
    const shouldShowStandaloneServiceBadge =
      !isApplyFlow && canCheckoutWithService && !ENABLE_STRING_STANDALONE_ORDER;
    const merchandisingBadges = commerceBadgeSpecs(
      {
        isNew:
          inventory?.isNew === true ||
          inventory?.isNew === "true" ||
          inventory?.isNew === 1 ||
          product.isNew,
        isRecommended:
          inventory?.isFeatured === true ||
          inventory?.isFeatured === "true" ||
          inventory?.isFeatured === 1,
        isSale,
        isSoldOut,
        discountRate: isSale ? ((regularPrice - salePrice) / regularPrice) * 100 : undefined,
      },
      "image",
      { ensureNew: ensureNewBadge, excludeKinds: ["sale"] },
    );

    const priceBlock = (align: "left" | "right" = "right") => (
      <CatalogPrice
        regularPrice={regularPrice}
        salePrice={isSale ? salePrice : null}
        label={isSale ? "할인가" : "판매가"}
        align={align === "right" ? "end" : "start"}
        size={viewMode === "list" ? "list" : "card"}
      />
    );

    const detailHref = isApplyFlow
      ? `/products/${product._id}?from=apply`
      : `/products/${product._id}`;

    const setBuyNowItem = useBuyNowStore((s) => s.setItem);
    const clearPdpBundle = usePdpBundleStore((s) => s.clear);

    const handleStringSingleBuy = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSoldOut) {
        showErrorToast("품절된 상품입니다.");
        return;
      }
      clearPdpBundle();
      const image = product.images?.[0] ?? "";
      setBuyNowItem({
        id: String(product._id),
        name: product.name,
        price: displayPrice,
        ...getProductPriceDisplayMeta(product),
        quantity: 1,
        image,
        stock: stockForItem,
        kind: "product",
      });
      router.push("/checkout?mode=buynow");
    };

    const media = (
      <div
        className={cn(
          "relative w-full overflow-hidden bg-muted/20",
          viewMode === "list" ? "h-full min-h-[220px]" : "aspect-[4/3]",
        )}
      >
        <Link
          href={detailHref}
          aria-label={`${product.name} ${isApplyFlow ? "교체 신청" : "상세 보기"}`}
          className="absolute inset-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Image
            src={
              (product.images?.[0] as string) ||
              "/placeholder.svg?height=300&width=300&query=tennis+string"
            }
            alt={product.name}
            fill
            sizes={
              viewMode === "list"
                ? "(max-width: 1199px) 240px, 260px"
                : "(max-width: 575px) calc(100vw - 24px), (max-width: 1023px) 50vw, (max-width: 1535px) 33vw, 25vw"
            }
            className="object-contain p-3 transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transform-none"
          />
        </Link>
        {merchandisingBadges.length > 0 && (
          <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
            {merchandisingBadges.map((badge) => (
              <SemanticBadge key={`${product._id}-${badge.label}`} {...badge}>
                {badge.label}
              </SemanticBadge>
            ))}
          </div>
        )}
        <div className="absolute right-3 top-3 z-20">
          <WishButton
            inWish={inWish}
            disabled={isWishUnknown}
            onToggle={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                await toggle(product._id);
                showSuccessToast(
                  inWish ? "위시리스트에서 제거했습니다." : "위시리스트에 추가했습니다.",
                );
              } catch (e: any) {
                if (e?.message === "unauthorized") {
                  router.push(`/login?next=${encodeURIComponent(detailHref)}`);
                } else {
                  showErrorToast("처리 중 오류가 발생했습니다.");
                }
              }
            }}
            size="sm"
          />
        </div>
      </div>
    );

    const content = (
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="mb-1.5 max-w-full truncate text-ui-label font-ui-medium uppercase tracking-[0.08em] text-muted-foreground"
          title={brandLabel}
        >
          {brandLabel}
        </div>
        <Link
          href={detailHref}
          className="group/title block min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <h3
            className={cn(
              "mb-2 line-clamp-2 break-words text-ui-body font-ui-medium leading-snug text-foreground transition-colors group-hover/title:text-primary",
              viewMode === "list"
                ? "bp-md:text-ui-card-title-lg bp-lg:line-clamp-3"
                : "bp-lg:line-clamp-3 bp-lg:text-ui-card-title-lg",
            )}
            title={product.name}
          >
            {product.name}
          </h3>
        </Link>
        <div className="mb-3 flex items-center gap-1.5">
          <CatalogRating
            average={ratingAvg}
            count={ratingCount}
            size={viewMode === "list" ? "md" : "sm"}
          />
        </div>
        <PerformanceSummary entries={featureEntries} />
        {shouldShowStandaloneServiceBadge && (
          <SemanticBadge tone="neutral" size="md" shape="pill" className="mt-3 shrink-0">
            교체서비스 전용
          </SemanticBadge>
        )}
      </div>
    );

    const actions = (
      <div className="grid grid-cols-1 gap-2">
        {isSoldOut ? (
          <Button
            type="button"
            variant="secondary"
            disabled
            aria-disabled="true"
            aria-label="상품 선택 불가: 품절된 상품입니다."
            title="품절된 상품입니다."
            className="h-11 min-h-11 w-full cursor-not-allowed whitespace-nowrap rounded-control border border-border bg-muted/70 text-ui-body-sm text-muted-foreground opacity-100 disabled:opacity-100 bp-md:h-10 bp-md:min-h-10"
          >
            <Eye className="h-4 w-4 shrink-0" />
            품절
          </Button>
        ) : (
          <Button
            asChild
            type="button"
            variant="highlight_soft"
            className="h-11 min-h-11 whitespace-nowrap rounded-control text-ui-body-sm bp-md:h-10 bp-md:min-h-10"
          >
            <Link href={detailHref}>
              <Eye className="mr-1.5 h-4 w-4 shrink-0" />
              <span>상세·옵션 보기</span>
            </Link>
          </Button>
        )}
        {ENABLE_STRING_STANDALONE_ORDER && (
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 w-full rounded-control px-3 text-center text-ui-label whitespace-nowrap bp-sm:text-ui-body-sm bp-md:h-10 bp-md:min-h-10"
            onClick={handleStringSingleBuy}
            disabled={isSoldOut}
          >
            스트링만 구매
          </Button>
        )}
      </div>
    );

    if (viewMode === "list") {
      return (
        <CatalogCardFrame
          viewMode="list"
          media={media}
          content={content}
          price={priceBlock("right")}
          actions={actions}
        />
      );
    }

    // ─── 그리드 뷰 ────────────────────────────────────────────────────────────
    return (
      <CatalogCardFrame
        viewMode="grid"
        media={media}
        content={content}
        price={priceBlock("left")}
        actions={actions}
      />
    );
  },
);

export default ProductCard;
