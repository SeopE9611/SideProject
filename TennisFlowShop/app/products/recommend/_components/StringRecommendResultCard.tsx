import type { RecommendedStringProduct } from "@/app/products/recommend/_types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { stringBrandLabel, stringMaterialLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import Image from "next/image";
import Link from "next/link";

type StringRecommendResultCardProps = {
  result: RecommendedStringProduct;
  rank: number;
  careItemId?: string | null;
};

export default function StringRecommendResultCard({
  result,
  rank,
  careItemId,
}: StringRecommendResultCardProps) {
  const { product } = result;
  const productHref = careItemId
    ? `/products/${product.id}?from=apply&source=racket-care&careItemId=${encodeURIComponent(careItemId)}`
    : `/products/${product.id}?from=apply`;
  const regularPrice = Number(product.price ?? 0);
  const salePrice = Number(product.inventory?.salePrice ?? 0);
  const isSale = product.inventory?.isSale === true && salePrice > 0 && salePrice < regularPrice;
  const displayPrice = isSale ? salePrice : regularPrice;
  const saleRate =
    isSale && regularPrice > 0 ? Math.round(((regularPrice - salePrice) / regularPrice) * 100) : 0;
  const primaryGauge = product.gauge || product.gaugeOptions?.[0];

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-border/80 bg-card shadow-soft">
      <CardHeader className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={rank === 1 ? "signal" : "secondary"} className="shrink-0">추천 {rank}순위</Badge>
          {careItemId ? (
            <span className="break-keep text-ui-label text-muted-foreground">라켓 케어 기준</span>
          ) : null}
        </div>
        <div className="relative aspect-[5/4] w-full overflow-hidden rounded-xl bg-muted">
          {product.image ? (
            <Image src={product.image} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-ui-body-sm text-muted-foreground">
              이미지 없음
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <p className="break-keep text-ui-label text-muted-foreground">
            {stringBrandLabel(product.brand) || "브랜드 정보 없음"}
          </p>
          <CardTitle className="break-keep break-words text-ui-body leading-snug">
            {product.name}
          </CardTitle>
          {isSale ? (
            <div className="space-y-1 tabular-nums">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-ui-caption text-muted-foreground">할인가</span>
                <span className="text-ui-body-sm font-semibold">
                  {displayPrice.toLocaleString()}원
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-ui-caption text-muted-foreground">정가</span>
                <span className="text-ui-label text-muted-foreground line-through">
                  {regularPrice.toLocaleString()}원
                </span>
                <Badge variant="destructive" className="text-ui-micro">
                  {saleRate}% OFF
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-ui-body-sm font-semibold">{displayPrice.toLocaleString()}원</p>
          )}
          <p className="break-keep text-ui-label leading-relaxed text-muted-foreground">
            소재 {stringMaterialLabel(product.material) || "-"} · 게이지(굵기){" "}
            {formatGaugeLabel(primaryGauge) || "-"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
        <div className="flex flex-wrap gap-2">
          {result.badges.map((badge) => (
            <Badge key={badge} variant="outline" wrap="normal">
              {badge}
            </Badge>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="break-keep text-ui-body-sm font-medium">왜 이 스트링을 추천하나요?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ui-body-sm leading-relaxed text-muted-foreground">
            {result.reasons.map((reason) => (
              <li key={reason} className="break-keep">
                {reason}
              </li>
            ))}
          </ul>
        </div>
        {result.matchSummary && result.matchSummary.length > 0 ? (
          <div className="rounded-xl border border-border bg-background p-3 text-ui-body-sm leading-relaxed">
            <p className="break-keep font-medium">반영된 선택</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.matchSummary.map((item) => (
                <Badge
                  key={`${item.label}-${item.value}`}
                  variant="secondary"
                  wrap="normal"
                  className="font-normal"
                >
                  {item.label}: {item.value}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-ui-body-sm leading-relaxed">
          <p className="break-keep font-medium">
            {result.tensionRange.label}: {result.tensionRange.min}~{result.tensionRange.max} lbs
          </p>
          <p className="mt-1 break-keep leading-relaxed text-muted-foreground">
            {result.tensionRange.note}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-3 p-4 pt-0 sm:p-5 sm:pt-0">
        <div className="mt-1 w-full space-y-2">
          <Button asChild className="min-h-10 w-full overflow-hidden whitespace-nowrap">
            <Link href={productHref}>
              <span className="min-w-0 truncate">이 스트링으로 교체 신청하기</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="min-h-10 w-full overflow-hidden whitespace-nowrap"
          >
            <Link href={productHref}>
              <span className="min-w-0 truncate">상세 보기</span>
            </Link>
          </Button>
        </div>
        <p className="break-keep text-ui-label leading-relaxed text-muted-foreground">
          상세 페이지에서 재고와 스트링 정보를 확인한 뒤 교체서비스 신청을 이어서 진행할 수 있어요.
        </p>
      </CardFooter>
    </Card>
  );
}
