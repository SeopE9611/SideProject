"use client";

import { useWishlist } from "@/app/features/wishlist/useWishlist";
import { useBuyNowStore } from "@/app/store/buyNowStore";
import { usePdpBundleStore } from "@/app/store/pdpBundleStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { isMountableStringByFee } from "@/lib/orders/string-mounting-policy";
import { ENABLE_STRING_STANDALONE_ORDER } from "@/lib/orders/string-standalone-policy";
import { normalizeFeatureScoreTo100 } from "@/lib/product-feature-score";
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
  inventory?: {
    stock?: number;
    status?: "instock" | "outofstock" | "backorder" | string;
    manageStock?: boolean;
    allowBackorder?: boolean;
    isSale?: boolean | string | number;
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

// shadcn Button의 hover:bg-accent / hover:text-accent-foreground 간섭을 피하기 위해
// 순수 <button>으로 구현한 위시리스트 토글 버튼
function WishButton({ inWish, disabled = false, onToggle, size = "md" }: { inWish: boolean; disabled?: boolean; onToggle: (e: React.MouseEvent) => void; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8 sm:h-9 sm:w-9" : "h-9 w-9 sm:h-10 sm:w-10";
  const iconDim = size === "sm" ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-3.5 h-3.5 sm:w-4 sm:h-4";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={inWish ? "위시리스트에서 제거" : "위시리스트에 추가"}
      title={disabled ? "위시리스트 상태 확인 중" : inWish ? "위시리스트에서 제거" : "위시리스트에 추가"}
      className={cn(
        dim,
        "flex-shrink-0 rounded-md border shadow-md",
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
        inWish && ["border-destructive bg-destructive text-destructive-foreground", "hover:opacity-90 active:opacity-80"],
      )}
    >
      <Heart className={cn(iconDim, "transition-colors duration-200 mx-auto", inWish ? "fill-current scale-110" : "scale-100")} />
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

const productCardSurfaceClass = "group h-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md flex flex-col";
const productImageWrapClass = "relative w-full overflow-hidden rounded-t-2xl bg-secondary/40 aspect-[5/4] bp-md:aspect-square";
const productMetaPillClass = "flex items-center justify-between rounded-xl border border-border/60 bg-secondary/50 px-2 py-1.5";

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
    const isSale = (inventory?.isSale === true || inventory?.isSale === "true" || inventory?.isSale === 1) && salePrice > 0 && salePrice < regularPrice;
    const displayPrice = isSale ? salePrice : regularPrice;
    const saleRate = isSale ? Math.round(((regularPrice - salePrice) / regularPrice) * 100) : 0;
    const stockRaw = typeof inventory?.stock === "number" ? inventory.stock : null;
    const manageStock = inventory?.manageStock === true;
    const allowBackorder = inventory?.allowBackorder === true;
    const status = String(inventory?.status ?? "");

    const isSoldOut = status === "outofstock" || (manageStock && (stockRaw ?? 0) <= 0 && !allowBackorder);
    const stockForItem = typeof stockRaw === "number" ? stockRaw : undefined;
    const canCheckoutWithService = isMountableStringByFee(product.mountingFee);
    const featureEntries = getFeatureEntries(product.features);
    const shouldShowStandaloneServiceBadge = !isApplyFlow && canCheckoutWithService && !ENABLE_STRING_STANDALONE_ORDER;

    const detailHref = isApplyFlow ? `/products/${product._id}?from=apply` : `/products/${product._id}`;

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

          <div className="flex flex-col bp-md:flex-row relative z-10">
            <div className="relative w-full bp-md:w-[280px] bp-xl:w-[320px] aspect-[4/3] flex-shrink-0 overflow-hidden bg-secondary/30">
              <Image src={(product.images?.[0] as string) || "/placeholder.svg?height=200&width=200&query=tennis+string"} alt={product.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1536px) 280px, 320px" className="object-contain" />
              {product.isNew && (
                <Badge variant="info" className="absolute right-2 top-2 border bg-background/95 shadow-sm backdrop-blur-sm dark:bg-card/95">
                  NEW
                </Badge>
              )}
            </div>
            <div className="min-w-0 flex-1 p-4 bp-md:p-5">
              <div className="flex flex-col gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 max-w-full truncate text-sm font-medium text-foreground/80" title={brandLabel}>
                    {brandLabel}
                  </div>
                  <h3 className="mb-2 line-clamp-2 break-words text-base font-bold text-foreground sm:text-lg md:text-xl" title={product.name}>
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <RatingStars avg={ratingAvg} starClassName="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-sm text-foreground/80">({ratingCount})</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <div className="whitespace-nowrap tabular-nums text-xl font-bold text-primary sm:text-2xl">{displayPrice.toLocaleString()}원</div>
                  {isSale && <span className="whitespace-nowrap tabular-nums text-sm text-muted-foreground line-through">{regularPrice.toLocaleString()}원</span>}
                  {isSale && (
                    <Badge variant="destructive" className="shrink-0 whitespace-nowrap text-xs">
                      {saleRate}% OFF
                    </Badge>
                  )}
                </div>
              </div>

              {featureEntries.length > 0 && (
                <div className="mb-3">
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] sm:text-xs">
                    {featureEntries.map((feature, index) => (
                      <div key={feature.key} className={cn(productMetaPillClass, "min-w-0", featureEntries.length % 2 === 1 && index === featureEntries.length - 1 && "col-span-2")}>
                        <div className="flex min-w-0 items-center justify-between gap-1">
                          <span className="shrink-0 whitespace-nowrap text-muted-foreground font-medium">{feature.label}</span>
                          <span className="shrink-0 whitespace-nowrap tabular-nums font-semibold text-primary">{feature.value}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 max-w-md">
                <Button asChild variant="default" size="sm" wrap="responsive" className="w-full h-10 text-xs sm:text-sm">
                  <Link href={detailHref}>
                    <Eye className="w-3 h-3 bp-sm:w-4 bp-sm:h-4 mr-1.5" />
                    {isApplyFlow ? (
                      <>
                        <span className="sm:hidden">교체 신청</span>
                        <span className="hidden sm:inline">이 스트링으로 교체 신청</span>
                      </>
                    ) : (
                      "상세 보기"
                    )}
                  </Link>
                </Button>

                {ENABLE_STRING_STANDALONE_ORDER && (
                  <Button type="button" size="sm" variant="outline" onClick={handleStringSingleBuy} disabled={isSoldOut} className="h-9 whitespace-nowrap sm:h-10 text-xs sm:text-sm">
                    단품 구매
                  </Button>
                )}

                <WishButton
                  inWish={inWish}
                  disabled={isWishUnknown}
                  onToggle={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      await toggle(product._id);
                      showSuccessToast(inWish ? "위시리스트에서 제거했습니다." : "위시리스트에 추가했습니다.");
                    } catch (e: any) {
                      if (e?.message === "unauthorized") {
                        router.push(`/login?next=${encodeURIComponent(detailHref)}`);
                      } else {
                        showErrorToast("처리 중 오류가 발생했습니다.");
                      }
                    }
                  }}
                />
              </div>
              {shouldShowStandaloneServiceBadge && (
                <Badge variant="secondary" className="mt-2 w-fit shrink-0 whitespace-nowrap text-[11px]">
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
          <Link href={detailHref} aria-label={`${product.name} ${isApplyFlow ? "교체 신청" : "상세 보기"}`} className="absolute inset-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Image src={(product.images?.[0] as string) || "/placeholder.svg?height=300&width=300&query=tennis+string"} alt={product.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
          </Link>

          {product.isNew && (
            <Badge variant="info" className="absolute right-2 sm:right-3 top-2 sm:top-3 z-10 border bg-background/95 text-xs shadow-sm backdrop-blur-sm dark:bg-card/95">
              NEW
            </Badge>
          )}
        </div>

        {/* 카드 콘텐츠 */}
        <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
          <Link href={detailHref} className="block min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <div className="min-h-[48px]">
              <div className="mb-1.5 max-w-full truncate text-xs font-medium text-muted-foreground" title={brandLabel}>
                {brandLabel}
              </div>
              <CardTitle className="mb-2 min-h-[2.5rem] line-clamp-2 break-words text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-foreground sm:min-h-[3rem] sm:text-base" title={product.name}>
                {product.name}
              </CardTitle>
            </div>

            <div className="flex items-center gap-1.5 mb-2.5">
              <RatingStars avg={ratingAvg} starClassName="w-3 h-3" />
              <span className="text-xs text-muted-foreground">({ratingCount})</span>
            </div>

            {featureEntries.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-1.5 text-[11px] sm:text-xs">
                {featureEntries.map((feature, index) => (
                  <div key={feature.key} className={cn(productMetaPillClass, "min-w-0 px-2 py-1.5", featureEntries.length % 2 === 1 && index === featureEntries.length - 1 && "col-span-2")}>
                    <div className="flex min-w-0 items-center justify-between gap-1">
                      <span className="shrink-0 whitespace-nowrap text-muted-foreground font-medium">{feature.label}</span>
                      <span className="shrink-0 whitespace-nowrap tabular-nums font-semibold text-primary">{feature.value}/100</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex min-h-[64px] justify-end pt-1">
              <div className="flex flex-col items-end justify-end text-right space-y-1">
                {isSale && (
                  <div className="flex justify-end">
                    <Badge variant="outline" className="h-5 shrink-0 whitespace-nowrap rounded-full border-destructive/25 bg-destructive/10 px-2 text-[11px] font-semibold text-destructive">
                      {saleRate}% OFF
                    </Badge>
                  </div>
                )}
                <div className="whitespace-nowrap tabular-nums text-lg font-bold text-foreground">{displayPrice.toLocaleString()}원</div>
                {isSale && <div className="whitespace-nowrap tabular-nums text-xs text-muted-foreground line-through">{regularPrice.toLocaleString()}원</div>}
              </div>
            </div>
          </Link>
        </CardContent>

        <CardFooter className="mt-auto grid grid-cols-1 gap-2 p-3 pt-3 bp-sm:p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2">
            <Button asChild type="button" variant="outline" wrap="responsive" className="h-10 text-sm">
              <Link href={detailHref}>
                <Eye className="h-4 w-4 mr-1.5" />
                {isApplyFlow ? (
                  <>
                    <span className="sm:hidden">교체 신청</span>
                    <span className="hidden sm:inline">이 스트링으로 교체 신청</span>
                  </>
                ) : (
                  "상세 보기"
                )}
              </Link>
            </Button>
            <div className="flex justify-end">
              <WishButton
                inWish={inWish}
                disabled={isWishUnknown}
                onToggle={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    await toggle(product._id);
                    showSuccessToast(inWish ? "위시리스트에서 제거했습니다." : "위시리스트에 추가했습니다.");
                  } catch {
                    showErrorToast("처리 중 오류가 발생했습니다.");
                  }
                }}
                size="md"
              />
            </div>
          </div>

          {ENABLE_STRING_STANDALONE_ORDER && (
            <Button type="button" variant="outline" className="w-full rounded-lg h-10 px-3 text-xs sm:text-sm whitespace-nowrap text-center" onClick={handleStringSingleBuy} disabled={isSoldOut}>
              단품 구매
            </Button>
          )}

          {/* {shouldShowStandaloneServiceBadge && (
            <Badge variant="secondary" className="w-fit text-[11px]">
              교체서비스 전용
            </Badge>
          )} */}
        </CardFooter>
      </Card>
    );
  },
  (prev, next) => prev.product._id === next.product._id && prev.viewMode === next.viewMode && prev.brandLabel === next.brandLabel && Boolean(prev.isApplyFlow) === Boolean(next.isApplyFlow),
);

export default ProductCard;
