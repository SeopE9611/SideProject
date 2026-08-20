import type { ReactNode } from "react";

import SiteContainer from "@/components/layout/SiteContainer";
import { cn } from "@/lib/utils";

export type CommerceCatalogGuideItem = {
  label: string;
  description?: string;
};

type CommerceCatalogHeroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions: ReactNode;
  guideTitle: ReactNode;
  guideItems: CommerceCatalogGuideItem[];
};

export function CommerceCatalogHero({
  eyebrow,
  title,
  description,
  actions,
  guideTitle,
  guideItems,
}: CommerceCatalogHeroProps) {
  const hasEyebrow =
    eyebrow !== null &&
    eyebrow !== undefined &&
    eyebrow !== false;

  return (
    <header className="bg-background pt-4 bp-sm:pt-6 bp-md:pt-8">
      <SiteContainer
        variant="wide"
        className="bp-lg:max-w-[1600px] bp-xl:max-w-[1680px]"
      >
        <div className="grid min-w-0 gap-5 rounded-hero border border-border bg-card p-4 shadow-soft bp-sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-stretch lg:gap-8 lg:p-8">
          <div className="flex min-w-0 flex-col justify-center">
            {hasEyebrow ? (
              <p className="text-ui-label font-ui-medium uppercase tracking-[0.14em] text-brand-highlight-ink">
                {eyebrow}
              </p>
            ) : null}
            <h1
              className={cn(
                "break-keep text-balance font-brand-display text-[36px] leading-[1.05] tracking-normal text-foreground bp-sm:text-[44px] bp-md:text-[52px] lg:text-[56px] bp-lg:text-[64px]",
                hasEyebrow && "mt-3",
              )}
            >
              {title}
            </h1>
            <div className="mt-4 max-w-2xl break-words text-pretty text-ui-body font-ui-regular leading-relaxed text-muted-foreground bp-sm:text-ui-body-lg">
              {description}
            </div>
            <div className="mt-6 flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row bp-sm:flex-wrap">
              {actions}
            </div>
          </div>

          <section className="min-w-0 border-x-0 border-b-0 border-t border-border bg-transparent px-0 pb-0 pt-5 bp-sm:pt-6 lg:rounded-panel lg:border lg:bg-muted/20 lg:p-5" aria-labelledby="catalog-guide-title">
            <h2 id="catalog-guide-title" className="text-ui-card-title font-ui-medium text-foreground">
              {guideTitle}
            </h2>
            <ol className="mt-3 divide-y divide-border">
              {guideItems.map((item, index) => (
                <li key={`${index}-${item.label}`} className="flex min-w-0 gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-highlight-muted text-ui-label font-ui-medium text-brand-highlight-ink">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-ui-body-sm font-ui-medium text-foreground">
                      {item.label}
                    </p>
                    {item.description ? (
                      <p className="mt-0.5 break-words text-ui-label leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </SiteContainer>
    </header>
  );
}
