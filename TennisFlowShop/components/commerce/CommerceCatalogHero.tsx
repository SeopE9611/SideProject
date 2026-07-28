import type { ReactNode } from "react";

import SiteContainer from "@/components/layout/SiteContainer";

export type CommerceCatalogGuideItem = {
  label: string;
  description?: string;
};

type CommerceCatalogHeroProps = {
  eyebrow: ReactNode;
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
  return (
    <header className="bg-background pt-4 bp-sm:pt-6 bp-md:pt-8">
      <SiteContainer
        variant="wide"
        className="bp-lg:max-w-[1600px] bp-xl:max-w-[1680px]"
      >
        <div className="grid min-w-0 gap-6 rounded-hero border border-border bg-card p-5 shadow-soft bp-sm:p-6 bp-lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] bp-lg:items-stretch bp-lg:gap-8 bp-lg:p-8">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-ui-label font-ui-medium uppercase tracking-[0.14em] text-brand-highlight-ink">
              {eyebrow}
            </p>
            <h1 className="mt-3 break-words text-balance font-brand-display text-[40px] leading-[1.05] tracking-normal text-foreground bp-sm:text-ui-display bp-lg:text-ui-display-lg">
              {title}
            </h1>
            <div className="mt-4 max-w-2xl break-words text-pretty text-ui-body font-ui-regular leading-relaxed text-muted-foreground bp-sm:text-ui-body-lg">
              {description}
            </div>
            <div className="mt-6 flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row bp-sm:flex-wrap">
              {actions}
            </div>
          </div>

          <section className="min-w-0 rounded-panel border border-border bg-muted/20 p-4 bp-sm:p-5" aria-labelledby="catalog-guide-title">
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
