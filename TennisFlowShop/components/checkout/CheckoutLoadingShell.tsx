import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type CheckoutLoadingShellProps = {
  layout?: "linear" | "aside";
  sectionKeys?: readonly string[];
  className?: string;
};

const defaultLinearKeys = [
  "items",
  "delivery",
  "recipient",
  "payment",
  "agreements",
  "confirm",
] as const;
const defaultAsideKeys = ["package", "applicant", "guide", "payment", "agreements"] as const;

function HeaderSkeleton() {
  return (
    <header aria-hidden="true" className="border-b border-border/80 bg-muted/30 text-foreground">
      <SiteContainer variant="wide" className="py-4 bp-sm:py-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col gap-4 bp-md:flex-row bp-md:items-end bp-md:justify-between">
            <div className="flex min-w-0 items-start gap-3 bp-sm:gap-4">
              <div className="min-w-0">
                <div className="font-ui-bold leading-tight tracking-tight">
                  <Skeleton className="h-8 w-44" />
                </div>

                <div className="mt-2 max-w-3xl leading-relaxed">
                  <Skeleton className="h-4 w-72 max-w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SiteContainer>
    </header>
  );
}

function SectionSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="-mx-3 overflow-hidden border-y border-border/80 bg-card shadow-none bp-sm:mx-0 bp-sm:rounded-panel bp-sm:border bp-sm:shadow-soft">
      <div className="border-b border-border/80 bg-muted/20 px-4 py-4 bp-sm:px-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-control" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>
      </div>
      <div className="space-y-3 p-4 bp-sm:p-6">
        <Skeleton className={cn("w-full rounded-control", compact ? "h-12" : "h-16")} />
        <Skeleton className="h-11 w-full rounded-control" />
        {!compact && <Skeleton className="h-11 w-4/5 rounded-control" />}
      </div>
    </div>
  );
}

export default function CheckoutLoadingShell({
  layout = "linear",
  sectionKeys,
  className,
}: CheckoutLoadingShellProps) {
  const keys = sectionKeys ?? (layout === "aside" ? defaultAsideKeys : defaultLinearKeys);

  return (
    <div aria-hidden="true" className={cn("min-h-full bg-background", className)}>
      <HeaderSkeleton />
      <SiteContainer variant="wide" className="py-6 bp-sm:py-10">
        {layout === "aside" ? (
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-y-5 pb-[calc(96px+env(safe-area-inset-bottom))] bp-sm:gap-y-6 bp-lg:grid-cols-[minmax(0,1fr)_360px] bp-lg:items-start bp-lg:gap-x-8 bp-lg:pb-0">
            <div className="space-y-5 bp-sm:space-y-6">
              {keys.map((key) => (
                <SectionSkeleton key={key} />
              ))}
            </div>
            <div className="-mx-3 bp-sm:mx-0 bp-lg:sticky bp-lg:top-[calc(var(--header-h,0px)+16px)] bp-lg:self-start">
              <div className="overflow-hidden rounded-none border-y border-border/80 border-x-0 bg-card shadow-none bp-sm:rounded-panel bp-sm:border bp-sm:shadow-soft">
                <div className="border-b border-border/80 bg-muted/20 p-5">
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="space-y-4 p-5">
                  <Skeleton className="h-20 w-full rounded-control" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-12 w-full rounded-control" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-6xl space-y-5 pb-[calc(96px+env(safe-area-inset-bottom))] bp-sm:space-y-6 bp-lg:pb-0">
            {keys.map((key) => (
              <SectionSkeleton key={key} compact={key === "agreements"} />
            ))}
          </div>
        )}
      </SiteContainer>
    </div>
  );
}
