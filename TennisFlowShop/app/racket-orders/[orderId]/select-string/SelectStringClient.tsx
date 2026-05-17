"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useInfiniteProducts } from "@/app/products/hooks/useInfiniteProducts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type SelectableStringProduct = {
  _id: string;
  name?: string;
  price?: number;
  mountingFee?: number;
};

export default function SelectStringClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const {
    products,
    isLoadingInitial,
    isFetchingMore,
    hasMore,
    loadMore,
    error,
  } = useInfiniteProducts({ limit: 6, purpose: "stringing" });

  const mountableProducts = products.filter((product) =>
    typeof (product as SelectableStringProduct).mountingFee === "number" &&
    Number.isFinite((product as SelectableStringProduct).mountingFee) &&
    Number((product as SelectableStringProduct).mountingFee) >= 0,
  );

  // 스트링 선택 핸들러: 주문은 건드리지 않고 단순히 "선택 정보"만 들고 신청 페이지로 이동
  const handleSelectString = async (productId: string) => {
    // 중복 클릭 방지
    if (addingProductId) return;

    setAddingProductId(productId);

    try {
      // 주문에 스트링을 추가하지 않고,
      //    orderId + productId 만 쿼리로 넘겨서
      //    /services/apply 쪽에서 productId 기준 mini API로 공임/가격을 확정한다.
      router.push(`/services/apply?orderId=${orderId}&productId=${productId}`);
    } finally {
      setAddingProductId(null);
    }
  };

  if (isLoadingInitial) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border bg-card p-3 space-y-3"
          >
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-destructive">
        목록을 불러오는 중 오류가 발생했습니다. {error}
      </div>
    );
  }

  if (!mountableProducts || mountableProducts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">사용 가능한 스트링이 없습니다.</p>
        <p className="mt-1">장착 가능한 스트링 상품 설정을 확인하거나, 교체서비스 신청 화면으로 돌아가 다시 진행해주세요.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="default"
            onClick={() => router.push(`/services/apply?orderId=${orderId}`)}
          >
            교체서비스 신청 화면으로
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/products?from=apply")}
          >
            스트링 목록으로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mountableProducts.map((p: SelectableStringProduct) => {
          const isAdding = addingProductId === p._id;

          return (
            <div
              key={p._id}
              data-cy="racket-string-option"
              className="flex h-full flex-col rounded-lg border border-border bg-card p-3 text-left text-foreground transition hover:border-primary"
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-muted-foreground">
                {typeof p.price === "number"
                  ? `${p.price.toLocaleString()}원`
                  : "가격 정보 없음"}
              </div>
              {typeof p.mountingFee === "number" && (
                <div className="mt-1 text-xs text-muted-foreground">
                  장착비: {p.mountingFee.toLocaleString()}원
                </div>
              )}
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                선택한 스트링은 기존 라켓 주문과 연결되어 교체서비스 신청에 사용됩니다.
              </p>
              <Button
                type="button"
                data-cy="racket-string-select-button"
                disabled={!!addingProductId}
                className="mt-auto min-h-10 w-full h-auto whitespace-normal break-keep text-center leading-tight"
                onClick={() => handleSelectString(p._id)}
              >
                {isAdding ? "이동 중…" : "이 스트링 선택하고 신청 계속하기"}
              </Button>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            data-cy="racket-string-load-more"
            onClick={loadMore}
            disabled={isFetchingMore || !!addingProductId}
            className="w-full border-border bg-card text-foreground"
          >
            {isFetchingMore ? (
              <Skeleton className="mx-auto h-4 w-20" />
            ) : (
              "더 보기"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
