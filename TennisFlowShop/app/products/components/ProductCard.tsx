"use client";

import { useWishlist } from "@/app/features/wishlist/useWishlist";
import { useBuyNowStore } from "@/app/store/buyNowStore";
import { usePdpBundleStore } from "@/app/store/pdpBundleStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
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

const FEATURE_ORDER = [
  "power",
  "control",
  "spin",
  "durability",
  "comfort",
] as const;

function getFeatureEntries(features?: Record<string, number>) {
  return FEATURE_ORDER.map((key) => {
    const rawValue = Number(features?.[key] ?? 0);
    const value = Math.max(0, Math.min(5, rawValue));
    return { key, label: keyMap[key], value };
  }).filter((item) => item.value > 0);
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
  const dim =
    size === "sm" ? "h-8 w-8 sm:h-9 sm:w-9" : "h-9 w-9 sm:h-10 sm:w-10";
  const iconDim =
    size === "sm" ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-3.5 h-3.5 sm:w-4 sm:h-4";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={inWish ? "위시리스트에서 제거" : "위시리스트에 추가"}
      title={
        disabled
          ? "위시리스트 상태 확인 중"
          : inWish
            ? "위시리스트에서 제거"
            : "위시리스트에 추가"
      }
      className={cn(
        dim,
        "flex-shrink-0 rounded-md border shadow-md",
        "transition-all duration-200",
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
          "transition-all duration-200 mx-auto",
          inWish ? "fill-current scale-110" : "scale-100",
        )}
      />
    </button>
  );
}

function RatingStars({
  avg,
  starClassName = "w-3 h-3",
}: {
  avg: number;
  starClassName?: string;
}) {
  const safe = Math.max(0, Math.min(5, Number(avg) || 0));
  return (
    <div className="flex items-center">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, safe - i));
        return (
          <span key={i} className={`relative inline-block ${starClassName}`}>
            <Star className={`${starClassName} text-warning`} />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className={`${starClassName} text-warning fill-current`} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

type Props = {
  product: Product;
  viewMode: "grid" | "list";
  brandLabel: string;
  isApplyFlow?: boolean;
};

const ProductCard = React.memo(
  function ProductCard({
    product,
    viewMode,
    brandLabel,
    isApplyFlow = false,
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
    const stockRaw =
      typeof inventory?.stock === "number" ? inventory.stock : null;
    const manageStock = inventory?.manageStock === true;
    const allowBackorder = inventory?.allowBackorder === true;
    const status = String(inventory?.status ?? "");

    const isSoldOut =
      status === "outofstock" ||
      (manageStock && (stockRaw ?? 0) <= 0 && !allowBackorder);
    const stockForItem = typeof stockRaw === "number" ? stockRaw : undefined;
    const canCheckoutWithService =
      typeof product.mountingFee === "number" && product.mountingFee > 0;
    const featureEntries = getFeatureEntries(product.features);

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
        price: Number(product.price ?? 0),
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
        price: Number(product.price ?? 0),
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
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl bg-card border border-border hover:border-border relative">
          {/* 리스트뷰: 배경 장식 SVG 제거 */}

          <div className="flex flex-col bp-md:flex-row relative z-10">
            <div className="relative w-full bp-md:w-48 aspect-[4/3] bp-md:aspect-square flex-shrink-0 overflow-hidden">
              <Image
                src={
                  (product.images?.[0] as string) ||
                  "/placeholder.svg?height=200&width=200&query=tennis+string"
                }
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 192px"
                className="object-cover"
              />
              {product.isNew && (
                <Badge
                  variant="info"
                  className="absolute right-2 top-2 shadow-sm"
                >
                  NEW
                </Badge>
              )}
            </div>
            <div className="flex-1 p-4 bp-md:p-5">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex-1">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1 font-medium">
                    {brandLabel}
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 text-foreground line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <RatingStars
                      avg={ratingAvg}
                      starClassName="w-3 h-3 sm:w-4 sm:h-4"
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      ({ratingCount})
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-xl sm:text-2xl font-bold text-primary">
                    {product.price.toLocaleString()}원
                  </div>
                </div>
              </div>

              {featureEntries.length > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {featureEntries.map((feature, index) => (
                      <div
                        key={feature.key}
                        className={cn(
                          "rounded-md border border-border/60 bg-muted/30 px-2.5 py-2",
                          featureEntries.length % 2 === 1 &&
                            index === featureEntries.length - 1 &&
                            "col-span-2",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground font-medium">
                            {feature.label}
                          </span>
                          <span className="font-semibold text-primary">
                            {feature.value}/5
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 bp-sm:flex gap-2">
                <Link href={detailHref} className="bp-sm:flex-1">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <Eye className="w-3 h-3 bp-sm:w-4 bp-sm:h-4 mr-1.5" />
                    상세보기
                  </Button>
                </Link>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleStringSingleBuy}
                  disabled={isSoldOut}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  {isApplyFlow ? "단품만 구매" : "단품 구매"}
                </Button>

                {canCheckoutWithService && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleStringServiceApply}
                    disabled={isSoldOut}
                    className="h-9 sm:h-10 text-xs sm:text-sm col-span-2 sm:col-span-1 whitespace-normal leading-tight"
                  >
                    교체 서비스 포함 결제
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
                      showSuccessToast(
                        inWish
                          ? "위시리스트에서 제거했습니다."
                          : "위시리스트에 추가했습니다.",
                      );
                    } catch (e: any) {
                      if (e?.message === "unauthorized") {
                        router.push(
                          `/login?next=${encodeURIComponent(detailHref)}`,
                        );
                      } else {
                        showErrorToast("처리 중 오류가 발생했습니다.");
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      );
    }

    // ─── 그리드 뷰 ────────────────────────────────────────────────────────────
    return (
      <Link href={detailHref}>
        <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card border border-border hover:border-primary/40 dark:hover:border-primary/40 group relative">
          {/* 이미지 영역 */}
          <div className="relative w-full aspect-[4/3] bp-md:aspect-square overflow-hidden">
            <Image
              src={
                (product.images?.[0] as string) ||
                "/placeholder.svg?height=300&width=300&query=tennis+string"
              }
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {product.isNew && (
              <Badge
                variant="info"
                className="absolute right-2 sm:right-3 top-2 sm:top-3 text-xs shadow-sm z-10"
              >
                NEW
              </Badge>
            )}

            {/* ─── 호버 오버레이: 투명 없음, 단색 불투명 배경 ─────────────────
                라이트: 흰색 베이스 / 다크: 짙은 카드색 베이스
                opacity-0 → opacity-100 전환만 사용, bg-overlay 제거
            ──────────────────────────────────────────────────────────────── */}
            <div
              className={cn(
                "absolute inset-0 flex items-end justify-between px-3 pb-3 gap-2",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                // 라이트: 하단 흰 그라디언트 (이미지 가리지 않고 버튼 가독성 확보)
                // 다크: 하단 짙은 그라디언트
                "bg-gradient-to-t from-card via-card/70 to-transparent",
                "dark:from-card dark:via-card/70 dark:to-transparent",
              )}
            >
              {/* 상세보기 버튼 */}
              <Button
                size="sm"
                variant="default"
                className="h-8 sm:h-9 text-xs sm:text-sm shadow-md flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye className="w-3 h-3 bp-sm:w-4 bp-sm:h-4 mr-1" />
                상세보기
              </Button>

              {/* 위시리스트 버튼
                  라이트: 기본은 흰 배경 + 테두리, 호버/활성화 시 rose 계열로 전환
                  다크: 기본은 zinc 배경, 호버/활성화 시 rose 계열
              */}
              <WishButton
                inWish={inWish}
                disabled={isWishUnknown}
                onToggle={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    await toggle(product._id);
                    showSuccessToast(
                      inWish
                        ? "위시리스트에서 제거했습니다."
                        : "위시리스트에 추가했습니다.",
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
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">
              {brandLabel}
            </div>
            <CardTitle className="text-sm sm:text-base font-semibold mb-2 line-clamp-2 text-foreground group-hover:text-primary transition-colors min-h-[2.5rem] sm:min-h-[3rem]">
              {product.name}
            </CardTitle>

            <div className="flex items-center gap-1.5 mb-2">
              <RatingStars avg={ratingAvg} starClassName="w-3 h-3" />
              <span className="text-xs text-muted-foreground">
                ({ratingCount})
              </span>
            </div>

            {featureEntries.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-1.5 text-[11px] sm:text-xs">
                {featureEntries.map((feature, index) => (
                  <div
                    key={feature.key}
                    className={cn(
                      "flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5",
                      featureEntries.length % 2 === 1 &&
                        index === featureEntries.length - 1 &&
                        "col-span-2",
                    )}
                  >
                    <span className="text-muted-foreground font-medium">
                      {feature.label}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${i < feature.value ? "bg-primary" : "bg-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <div className="font-bold text-base sm:text-lg text-primary">
                {product.price.toLocaleString()}원
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-2.5 bp-sm:p-3 bp-md:p-4 pt-0 grid grid-cols-1 gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-lg h-10 px-3 text-[11px] sm:text-xs whitespace-nowrap text-center"
              onClick={handleStringSingleBuy}
              disabled={isSoldOut}
            >
              {isApplyFlow ? "단품만 구매" : "단품 구매"}
            </Button>

            {canCheckoutWithService && (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-lg h-10 px-3 text-[11px] sm:text-xs whitespace-nowrap text-center"
                onClick={handleStringServiceApply}
                disabled={isSoldOut}
              >
                교체 서비스 포함 결제
              </Button>
            )}
          </CardFooter>
        </Card>
      </Link>
    );
  },
  (prev, next) =>
    prev.product._id === next.product._id &&
    prev.viewMode === next.viewMode &&
    prev.brandLabel === next.brandLabel &&
    Boolean(prev.isApplyFlow) === Boolean(next.isApplyFlow),
);

export default ProductCard;
