import ProductFeatureRadarChart from "@/app/products/components/ProductFeatureRadarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ProductFeatureKey } from "@/lib/product-feature-score";
import { cn } from "@/lib/utils";
import { Activity, Target } from "lucide-react";

type ProductDetailRecommendationSectionProps = {
  selectedPlayerTypes: string[];
  selectedPlayStyles: string[];
  additionalFeaturesText: string;
  normalizedFeatureScores: Record<ProductFeatureKey, number>;
};

const detailSurfaceSubtleInnerClass =
  "border-y border-border/60 py-3 bp-md:rounded-xl bp-md:border bp-md:bg-muted/20 bp-md:p-3";
const detailSurfaceInfoItemClass =
  "flex min-w-0 items-center gap-3 py-3 bp-md:rounded-xl bp-md:border bp-md:border-border bp-md:bg-muted/20 bp-md:p-3";

export default function ProductDetailRecommendationSection({
  selectedPlayerTypes,
  selectedPlayStyles,
  additionalFeaturesText,
  normalizedFeatureScores,
}: ProductDetailRecommendationSectionProps) {
  return (
    <div className="-mx-3 mt-8 grid grid-cols-1 divide-y divide-border/60 border-y border-border bg-card bp-sm:-mx-4 bp-md:mx-0 bp-md:mt-10 bp-md:grid-cols-2 bp-md:gap-6 bp-md:divide-y-0 bp-md:border-y-0 bp-md:bg-transparent">
      <Card className="min-w-0 rounded-none border-0 bg-card shadow-none bp-md:rounded-panel bp-md:border bp-md:border-border bp-md:shadow-sm">
        <CardHeader className="p-4 pb-3 bp-sm:p-5 bp-sm:pb-4 bp-md:p-6 bp-md:pb-5">
          <CardTitle className="flex items-center gap-2.5 break-keep text-ui-card-title-lg font-ui-bold leading-snug text-foreground bp-sm:text-ui-section-title">
            <Target aria-hidden="true" className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
            추천 정보 & 특성
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0 bp-sm:space-y-6 bp-sm:p-5 bp-sm:pt-0 bp-md:p-6 bp-md:pt-0">
          <div>
            <h4 className="mb-3 break-keep text-ui-body-sm font-ui-bold text-foreground bp-sm:mb-4 bp-sm:text-ui-body">
              추천 대상
            </h4>
            <div className="divide-y divide-border/60 border-y border-border/60 bp-md:space-y-2.5 bp-md:divide-y-0 bp-md:border-y-0">
              {selectedPlayerTypes.length > 0 && (
                <div
                  className={cn(
                    "flex flex-col items-start gap-2 text-ui-body-sm bp-sm:flex-row bp-sm:items-start bp-sm:gap-3 bp-sm:text-ui-body",
                    detailSurfaceInfoItemClass,
                  )}
                >
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/70"></div>
                    <span className="shrink-0 whitespace-nowrap break-keep text-muted-foreground">
                      플레이어:
                    </span>
                  </div>
                  <span className="min-w-0 whitespace-normal break-keep break-words font-medium leading-relaxed text-foreground">
                    {selectedPlayerTypes.join(", ")}
                  </span>
                </div>
              )}
              {selectedPlayStyles.length > 0 && (
                <div
                  className={cn(
                    "flex flex-col items-start gap-2 text-ui-body-sm bp-sm:flex-row bp-sm:items-start bp-sm:gap-3 bp-sm:text-ui-body",
                    detailSurfaceInfoItemClass,
                  )}
                >
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/70"></div>
                    <span className="shrink-0 whitespace-nowrap break-keep text-muted-foreground">
                      스타일:
                    </span>
                  </div>
                  <span className="min-w-0 whitespace-normal break-keep break-words font-medium leading-relaxed text-foreground">
                    {selectedPlayStyles.join(", ")}
                  </span>
                </div>
              )}
              {selectedPlayerTypes.length === 0 && selectedPlayStyles.length === 0 && (
                <p className="py-3 text-ui-body-sm text-muted-foreground bp-sm:text-ui-body">
                  추천 대상 정보가 없습니다.
                </p>
              )}
            </div>
          </div>

          <div>
            <h4 className="mb-3 break-keep text-ui-body-sm font-ui-bold text-foreground bp-sm:mb-4 bp-sm:text-ui-body">
              추가 특성
            </h4>
            {additionalFeaturesText ? (
              <p
                className={cn(
                  "whitespace-pre-line break-keep break-words text-ui-body-sm leading-relaxed text-muted-foreground bp-sm:text-ui-body",
                  detailSurfaceSubtleInnerClass,
                )}
              >
                {additionalFeaturesText}
              </p>
            ) : (
              <p
                className={cn(
                  "text-ui-body-sm italic text-muted-foreground bp-sm:text-ui-body",
                  detailSurfaceSubtleInnerClass,
                )}
              >
                추가 특성 정보가 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 rounded-none border-0 bg-card shadow-none bp-md:rounded-panel bp-md:border bp-md:border-border bp-md:shadow-sm">
        <CardHeader className="p-4 pb-3 bp-sm:p-5 bp-sm:pb-4 bp-md:p-6 bp-md:pb-5">
          <CardTitle className="flex items-center gap-2.5 break-keep text-ui-card-title-lg font-ui-bold leading-snug text-foreground bp-sm:text-ui-section-title">
            <Activity aria-hidden="true" className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
            성능 특성
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 bp-sm:p-5 bp-sm:pt-0 bp-md:p-6 bp-md:pt-0">
          <ProductFeatureRadarChart scores={normalizedFeatureScores} />
        </CardContent>
      </Card>
    </div>
  );
}
