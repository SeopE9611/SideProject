import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero } from "@/components/public/PublicPageHero";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  mode?: "notice" | "event";
};

export default function NoticeListLoadingShell({ mode = "notice" }: Props) {
  const isEventMode = mode === "event";
  const pageTitle = isEventMode ? "고객센터 · 이벤트" : "고객센터 · 공지사항";
  const pageDescription = isEventMode
    ? "할인, 프로모션, 행사 소식을 확인하세요."
    : "도깨비테니스 고객센터의 주요 안내와 공지사항을 확인하실 수 있습니다.";
  const listTitle = isEventMode ? "이벤트 목록" : "공지사항 목록";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicPageHero
        variant="feature"
        eyebrow={
          <Badge variant={isEventMode ? "success" : "highlight"} className="rounded-control">
            {isEventMode ? "Event Board" : "Notice Board"}
          </Badge>
        }
        title={pageTitle}
        description={pageDescription}
        actions={
          <Button asChild variant="secondary" className="w-full rounded-control bp-sm:w-auto">
            <Link href="/support">
              <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
              고객센터 홈
            </Link>
          </Button>
        }
      />

      <SiteContainer
        className="space-y-5 py-6 sm:space-y-6 sm:py-8 md:py-10"
        aria-busy="true"
        aria-live="polite"
      >
        <PublicSurface variant="feature" padding="md" className="overflow-hidden">
          <div className="h-1 bg-brand-highlight" aria-hidden="true" />
          <div className="flex flex-col gap-3 bg-brand-highlight-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="space-y-2">
              <Skeleton className="h-6 w-20 rounded-control" />
              <SectionHeader title={listTitle} />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-16 w-32 rounded-control" />
          </div>
        </PublicSurface>

        <PublicSurface variant="feature" padding="md" className="shadow-soft">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-9 w-full sm:h-10 sm:w-[170px]" />
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:ml-auto lg:max-w-xl">
              <Skeleton className="h-9 min-w-0 flex-1 sm:h-10" />
              <Skeleton className="h-9 w-full sm:h-10 sm:w-16" />
            </div>
          </div>
        </PublicSurface>

        <PublicSurface variant="feature" padding="none" className="overflow-hidden shadow-soft">
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-9 rounded-full" />
                  <Skeleton className="h-5 min-w-0 flex-1" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        </PublicSurface>
      </SiteContainer>
    </main>
  );
}
