import type { RecommendedStringProduct } from "@/app/products/recommend/_types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { stringBrandLabel, stringMaterialLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import Image from "next/image";
import Link from "next/link";

type StringRecommendResultCardProps = {
  result: RecommendedStringProduct;
  rank: number;
};

export default function StringRecommendResultCard({
  result,
  rank,
}: StringRecommendResultCardProps) {
  const { product } = result;
  const productHref = `/products/${product.id}?from=apply`;
  const regularPrice = Number(product.price ?? 0);
  const salePrice = Number(product.inventory?.salePrice ?? 0);
  const isSale =
    product.inventory?.isSale === true &&
    salePrice > 0 &&
    salePrice < regularPrice;
  const displayPrice = isSale ? salePrice : regularPrice;
  const saleRate = Math.round(
    ((regularPrice - salePrice) / regularPrice) * 100,
  );

  return (
    <Card className="rounded-2xl">
      <CardHeader className="space-y-3">
        <Badge className="w-fit">TOP {rank}</Badge>
        <div className="relative aspect-[5/4] w-full overflow-hidden rounded-xl bg-muted">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              이미지 없음
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {stringBrandLabel(product.brand) || "브랜드 정보 없음"}
          </p>
          <CardTitle className="mt-1 text-base">{product.name}</CardTitle>
          {isSale ? (
            <div className="mt-2 space-y-1 tabular-nums">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-muted-foreground">
                  할인가
                </span>
                <span className="text-sm font-semibold">
                  {displayPrice.toLocaleString()}원
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">정가</span>
                <span className="text-xs text-muted-foreground line-through">
                  {regularPrice.toLocaleString()}원
                </span>
                <Badge variant="destructive" className="text-[10px]">
                  {saleRate}% OFF
                </Badge>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold">
              {displayPrice.toLocaleString()}원
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            소재 {stringMaterialLabel(product.material) || "-"} · 게이지{" "}
            {formatGaugeLabel(product.gauge) || "-"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {result.badges.map((badge) => (
            <Badge key={badge} variant="outline">
              {badge}
            </Badge>
          ))}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium">
            {result.tensionRange.label}: {result.tensionRange.min}~
            {result.tensionRange.max} lbs
          </p>
          <p className="mt-1 text-muted-foreground">
            {result.tensionRange.note}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
        <div className="mt-1 w-full space-y-2">
          <Button asChild className="w-full">
            <Link href={productHref}>이 스트링으로 교체서비스 신청</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={productHref}>상세 보기</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          상세 페이지에서 스트링 정보를 확인한 뒤 교체서비스 신청을 이어서
          진행할 수 있어요.
        </p>
      </CardFooter>
    </Card>
  );
}
