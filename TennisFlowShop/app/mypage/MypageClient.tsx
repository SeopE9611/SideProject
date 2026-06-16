"use client";

import OrdersScopeTabs, {
  resolveOrdersScopeContext,
} from "@/app/mypage/_components/OrdersScopeTabs";
import UserSection from "@/app/mypage/UserSection";
import { UserSidebar } from "@/app/mypage/orders/_components/UserSidebar";
import SiteContainer from "@/components/layout/SiteContainer";
import { TabPanelSkeleton } from "@/components/system/loading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSocialProviderBadgeSpec } from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  ClipboardList,
  GraduationCap,
  Heart,
  ListTodo,
  MessageCircleQuestion,
  MessageSquare,
  ReceiptCent,
  Target,
  Ticket,
  Trophy,
  User,
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
const AcademyApplicationsTab = dynamic(
  () => import("@/app/mypage/tabs/AcademyApplicationsTab"),
  { loading: () => <TabPanelSkeleton rowCount={4} /> },
);
const MyPointsTab = dynamic(() => import("@/app/mypage/tabs/MyPointsTab"), {
  loading: () => <TabPanelSkeleton rowCount={4} />,
});
const TransactionFlowList = dynamic(
  () => import("@/app/mypage/tabs/TransactionFlowList"),
  { loading: () => <TabPanelSkeleton rowCount={5} /> },
);
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

  const buildFlowFromQuery = (from: string | null, scope: string | null) => {
    if (from !== "orders") return "";
    const params = new URLSearchParams();
    params.set("from", from);
    const resolvedScope = resolveOrdersScope(scope);
    if (resolvedScope) params.set("scope", resolvedScope);
    return `&${params.toString()}`;
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
  const currentTab = MYPAGE_TABS.includes(
    tabParam as (typeof MYPAGE_TABS)[number],
  )
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
  const flowFromQuery = buildFlowFromQuery(from, scope);
  const ordersFlowFromQuery = buildFlowFromQuery("orders", scope);
  const isOrdersTab = currentTab === "orders";
  const hasOrderFlowDetail = Boolean(
    (flowType === "order" && flowId) || orderId,
  );
  const hasApplicationFlowDetail = Boolean(
    (flowType === "application" && flowId) || selectedApplicationId,
  );
  const hasRentalFlowDetail = Boolean(
    (flowType === "rental" && flowId) || selectedRentalId,
  );
  const isOrdersDetailView =
    isOrdersTab &&
    (hasOrderFlowDetail || hasApplicationFlowDetail || hasRentalFlowDetail);
  const detailScopeFallback = hasApplicationFlowDetail
    ? "application"
    : hasRentalFlowDetail
      ? "rental"
      : "order";
  const activeOrdersScope = resolveOrdersScopeContext(
    flowBackUrl,
    detailScopeFallback,
  );

  // 페이지 톤 클래스 분류(대시보드 카드, 탭 헤더, 아이콘 배경)
  const pageTone = {
    dashboardPanel: "border-b border-border bg-background",
    sectionHeader: "border-b border-border bg-muted/50 p-4 bp-sm:p-6",
    iconSurface:
      "rounded-xl border border-border bg-muted p-2.5 bp-sm:rounded-2xl bp-sm:p-3",
  };
  const todoCount = summary?.todoCount ?? 0;
  const hasTodoItems = !summaryLoading && todoCount > 0;
  const todoCardDescription = hasTodoItems ? "바로 확인" : "처리 완료";

  return (
    <div className="min-h-full bg-background">
      <div className={pageTone.dashboardPanel}>
        <SiteContainer
          variant="wide"
          className="space-y-5 py-6 bp-sm:space-y-6 bp-sm:py-8 bp-lg:py-10"
        >
          <UserSection user={user} />

          <div className="grid gap-4 bp-lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] bp-lg:items-stretch">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm bp-sm:p-5 bp-lg:p-6">
              <div className="mb-4 flex min-w-0 flex-col gap-1 bp-sm:flex-row bp-sm:items-end bp-sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">내 이용 요약</p>
                  <h2 className="mt-1 break-keep text-xl font-semibold text-foreground bp-sm:text-2xl">
                    주요 활동을 빠르게 확인하세요
                  </h2>
                </div>
                {hasSummaryError ? (
                  <p className="text-xs text-muted-foreground">
                    일부 지표를 불러오지 못했습니다.
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2 bp-xl:grid-cols-4">
                <div className="flex h-full min-h-[132px] flex-col rounded-xl border border-border bg-muted/40 p-4">
                  <Trophy className="mb-4 h-5 w-5 text-primary" />
                  <div className="mt-auto">
                    <div className="text-2xl font-semibold text-foreground">
                      {summaryLoading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        (summary?.activityFlowCount ?? "-")
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      전체 이용 내역
                    </div>
                  </div>
                </div>
                <div className="flex h-full min-h-[132px] flex-col rounded-xl border border-border bg-muted/40 p-4">
                  <Target className="mb-4 h-5 w-5 text-primary" />
                  <div className="mt-auto">
                    <div className="text-2xl font-semibold text-foreground">
                      {summaryLoading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        (summary?.applicationsCount ?? "-")
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      교체서비스 신청
                    </div>
                  </div>
                </div>
                <div className="flex h-full min-h-[132px] flex-col rounded-xl border border-border bg-muted/40 p-4">
                  <ClipboardList className="mb-4 h-5 w-5 text-primary" />
                  <div className="mt-auto">
                    <div className="text-2xl font-semibold text-foreground">
                      {summaryLoading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        (summary?.ordersCount ?? "-")
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      상품 주문
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    router.push("/mypage?tab=academy", { scroll: false })
                  }
                  className="group flex h-full min-h-[132px] flex-col rounded-xl border border-border bg-muted/40 p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="클래스 신청 내역으로 이동"
                >
                  <GraduationCap className="mb-4 h-5 w-5 text-primary transition-transform group-hover:scale-105" />
                  <div className="mt-auto">
                    <div className="text-2xl font-semibold text-foreground">
                      {summaryLoading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        (summary?.academyActiveApplicationsCount ?? "-")
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      클래스 신청
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/mypage?tab=orders&scope=todo", { scroll: false })
              }
              className={`group flex h-full min-h-[220px] flex-col rounded-2xl border p-5 text-left shadow-sm transition-colors bp-lg:p-6 ${
                hasTodoItems
                  ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                  : "border-border bg-card hover:bg-muted/40"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-xl border border-border bg-card p-3">
                  <ListTodo className="h-5 w-5 text-primary" />
                </div>
                <Badge
                  variant={hasTodoItems ? "default" : "secondary"}
                  className="whitespace-nowrap"
                >
                  {todoCardDescription}
                </Badge>
              </div>
              <div className="mt-auto pt-8">
                <p className="text-sm font-medium text-primary">지금 처리할 일</p>
                <h2 className="mt-2 break-keep text-2xl font-semibold text-foreground">
                  {summaryLoading ? (
                    <span className="block space-y-2">
                      <Skeleton className="h-8 w-40" />
                      <Skeleton className="h-4 w-56 max-w-full" />
                    </span>
                  ) : hasTodoItems ? (
                    `확인할 항목 ${todoCount}개`
                  ) : (
                    "현재 처리할 일이 없습니다"
                  )}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  입금 대기, 운송장 등록, 구매확정, 리뷰 작성, 클래스 신청
                  상태를 모아 보여드립니다.
                </p>
              </div>
            </button>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-lg:py-12">
        <div className="grid grid-cols-1 gap-6 bp-lg:grid-cols-4 bp-lg:gap-8">
          <div className="hidden bp-lg:block bp-lg:col-span-1">
            <div className="sticky top-8">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted rounded-2xl p-3 ring-1 ring-ring/20">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="line-clamp-2 break-words text-lg leading-tight">
                        {user.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="min-w-0 break-all text-sm text-foreground">
                          {user.email}
                        </span>
                        {user.oauthProviders?.length ? (
                          <>
                            {user.oauthProviders.includes("kakao") && (
                              <Badge
                                variant={
                                  getSocialProviderBadgeSpec("kakao").variant
                                }
                                className="text-xs py-0 px-2 h-5"
                              >
                                카카오
                              </Badge>
                            )}
                            {user.oauthProviders.includes("naver") && (
                              <Badge
                                variant={
                                  getSocialProviderBadgeSpec("naver").variant
                                }
                                className="text-xs py-0 px-2 h-5"
                              >
                                네이버
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            이메일 계정
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <UserSidebar />
                </CardContent>
              </Card>
            </div>
          </div>
          {/* 메인 콘텐츠 */}
          <div className="bp-lg:col-span-3 min-w-0">
            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <Card className="mb-5 border-border bg-card shadow-sm bp-sm:mb-6 bp-lg:hidden">
                <CardContent className="p-3 bp-sm:p-4">
                  <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                    내 상세 내역
                  </p>
                  <div className="overflow-x-auto pb-1">
                    <TabsList className="inline-grid h-auto min-w-max grid-cols-7 gap-1 bg-muted p-1 bp-sm:gap-1.5 bp-lg:w-full">
                      <TabsTrigger
                        value="orders"
                        className="flex min-w-[88px] flex-col items-center gap-1 px-2 py-2.5 whitespace-nowrap leading-tight data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:bg-card bp-sm:gap-1.5 bp-sm:px-3 bp-sm:py-3"
                      >
                        <ClipboardList className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-center text-xs font-medium leading-tight break-keep bp-sm:text-sm">
                          <span className="bp-lg:hidden">거래/이용</span>
                          <span className="hidden bp-lg:inline">
                            거래/이용 내역
                          </span>
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="academy"
                        className="flex min-w-[88px] flex-col items-center gap-1 px-2 py-2.5 whitespace-nowrap leading-tight data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:bg-card bp-sm:gap-1.5 bp-sm:px-3 bp-sm:py-3"
                      >
                        <GraduationCap className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-center text-xs font-medium leading-tight break-keep bp-sm:text-sm">
                          <span className="bp-lg:hidden">클래스</span>
                          <span className="hidden bp-lg:inline">
                            클래스 신청
                          </span>
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="wishlist"
                        className="flex min-w-[88px] flex-col items-center gap-1 px-2 py-2.5 whitespace-nowrap leading-tight data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:bg-card bp-sm:gap-1.5 bp-sm:px-3 bp-sm:py-3"
                      >
                        <Heart className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-center text-xs font-medium leading-tight break-keep bp-sm:text-sm">
                          <span className="bp-lg:hidden">찜</span>
                          <span className="hidden bp-lg:inline">찜한 상품</span>
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="reviews"
                        className="flex min-w-[88px] flex-col items-center gap-1 px-2 py-2.5 whitespace-nowrap leading-tight data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:bg-card bp-sm:gap-1.5 bp-sm:px-3 bp-sm:py-3"
                      >
                        <MessageSquare className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-center text-xs font-medium leading-tight break-keep bp-sm:text-sm">
                          <span className="bp-lg:hidden">리뷰</span>
                          <span className="hidden bp-lg:inline">리뷰 관리</span>
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="qna"
                        className="flex min-w-[88px] flex-col items-center gap-1 px-2 py-2.5 whitespace-nowrap leading-tight data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:bg-card bp-sm:gap-1.5 bp-sm:px-3 bp-sm:py-3"
                      >
                        <MessageCircleQuestion className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-center text-xs font-medium leading-tight break-keep bp-sm:text-sm">
                          <span className="bp-lg:hidden">Q&A</span>
                          <span className="hidden bp-lg:inline">Q&A 내역</span>
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="passes"
                        className="flex min-w-[88px] flex-col items-center gap-1 px-2 py-2.5 whitespace-nowrap leading-tight data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:bg-card bp-sm:gap-1.5 bp-sm:px-3 bp-sm:py-3"
                      >
                        <Ticket className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-center text-xs font-medium leading-tight bp-sm:text-sm">
                          패키지
                        </span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="points"
                        className="flex min-w-[88px] flex-col items-center gap-1 px-2 py-2.5 whitespace-nowrap leading-tight data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:bg-card bp-sm:gap-1.5 bp-sm:px-3 bp-sm:py-3"
                      >
                        <ReceiptCent className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-center text-xs font-medium leading-tight break-keep bp-sm:text-sm">
                          <span className="bp-lg:hidden">포인트</span>
                          <span className="hidden bp-lg:inline">
                            적립 포인트
                          </span>
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </CardContent>
              </Card>

              {/* 거래 내역 탭 */}
              <TabsContent value="orders" className="mt-0">
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className="bg-muted border-b border-border p-4 bp-sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <ClipboardList className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">
                          거래/이용 내역
                        </CardTitle>
                        <CardDescription className="text-sm text-foreground/80">
                          주문·신청·대여를 한 곳에서 확인하세요.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    {isOrdersDetailView ? (
                      <OrdersScopeTabs
                        activeScope={activeOrdersScope}
                        className="mb-4 bp-sm:mb-5"
                      />
                    ) : null}
                    {isOrdersTab && flowType === "order" && flowId ? (
                      <OrderDetailClient
                        orderId={flowId}
                        backUrl={flowBackUrl}
                        linkedApplicationHrefBuilder={(applicationId) =>
                          `/mypage?tab=orders&flowType=application&flowId=${encodeURIComponent(applicationId)}${flowFromQuery}`
                        }
                      />
                    ) : isOrdersTab && flowType === "application" && flowId ? (
                      <ApplicationDetail id={flowId} backUrl={flowBackUrl} />
                    ) : isOrdersTab && flowType === "rental" && flowId ? (
                      <RentalsDetailClient id={flowId} backUrl={flowBackUrl} />
                    ) : isOrdersTab && orderId ? (
                      <OrderDetailClient
                        orderId={orderId}
                        backUrl={flowBackUrl}
                        linkedApplicationHrefBuilder={(applicationId) =>
                          `/mypage?tab=orders&flowType=application&flowId=${encodeURIComponent(applicationId)}${ordersFlowFromQuery}`
                        }
                      />
                    ) : isOrdersTab && selectedApplicationId ? (
                      <ApplicationDetail
                        id={selectedApplicationId}
                        backUrl={flowBackUrl}
                      />
                    ) : isOrdersTab && selectedRentalId ? (
                      <RentalsDetailClient
                        id={selectedRentalId}
                        backUrl={flowBackUrl}
                      />
                    ) : isOrdersTab ? (
                      <TransactionFlowList />
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 클래스 신청 탭 */}
              <TabsContent value="academy" className="mt-0">
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className={pageTone.sectionHeader}>
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <GraduationCap className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">
                          클래스 신청
                        </CardTitle>
                        <CardDescription className="text-sm text-foreground/80">
                          도깨비테니스 아카데미 클래스 신청 내역을 확인하세요.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    {currentTab === "academy" ? (
                      <AcademyApplicationsTab />
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 위시리스트 탭 */}
              <TabsContent value="wishlist" className="mt-0">
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className={pageTone.sectionHeader}>
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <Heart className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">
                          위시리스트
                        </CardTitle>
                        <CardDescription className="text-sm text-foreground/80">
                          찜한 상품 목록을 확인하실 수 있습니다.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    {currentTab === "wishlist" ? <Wishlist /> : null}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 리뷰 관리 탭 */}
              <TabsContent value="reviews" className="mt-0">
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className={pageTone.sectionHeader}>
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <MessageSquare className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">
                          리뷰 관리
                        </CardTitle>
                        <CardDescription className="text-sm text-foreground/80">
                          작성한 리뷰를 확인하고 관리하실 수 있습니다.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    {currentTab === "reviews" ? <ReviewList /> : null}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Q&A 내역 탭 */}
              <TabsContent value="qna" className="mt-0">
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className={pageTone.sectionHeader}>
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <MessageCircleQuestion className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">
                          Q&A 내역
                        </CardTitle>
                        <CardDescription className="text-sm text-foreground/80">
                          문의 내역을 확인하고 답변을 받으실 수 있습니다.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    {currentTab === "qna" ? <QnAList /> : null}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 패키지 탭 */}
              <TabsContent value="passes" className="mt-0">
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className={pageTone.sectionHeader}>
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <Ticket className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">
                          패키지
                        </CardTitle>
                        <CardDescription className="text-sm text-foreground/80">
                          보유 중인 패키지를 확인하실 수 있습니다.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    {currentTab === "passes" ? <PassList /> : null}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 적립 포인트 탭 */}
              <TabsContent value="points" className="mt-0">
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className={pageTone.sectionHeader}>
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <ReceiptCent className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">
                          적립 포인트
                        </CardTitle>
                        <CardDescription className="text-sm text-foreground/80">
                          포인트 적립 및 사용 내역을 확인하실 수 있습니다.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    {currentTab === "points" ? <MyPointsTab /> : null}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
