import MypagePrimaryNavigation from "@/app/mypage/_components/MypagePrimaryNavigation";
import AcademyApplicationDetailSkeleton from "@/app/mypage/academy-applications/[id]/_components/AcademyApplicationDetailSkeleton";
import SiteContainer from "@/components/layout/SiteContainer";
import StickyAside from "@/components/layout/StickyAside";
import { DashboardSectionPanel } from "@/components/public";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { GraduationCap } from "lucide-react";

export default function AcademyApplicationDetailLoading() {
  return (
    <div className="relative min-h-full bg-background">
      <div className="relative border-b border-border/70 bg-muted/10">
        <SiteContainer variant="wide" className="py-4 bp-sm:py-5 bp-lg:py-8">
          <section className="overflow-hidden rounded-hero border border-surface-inverse-foreground/15 bg-surface-inverse p-5 text-surface-inverse-foreground shadow-soft bp-sm:p-6 bp-lg:p-8" aria-busy="true" aria-live="polite">
            <span className="sr-only">마이페이지 아카데미 신청 상세 화면을 불러오는 중입니다.</span>
            <div className="grid gap-5 bp-md:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] bp-md:items-center bp-lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
              <div className="space-y-4">
                <Skeleton className="h-4 w-32 bg-surface-inverse-muted/25" />
                <Skeleton className="h-10 w-72 max-w-full bg-surface-inverse-muted/25" />
                <Skeleton className="h-5 w-56 max-w-full bg-surface-inverse-muted/25" />
              </div>
              <div className="rounded-panel border border-surface-inverse-foreground/15 bg-surface-inverse-muted/10 p-4 bp-sm:p-5">
                <Skeleton className="h-5 w-28 bg-surface-inverse-muted/25" />
                <Skeleton className="mt-4 h-16 w-20 bg-surface-inverse-muted/25" />
                <Skeleton className="mt-4 h-11 w-full bg-surface-inverse-muted/25" />
              </div>
            </div>
          </section>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-4 bp-sm:py-5 bp-lg:py-8">
        <div className="grid grid-cols-1 gap-6 bp-lg:grid-cols-4 bp-lg:gap-8">
          <div className="hidden bp-lg:block bp-lg:col-span-1">
            <StickyAside>
              <Card className="overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft">
                <CardContent className="space-y-2 p-3">
                  {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 w-full rounded-control" />)}
                </CardContent>
              </Card>
            </StickyAside>
          </div>

          <div className="bp-lg:col-span-3 min-w-0">
            <Tabs value="academy">
              <Card className="mb-3 overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft bp-sm:mb-4 bp-lg:hidden">
                <CardContent className="p-2">
                  <MypagePrimaryNavigation />
                </CardContent>
              </Card>

              <DashboardSectionPanel
                variant="feature"
                icon={<GraduationCap className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />}
                title="클래스 신청"
                description="신청 상태와 상담·수강 정보를 확인하세요."
              >
                <AcademyApplicationDetailSkeleton />
              </DashboardSectionPanel>
            </Tabs>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
