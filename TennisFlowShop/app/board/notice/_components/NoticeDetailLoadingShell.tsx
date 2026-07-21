import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, PublicSurface } from "@/components/public";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type NoticeDetailLoadingShellProps = {
  mode?: "notice" | "event";
};

export function NoticeDetailContentSkeleton() {
  return (
    <>
      <PublicSurface variant="feature" padding="none" className="overflow-hidden">
        <div className="h-1 bg-brand-highlight" aria-hidden="true" />
        <div className="space-y-4 bg-brand-highlight-muted/30 p-5 sm:p-6">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-10" />
          </div>
          <Skeleton className="h-9 w-4/5 max-w-3xl" />
          <div className="grid gap-2 sm:flex sm:gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        <div className="border-t border-border bg-card p-5 sm:p-6 md:p-8">
          <div className="max-w-3xl space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        <div className="border-t border-border p-5 sm:p-6 md:p-8">
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </PublicSurface>

      <PublicSurface padding="none" className="overflow-hidden">
        <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-3/4" />
          </div>
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
      </PublicSurface>
    </>
  );
}

export default function NoticeDetailLoadingShell({
  mode = "notice",
}: NoticeDetailLoadingShellProps) {
  const isEventMode = mode === "event";
  const sectionLabel = isEventMode ? "이벤트" : "공지사항";
  const pageTitle = isEventMode ? "고객센터 · 이벤트" : "고객센터 · 공지사항";
  const pageDescription = isEventMode
    ? "할인, 프로모션, 행사 소식을 확인하세요."
    : "도깨비테니스 고객센터의 주요 안내와 공지사항을 확인하세요.";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicPageHero
        variant="feature"
        eyebrow={<Badge variant="signal">{sectionLabel}</Badge>}
        title={pageTitle}
        description={pageDescription}
        actions={
          <>
            <Skeleton className="h-10 w-full bp-sm:w-32" />
            <Skeleton className="h-10 w-full bp-sm:w-28" />
          </>
        }
      />

      <SiteContainer className="space-y-5 py-7 sm:space-y-6 sm:py-9 md:py-10">
        <NoticeDetailContentSkeleton />
      </SiteContainer>
    </main>
  );
}
