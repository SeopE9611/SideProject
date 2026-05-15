"use client";

import { UserSidebar } from "@/app/mypage/orders/_components/UserSidebar";
import SiteContainer from "@/components/layout/SiteContainer";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import useSWR from "swr";

const ACTIVE_TAB = "academy";

const mypageTabs = [
  {
    value: "orders",
    label: "거래/이용 내역",
    href: "/mypage?tab=orders",
    icon: ClipboardList,
  },
  {
    value: "academy",
    label: "클래스 신청",
    href: "/mypage?tab=academy",
    icon: GraduationCap,
  },
  {
    value: "wishlist",
    label: "위시리스트",
    href: "/mypage?tab=wishlist",
    icon: Heart,
  },
  {
    value: "reviews",
    label: "리뷰 관리",
    href: "/mypage?tab=reviews",
    icon: MessageSquare,
  },
  {
    value: "qna",
    label: "Q&A 내역",
    href: "/mypage?tab=qna",
    icon: MessageCircleQuestion,
  },
  {
    value: "passes",
    label: "패키지",
    href: "/mypage?tab=passes",
    icon: Ticket,
  },
  {
    value: "points",
    label: "적립 포인트",
    href: "/mypage?tab=points",
    icon: ReceiptCent,
  },
] as const;

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

export default function AcademyApplicationMypageShell({
  user,
  children,
}: Props) {
  const router = useRouter();
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useSWR<MypageSummary>("/api/mypage/summary", authenticatedSWRFetcher, {
    revalidateOnFocus: true,
  });

  const todoCount = summary?.todoCount ?? 0;
  const hasTodoItems = !summaryLoading && todoCount > 0;
  const todoCardDescription = hasTodoItems
    ? "확인하고 바로 처리하기"
    : "현재 추가 작업 없음";

  return (
    <div className="min-h-full bg-background">
      <div className="absolute inset-0 opacity-5 dark:opacity-10 bp-xs:hidden bg-cross-line-pattern" />

      <div className="relative overflow-hidden border-b border-border bg-card">
        <div className="absolute inset-0 bg-muted/40" />
        <div className="absolute inset-0 bp-xs:hidden">
          <div className="absolute top-10 left-10 w-20 h-20 bg-card/10 rounded-full animate-pulse" />
          <div className="absolute top-32 right-20 w-16 h-16 bg-card/5 rounded-full" />
          <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-card/10 rounded-full animate-pulse" />
        </div>

        <SiteContainer
          variant="wide"
          className="relative py-6 bp-sm:py-10 bp-lg:py-16"
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6 bp-sm:mb-8">
              <div className="bg-muted rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 ring-1 ring-ring/20">
                <User className="h-6 w-6 bp-sm:h-8 bp-sm:w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl bp-sm:text-3xl bp-lg:text-4xl font-bold mb-1 text-foreground truncate">
                  안녕하세요, {user.name}님!
                </h1>
                <p className="text-sm bp-sm:text-base bp-lg:text-xl text-foreground">
                  도깨비테니스의 회원이 되어주셔서 감사합니다
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 bp-lg:grid-cols-4 gap-3 bp-sm:gap-4 bp-lg:gap-6">
              <div className="bg-muted rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 text-center border border-border">
                <Trophy className="h-6 w-6 bp-sm:h-8 bp-sm:w-8 mx-auto mb-2 bp-sm:mb-3 text-primary" />
                <div className="text-xl bp-sm:text-2xl font-bold mb-1">
                  {summaryLoading ? (
                    <Skeleton className="mx-auto h-7 w-10" />
                  ) : (
                    (summary?.activityFlowCount ?? "-")
                  )}
                </div>
                <div className="text-xs bp-sm:text-sm text-muted-foreground">
                  전체 이용 내역
                </div>
              </div>
              <div className="bg-muted rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 text-center border border-border">
                <Target className="h-6 w-6 bp-sm:h-8 bp-sm:w-8 mx-auto mb-2 bp-sm:mb-3 text-primary" />
                <div className="text-xl bp-sm:text-2xl font-bold mb-1">
                  {summaryLoading ? (
                    <Skeleton className="mx-auto h-7 w-10" />
                  ) : (
                    (summary?.applicationsCount ?? "-")
                  )}
                </div>
                <div className="text-xs bp-sm:text-sm text-muted-foreground">
                  교체서비스 신청
                </div>
              </div>
              <div className="bg-muted rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 text-center border border-border">
                <ClipboardList className="h-6 w-6 bp-sm:h-8 bp-sm:w-8 mx-auto mb-2 bp-sm:mb-3 text-primary" />
                <div className="text-xl bp-sm:text-2xl font-bold mb-1">
                  {summaryLoading ? (
                    <Skeleton className="mx-auto h-7 w-10" />
                  ) : (
                    (summary?.ordersCount ?? "-")
                  )}
                </div>
                <div className="text-xs bp-sm:text-sm text-muted-foreground">
                  상품 주문
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push("/mypage?tab=orders&scope=todo", {
                    scroll: false,
                  })
                }
                className={`group rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 text-center border col-span-2 bp-lg:col-span-1 transition-[background-color,border-color,box-shadow,transform] ${
                  hasTodoItems
                    ? "border-primary/30 bg-primary/5 shadow-sm ring-1 ring-primary/10 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/15"
                    : "border-border bg-muted hover:bg-muted/80"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2`}
                aria-label="지금 처리할 일 목록으로 이동"
              >
                <ListTodo className="h-6 w-6 bp-sm:h-8 bp-sm:w-8 mx-auto mb-2 bp-sm:mb-3 text-primary transition-transform group-hover:scale-105" />
                <div className="text-xl bp-sm:text-2xl font-bold mb-1">
                  {summaryLoading ? (
                    <Skeleton className="mx-auto h-7 w-10" />
                  ) : (
                    (summary?.todoCount ?? "-")
                  )}
                </div>
                <div className="text-xs bp-sm:text-sm text-muted-foreground group-hover:text-foreground">
                  지금 처리할 일
                </div>
                {summaryLoading ? (
                  <Skeleton className="mx-auto mt-2 h-3 w-24" />
                ) : (
                  <div className="mt-1 text-[11px] font-medium text-foreground/75 bp-sm:text-xs">
                    {todoCardDescription}
                  </div>
                )}
              </button>
            </div>
            {summaryError ? (
              <p className="mt-3 text-xs text-muted-foreground">
                일부 지표를 불러오지 못해 숫자를 &quot;-&quot;로 표시하고
                있어요. 잠시 후 다시 확인해 주세요.
              </p>
            ) : null}
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
                      <CardTitle className="text-lg truncate">
                        {user.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-sm text-foreground truncate">
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
                            일반 계정
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <UserSidebar activeTab={ACTIVE_TAB} />
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="bp-lg:col-span-3 min-w-0">
            <Tabs value={ACTIVE_TAB}>
              <Card className="mb-6 border-border bg-card shadow-sm bp-sm:mb-8">
                <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
                  <TabsList className="h-auto w-full p-1 bg-muted grid grid-cols-2 gap-1 bp-sm:grid-cols-3 bp-md:grid-cols-4 bp-xl:grid-cols-7">
                    {mypageTabs.map(({ value, label, href, icon: Icon }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        asChild
                        className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-card data-[state=active]:shadow-md min-w-0"
                      >
                        <Link href={href}>
                          <Icon className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                          <span className="text-xs bp-sm:text-sm font-medium whitespace-nowrap">
                            {label}
                          </span>
                        </Link>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="border-b border-border bg-secondary/70 p-4 bp-sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-border/60 bg-secondary p-2.5 bp-sm:rounded-2xl bp-sm:p-3">
                      <GraduationCap className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg bp-sm:text-xl">
                        클래스 신청
                      </CardTitle>
                      <CardDescription className="text-sm text-foreground/80">
                        도깨비테니스 아카데미 클래스 신청 상세와 진행 상태를
                        확인하세요.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 bp-sm:p-6">{children}</CardContent>
              </Card>
            </Tabs>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
