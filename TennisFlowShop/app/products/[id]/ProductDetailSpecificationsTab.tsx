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
  const displaySpecEntries = Object.entries(displaySpec).filter(([, value]) => value);

  return (
    <div className="space-y-4 bp-sm:space-y-6">
      <div className="mb-4 flex min-w-0 items-center gap-3 bp-sm:mb-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary text-foreground bp-sm:h-12 bp-sm:w-12">
          <Settings className="h-4 w-4 bp-sm:h-6 bp-sm:w-6" />
        </div>
        <h3 className="break-keep text-ui-section-title font-ui-bold leading-tight text-foreground bp-sm:text-ui-page-title">
          상세 스펙
        </h3>
      </div>

      {displaySpecEntries.length > 0 && (
        <div className="-mx-4 divide-y divide-border/60 border-y border-border/60 px-4 bp-sm:-mx-6 bp-sm:px-6 bp-md:mx-0 bp-md:grid bp-md:grid-cols-2 bp-md:gap-4 bp-md:divide-y-0 bp-md:border-y-0 bp-md:px-0">
          {displaySpecEntries.map(([key, value]) => {
            const displayValue = key === "색상" && selectedColorLabel ? selectedColorLabel : value;
            return (
              <div
                key={key}
                className="flex min-w-0 items-start justify-between gap-4 py-3 bp-md:rounded-xl bp-md:border bp-md:border-border bp-md:bg-muted/30 bp-md:p-4"
              >
                <span className="shrink-0 text-ui-body-sm font-ui-medium text-foreground bp-sm:text-ui-body">
                  {key}
                </span>
                <span className="min-w-0 break-words text-right text-ui-body-sm font-ui-medium text-muted-foreground bp-sm:text-ui-body">
                  {String(displayValue)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {isHybridMaterial && hybridSpec && (
        <section className="mt-4 space-y-3 bp-sm:mt-6 bp-sm:space-y-4">
          <div className="flex items-center gap-2 bp-sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary text-foreground bp-sm:h-10 bp-sm:w-10">
              <Settings className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
            </div>
            <h4 className="text-ui-card-title-lg font-ui-bold text-foreground bp-sm:text-ui-section-title">
              하이브리드 구성
            </h4>
          </div>

          <div className="-mx-4 divide-y divide-border/60 border-y border-border/60 px-4 bp-sm:-mx-6 bp-sm:px-6 bp-md:mx-0 bp-md:grid bp-md:grid-cols-2 bp-md:gap-4 bp-md:divide-y-0 bp-md:border-y-0 bp-md:px-0">
            <div className="py-3 bp-md:rounded-xl bp-md:border bp-md:border-border bp-md:bg-muted/30 bp-md:p-4">
              <div className="mb-0.5 text-ui-label text-muted-foreground bp-sm:mb-1 bp-sm:text-ui-body-sm">
                메인(Mains)
              </div>
              <div className="text-ui-body-sm font-ui-medium bp-sm:text-ui-body">
                {hMainBrand ?? ""} {hMain?.name ?? ""}
              </div>
              <div className="text-ui-label text-muted-foreground bp-sm:text-ui-body-sm">
                {hMainGauge ? `게이지(굵기): ${hMainGauge}` : null}
                {hMainColor ? ` · 색상: ${hMainColor}` : null}
              </div>
            </div>

            <div className="py-3 bp-md:rounded-xl bp-md:border bp-md:border-border bp-md:bg-muted/30 bp-md:p-4">
              <div className="mb-0.5 text-ui-label text-muted-foreground bp-sm:mb-1 bp-sm:text-ui-body-sm">
                크로스(Crosses)
              </div>
              <div className="text-ui-body-sm font-ui-medium bp-sm:text-ui-body">
                {hCrossBrand ?? ""} {hCross?.name ?? ""}
              </div>
              <div className="text-ui-label text-muted-foreground bp-sm:text-ui-body-sm">
                {hCrossGauge ? `게이지(굵기): ${hCrossGauge}` : null}
                {hCrossColor ? ` · 색상: ${hCrossColor}` : null}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
