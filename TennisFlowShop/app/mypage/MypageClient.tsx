"use client";

import OrdersScopeTabs, {
  resolveOrdersScopeContext,
} from "@/app/mypage/_components/OrdersScopeTabs";
import { UserSidebar } from "@/app/mypage/orders/_components/UserSidebar";
import UserSection from "@/app/mypage/UserSection";
import SiteContainer from "@/components/layout/SiteContainer";
import { DashboardSectionPanel, SummaryCard } from "@/components/public";
import { TabPanelSkeleton } from "@/components/system/loading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  ClipboardList,
  GraduationCap,
  Heart,
  MessageCircleQuestion,
  MessageSquare,
  ReceiptCent,
  Ticket,
  Wrench,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import useSWR from "swr";

const ApplicationDetail = dynamic(
  () => import("@/app/mypage/applications/_components/ApplicationDetail"),
  { loading: () => <TabPanelSkeleton rowCount={3} /> },
);
const OrderDetailClient = dynamic(
  () => import("@/app/mypage/orders/_components/OrderDetailClient"),
  { loading: () => <TabPanelSkeleton rowCount={4} /> },
);
const RentalsDetailClient = dynamic(
  () => import("@/app/mypage/rentals/_components/RentalsDetailClient"),
  { loading: () => <TabPanelSkeleton rowCount={3} /> },
);
const AcademyApplicationsTab = dynamic(() => import("@/app/mypage/tabs/AcademyApplicationsTab"), {
  loading: () => <TabPanelSkeleton rowCount={4} />,
});
const MyPointsTab = dynamic(() => import("@/app/mypage/tabs/MyPointsTab"), {
  loading: () => <TabPanelSkeleton rowCount={4} />,
});
const TransactionFlowList = dynamic(() => import("@/app/mypage/tabs/TransactionFlowList"), {
  loading: () => <TabPanelSkeleton rowCount={5} />,
});
const PassList = dynamic(() => import("@/app/mypage/tabs/PassList"), {
  loading: () => <TabPanelSkeleton rowCount={4} />,
});
const QnAList = dynamic(() => import("@/app/mypage/tabs/QnAList"), {
  loading: () => <TabPanelSkeleton rowCount={4} />,
});
const ReviewList = dynamic(() => import("@/app/mypage/tabs/ReviewList"), {
  loading: () => <TabPanelSkeleton rowCount={4} />,
});
const Wishlist = dynamic(() => import("@/app/mypage/tabs/Wishlist"), {
  loading: () => <TabPanelSkeleton rowCount={4} />,
});

const MYPAGE_TABS = [
  "orders",
  "academy",
  "wishlist",
  "reviews",
  "qna",
  "passes",
  "points",
] as const;

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    oauthProviders?: Array<"kakao" | "naver">;
  };
};

export default function MypageClient({ user }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useSWR<{
    ordersCount: number;
    applicationsCount: number;
    activityFlowCount: number;
    academyActiveApplicationsCount: number;
    todoCount: number;
    racketCare?: { count: number; nearestState: "good" | "prepare" | "due" | null; nearestDaysRemaining: number | null };
  }>("/api/mypage/summary", authenticatedSWRFetcher, {
    revalidateOnFocus: true,
  });
  const hasSummaryError = !!summaryError;

  const resolveOrdersScope = (scope: string | null) => {
    if (
      scope === "all" ||
      scope === "todo" ||
      scope === "order" ||
      scope === "application" ||
      scope === "rental"
    ) {
      return scope;
    }
    return null;
  };

  const resolveFlowBackUrl = (_from: string | null, scope: string | null) => {
    const params = new URLSearchParams();
    params.set("tab", "orders");
    const resolvedScope = resolveOrdersScope(scope);
    if (resolvedScope) params.set("scope", resolvedScope);
    return `/mypage?${params.toString()}`;
  };

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    let changed = false;

    const legacyTab = searchParams.get("tab");
    const legacyApplicationId = searchParams.get("applicationId");
    const legacyRentalId = searchParams.get("rentalId");
    const from = searchParams.get("from");

    if (
      !legacyTab ||
      legacyTab === "activity" ||
      legacyTab === "applications" ||
      legacyTab === "rentals" ||
      !MYPAGE_TABS.includes(legacyTab as (typeof MYPAGE_TABS)[number])
    ) {
      nextParams.set("tab", "orders");
      changed = true;
    }

    if (!searchParams.get("flowType") && !searchParams.get("flowId")) {
      if (legacyApplicationId) {
        nextParams.set("flowType", "application");
        nextParams.set("flowId", legacyApplicationId);
        changed = true;
      } else if (legacyRentalId) {
        nextParams.set("flowType", "rental");
        nextParams.set("flowId", legacyRentalId);
        changed = true;
      }
    }

    if (legacyApplicationId || legacyRentalId) {
      nextParams.delete("applicationId");
      nextParams.delete("rentalId");
      changed = true;
    }

    if (from === "activity") {
      nextParams.set("from", "orders");
      changed = true;
    }

    if (!changed) return;

    const query = nextParams.toString();
    router.replace(query ? `/mypage?${query}` : "/mypage", { scroll: false });
  }, [router, searchParams]);

  if (!user) {
    return (
      <SiteContainer variant="wide" className="py-10">
        <Card className="border-border bg-card">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardContent>
        </Card>
      </SiteContainer>
    );
  }

  const tabParam = searchParams.get("tab");
  const currentTab = MYPAGE_TABS.includes(tabParam as (typeof MYPAGE_TABS)[number])
    ? tabParam!
    : "orders";

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());

    // 현재 탭 변경
    newParams.set("tab", value);

    // 탭 전환 시, 다른 도메인의 상세 id는 정리
    if (value !== "orders") {
      newParams.delete("orderId");
      newParams.delete("flowType");
      newParams.delete("flowId");
      newParams.delete("from");
      newParams.delete("scope");
    }
    newParams.delete("applicationId");
    newParams.delete("rentalId");

    router.push(`/mypage?${newParams.toString()}`, { scroll: false });
  };

  const orderId = searchParams.get("orderId");
  const selectedApplicationId = searchParams.get("applicationId");
  const selectedRentalId = searchParams.get("rentalId");
  const flowType = searchParams.get("flowType");
  const flowId = searchParams.get("flowId");
  const from = searchParams.get("from");
  const scope = searchParams.get("scope");
  const flowBackUrl = resolveFlowBackUrl(from, scope);
  const isOrdersTab = currentTab === "orders";
  const hasOrderFlowDetail = Boolean((flowType === "order" && flowId) || orderId);
  const hasApplicationFlowDetail = Boolean(
    (flowType === "application" && flowId) || selectedApplicationId,
  );
  const hasRentalFlowDetail = Boolean((flowType === "rental" && flowId) || selectedRentalId);
  const isOrdersDetailView =
    isOrdersTab && (hasOrderFlowDetail || hasApplicationFlowDetail || hasRentalFlowDetail);
  const detailScopeFallback = hasApplicationFlowDetail
    ? "application"
    : hasRentalFlowDetail
      ? "rental"
      : "order";
  const activeOrdersScope = resolveOrdersScopeContext(flowBackUrl, detailScopeFallback);

  const sidebarCardClass = "overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft";
  const todoCount = summary?.todoCount ?? 0;
  const hasTodoItems = !summaryLoading && todoCount > 0;
  const activitySummaryItems = [
    {
      label: "거래/이용",
      value: summary?.activityFlowCount,
      href: "/mypage?tab=orders",
    },
    {
      label: "서비스",
      value: summary?.applicationsCount,
      href: "/mypage?tab=orders&scope=application",
    },
    {
      label: "주문",
      value: summary?.ordersCount,
      href: "/mypage?tab=orders&scope=order",
    },
    {
      label: "클래스",
      value: summary?.academyActiveApplicationsCount,
      href: "/mypage?tab=academy",
    },
  ];

  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border/60 bg-background">
        <SiteContainer
          variant="wide"
          className="space-y-3 py-4 bp-sm:space-y-4 bp-sm:py-5 bp-lg:py-6"
        >
          <UserSection user={user} />

          <div className="grid gap-3 bp-lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
            <SummaryCard
              variant="feature"
              className="transition-colors hover:bg-muted/20"
              contentClassName="p-4 bp-sm:p-5"
            >
              <button
                type="button"
                onClick={() =>
                  router.push("/mypage?tab=orders&scope=todo", {
                    scroll: false,
                  })
                }
                className="group w-full rounded-xl bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/30 bp-sm:px-5 bp-sm:py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ui-label font-semibold uppercase tracking-[0.14em] text-primary">
                      해야 할 일
                    </p>
                    <h2 className="mt-1 break-keep text-ui-card-title-lg font-semibold text-foreground bp-sm:text-ui-section-title">
                      {summaryLoading ? (
                        <span className="block">
                          <Skeleton className="h-6 w-40" />
                        </span>
                      ) : hasTodoItems ? (
                        `확인할 항목 ${todoCount}개`
                      ) : (
                        "현재 처리할 일이 없습니다"
                      )}
                    </h2>
                    <p className="mt-1 line-clamp-2 break-keep text-ui-body-sm text-muted-foreground">
                      {hasTodoItems
                        ? "후기, 배송, 확정이 필요한 내역만 모았습니다."
                        : "새로 처리할 내역이 없습니다."}
                    </p>
                  </div>

                  <Badge
                    variant={hasTodoItems ? "warning" : "success"}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {hasTodoItems ? "확인하기" : "완료"}
                  </Badge>
                </div>
              </button>
            </SummaryCard>

            <SummaryCard
              variant="inverse"
              className="transition-colors"
              contentClassName="p-4 bp-sm:p-5"
            >
              <button
                type="button"
                onClick={() => router.push("/mypage/racket-care")}
                className="group flex min-h-24 w-full items-center gap-3 rounded-xl bg-surface-inverse-muted/10 px-4 py-3 text-left transition-colors hover:bg-surface-inverse-muted/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="rounded-control bg-brand-highlight-muted p-2 text-brand-highlight">
                  <Wrench className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-ui-label font-semibold text-surface-inverse-muted">라켓 케어</span>
                  <span className="mt-1 block break-keep text-ui-body-sm font-medium text-surface-inverse-foreground">
                    {summaryLoading
                      ? "불러오는 중"
                      : `${summary?.racketCare?.count ?? 0}개 등록 · ${summary?.racketCare?.nearestState === "due" ? "교체 권장" : summary?.racketCare?.nearestState === "prepare" ? "교체 준비" : "관리 시작"}`}
                  </span>
                  <span className="mt-0.5 block break-keep text-ui-label text-surface-inverse-muted">
                    다음 스트링 교체 시점을 확인해보세요.
                  </span>
                </span>
              </button>
            </SummaryCard>

            <SummaryCard
              className="rounded-panel border-border/80 shadow-soft bp-lg:col-span-2"
              contentClassName="px-4 py-3 bp-sm:px-5 bp-sm:py-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-ui-body-sm font-semibold text-foreground">내 활동</p>
                {hasSummaryError ? (
                  <span className="text-ui-label text-muted-foreground">일부 지표 오류</span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 bp-sm:grid-cols-4">
                {activitySummaryItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => router.push(item.href, { scroll: false })}
                    className="min-w-0 rounded-xl bg-muted/15 px-2 py-3 text-center transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bp-sm:py-2.5"
                  >
                    <span className="block text-ui-body font-semibold tabular-nums text-foreground">
                      {summaryLoading ? "-" : (item.value ?? 0)}
                    </span>
                    <span className="mt-0.5 block break-keep text-ui-label text-muted-foreground">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </SummaryCard>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-4 bp-sm:py-5 bp-lg:py-8">
        <div className="grid grid-cols-1 gap-6 bp-lg:grid-cols-4 bp-lg:gap-8">
          <div className="hidden bp-lg:block bp-lg:col-span-1">
            <div className="sticky top-8">
              <Card className={sidebarCardClass}>
                <CardContent className="p-3">
                  <UserSidebar />
                </CardContent>
              </Card>
            </div>
          </div>
          {/* 메인 콘텐츠 */}
          <div className="bp-lg:col-span-3 min-w-0">
            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <Card className="mb-3 overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft bp-sm:mb-4 bp-lg:hidden">
                <CardContent className="p-2.5 bp-sm:p-3">
                  <p className="mb-2 px-1 text-ui-label font-medium text-muted-foreground">
                    내 상세 내역
                  </p>
                  <div>
                    <TabsList className="grid h-auto w-full grid-cols-4 gap-1 bg-muted/40 p-1 bp-md:grid-cols-7 bp-md:gap-1.5 bp-lg:w-full">
                      <TabsTrigger
                        value="orders"
                        className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center leading-tight text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50 dark:data-[state=active]:bg-card bp-md:gap-1.5 bp-md:px-2.5 bp-md:py-2.5"
                      >
                        <ClipboardList className="h-4 w-4 bp-md:h-5 bp-md:w-5" />
                        <span className="text-center text-ui-label font-medium leading-tight break-keep bp-md:text-ui-body-sm">
                          <span className="bp-lg:hidden">거래/이용</span>
                          <span className="hidden bp-lg:inline">거래/이용 내역</span>
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="academy"
                        className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center leading-tight text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50 dark:data-[state=active]:bg-card bp-md:gap-1.5 bp-md:px-2.5 bp-md:py-2.5"
                      >
                        <GraduationCap className="h-4 w-4 bp-md:h-5 bp-md:w-5" />
                        <span className="text-center text-ui-label font-medium leading-tight break-keep bp-md:text-ui-body-sm">
                          <span className="bp-lg:hidden">클래스</span>
                          <span className="hidden bp-lg:inline">클래스 신청</span>
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="wishlist"
                        className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center leading-tight text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50 dark:data-[state=active]:bg-card bp-md:gap-1.5 bp-md:px-2.5 bp-md:py-2.5"
                      >
                        <Heart className="h-4 w-4 bp-md:h-5 bp-md:w-5" />
                        <span className="text-center text-ui-label font-medium leading-tight break-keep bp-md:text-ui-body-sm">
                          <span className="bp-lg:hidden">찜</span>
                          <span className="hidden bp-lg:inline">찜한 상품</span>
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="reviews"
                        className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center leading-tight text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50 dark:data-[state=active]:bg-card bp-md:gap-1.5 bp-md:px-2.5 bp-md:py-2.5"
                      >
                        <MessageSquare className="h-4 w-4 bp-md:h-5 bp-md:w-5" />
                        <span className="text-center text-ui-label font-medium leading-tight break-keep bp-md:text-ui-body-sm">
                          <span className="bp-lg:hidden">리뷰</span>
                          <span className="hidden bp-lg:inline">리뷰 관리</span>
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="qna"
                        className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center leading-tight text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50 dark:data-[state=active]:bg-card bp-md:gap-1.5 bp-md:px-2.5 bp-md:py-2.5"
                      >
                        <MessageCircleQuestion className="h-4 w-4 bp-md:h-5 bp-md:w-5" />
                        <span className="text-center text-ui-label font-medium leading-tight break-keep bp-md:text-ui-body-sm">
                          <span className="bp-lg:hidden">문의</span>
                          <span className="hidden bp-lg:inline">문의 내역</span>
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="passes"
                        className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center leading-tight text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50 dark:data-[state=active]:bg-card bp-md:gap-1.5 bp-md:px-2.5 bp-md:py-2.5"
                      >
                        <Ticket className="h-4 w-4 bp-md:h-5 bp-md:w-5" />
                        <span className="text-center text-ui-label font-medium leading-tight bp-md:text-ui-body-sm">
                          패키지권
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="points"
                        className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center leading-tight text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50 dark:data-[state=active]:bg-card bp-md:gap-1.5 bp-md:px-2.5 bp-md:py-2.5"
                      >
                        <ReceiptCent className="h-4 w-4 bp-md:h-5 bp-md:w-5" />
                        <span className="text-center text-ui-label font-medium leading-tight break-keep bp-md:text-ui-body-sm">
                          <span className="bp-lg:hidden">포인트</span>
                          <span className="hidden bp-lg:inline">적립 포인트</span>
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </CardContent>
              </Card>

              {/* 거래 내역 탭 */}
              <TabsContent value="orders" className="mt-0">
                <DashboardSectionPanel
                  icon={<ClipboardList className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />}
                  title="거래/이용 내역"
                  description="상태와 다음 행동을 확인하세요."
                >
                  {isOrdersDetailView ? (
                    <OrdersScopeTabs
                      activeScope={activeOrdersScope}
                      className="mb-4 bp-sm:mb-5"
                    />
                  ) : null}
                  {isOrdersTab && flowType === "order" && flowId ? (
                    <OrderDetailClient orderId={flowId} backUrl={flowBackUrl} />
                  ) : isOrdersTab && flowType === "application" && flowId ? (
                    <ApplicationDetail id={flowId} backUrl={flowBackUrl} />
                  ) : isOrdersTab && flowType === "rental" && flowId ? (
                    <RentalsDetailClient id={flowId} backUrl={flowBackUrl} />
                  ) : isOrdersTab && orderId ? (
                    <OrderDetailClient orderId={orderId} backUrl={flowBackUrl} />
                  ) : isOrdersTab && selectedApplicationId ? (
                    <ApplicationDetail id={selectedApplicationId} backUrl={flowBackUrl} />
                  ) : isOrdersTab && selectedRentalId ? (
                    <RentalsDetailClient id={selectedRentalId} backUrl={flowBackUrl} />
                  ) : isOrdersTab ? (
                    <TransactionFlowList />
                  ) : null}
                </DashboardSectionPanel>
              </TabsContent>

              {/* 클래스 신청 탭 */}
              <TabsContent value="academy" className="mt-0">
                <DashboardSectionPanel
                  icon={<GraduationCap className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />}
                  title="클래스 신청"
                  description="도깨비테니스 아카데미 클래스 신청 내역을 확인하세요."
                >
                  {currentTab === "academy" ? <AcademyApplicationsTab /> : null}
                </DashboardSectionPanel>
              </TabsContent>

              {/* 위시리스트 탭 */}
              <TabsContent value="wishlist" className="mt-0">
                <DashboardSectionPanel
                  icon={<Heart className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />}
                  title="위시리스트"
                  description="찜한 상품 목록을 확인하실 수 있습니다."
                >
                  {currentTab === "wishlist" ? <Wishlist /> : null}
                </DashboardSectionPanel>
              </TabsContent>

              {/* 리뷰 관리 탭 */}
              <TabsContent value="reviews" className="mt-0">
                <DashboardSectionPanel
                  icon={<MessageSquare className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />}
                  title="리뷰 관리"
                  description="작성한 리뷰를 확인하고 관리하실 수 있습니다."
                >
                  {currentTab === "reviews" ? <ReviewList /> : null}
                </DashboardSectionPanel>
              </TabsContent>

              {/* 문의 내역 탭 */}
              <TabsContent value="qna" className="mt-0">
                <DashboardSectionPanel
                  icon={<MessageCircleQuestion className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />}
                  title="문의 내역"
                  description="문의 내역을 확인하고 답변을 받으실 수 있습니다."
                >
                  {currentTab === "qna" ? <QnAList /> : null}
                </DashboardSectionPanel>
              </TabsContent>

              {/* 패키지권 탭 */}
              <TabsContent value="passes" className="mt-0">
                <DashboardSectionPanel
                  icon={<Ticket className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />}
                  title="패키지권"
                  description="보유 중인 패키지권을 확인하실 수 있습니다."
                >
                  {currentTab === "passes" ? <PassList /> : null}
                </DashboardSectionPanel>
              </TabsContent>

              {/* 적립 포인트 탭 */}
              <TabsContent value="points" className="mt-0">
                <DashboardSectionPanel
                  icon={<ReceiptCent className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />}
                  title="적립 포인트"
                  description="포인트 적립 및 사용 내역을 확인하실 수 있습니다."
                >
                  {currentTab === "points" ? <MyPointsTab /> : null}
                </DashboardSectionPanel>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
