import { cn } from "@/lib/utils";
import { CommerceBadge } from "@/components/badges/CommerceBadge";

type Props = {
  regularPrice: number;
  salePrice?: number | null;
  label?: string;
  align?: "start" | "end";
  size?: "card" | "list" | "detail";
};
export function CatalogPrice({
  regularPrice,
  salePrice,
  label,
  align = "start",
  size = "card",
}: Props) {
  const isSale = salePrice != null && salePrice > 0 && salePrice < regularPrice;
  const displayPrice = isSale ? salePrice : regularPrice;
  const saleRate =
    isSale && regularPrice > 0 ? Math.round(((regularPrice - salePrice!) / regularPrice) * 100) : 0;
  const accessiblePrice = isSale
    ? `${label ? `${label} ` : ""}${displayPrice.toLocaleString()}원, 정상가 ${regularPrice.toLocaleString()}원, ${saleRate}% 할인`
    : `${label ? `${label} ` : ""}${displayPrice.toLocaleString()}원`;
  return (
    <div
      className={cn("min-w-0 space-y-1", align === "end" && "text-right")}
      aria-label={accessiblePrice}
    >
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1",
          align === "end" && "justify-end",
        )}
      >
        {label ? <span className="text-ui-label text-muted-foreground">{label}</span> : null}
        <span
          className={cn(
            "whitespace-nowrap tabular-nums font-ui-medium text-foreground",
            size === "detail"
              ? "text-ui-price-lg"
              : size === "list"
                ? "text-ui-price-lg"
                : "text-ui-price",
          )}
        >
          {displayPrice.toLocaleString()}원
        </span>
        {isSale ? <CommerceBadge kind="sale" surface="inline" discountRate={saleRate} /> : null}
      </div>
      {isSale ? (
        <div
          className={cn(
            "whitespace-nowrap tabular-nums text-ui-label text-muted-foreground line-through",
            align === "end" && "text-right",
          )}
        >
          {regularPrice.toLocaleString()}원
        </div>
      ) : null}
    </div>
  );
}
