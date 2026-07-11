"use client";

import { getProductPriceDisplayMeta } from "@/lib/product-pricing";

import { useWishlist } from "@/app/features/wishlist/useWishlist";
import { useBuyNowStore } from "@/app/store/buyNowStore";
import { usePdpBundleStore } from "@/app/store/pdpBundleStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
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
import { Eye, Heart, Star } from "lucide-react";
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

function RatingStars({ avg, starClassName = "w-3 h-3" }: { avg: number; starClassName?: string }) {
  const safe = Math.max(0, Math.min(5, Number(avg) || 0));
  return (
    <div className="flex items-center">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, safe - i));
        return (
          <span key={i} className={`relative inline-block ${starClassName}`}>
            <Star className={`${starClassName} text-warning`} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={`${starClassName} text-warning fill-current`} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

const productCardSurfaceClass =
  "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:bg-muted/20 hover:shadow-sm";
const productImageWrapClass =
  "relative w-full overflow-hidden rounded-t-2xl bg-muted/30 aspect-[5/4] bp-md:aspect-square";

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
    const saleRate = isSale ? Math.round(((regularPrice - salePrice) / regularPrice) * 100) : 0;
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
      <div
        className={cn(
          "flex flex-col gap-1 tabular-nums",
          align === "right" ? "items-end text-right" : "items-start text-left",
        )}
      >
        {isSale ? (
          <>
            <div className={cn("flex items-baseline gap-1.5", align === "right" && "justify-end")}>
              <span className="text-ui-caption text-muted-foreground">할인가</span>
              <span className="whitespace-nowrap text-ui-price font-semibold text-foreground bp-sm:text-ui-price-lg">
                {displayPrice.toLocaleString()}원
              </span>
            </div>
            <div
              className={cn(
                "flex flex-wrap items-center gap-1.5",
                align === "right" && "justify-end",
              )}
            >
              <span className="text-ui-caption text-muted-foreground">정가</span>
              <span className="whitespace-nowrap text-ui-label text-muted-foreground line-through">
                {regularPrice.toLocaleString()}원
              </span>
              <Badge
                variant="outline"
                className={cn("shrink-0 whitespace-nowrap text-ui-label", badgeToneClass("danger"))}
              >
                {saleRate}% OFF
              </Badge>
            </div>
          </>
        ) : (
          <div className={cn("flex items-baseline gap-1.5", align === "right" && "justify-end")}>
            <span className="text-ui-caption text-muted-foreground">판매가</span>
            <span className="whitespace-nowrap text-ui-price font-semibold text-foreground bp-sm:text-ui-price-lg">
              {displayPrice.toLocaleString()}원
            </span>
          </div>
        )}
      </div>
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

    const handleStringServiceApply = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canCheckoutWithService) return;
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
      const search = new URLSearchParams({ mode: "buynow", withService: "1" });
      router.push(`/checkout?${search.toString()}`);
    };

    if (viewMode === "list") {
      return (
        <Card className={cn(productCardSurfaceClass, "relative")}>
          {/* 리스트뷰: 배경 장식 SVG 제거 */}

          <div className="relative z-10 flex h-full flex-col bp-md:flex-row">
            <div className="relative aspect-[4/3] w-full flex-shrink-0 overflow-hidden bg-muted/30 bp-md:w-[280px] bp-xl:w-[320px]">
              <Image
                src={
                  (product.images?.[0] as string) ||
                  "/placeholder.svg?height=200&width=200&query=tennis+string"
                }
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1536px) 280px, 320px"
                className="object-contain p-3"
              />
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
            <div className="flex min-w-0 flex-1 flex-col p-4 bp-md:p-5">
              <div className="mb-4 flex flex-col gap-3">
                <div className="min-w-0 flex-1">
                  <div
                    className="mb-1 max-w-full truncate text-ui-label font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:text-ui-body-sm"
                    title={brandLabel}
                  >
                    {brandLabel}
                  </div>
                  <h3
                    className="mb-2 line-clamp-2 break-words text-ui-body font-medium text-foreground sm:text-ui-card-title-lg md:text-ui-section-title bp-lg:line-clamp-3"
                    title={product.name}
                  >
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <RatingStars avg={ratingAvg} starClassName="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-ui-label text-muted-foreground sm:text-ui-body-sm">
                      ({ratingCount})
                    </span>
                  </div>
                </div>
                {priceBlock("left")}
              </div>

              <div className="mb-4">
                <PerformanceSummary entries={featureEntries} />
              </div>

              <div className="mt-auto grid max-w-md grid-cols-1 gap-2">
                <Button
                  asChild
                  variant="default"
                  size="sm"
                  className="w-full overflow-hidden whitespace-nowrap text-ui-label sm:text-ui-body-sm"
                >
                  <Link href={detailHref}>
                    <Eye className="mr-1.5 h-3 w-3 shrink-0 bp-sm:h-4 bp-sm:w-4" />
                    <span className="min-w-0 truncate">교체서비스 신청하기</span>
                  </Link>
                </Button>

                {ENABLE_STRING_STANDALONE_ORDER && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleStringSingleBuy}
                    disabled={isSoldOut}
                    className="h-9 whitespace-nowrap sm:h-10 text-ui-label sm:text-ui-body-sm"
                  >
                    스트링만 구매
                  </Button>
                )}
              </div>
              {shouldShowStandaloneServiceBadge && (
                <Badge
                  variant="secondary"
                  className="mt-2 w-fit shrink-0 whitespace-nowrap rounded-full border-border bg-muted/30 text-ui-caption"
                >
                  교체서비스 전용
                </Badge>
              )}
            </div>
          </div>
        </Card>
      );
    }

    // ─── 그리드 뷰 ────────────────────────────────────────────────────────────
    return (
      <Card className={productCardSurfaceClass}>
        {/* 이미지 영역 */}
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
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                } catch {
                  showErrorToast("처리 중 오류가 발생했습니다.");
                }
              }}
              size="sm"
            />
          </div>
        </div>

        {/* 카드 콘텐츠 */}
        <CardContent className="flex flex-1 flex-col p-4 pb-3 sm:p-5 sm:pb-4">
          <Link
            href={detailHref}
            className="flex min-w-0 flex-1 flex-col rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div>
              <div
                className="mb-1.5 max-w-full truncate text-ui-label font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                title={brandLabel}
              >
                {brandLabel}
              </div>
              <CardTitle
                className="mb-2 line-clamp-2 break-words text-ui-body-sm font-medium leading-snug text-foreground transition-colors group-hover:text-foreground sm:text-ui-body bp-lg:line-clamp-3"
                title={product.name}
              >
                {product.name}
              </CardTitle>
            </div>

            <div className="mb-3 flex items-center gap-1.5">
              <RatingStars avg={ratingAvg} starClassName="w-3 h-3" />
              <span className="text-ui-label text-muted-foreground">({ratingCount})</span>
            </div>

            <div className="mb-4">
              <PerformanceSummary entries={featureEntries} />
            </div>

            <div className="mt-auto flex justify-end pt-4">{priceBlock("right")}</div>
          </Link>
        </CardContent>

        <CardFooter className="mt-auto grid grid-cols-1 gap-2 border-t border-border/50 p-3 bp-sm:p-4">
          <div className="grid grid-cols-1 gap-2">
            <Button
              asChild
              type="button"
              variant="outline"
              className="h-10 overflow-hidden whitespace-nowrap rounded-xl text-ui-body-sm"
            >
              <Link href={detailHref}>
                <Eye className="mr-1.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">교체서비스 신청하기</span>
              </Link>
            </Button>
          </div>

          {ENABLE_STRING_STANDALONE_ORDER && (
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-xl px-3 text-center text-ui-label whitespace-nowrap sm:text-ui-body-sm"
              onClick={handleStringSingleBuy}
              disabled={isSoldOut}
            >
              스트링만 구매
            </Button>
          )}

          {/* {shouldShowStandaloneServiceBadge && (
            <Badge variant="secondary" className="w-fit text-ui-caption">
              교체서비스 전용
            </Badge>
          )} */}
        </CardFooter>
      </Card>
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
