"use client";

import { UserSidebar } from "@/app/mypage/orders/_components/UserSidebar";
import SiteContainer from "@/components/layout/SiteContainer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSocialProviderBadgeSpec } from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { ClipboardList, Heart, ListTodo, MessageCircleQuestion, MessageSquare, ReceiptCent, Target, Ticket, Trophy, User } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import useSWR from "swr";

const ApplicationDetail = dynamic(() => import("@/app/mypage/applications/_components/ApplicationDetail"), { loading: () => null });
const OrderDetailClient = dynamic(() => import("@/app/mypage/orders/_components/OrderDetailClient"), { loading: () => null });
const RentalsDetailClient = dynamic(() => import("@/app/mypage/rentals/_components/RentalsDetailClient"), { loading: () => null });
const MyPointsTab = dynamic(() => import("@/app/mypage/tabs/MyPointsTab"), {
  loading: () => null,
});
const TransactionFlowList = dynamic(() => import("@/app/mypage/tabs/TransactionFlowList"), { loading: () => null });
const PassList = dynamic(() => import("@/app/mypage/tabs/PassList"), {
  loading: () => null,
});
const QnAList = dynamic(() => import("@/app/mypage/tabs/QnAList"), {
  loading: () => null,
});
const ReviewList = dynamic(() => import("@/app/mypage/tabs/ReviewList"), {
  loading: () => null,
});
const Wishlist = dynamic(() => import("@/app/mypage/tabs/Wishlist"), {
  loading: () => null,
});

const MypageTabPanelSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={`mypage-tab-skeleton-${idx}`} className="rounded-lg border border-border/60 p-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
    ))}
  </div>
);

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
    todoCount: number;
  }>("/api/mypage/summary", authenticatedSWRFetcher, {
    revalidateOnFocus: true,
  });
  const hasSummaryError = !!summaryError;

  const resolveOrdersScope = (scope: string | null) => {
    if (scope === "todo" || scope === "order" || scope === "application" || scope === "rental") {
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

    if (!legacyTab || legacyTab === "activity" || legacyTab === "applications" || legacyTab === "rentals") {
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
          <CardContent className="p-6 text-sm text-muted-foreground">회원 정보를 확인하는 중입니다.</CardContent>
        </Card>
      </SiteContainer>
    );
  }

  const currentTab = searchParams.get("tab") ?? "orders";

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

  // 페이지 톤 클래스 분류(히어로, 카드 헤더, 아이콘 배경)
  const pageTone = {
    heroPanel: "relative overflow-hidden bg-card border-b border-border",
    sectionHeader: "bg-muted border-b border-border p-4 bp-sm:p-6",
    iconSurface: "bg-muted rounded-xl bp-sm:rounded-2xl p-2.5 bp-sm:p-3 ring-1 ring-ring/20",
  };

  return (
    <div className="min-h-full bg-background">
      <div className="absolute inset-0 opacity-5 dark:opacity-10 bp-xs:hidden bg-cross-line-pattern" />

      <div className={pageTone.heroPanel}>
        <div className="absolute inset-0 bg-muted/40"></div>
        <div className="absolute inset-0 bp-xs:hidden">
          <div className="absolute top-10 left-10 w-20 h-20 bg-card/10 rounded-full animate-pulse" />
          <div className="absolute top-32 right-20 w-16 h-16 bg-card/5 rounded-full" />
          <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-card/10 rounded-full animate-pulse" />
        </div>

        <SiteContainer variant="wide" className="relative py-6 bp-sm:py-10 bp-lg:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6 bp-sm:mb-8">
              <div className="bg-muted rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 ring-1 ring-ring/20">
                <User className="h-6 w-6 bp-sm:h-8 bp-sm:w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl bp-sm:text-3xl bp-lg:text-5xl font-black mb-1 text-foreground truncate">안녕하세요, {user.name}님!</h1>
                <p className="text-sm bp-sm:text-base bp-lg:text-xl text-foreground">상호명 미정의 회원이 되어주셔서 감사합니다</p>
              </div>
            </div>

            <div className="grid grid-cols-2 bp-lg:grid-cols-4 gap-3 bp-sm:gap-4 bp-lg:gap-6">
              <div className="bg-muted rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 text-center border border-border">
                <Trophy className="h-6 w-6 bp-sm:h-8 bp-sm:w-8 mx-auto mb-2 bp-sm:mb-3 text-primary" />
                <div className="text-xl bp-sm:text-2xl font-bold mb-1">{summaryLoading ? <Skeleton className="mx-auto h-7 w-10" /> : (summary?.activityFlowCount ?? "-")}</div>
                <div className="text-xs bp-sm:text-sm text-muted-foreground">전체 이용 내역</div>
              </div>
              <div className="bg-muted rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 text-center border border-border">
                <Target className="h-6 w-6 bp-sm:h-8 bp-sm:w-8 mx-auto mb-2 bp-sm:mb-3 text-primary" />
                <div className="text-xl bp-sm:text-2xl font-bold mb-1">{summaryLoading ? <Skeleton className="mx-auto h-7 w-10" /> : (summary?.applicationsCount ?? "-")}</div>
                <div className="text-xs bp-sm:text-sm text-muted-foreground">교체서비스 신청</div>
              </div>
              <div className="bg-muted rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 text-center border border-border">
                <ClipboardList className="h-6 w-6 bp-sm:h-8 bp-sm:w-8 mx-auto mb-2 bp-sm:mb-3 text-primary" />
                <div className="text-xl bp-sm:text-2xl font-bold mb-1">{summaryLoading ? <Skeleton className="mx-auto h-7 w-10" /> : (summary?.ordersCount ?? "-")}</div>
                <div className="text-xs bp-sm:text-sm text-muted-foreground">상품 주문</div>
              </div>
              <div className="bg-muted rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 text-center border border-border col-span-2 bp-lg:col-span-1">
                <ListTodo className="h-6 w-6 bp-sm:h-8 bp-sm:w-8 mx-auto mb-2 bp-sm:mb-3 text-primary" />
                <div className="text-xl bp-sm:text-2xl font-bold mb-1">{summaryLoading ? <Skeleton className="mx-auto h-7 w-10" /> : (summary?.todoCount ?? "-")}</div>
                <div className="text-xs bp-sm:text-sm text-muted-foreground">해야 할 일</div>
              </div>
            </div>
            {hasSummaryError ? <p className="mt-3 text-xs text-muted-foreground">일부 지표를 불러오지 못해 숫자를 "-"로 표시하고 있어요. 잠시 후 다시 확인해 주세요.</p> : null}
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-lg:py-12">
        <div className="grid grid-cols-1 gap-6 bp-lg:grid-cols-4 bp-lg:gap-8">
          <div className="hidden bp-lg:block bp-lg:col-span-1">
            <div className="sticky top-8">
              <Card className="border-0 shadow-2xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted rounded-2xl p-3 ring-1 ring-ring/20">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{user.name}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-sm text-foreground truncate">{user.email}</span>
                        {user.oauthProviders?.length ? (
                          <>
                            {user.oauthProviders.includes("kakao") && (
                              <Badge variant={getSocialProviderBadgeSpec("kakao").variant} className="text-xs py-0 px-2 h-5">
                                카카오
                              </Badge>
                            )}
                            {user.oauthProviders.includes("naver") && (
                              <Badge variant={getSocialProviderBadgeSpec("naver").variant} className="text-xs py-0 px-2 h-5">
                                네이버
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">일반 계정</span>
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
              <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm mb-6 bp-sm:mb-8">
                <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
                  <TabsList className="h-auto w-full p-1 bg-muted grid grid-cols-3 gap-1 bp-md:grid-cols-6">
                    <TabsTrigger value="orders" className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-card data-[state=active]:shadow-md min-w-0">
                      <ClipboardList className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                      <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">거래/이용 내역</span>
                    </TabsTrigger>

                    <TabsTrigger value="wishlist" className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-card data-[state=active]:shadow-md min-w-0">
                      <Heart className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                      <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">위시리스트</span>
                    </TabsTrigger>

                    <TabsTrigger value="reviews" className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-card data-[state=active]:shadow-md min-w-0">
                      <MessageSquare className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                      <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">리뷰 관리</span>
                    </TabsTrigger>

                    <TabsTrigger value="qna" className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-card data-[state=active]:shadow-md min-w-0">
                      <MessageCircleQuestion className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                      <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">Q&A 내역</span>
                    </TabsTrigger>

                    <TabsTrigger value="passes" className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-card data-[state=active]:shadow-md min-w-0">
                      <Ticket className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                      <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">패키지</span>
                    </TabsTrigger>

                    <TabsTrigger value="points" className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-card data-[state=active]:shadow-md min-w-0">
                      <ReceiptCent className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                      <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">적립 포인트</span>
                    </TabsTrigger>
                  </TabsList>
                </CardContent>
              </Card>

              {/* 거래 내역 탭 */}
              <TabsContent value="orders" className="mt-0">
                <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                  <CardHeader className="bg-muted border-b border-border p-4 bp-sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <ClipboardList className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">거래/이용 내역</CardTitle>
                        <CardDescription className="text-xs bp-sm:text-sm">주문·신청·대여를 한 곳에서 확인하세요.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    <Suspense fallback={<MypageTabPanelSkeleton count={4} />}>
                      {isOrdersTab && flowType === "order" && flowId ? (
                        <OrderDetailClient orderId={flowId} backUrl={flowBackUrl} linkedApplicationHrefBuilder={(applicationId) => `/mypage?tab=orders&flowType=application&flowId=${encodeURIComponent(applicationId)}${flowFromQuery}`} />
                      ) : isOrdersTab && flowType === "application" && flowId ? (
                        <ApplicationDetail id={flowId} backUrl={flowBackUrl} />
                      ) : isOrdersTab && flowType === "rental" && flowId ? (
                        <RentalsDetailClient id={flowId} backUrl={flowBackUrl} />
                      ) : isOrdersTab && orderId ? (
                        <OrderDetailClient orderId={orderId} backUrl={flowBackUrl} linkedApplicationHrefBuilder={(applicationId) => `/mypage?tab=orders&flowType=application&flowId=${encodeURIComponent(applicationId)}${ordersFlowFromQuery}`} />
                      ) : isOrdersTab && selectedApplicationId ? (
                        <ApplicationDetail id={selectedApplicationId} backUrl={flowBackUrl} />
                      ) : isOrdersTab && selectedRentalId ? (
                        <RentalsDetailClient id={selectedRentalId} backUrl={flowBackUrl} />
                      ) : isOrdersTab ? (
                        <TransactionFlowList />
                      ) : null}
                    </Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 위시리스트 탭 */}
              <TabsContent value="wishlist" className="mt-0">
                <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                  <CardHeader className={pageTone.sectionHeader}>
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <Heart className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">위시리스트</CardTitle>
                        <CardDescription className="text-xs bp-sm:text-sm">찜한 상품 목록을 확인하실 수 있습니다.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    <Suspense fallback={<MypageTabPanelSkeleton count={3} />}>{currentTab === "wishlist" ? <Wishlist /> : null}</Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 리뷰 관리 탭 */}
              <TabsContent value="reviews" className="mt-0">
                <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                  <CardHeader className={pageTone.sectionHeader}>
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <MessageSquare className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">리뷰 관리</CardTitle>
                        <CardDescription className="text-xs bp-sm:text-sm">작성한 리뷰를 확인하고 관리하실 수 있습니다.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    <Suspense fallback={<MypageTabPanelSkeleton count={3} />}>{currentTab === "reviews" ? <ReviewList /> : null}</Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Q&A 내역 탭 */}
              <TabsContent value="qna" className="mt-0">
                <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                  <CardHeader className={pageTone.sectionHeader}>
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <MessageCircleQuestion className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">Q&A 내역</CardTitle>
                        <CardDescription className="text-xs bp-sm:text-sm">문의 내역을 확인하고 답변을 받으실 수 있습니다.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    <Suspense fallback={<MypageTabPanelSkeleton count={3} />}>{currentTab === "qna" ? <QnAList /> : null}</Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 패키지 탭 */}
              <TabsContent value="passes" className="mt-0">
                <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                  <CardHeader className={pageTone.sectionHeader}>
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <Ticket className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">패키지</CardTitle>
                        <CardDescription className="text-xs bp-sm:text-sm">보유 중인 패키지를 확인하실 수 있습니다.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    <Suspense fallback={<MypageTabPanelSkeleton count={3} />}>{currentTab === "passes" ? <PassList /> : null}</Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 적립 포인트 탭 */}
              <TabsContent value="points" className="mt-0">
                <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                  <CardHeader className={pageTone.sectionHeader}>
                    <div className="flex items-center gap-3">
                      <div className={pageTone.iconSurface}>
                        <ReceiptCent className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg bp-sm:text-xl">적립 포인트</CardTitle>
                        <CardDescription className="text-xs bp-sm:text-sm">포인트 적립 및 사용 내역을 확인하실 수 있습니다.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bp-sm:p-6">
                    <Suspense fallback={<MypageTabPanelSkeleton count={3} />}>{currentTab === "points" ? <MyPointsTab /> : null}</Suspense>
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
