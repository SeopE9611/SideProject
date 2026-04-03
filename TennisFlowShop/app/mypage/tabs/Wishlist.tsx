"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useWishlist } from "@/app/features/wishlist/useWishlist";
import { useCartStore } from "@/app/store/cartStore";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";

const LIMIT = 12;

export default function Wishlist() {
  const { items, remove, isLoading, hasDataError, hasResolvedData } =
    useWishlist();
  const addItem = useCartStore((s) => s.addItem);

  // '더 보기' 노출 개수
  const [visible, setVisible] = useState(LIMIT);

  const resolvedItems = items ?? [];
  const hasMore = useMemo(
    () => resolvedItems.length > visible,
    [resolvedItems.length, visible],
  );
  const visibleItems = useMemo(
    () => resolvedItems.slice(0, visible),
    [resolvedItems, visible],
  );

  // empty state는 로딩/에러가 아닌 실제 데이터 확정 후 length===0일 때만 노출한다.
  const shouldShowEmptyState =
    hasResolvedData &&
    !isLoading &&
    !hasDataError &&
    resolvedItems.length === 0;

  if (isLoading && !hasResolvedData) {
    return (
      <Card className="relative overflow-hidden border-0">
        <CardContent className="space-y-3 p-4 md:p-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`wishlist-loading-${idx}`}
              className="rounded-lg border border-border/50 p-3"
            >
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
      <Card className="relative overflow-hidden border-0">
        <CardContent className="p-8 md:p-12 text-center">
          <h3 className="mb-2 text-xl font-semibold">
            위시리스트를 불러오지 못했습니다
          </h3>
          <p className="text-muted-foreground">잠시 후 다시 시도해주세요.</p>
        </CardContent>
      </Card>
    );
  }

  if (shouldShowEmptyState) {
    return (
      <Card className="relative overflow-hidden border-0">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20">
            <Heart className="h-10 w-10" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">
            위시리스트가 비어있습니다
          </h3>
          <p className="mb-6 text-muted-foreground">
            마음에 드는 상품을 위시리스트에 추가해보세요!
          </p>
          <Button
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Link href="/products">상품 둘러보기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleItems.map((it) => (
          <Card
            key={it.id}
            className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <CardContent className="p-4">
              <Link href={`/products/${it.id}`} className="block">
                <div className="relative w-full h-40">
                  <Image
                    src={it.image || "/placeholder.svg"}
                    alt={it.name}
                    fill
                    sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
                    className="object-cover rounded-xl border shadow-sm"
                  />
                </div>
                <div className="mt-3">
                  <div className="font-medium line-clamp-2 hover:underline hover:text-primary dark:hover:text-primary transition-colors">
                    {it.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {it.price.toLocaleString()}원
                  </div>
                </div>
              </Link>

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  onClick={() => {
                    addItem({
                      id: it.id,
                      name: it.name,
                      price: it.price,
                      quantity: 1,
                      image: it.image,
                      stock: it.stock,
                    });
                    showSuccessToast("장바구니에 담았습니다.");
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" /> 담기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive hover:bg-destructive/10 dark:border-destructive dark:hover:bg-destructive/15 bg-transparent"
                  onClick={() => {
                    remove(it.id).catch(() => {
                      showErrorToast("위시리스트 삭제에 실패했습니다.");
                    });
                    // 현재 페이지에서 바로 사라지도록, 노출 개수 보정
                    setVisible((v) =>
                      Math.min(v, Math.max(0, resolvedItems.length - 1)),
                    );
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
            className="border-border hover:bg-primary/10 dark:hover:bg-primary/20 bg-transparent"
          >
            더 보기
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">
            마지막 페이지입니다
          </span>
        )}
      </div>
    </div>
  );
}
