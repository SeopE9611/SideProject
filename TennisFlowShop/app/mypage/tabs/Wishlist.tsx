"use client";

import { useWishlist } from "@/app/features/wishlist/useWishlist";
import { useCartStore } from "@/app/store/cartStore";
import { Button } from "@/components/ui/button";
import WishlistSkeleton from "@/app/mypage/tabs/_components/WishlistSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { AlertCircle, Heart, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const LIMIT = 12;

export default function Wishlist() {
  const { items, remove, isLoading, hasDataError, hasResolvedData } = useWishlist();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  // '더 보기' 노출 개수
  const [visible, setVisible] = useState(LIMIT);

  const resolvedItems = items ?? [];
  const hasMore = useMemo(() => resolvedItems.length > visible, [resolvedItems.length, visible]);
  const visibleItems = useMemo(() => resolvedItems.slice(0, visible), [resolvedItems, visible]);

  // empty state는 로딩/에러가 아닌 실제 데이터 확정 후 length===0일 때만 노출한다.
  const shouldShowEmptyState =
    hasResolvedData && !isLoading && !hasDataError && resolvedItems.length === 0;

  function handleAddToCart(it: (typeof resolvedItems)[number]) {
    if (it.requiresOption && !it.hasSelectedOption) {
      showErrorToast(
        "색상과 게이지(굵기)를 선택해주세요. 상세페이지에서 옵션을 다시 선택해주세요.",
      );
      router.push(`/products/${it.id}`);
      return;
    }
    if (it.requiresOption && !it.optionAvailable) {
      showErrorToast("찜한 옵션이 현재 품절되었습니다. 다른 옵션을 선택해주세요.");
      return;
    }

    const result = addItem({
      id: it.id,
      name: it.name,
      price: it.price,
      quantity: 1,
      image: it.selectedColorImage || it.image,
      stock: it.requiresOption ? it.optionStock : it.stock,
      selectedGauge: it.selectedGauge,
      selectedColor: it.selectedColor,
      selectedColorLabel: it.selectedColorLabel,
      selectedColorHex: it.selectedColorHex,
      selectedColorImage: it.selectedColorImage,
    });

    if (!result.success) {
      showErrorToast(result.message ?? "장바구니에 담을 수 없습니다.");
      return;
    }
    showSuccessToast("장바구니에 담았습니다.");
  }

  if (isLoading && !hasResolvedData) {
    return <WishlistSkeleton />;
  }

  if (hasDataError) {
    return (
      <Card variant="feature" className="border-destructive/30 bg-card shadow-soft">
        <CardContent className="p-8 text-center md:p-12">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-control bg-destructive/10 text-destructive">
            <AlertCircle className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 className="mb-2 font-brand-heading text-ui-section-title font-semibold">
            위시리스트를 불러오지 못했습니다
          </h3>
          <p className="text-ui-body-sm text-muted-foreground">잠시 후 다시 시도해주세요.</p>
        </CardContent>
      </Card>
    );
  }

  if (shouldShowEmptyState) {
    return (
      <Card variant="feature" className="overflow-hidden border-border/80 bg-card shadow-soft">
        <CardContent className="p-8 text-center md:p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-control border border-brand-highlight-ink/20 bg-brand-highlight-muted text-brand-highlight-ink shadow-soft">
            <Heart className="h-10 w-10" aria-hidden="true" />
          </div>
          <h3 className="mb-2 font-brand-heading text-ui-section-title font-semibold">위시리스트가 비어있습니다</h3>
          <p className="mx-auto mb-6 max-w-md text-ui-body-sm text-muted-foreground">
            마음에 드는 상품을 저장해두고 언제든 다시 확인해보세요.
          </p>
          <Button asChild variant="highlight" wrap="responsive" className="w-full sm:w-auto">
            <Link href="/products">상품 둘러보기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleItems.map((it) => (
          <Card
            key={it.id}
            variant="interactive"
            className="flex h-full flex-col overflow-hidden border-border/80 bg-card shadow-soft transition-[box-shadow,border-color,transform] duration-200 hover:border-brand-highlight-ink/35 hover:shadow-md focus-within:border-brand-highlight-ink/45 focus-within:shadow-md"
          >
            <CardContent className="flex h-full flex-col p-0">
              <Link
                href={`/products/${it.id}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border/70 bg-muted/20">
                  <Image
                    src={it.image || "/placeholder.svg"}
                    alt={it.name}
                    fill
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div className="line-clamp-2 min-h-12 break-keep font-brand-heading text-ui-card-title font-semibold text-foreground hover:underline">
                    {it.name}
                  </div>
                  <div className="text-ui-body-sm tabular-nums">
                    <span className="font-semibold text-foreground">
                      {it.price.toLocaleString()}원
                    </span>

                    {typeof it.regularPrice === "number" && it.regularPrice > it.price && (
                      <div className="mt-0.5 text-ui-label text-muted-foreground">
                        정가{" "}
                        <span className="line-through">{it.regularPrice.toLocaleString()}원</span>
                        {typeof it.discountRate === "number" ? ` · ${it.discountRate}% 할인` : ""}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 rounded-control border border-border/70 bg-muted/20 p-3 text-ui-label text-muted-foreground">
                    {it.hasSelectedOption ? (
                      <>
                        {it.selectedColorLabel && <div>색상: {it.selectedColorLabel}</div>}
                        {it.selectedGauge && <div>게이지(굵기): {it.selectedGauge}</div>}
                        {typeof it.optionStock === "number" && (
                          <div>현재 재고: {it.optionStock}개</div>
                        )}
                      </>
                    ) : it.requiresOption ? (
                      <>
                        <div className="font-medium text-warning">옵션 미선택</div>
                        <div>상세페이지에서 색상/게이지(굵기)를 선택해주세요.</div>
                      </>
                    ) : null}
                    {it.hasSelectedOption && it.optionAvailable === false && (
                      <div className="font-medium text-destructive">품절</div>
                    )}
                  </div>
                </div>
              </Link>

              <div className="mt-auto grid grid-cols-1 gap-2 p-4 pt-0 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Button
                  size="sm"
                  variant="highlight"
                  wrap="responsive"
                  className="w-full min-w-0 px-3"
                  onClick={() => handleAddToCart(it)}
                  disabled={it.requiresOption && it.hasSelectedOption && !it.optionAvailable}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />{" "}
                  {it.requiresOption && !it.hasSelectedOption ? "옵션 선택" : "담기"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  wrap="responsive"
                  className="w-full min-w-0 border-destructive/40 px-3 text-destructive hover:bg-destructive/10"
                  aria-label={`${it.name} 위시리스트에서 삭제`}
                  onClick={() => {
                    remove(it.id).catch(() => {
                      showErrorToast("위시리스트 삭제에 실패했습니다.");
                    });
                    // 현재 페이지에서 바로 사라지도록, 노출 개수 보정
                    setVisible((v) => Math.min(v, Math.max(0, resolvedItems.length - 1)));
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" /> 삭제
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 더 보기 */}
      <div className="flex justify-center pt-2">
        {hasMore ? (
          <Button
            variant="outline"
            onClick={() => setVisible((v) => v + LIMIT)}
            className="bg-transparent"
          >
            더 보기
          </Button>
        ) : (
          <span className="text-ui-body-sm text-muted-foreground">마지막 페이지입니다</span>
        )}
      </div>
    </div>
  );
}
