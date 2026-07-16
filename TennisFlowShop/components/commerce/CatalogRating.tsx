import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { average: number; count: number; size?: "sm" | "md" | "lg"; showAverage?: boolean };
export function CatalogRating({ average, count, size = "sm", showAverage = true }: Props) {
  const safeAvg = Number.isFinite(average) ? average : 0; const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  return <div className={cn("flex min-w-0 items-center gap-1 text-muted-foreground", size === "lg" ? "text-ui-body-sm" : "text-ui-label")} aria-label={`평점 ${safeAvg.toFixed(1)}점, 후기 ${safeCount}개`}><Star className={cn("fill-brand-highlight text-brand-highlight", size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5")} />{showAverage ? <span className="tabular-nums text-foreground">{safeAvg.toFixed(1)}</span> : null}<span className="whitespace-nowrap tabular-nums">({safeCount})</span></div>;
}
