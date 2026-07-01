import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

type ProductDetailSpecificationsTabProps = {
  displaySpec: Record<string, any>;
  selectedColorLabel?: string;
  isHybridMaterial: boolean;
  hybridSpec: any;
  hMain: any;
  hCross: any;
  hMainBrand?: string;
  hCrossBrand?: string;
  hMainGauge?: string;
  hCrossGauge?: string;
  hMainColor?: string;
  hCrossColor?: string;
};

export default function ProductDetailSpecificationsTab({
  displaySpec,
  selectedColorLabel,
  isHybridMaterial,
  hybridSpec,
  hMain,
  hCross,
  hMainBrand,
  hCrossBrand,
  hMainGauge,
  hCrossGauge,
  hMainColor,
  hCrossColor,
}: ProductDetailSpecificationsTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex min-w-0 items-center gap-3 mb-5 sm:mb-6">
        <div className="w-10 sm:w-12 h-10 sm:h-12 border border-border/60 bg-secondary text-foreground rounded-lg flex items-center justify-center">
          <Settings className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        <h3 className="break-keep text-ui-section-title font-semibold leading-tight text-foreground sm:text-ui-page-title">
          상세 스펙
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {Object.entries(displaySpec)
          .filter(([, value]) => value)
          .map(([key, value]) => {
            const displayValue = key === "색상" && selectedColorLabel ? selectedColorLabel : value;
            return (
              <div key={key} className="rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4">
                <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <span className="font-semibold text-foreground text-ui-body-sm sm:text-ui-body">
                    {key}
                  </span>
                  <span className="min-w-0 break-words text-left text-muted-foreground font-medium text-ui-body-sm sm:text-right sm:text-ui-body">
                    {String(displayValue)}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
      {isHybridMaterial && hybridSpec && (
        <Card className="mt-4 sm:mt-6 border-0 bg-transparent shadow-none">
          <CardContent className="p-0">
            {/* 상세 스펙 그리드(파란 그라데이션 카드)와 톤 통일 */}
            <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 sm:w-10 h-9 sm:h-10 border border-border/60 bg-secondary text-foreground rounded-lg flex items-center justify-center">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <h4 className="text-ui-card-title-lg sm:text-ui-section-title font-semibold text-foreground">
                  하이브리드 구성
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* 메인 */}
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4">
                  <div className="text-ui-label sm:text-ui-body-sm text-muted-foreground mb-0.5 sm:mb-1">
                    메인(Mains)
                  </div>
                  <div className="font-medium text-ui-body-sm sm:text-ui-body">
                    {hMainBrand ?? ""} {hMain?.name ?? ""}
                  </div>
                  <div className="text-ui-label sm:text-ui-body-sm text-muted-foreground">
                    {hMainGauge ? `게이지(굵기): ${hMainGauge}` : null}
                    {hMainColor ? ` · 색상: ${hMainColor}` : null}
                  </div>
                </div>

                {/* 크로스 */}
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4">
                  <div className="text-ui-label sm:text-ui-body-sm text-muted-foreground mb-0.5 sm:mb-1">
                    크로스(Crosses)
                  </div>
                  <div className="font-medium text-ui-body-sm sm:text-ui-body">
                    {hCrossBrand ?? ""} {hCross?.name ?? ""}
                  </div>
                  <div className="text-ui-label sm:text-ui-body-sm text-muted-foreground">
                    {hCrossGauge ? `게이지(굵기): ${hCrossGauge}` : null}
                    {hCrossColor ? ` · 색상: ${hCrossColor}` : null}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
