import { cn } from "@/lib/utils";

type Props = { regularPrice: number; salePrice?: number | null; label?: string; align?: "start" | "end"; size?: "card" | "list" | "detail" };
export function CatalogPrice({ regularPrice, salePrice, label, align = "start", size = "card" }: Props) {
  const isSale = salePrice != null && salePrice > 0 && salePrice < regularPrice;
  const displayPrice = isSale ? salePrice : regularPrice;
  const saleRate = isSale && regularPrice > 0 ? Math.round(((regularPrice - salePrice!) / regularPrice) * 100) : 0;
  return <div className={cn("min-w-0 space-y-1", align === "end" && "text-right")} aria-label={`${label ? `${label} ` : ""}${displayPrice.toLocaleString()}원`}><div className={cn("flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1", align === "end" && "justify-end")} >{label ? <span className="text-ui-label text-muted-foreground">{label}</span> : null}<span className={cn("whitespace-nowrap tabular-nums font-semibold text-foreground", size === "detail" ? "text-ui-price-lg" : size === "list" ? "text-ui-price-lg" : "text-ui-price")}>{displayPrice.toLocaleString()}원</span>{isSale ? <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-ui-label font-semibold text-foreground">{saleRate}%</span> : null}</div>{isSale ? <div className={cn("whitespace-nowrap tabular-nums text-ui-label text-muted-foreground line-through", align === "end" && "text-right")}>{regularPrice.toLocaleString()}원</div> : null}</div>;
}
