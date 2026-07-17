import CheckoutPageHeader from "@/components/checkout/CheckoutPageHeader";
import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type CheckoutLoadingShellProps = {
  layout?: "linear" | "aside";
  sectionKeys?: readonly string[];
  className?: string;
};

const defaultLinearKeys = ["items", "delivery", "recipient", "payment", "agreements", "confirm"] as const;
const defaultAsideKeys = ["package", "applicant", "guide", "payment", "agreements"] as const;

function SectionSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft">
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
        <Skeleton className="h-10 w-full rounded-control" />
        {!compact && <Skeleton className="h-10 w-4/5 rounded-control" />}
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
      <CheckoutPageHeader
        eyebrow={<Skeleton className="h-3 w-28" />}
        title={<Skeleton className="h-8 w-44" />}
        description={<Skeleton className="h-4 w-72 max-w-full" />}
      />
      <SiteContainer variant="wide" className="py-6 bp-sm:py-10">
        {layout === "aside" ? (
          <div className="grid gap-6 pb-[calc(96px+env(safe-area-inset-bottom))] bp-lg:grid-cols-[minmax(0,1fr)_360px] bp-lg:pb-0">
            <div className="space-y-5 bp-sm:space-y-6">
              {keys.map((key) => (
                <SectionSkeleton key={key} />
              ))}
            </div>
            <div className="hidden bp-lg:block">
              <div className="sticky top-[calc(var(--header-h,0px)+24px)] overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft">
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
          <div className="mx-auto w-full max-w-6xl space-y-5 pb-[calc(96px+env(safe-area-inset-bottom))] bp-sm:space-y-6 lg:pb-0">
            {keys.map((key) => (
              <SectionSkeleton key={key} compact={key === "agreements"} />
            ))}
          </div>
        )}
      </SiteContainer>
    </div>
  );
}
