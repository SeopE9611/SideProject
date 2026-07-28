"use client";

import MypageDashboardHero from "@/app/mypage/_components/MypageDashboardHero";
import MypagePrimaryNavigation from "@/app/mypage/_components/MypagePrimaryNavigation";
import { UserSidebar } from "@/app/mypage/orders/_components/UserSidebar";
import SiteContainer from "@/components/layout/SiteContainer";
import StickyAside from "@/components/layout/StickyAside";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import type { ReactNode } from "react";
import useSWR from "swr";

const ACTIVE_TAB = "academy";

type MypageSummary = {
  ordersCount: number;
  applicationsCount: number;
  activityFlowCount: number;
  todoCount: number;
};

type MypageShellUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  oauthProviders?: Array<"kakao" | "naver">;
};

type Props = {
  user: MypageShellUser;
  children: ReactNode;
};

export default function AcademyApplicationMypageShell({ user, children }: Props) {
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useSWR<MypageSummary>("/api/mypage/summary", authenticatedSWRFetcher, {
    revalidateOnFocus: true,
  });

  const todoCount = summary?.todoCount ?? 0;
  const summaryState = summaryLoading ? "loading" : summaryError ? "error" : "ready";

  return (
    <div className="relative min-h-full bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.07] bp-xs:hidden bg-cross-line-pattern"
      />

      <div className="relative border-b border-border/70 bg-muted/10">
        <SiteContainer variant="wide" className="py-4 bp-sm:py-5 bp-lg:py-8">
          <MypageDashboardHero user={user} todoCount={todoCount} summaryState={summaryState} />
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-4 bp-sm:py-5 bp-lg:py-8">
        <div className="grid grid-cols-1 gap-6 bp-lg:grid-cols-4 bp-lg:gap-8">
          <div className="hidden bp-lg:block bp-lg:col-span-1">
            <StickyAside>
              <Card className="overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft">
                <CardContent className="p-3">
                  <UserSidebar activeTab={ACTIVE_TAB} />
                </CardContent>
              </Card>
            </StickyAside>
          </div>

          <div className="bp-lg:col-span-3 min-w-0">
            <Tabs value={ACTIVE_TAB}>
              <Card className="mb-3 overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft bp-sm:mb-4 bp-lg:hidden">
                <CardContent className="p-2">
                  <MypagePrimaryNavigation />
                </CardContent>
              </Card>

              <div className="min-w-0">{children}</div>
            </Tabs>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
