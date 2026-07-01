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

const detailSurfaceSubtleInnerClass = "rounded-xl border border-border bg-muted/20";
const detailSurfaceInfoItemClass =
  "flex min-w-0 items-center gap-3 rounded-xl border border-border bg-muted/20 p-3";

export default function ProductDetailRecommendationSection({
  selectedPlayerTypes,
  selectedPlayStyles,
  additionalFeaturesText,
  normalizedFeatureScores,
}: ProductDetailRecommendationSectionProps) {
  return (
    <div className="grid grid-cols-1 bp-md:grid-cols-2 gap-5 sm:gap-6 mt-8 sm:mt-10">
      <Card className="min-w-0 rounded-3xl border border-border bg-card shadow-sm">
        <CardHeader className="pb-4 sm:pb-5 p-5 sm:p-6">
          <CardTitle className="flex items-center gap-2.5 break-keep text-ui-card-title-lg font-semibold leading-snug text-foreground sm:text-ui-section-title">
            <Target className="h-5 w-5 sm:h-6 sm:w-6" />
            추천 정보 & 특성
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 sm:space-y-6 p-5 sm:p-6 pt-0">
          <div>
            <h4 className="mb-3 break-keep text-ui-body-sm font-semibold text-foreground sm:mb-4 sm:text-ui-body">
              추천 대상
            </h4>
            <div className="space-y-2 sm:space-y-2.5">
              {selectedPlayerTypes.length > 0 && (
                <div
                  className={cn(
                    "flex flex-col items-start gap-2 p-3 text-ui-body-sm sm:flex-row sm:items-start sm:gap-3 sm:text-ui-body",
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
                    "flex flex-col items-start gap-2 p-3 text-ui-body-sm sm:flex-row sm:items-start sm:gap-3 sm:text-ui-body",
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
            </div>
          </div>

          <div>
            <h4 className="mb-3 break-keep text-ui-body-sm font-semibold text-foreground sm:mb-4 sm:text-ui-body">
              추가 특성
            </h4>
            {additionalFeaturesText ? (
              <p
                className={cn(
                  "whitespace-pre-line break-keep break-words p-3 text-ui-body-sm leading-relaxed text-muted-foreground sm:text-ui-body",
                  detailSurfaceSubtleInnerClass,
                )}
              >
                {additionalFeaturesText}
              </p>
            ) : (
              <p
                className={cn(
                  "p-3 text-ui-body-sm italic text-muted-foreground sm:text-ui-body",
                  detailSurfaceSubtleInnerClass,
                )}
              >
                추가 특성 정보가 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 rounded-3xl border border-border bg-card shadow-sm">
        <CardHeader className="pb-4 sm:pb-5 p-5 sm:p-6">
          <CardTitle className="flex items-center gap-2.5 break-keep text-ui-card-title-lg font-semibold leading-snug text-foreground sm:text-ui-section-title">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
            성능 특성
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 pt-0">
          <ProductFeatureRadarChart scores={normalizedFeatureScores} />
        </CardContent>
      </Card>
    </div>
  );
}
