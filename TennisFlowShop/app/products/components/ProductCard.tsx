"use client";

import { getProductPriceDisplayMeta } from "@/lib/product-pricing";

import { useWishlist } from "@/app/features/wishlist/useWishlist";
import { useBuyNowStore } from "@/app/store/buyNowStore";
import { usePdpBundleStore } from "@/app/store/pdpBundleStore";
import { CatalogCardFrame, CatalogPrice, CatalogRating } from "@/components/commerce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  badgeToneClass,
  merchandisingImageBadgeClass,
  merchandisingImageBadgeVariant,
} from "@/lib/badge-style";
import { isMountableStringByFee } from "@/lib/orders/string-mounting-policy";
import { ENABLE_STRING_STANDALONE_ORDER } from "@/lib/orders/string-standalone-policy";
import { normalizeFeatureScoreTo100 } from "@/lib/product-feature-score";
import { hasSelectableStringStock } from "@/lib/products/string-stock";
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
    <section className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
      <p className="mb-1.5 text-ui-micro font-semibold tracking-wide text-muted-foreground">
        성능 요약
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-ui-caption sm:text-ui-label">
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

// shadcn Button의 hover:bg-accent / hover:text-accent-foreground 간섭을 피하기 위해
// 순수 <button>으로 구현한 위시리스트 토글 버튼
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
  const dim = size === "sm" ? "h-8 w-8 sm:h-9 sm:w-9" : "h-9 w-9 sm:h-10 sm:w-10";
  const iconDim = size === "sm" ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-3.5 h-3.5 sm:w-4 sm:h-4";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={inWish ? "위시리스트에서 제거" : "위시리스트에 추가"}
      title={
        disabled ? "위시리스트 상태 확인 중" : inWish ? "위시리스트에서 제거" : "위시리스트에 추가"
      }
      className={cn(
        dim,
        "flex-shrink-0 rounded-md border shadow-sm",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled && "cursor-not-allowed opacity-60",
        // 비활성 기본
        !inWish && [
          "border-border bg-card text-muted-foreground",
          "hover:border-destructive/45 hover:bg-destructive/12 hover:text-destructive",
          "dark:border-border dark:bg-card dark:text-muted-foreground",
          "dark:hover:border-destructive/55 dark:hover:bg-destructive/20 dark:hover:text-destructive",
        ],
        // 활성 hover
        inWish && [
          "border-destructive bg-destructive text-destructive-foreground",
          "hover:opacity-90 active:opacity-80",
        ],
      )}
    >
      <Heart
        className={cn(
          iconDim,
          "transition-colors duration-200 mx-auto",
          inWish ? "fill-current scale-110" : "scale-100",
        )}
      />
    </button>
  );
}

const productImageWrapClass =
  "relative aspect-[5/4] w-full overflow-hidden bg-muted/30 bp-md:aspect-square";

type Props = {
  product: Product;
  viewMode: "grid" | "list";
  brandLabel: string;
  isApplyFlow?: boolean;
};

const ProductCard = React.memo(
  function ProductCard({ product, viewMode, brandLabel, isApplyFlow = false }: Props) {
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
    const manageStock = inventory?.manageStock === true;
    const allowBackorder = inventory?.allowBackorder === true;
    const status = String(inventory?.status ?? "");

    const optionBasedSoldOut = !hasSelectableStringStock(product);
    const isSoldOut =
      status === "outofstock" ||
      optionBasedSoldOut ||
      (manageStock && (stockRaw ?? 0) <= 0 && !allowBackorder);
    const stockForItem = typeof stockRaw === "number" ? stockRaw : undefined;
    const canCheckoutWithService = isMountableStringByFee(product.mountingFee);
    const featureEntries = getFeatureEntries(product.features);
    const shouldShowStandaloneServiceBadge =
      !isApplyFlow && canCheckoutWithService && !ENABLE_STRING_STANDALONE_ORDER;
    const merchandisingBadges = [
      ...(inventory?.isNew === true ||
      inventory?.isNew === "true" ||
      inventory?.isNew === 1 ||
      product.isNew
        ? (["NEW"] as const)
        : []),
      ...(inventory?.isFeatured === true ||
      inventory?.isFeatured === "true" ||
      inventory?.isFeatured === 1
        ? (["추천"] as const)
        : []),
    ];

    const soldOutOverlay = isSoldOut ? (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/35">
        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
          <Badge variant="secondary" className="text-ui-body-sm font-semibold">
            품절
          </Badge>
        </div>
      </div>
    ) : null;

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
      <div className={productImageWrapClass}>
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
                ? "(max-width: 768px) 100vw, 260px"
                : "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            }
            className="object-contain p-3 transition-transform duration-200 group-hover:scale-[1.01]"
          />
        </Link>
        {soldOutOverlay}
        {merchandisingBadges.length > 0 && (
          <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
            {merchandisingBadges.map((badge) => (
              <Badge
                key={`${product._id}-${badge}`}
                variant={merchandisingImageBadgeVariant(badge)}
                shape="pill"
                className={cn(merchandisingImageBadgeClass)}
              >
                {badge}
              </Badge>
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
          className="mb-1.5 max-w-full truncate text-ui-label font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          title={brandLabel}
        >
          {brandLabel}
        </div>
        <Link
          href={detailHref}
          className="block min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <h3
            className="mb-2 line-clamp-2 break-words text-ui-body-sm font-medium leading-snug text-foreground transition-colors group-hover:text-foreground sm:text-ui-body bp-lg:line-clamp-3"
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
          <Badge
            variant="secondary"
            className="mt-3 w-fit shrink-0 whitespace-nowrap rounded-full border-border bg-muted/30 text-ui-caption"
          >
            교체서비스 전용
          </Badge>
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
            aria-label="교체서비스 신청 불가: 품절된 상품입니다."
            title="품절된 상품입니다."
            className="h-10 w-full cursor-not-allowed whitespace-nowrap rounded-control border border-border bg-muted/70 text-ui-body-sm text-muted-foreground opacity-100 disabled:opacity-100"
          >
            <Eye className="h-4 w-4 shrink-0" />
            품절
          </Button>
        ) : (
          <Button
            asChild
            type="button"
            variant="highlight_soft"
            className="h-10 whitespace-nowrap rounded-control text-ui-body-sm"
          >
            <Link href={detailHref}>
              <Eye className="mr-1.5 h-4 w-4 shrink-0" />
              <span>교체서비스 신청</span>
            </Link>
          </Button>
        )}
        {ENABLE_STRING_STANDALONE_ORDER && (
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-control px-3 text-center text-ui-label whitespace-nowrap sm:text-ui-body-sm"
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
        price={<div className="flex justify-end">{priceBlock("right")}</div>}
        actions={actions}
      />
    );
  },
  (prev, next) =>
    prev.product._id === next.product._id &&
    prev.product.ratingAvg === next.product.ratingAvg &&
    prev.product.ratingAverage === next.product.ratingAverage &&
    prev.product.ratingCount === next.product.ratingCount &&
    prev.viewMode === next.viewMode &&
    prev.brandLabel === next.brandLabel &&
    Boolean(prev.isApplyFlow) === Boolean(next.isApplyFlow),
);

export default ProductCard;
