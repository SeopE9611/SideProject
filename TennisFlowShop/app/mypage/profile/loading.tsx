import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-full bg-background" aria-busy="true" aria-live="polite">
      <div className="border-b border-border/60 bg-brand-muted/30">
        <SiteContainer className="space-y-3 py-8 md:py-12">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-full max-w-md" />
        </SiteContainer>
      </div>
      <SiteContainer className="py-8 md:py-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex gap-2 overflow-hidden rounded-panel border border-border/80 bg-muted/40 p-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 min-w-24 flex-1" />
            ))}
          </div>
          <section className="rounded-panel border border-border/80 bg-card shadow-soft">
            <div className="space-y-3 border-b border-border/70 bg-brand-muted/30 p-5">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="space-y-5 p-5 md:p-8">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="ml-auto h-11 w-28" />
            </div>
          </section>
        </div>
      </SiteContainer>
      <span className="sr-only">회원 정보 화면을 불러오는 중입니다.</span>
    </div>
  );
}
