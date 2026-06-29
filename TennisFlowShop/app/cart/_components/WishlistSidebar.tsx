"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWishlist } from "@/app/features/wishlist/useWishlist";
import { useCartStore } from "@/app/store/cartStore";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import clsx from "clsx";
import { useState } from "react";

type Props = {
  className?: string;
  variant?: "sidebar" | "inline"; // inline: 장바구니 목록 아래에 붙는 모드
};

export default function WishlistSidebar({ className, variant = "sidebar" }: Props) {
  const { items, clear, remove, isLoading, hasDataError, hasResolvedData } = useWishlist();
  const router = useRouter();
  const add = useCartStore((s) => s.addItem);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(id: string) {
    try {
      setRemovingId(id);
      await remove(id); // 서버 삭제 + SWR 갱신
    } catch {
      showErrorToast("위시리스트 삭제에 실패했습니다.");
    } finally {
      setRemovingId(null);
    }
  }

  const resolvedItems = items ?? [];
  // 사이드바 숨김은 실제 빈 데이터가 확정된 경우에만 허용한다.
  if (!isLoading && !hasDataError && hasResolvedData && resolvedItems.length === 0) return null;

  if (hasDataError) {
    return (
      <Card variant="muted" className={clsx("mt-6", className)}>
        <CardContent className="p-4 text-ui-body-sm text-muted-foreground">
          위시리스트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !hasResolvedData) {
    return (
      <Card variant="muted" className={clsx("mt-6", className)}>
        <CardContent className="p-4 text-ui-body-sm text-muted-foreground">
          위시리스트를 불러오는 중입니다.
        </CardContent>
      </Card>
    );
  }

  const title = `내 위시리스트${variant === "inline" ? ` (${resolvedItems.length}개)` : ""}`;
  const list = variant === "inline" ? resolvedItems : resolvedItems.slice(0, 5);

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

    const result = add({
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

  return (
    <Card variant="muted" className={clsx("mt-6", className)}>
      <CardHeader
        className={clsx(
          "rounded-t-lg",
          variant === "inline" && "bg-muted/50 dark:bg-card/40 border-b border-border",
        )}
      >
        <div className="flex flex-col items-start gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
          <CardTitle className="flex items-center gap-2 break-keep whitespace-nowrap">
            <Heart className="h-5 w-5 text-foreground" />
            {title}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              clear().catch(() => {
                showErrorToast("위시리스트 비우기에 실패했습니다.");
              });
            }}
            className="w-full justify-center border-border bg-transparent hover:bg-primary/10 bp-sm:w-auto dark:hover:bg-primary/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            위시리스트 비우기
          </Button>
        </div>
      </CardHeader>

      <CardContent className={variant === "inline" ? "p-0" : ""}>
        <div className={clsx(variant === "inline" ? "divide-y" : "space-y-3")}>
          {list.map((it) => (
            <div
              key={it.id}
              className={clsx(
                "flex items-center gap-4",
                variant === "inline" ? "p-4" : "p-3",
                "min-w-0", // 말줄임을 위해 필요
              )}
            >
              <Image
                src={it.image || "/placeholder.svg"}
                alt={it.name}
                width={56}
                height={56}
                className="h-14 w-14 rounded-xl border object-cover flex-shrink-0 shadow-sm"
              />
              {/* 이름/가격 영역 - 긴 이름은 말줄임 */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${it.id}`}
                  className="block line-clamp-2 break-keep text-ui-body-sm font-medium transition-colors hover:text-primary hover:underline"
                >
                  {it.name}
                </Link>
                <div className="text-ui-body-sm text-muted-foreground">{it.price.toLocaleString()}원</div>
                <div className="mt-1 space-y-0.5 text-ui-label text-muted-foreground">
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

              {/* 액션 버튼: 크기/간격 통일 */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 border-border bg-transparent p-0 hover:bg-primary/10 dark:hover:bg-primary/20"
                  onClick={() => handleAddToCart(it)}
                  disabled={it.requiresOption && it.hasSelectedOption && !it.optionAvailable}
                  aria-label={
                    it.requiresOption && !it.hasSelectedOption ? "옵션 선택" : "장바구니에 담기"
                  }
                  title={
                    it.requiresOption && !it.hasSelectedOption ? "옵션 선택" : "장바구니에 담기"
                  }
                  // remove(it.id); -> 자동삭제 전용 (지워서 활성화 시켜도됨)
                >
                  <ShoppingCart className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-muted-foreground hover:bg-destructive/10 dark:hover:bg-destructive/15 hover:text-destructive"
                  onClick={() => handleRemove(it.id)}
                  disabled={removingId === it.id}
                  aria-label="위시리스트에서 삭제"
                  title="위시리스트에서 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
