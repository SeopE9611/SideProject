"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { racketBrandLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { useInfiniteProducts } from "@/app/products/hooks/useInfiniteProducts";
import SiteContainer from "@/components/layout/SiteContainer";

import { CheckCircle2, ShoppingCart } from "lucide-react";

type RacketMini = {
  id: string;
  brand: string;
  model: string;
  condition: "A" | "B" | "C";
  image: string | null;
};

type GaugeInventoryRow = {
  value: string;
  label?: string;
  stock: number;
  isSoldOut: boolean;
};

function normalizeGaugeRows(product: any): GaugeInventoryRow[] {
  if (Array.isArray(product?.gaugeInventories) && product.gaugeInventories.length > 0) {
    return product.gaugeInventories
      .map((row: any) => {
        const stockNumber = Number(row?.stock ?? 0);
        return {
          value: String(row?.value ?? "").trim(),
          label: typeof row?.label === "string" ? row.label.trim() : undefined,
          stock: Number.isFinite(stockNumber) && stockNumber > 0 ? stockNumber : 0,
          isSoldOut: row?.isSoldOut === true,
        };
      })
      .filter((row: GaugeInventoryRow) => row.value.length > 0);
  }
  if (Array.isArray(product?.gaugeOptions) && product.gaugeOptions.length > 0) {
    const fallbackStock = Number(product?.inventory?.stock ?? 0);
    const normalizedFallbackStock = Number.isFinite(fallbackStock) && fallbackStock > 0 ? fallbackStock : 0;
    return product.gaugeOptions
      .map((value: unknown) => String(value ?? "").trim())
      .filter(Boolean)
      .map((value: string) => ({ value, stock: normalizedFallbackStock, isSoldOut: false }));
  }
  return [];
}

function getGaugeLabel(row: GaugeInventoryRow) {
  const rawLabel = String(row.label ?? "").trim();
  return rawLabel || formatGaugeLabel(row.value);
}

export default function RentalSelectStringClient({
  racket,
  period,
}: {
  racket: RacketMini;
  period: 7 | 15 | 30;
}) {
  const router = useRouter();
  const [selectedGaugeByStringId, setSelectedGaugeByStringId] = useState<Record<string, string>>({});

  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore } =
    useInfiniteProducts({
      limit: 6,
      purpose: "stringing",
    });

  const title = useMemo(() => {
    const brand = racketBrandLabel(racket.brand) ?? racket.brand;
    const condition = racket.condition ? `상태 ${racket.condition}` : "";
    return `${brand} ${racket.model}${condition ? ` · ${condition}` : ""}`;
  }, [racket.brand, racket.model, racket.condition]);

  const goCheckout = (stringId?: string, selectedGauge?: string) => {
    const base = `/rentals/${encodeURIComponent(racket.id)}/checkout?period=${period}`;
    const params = new URLSearchParams(`period=${period}`);
    if (stringId) params.set("stringId", stringId);
    if (selectedGauge) params.set("selectedGauge", selectedGauge);
    const url = `/rentals/${encodeURIComponent(racket.id)}/checkout?${params.toString()}`;
    router.push(url);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteContainer
        variant="wide"
        className="py-8 bp-md:py-12 space-y-8 bp-md:space-y-10"
      >
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-2xl bp-md:text-4xl font-bold tracking-normal text-foreground">
            스트링 선택
          </h1>
          <p className="text-sm bp-md:text-base text-muted-foreground leading-relaxed">
            대여 라켓에 장착할 스트링을 선택해주세요. 선택한 스트링은 대여
            결제에 포함됩니다.
          </p>
        </div>

        {/* Selected Racket Summary (구매 select-string과 동일 골격) */}
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-muted/30 rounded-full blur-3xl opacity-50 -z-0" />

            <div className="relative z-10 p-4 bp-md:p-6 flex gap-4 bp-md:gap-6 items-center">
              <div className="flex-shrink-0">
                {racket.image ? (
                  <img
                    src={racket.image || "/placeholder.svg"}
                    alt={title}
                    className="w-20 h-20 bp-md:w-24 bp-md:h-24 object-cover rounded-xl shadow-md ring-2 ring-border/60"
                  />
                ) : (
                  <div className="w-20 h-20 bp-md:w-24 bp-md:h-24 rounded-xl bg-muted/30 flex items-center justify-center shadow-md">
                    <ShoppingCart className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-success mb-1">
                      선택된 라켓 (대여)
                    </p>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      {title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      대여 기간:{" "}
                      <span className="font-semibold text-foreground">
                        {period}일
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Skip CTA (대여 전용) */}
              <div className="hidden bp-md:block flex-shrink-0">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => goCheckout()}
                >
                  스트링 없이 결제하기
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Skip CTA */}
          <div className="bp-md:hidden flex justify-center">
            <Button
              variant="outline"
              className="h-11 w-full max-w-xs"
              onClick={() => goCheckout()}
            >
              스트링 없이 결제하기
            </Button>
          </div>
        </div>

        {/* Strings */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground text-center">
            사용 가능한 스트링
          </h2>

          {isLoadingInitial ? (
            <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 gap-4 bp-md:gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card p-5 space-y-4"
                >
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : (products ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-base font-semibold text-foreground">사용 가능한 스트링이 없습니다.</p>
              <p className="mt-2 break-keep text-sm text-muted-foreground">스트링 상품의 장착 서비스 설정을 확인해주세요.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/services/apply">교체서비스 신청 화면으로 돌아가기</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 gap-4 bp-md:gap-6">
              {(products ?? []).map((p: any) => {
                const stringImage = p?.images?.[0] ?? p?.imageUrl;
                const id = String(p?._id ?? "");
                const gaugeRows = normalizeGaugeRows(p);
                const selectedGauge = selectedGaugeByStringId[id] ?? "";
                const selectedGaugeRow =
                  gaugeRows.find((row) => row.value === selectedGauge) ?? null;
                const hideGaugeStock = p?.inventory?.hideGaugeStock === true;
                const isGaugeRequired = gaugeRows.length > 0;
                const isGaugeSoldOut = selectedGaugeRow ? selectedGaugeRow.isSoldOut || selectedGaugeRow.stock <= 0 : false;
                const hasGaugeStockIssue = selectedGaugeRow ? selectedGaugeRow.stock < 1 : false;

                return (
                  <div
                    key={id}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="p-5 flex flex-col h-full">
                      {/* String Image */}
                      <div className="mb-4 rounded-xl overflow-hidden bg-muted/30 aspect-square flex items-center justify-center">
                        {stringImage ? (
                          <img
                            src={stringImage || "/placeholder.svg"}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                            이미지 없음
                          </div>
                        )}
                      </div>

                      {/* String Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                          {p.name}
                        </h3>
                        {p.shortDescription ? (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {p.shortDescription}
                          </p>
                        ) : null}
                        <p className="text-xl font-bold text-foreground">
                          {Number(p.price ?? 0).toLocaleString()}원
                        </p>

                        {isGaugeRequired ? (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium text-foreground">게이지 선택</p>
                            <Select
                              value={selectedGauge}
                              onValueChange={(value) =>
                                setSelectedGaugeByStringId((prev) => ({ ...prev, [id]: value }))
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="게이지를 선택해주세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {gaugeRows.map((row) => {
                                  const soldOut = row.isSoldOut || row.stock <= 0;
                                  const stockSuffix = soldOut
                                    ? " · 품절"
                                    : hideGaugeStock
                                      ? ""
                                      : ` · 재고 ${row.stock}개`;
                                  return (
                                    <SelectItem key={row.value} value={row.value} disabled={soldOut}>
                                      {`${getGaugeLabel(row)}${stockSuffix}`}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                      </div>

                      {/* Select Button */}
                      <Button
                        className="mt-4 w-full whitespace-normal break-keep bg-primary py-5 font-medium leading-tight text-primary-foreground transition-all duration-300 hover:bg-primary/90"
                        disabled={isGaugeRequired && (!selectedGauge || isGaugeSoldOut || hasGaugeStockIssue)}
                        onClick={() => {
                          if (isGaugeRequired && !selectedGauge) return alert("게이지를 선택해주세요.");
                          if (isGaugeSoldOut) return alert("선택한 게이지는 현재 품절입니다.");
                          if (hasGaugeStockIssue) return alert("선택한 게이지의 구매 가능 수량을 초과했습니다.");
                          goCheckout(id, selectedGauge || undefined);
                        }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          이 스트링 선택하고 대여 계속하기
                          <svg
                            className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </span>
                      </Button>
                      <p className="mt-2 px-1 text-center text-xs leading-relaxed text-muted-foreground break-keep">
                        선택 후 장착 정보 입력 단계로 이어집니다.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                className="w-full max-w-xs mx-auto h-11 border-border hover:bg-muted/60"
                onClick={loadMore}
                disabled={isFetchingMore}
              >
                {isFetchingMore ? (
                  <span className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    더 보기
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                )}
              </Button>
            </div>
          )}

          {!hasMore && (products ?? []).length > 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              마지막 상품입니다
            </p>
          ) : null}
        </div>
      </SiteContainer>
    </div>
  );
}
