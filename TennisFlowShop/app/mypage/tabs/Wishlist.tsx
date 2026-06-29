"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useWishlist } from "@/app/features/wishlist/useWishlist";
import { useCartStore } from "@/app/store/cartStore";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";

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
      showErrorToast("색상과 굵기를 선택해주세요. 상세페이지에서 옵션을 다시 선택해주세요.");
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
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="space-y-3 p-4 md:p-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`wishlist-loading-${idx}`} className="rounded-lg border border-border/50 p-3">
              <Skeleton className="h-28 w-full rounded-md" />
              <Skeleton className="mt-3 h-4 w-2/3" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (hasDataError) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-8 md:p-12 text-center">
          <h3 className="mb-2 text-ui-section-title font-semibold">위시리스트를 불러오지 못했습니다</h3>
          <p className="text-muted-foreground">잠시 후 다시 시도해주세요.</p>
        </CardContent>
      </Card>
    );
  }

  if (shouldShowEmptyState) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
            <Heart className="h-10 w-10" />
          </div>
          <h3 className="mb-2 text-ui-section-title font-semibold">위시리스트가 비어있습니다</h3>
          <p className="mb-6 text-muted-foreground">
            마음에 드는 상품을 위시리스트에 추가해보세요!
          </p>
          <Button asChild variant="default" className="w-full shadow-sm sm:w-auto">
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
            className="flex h-full flex-col overflow-hidden border-border bg-card shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-primary/30 hover:shadow-md"
          >
            <CardContent className="flex h-full flex-col p-4">
              <Link href={`/products/${it.id}`} className="block">
                <div className="relative h-44 w-full overflow-hidden rounded-xl bg-muted/30 sm:h-40">
                  <Image
                    src={it.image || "/placeholder.svg"}
                    alt={it.name}
                    fill
                    sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
                    className="rounded-xl border border-border/60 object-cover"
                  />
                </div>
                <div className="mt-3">
                  <div className="line-clamp-2 min-h-10 break-keep font-semibold text-foreground hover:underline">
                    {it.name}
                  </div>
                  <div className="mt-1 text-ui-body-sm tabular-nums text-muted-foreground">
                    {it.price.toLocaleString()}원
                  </div>
                  <div className="mt-2 space-y-0.5 text-ui-label text-muted-foreground">
                    {it.hasSelectedOption ? (
                      <>
                        {it.selectedColorLabel && <div>색상: {it.selectedColorLabel}</div>}
                        {it.selectedGauge && <div>굵기: {it.selectedGauge}</div>}
                        {typeof it.optionStock === "number" && (
                          <div>현재 재고: {it.optionStock}개</div>
                        )}
                      </>
                    ) : it.requiresOption ? (
                      <>
                        <div className="font-medium text-warning">옵션 미선택</div>
                        <div>상세페이지에서 색상/굵기를 선택해주세요.</div>
                      </>
                    ) : null}
                    {it.hasSelectedOption && it.optionAvailable === false && (
                      <div className="font-medium text-destructive">품절</div>
                    )}
                  </div>
                </div>
              </Link>

              <div className="mt-auto grid grid-cols-1 gap-2 pt-4 xl:grid-cols-2">
                <Button
                  size="sm"
                  variant="default"
                  className="w-full min-w-0 whitespace-nowrap px-3 shadow-sm"
                  onClick={() => handleAddToCart(it)}
                  disabled={it.requiresOption && it.hasSelectedOption && !it.optionAvailable}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />{" "}
                  {it.requiresOption && !it.hasSelectedOption ? "옵션 선택" : "담기"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full min-w-0 whitespace-nowrap border-destructive/40 px-3 hover:bg-destructive/10"
                  onClick={() => {
                    remove(it.id).catch(() => {
                      showErrorToast("위시리스트 삭제에 실패했습니다.");
                    });
                    // 현재 페이지에서 바로 사라지도록, 노출 개수 보정
                    setVisible((v) => Math.min(v, Math.max(0, resolvedItems.length - 1)));
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> 삭제
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
