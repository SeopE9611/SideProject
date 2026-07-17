import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public";
import { Skeleton } from "@/components/ui/skeleton";

const packageCardSkeletons = [
  { id: "starter", featured: false },
  { id: "regular", featured: true },
  { id: "pro", featured: false },
  { id: "champion", featured: false },
];

const packageUseStepSkeletons = ["select", "purchase", "use"];
const valueItemSkeletons = ["quality", "speed", "consulting", "management"];
const faqRowSkeletons = ["validity", "share", "refund", "usage"];
const featureRowSkeletons = ["feature-1", "feature-2", "feature-3"];
const compactMetaSkeletons = ["benefit", "validity"];

export default function ServicesPackagesLoading() {
  return (
    <div className="min-h-screen bg-background" aria-hidden="true">
      <section className="border-b border-border bg-muted/30 py-8 bp-sm:py-10">
        <SiteContainer>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-center">
            <div className="max-w-3xl space-y-4">
              <Skeleton className="h-6 w-32 rounded-control" />
              <div className="space-y-3">
                <Skeleton className="h-9 w-full max-w-2xl bp-sm:h-12" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full max-w-xl" />
                  <Skeleton className="h-5 w-4/5 max-w-lg" />
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row bp-sm:flex-wrap">
                <Skeleton className="h-11 w-full rounded-control bp-sm:w-40" />
                <Skeleton className="h-11 w-full rounded-control bp-sm:w-44" />
              </div>
            </div>

            <PublicSurface variant="inverse" padding="md" className="lg:justify-self-end">
              <Skeleton className="h-4 w-20 bg-surface-inverse-foreground/15" />
              <ol className="mt-4 space-y-3">
                {packageUseStepSkeletons.map((step, index) => (
                  <li key={step} className="flex min-w-0 items-center gap-3">
                    <Skeleton
                      className={`h-7 w-7 shrink-0 rounded-full ${
                        index === 0
                          ? "bg-brand-highlight"
                          : "bg-surface-inverse-foreground/15"
                      }`}
                    />
                    <Skeleton className="h-4 w-40 bg-surface-inverse-foreground/15" />
                  </li>
                ))}
              </ol>
            </PublicSurface>
          </div>
        </SiteContainer>
      </section>

      <section className="bg-background py-10 md:py-14">
        <SiteContainer variant="wide">
          <div className="mb-6 space-y-3 md:mb-8">
            <Skeleton className="h-6 w-28 rounded-control" />
            <Skeleton className="h-8 w-full max-w-lg" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>

          <div className="mx-auto grid max-w-[1500px] grid-cols-1 items-stretch gap-4 bp-sm:grid-cols-2 bp-lg:grid-cols-3 bp-2xl:grid-cols-4">
            {packageCardSkeletons.map((card) => (
              <PublicSurface
                key={card.id}
                padding="none"
                className={`flex h-full min-w-0 flex-col overflow-hidden ${
                  card.featured
                    ? "border-brand-highlight-ink/35 bg-brand-highlight-muted/35"
                    : "bg-card"
                }`}
              >
                <article className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                    <Skeleton className="h-7 min-w-0 flex-1" />
                    {card.featured && <Skeleton className="h-6 w-12 shrink-0 rounded-control" />}
                  </div>

                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="mt-2 h-10 w-24" />
                    </div>

                    <div className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-8 w-36" />
                      <Skeleton className="h-4 w-28" />
                    </div>

                    <dl className="grid gap-2 sm:grid-cols-2">
                      {compactMetaSkeletons.map((item) => (
                        <div
                          key={item}
                          className="rounded-control border border-border bg-muted/30 p-3"
                        >
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className="mt-2 h-4 w-full" />
                        </div>
                      ))}
                    </dl>
                  </div>

                  <ul className="mt-5 space-y-2">
                    {featureRowSkeletons.map((feature) => (
                      <li key={feature} className="flex min-w-0 gap-2">
                        <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
                        <Skeleton className="h-4 min-w-0 flex-1" />
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6">
                    <Skeleton className="h-10 w-full rounded-control" />
                  </div>
                </article>
              </PublicSurface>
            ))}
          </div>
        </SiteContainer>
      </section>

      <section className="bg-background py-10 md:py-14">
        <SiteContainer variant="wide">
          <PublicSurface variant="inverse" padding="lg">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div className="space-y-3">
                <Skeleton className="h-6 w-32 rounded-control bg-surface-inverse-foreground/15" />
                <Skeleton className="h-8 w-full max-w-md bg-surface-inverse-foreground/15" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full max-w-lg bg-surface-inverse-foreground/15" />
                  <Skeleton className="h-4 w-4/5 max-w-md bg-surface-inverse-foreground/15" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {valueItemSkeletons.map((item) => (
                  <div
                    key={item}
                    className="rounded-control border border-surface-inverse-foreground/15 bg-surface-inverse-foreground/5 p-4"
                  >
                    <Skeleton className="h-5 w-5 bg-surface-inverse-foreground/15" />
                    <Skeleton className="mt-3 h-4 w-20 bg-surface-inverse-foreground/15" />
                    <div className="mt-2 space-y-1.5">
                      <Skeleton className="h-3 w-full bg-surface-inverse-foreground/15" />
                      <Skeleton className="h-3 w-4/5 bg-surface-inverse-foreground/15" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PublicSurface>
        </SiteContainer>
      </section>

      <section className="bg-background py-10 md:py-14">
        <SiteContainer variant="wide">
          <div className="mb-8 flex flex-col items-center space-y-3 text-center md:mb-10">
            <Skeleton className="h-6 w-32 rounded-control" />
            <Skeleton className="h-8 w-full max-w-sm" />
            <Skeleton className="h-5 w-full max-w-xl" />
          </div>

          <PublicSurface className="mx-auto max-w-4xl" padding="md">
            <div className="divide-y divide-border">
              {faqRowSkeletons.map((row) => (
                <div key={row} className="flex items-center justify-between gap-4 py-4">
                  <Skeleton className="h-5 min-w-0 flex-1" />
                  <Skeleton className="h-5 w-5 shrink-0 rounded-control" />
                </div>
              ))}
            </div>
          </PublicSurface>

          <div className="mt-8 text-center md:mt-10">
            <Skeleton className="mx-auto h-11 w-full rounded-control sm:w-52" />
          </div>
        </SiteContainer>
      </section>
    </div>
  );
}
