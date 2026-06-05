"use client";

import SupportFaqSearch from "@/app/support/_components/SupportFaqSearch";
import SiteContainer from "@/components/layout/SiteContainer";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  badgeBaseOutlined,
  badgeSizeSm,
  getAnswerStatusBadgeSpec,
  getNoticeCategoryBadgeSpec,
  getQnaCategoryBadgeSpec,
} from "@/lib/badge-style";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  Eye,
  Gift,
  Headset,
  ImageIcon,
  Lock,
  MessageSquare,
  PackageSearch,
  Paperclip,
  Pin,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

// ---------------------- 공통 유틸 ----------------------

type NoticeItem = {
  _id: string;
  title: string;
  createdAt: string | Date;
  viewCount?: number;
  isPinned?: boolean;
  category?: string | null;
  hasImage?: boolean;
  hasFile?: boolean;
};

type QnaItem = {
  _id: string;
  title: string;
  createdAt: string | Date;
  category?: string | null;
  authorName?: string | null;
  authorId?: string | null;
  isSecret?: boolean;
  answer?: any;
  viewCount?: number;
  hasImage?: boolean;
  hasFile?: boolean;
};

type BoardsMainRes = {
  ok?: boolean;
  notices?: NoticeItem[];
  events?: NoticeItem[];
  qna?: QnaItem[];
};
type MeRes = { id?: string; role?: string };

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = (await res.json().catch(() => null)) as any;

  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return data as T;
}

async function fetcherAllow401<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { credentials: "include" });
  const data = (await res.json().catch(() => null)) as any;

  if (res.status === 401) return null;

  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      typeof (data as { error: string }).error === "string"
        ? (data as { error: string }).error
        : `${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return data as T;
}
const fmt = (v: string | Date) =>
  new Date(v)
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\.\s/g, ".")
    .replace(/\.$/, "");

// ---------------------- 퀵 액션 카드 ----------------------

type QuickActionProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  variant?: "default" | "primary";
};

const quickActions: QuickActionProps[] = [
  {
    icon: MessageSquare,
    title: "Q&A 문의하기",
    description: "주문, 배송, 서비스 문의",
    href: "/board/qna/write",
    variant: "primary",
  },
  {
    icon: Headset,
    title: "아카데미 문의",
    description: "레슨 일정 및 수강료",
    href: "/board/qna/write?category=academy",
  },
  {
    icon: ShoppingBag,
    title: "중고거래",
    description: "중고 장비 거래",
    href: "/board/market",
  },
];

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  variant = "default",
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border p-5 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        variant === "primary"
          ? "border-primary/20 bg-primary/5 hover:border-primary/30 hover:bg-primary/10"
          : "border-border bg-card hover:border-border/80",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
          variant === "primary"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground group-hover:bg-muted/80",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground group-hover:text-foreground/90">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

// ---------------------- 안내 링크 ----------------------

type InfoLinkProps = {
  icon: LucideIcon;
  title: string;
  href: string;
};

const infoLinks: InfoLinkProps[] = [
  { icon: Bell, title: "공지사항", href: "/board/notice" },
  { icon: Gift, title: "이벤트", href: "/board/event" },
  { icon: Headset, title: "아카데미", href: "/academy" },
  { icon: MessageSquare, title: "쪽지함", href: "/messages" },
];

function InfoLinkItem({ icon: Icon, title, href }: InfoLinkProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-14 items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 transition-colors hover:border-primary/20 hover:bg-muted/50"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="whitespace-nowrap text-sm font-medium text-foreground">
        {title}
      </span>
      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}

// ---------------------- 스켈레톤 ----------------------

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 flex-1 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

function ErrorBox({
  message = "데이터를 불러오는 중 오류가 발생했습니다.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <AsyncState
      kind="error"
      variant="inline"
      title={message}
      onAction={onRetry}
    />
  );
}

// ---------------------- 공지/이벤트 리스트 ----------------------

function NoticeList({
  items,
  isAdmin,
  isLoading,
  error,
  onRetry,
  mode = "notice",
}: {
  items: NoticeItem[];
  isAdmin?: boolean;
  isLoading?: boolean;
  error?: any;
  onRetry?: () => void;
  mode?: "notice" | "event";
}) {
  const supportQuery = "from=support&returnTo=%2Fsupport";
  const isEventMode = mode === "event";
  const basePath = isEventMode ? "/board/event" : "/board/notice";
  const writePath = isEventMode ? "/board/event/write" : "/board/notice/write";
  const emptyTitle = isEventMode
    ? "등록된 이벤트가 없습니다."
    : "등록된 공지가 없습니다.";
  const emptyDescription = isEventMode
    ? "새로운 이벤트가 등록되면 이곳에 표시됩니다."
    : "새 소식이 등록되면 이곳에서 바로 확인할 수 있어요.";
  const loadErrorMessage = isEventMode
    ? "이벤트 불러오기에 실패했습니다."
    : "공지 불러오기에 실패했습니다.";
  const pinnedLabel = isEventMode ? "고정" : "고정";

  if (error) return <ErrorBox message={loadErrorMessage} onRetry={onRetry} />;
  if (isLoading) return <ListSkeleton />;
  if (items.length === 0)
    return (
      <AsyncState
        kind="empty"
        variant="card"
        title={emptyTitle}
        description={emptyDescription}
      />
    );

  return (
    <div className="space-y-1">
      {items.map((notice) => (
        <Link
          key={notice._id}
          href={`${basePath}/${notice._id}?${supportQuery}`}
          className="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
            {notice.isPinned && (
              <Badge
                variant="brand"
                className={`${badgeBaseOutlined} ${badgeSizeSm}`}
                title={pinnedLabel}
              >
                <Pin className="h-3 w-3" />
              </Badge>
            )}
            {!!notice.category && (
              <Badge
                variant={getNoticeCategoryBadgeSpec(notice.category).variant}
                className={`${badgeBaseOutlined} ${badgeSizeSm}`}
              >
                {notice.category}
              </Badge>
            )}
          </div>

          <span
            className="flex-1 line-clamp-1 text-sm font-medium text-foreground group-hover:text-foreground/80"
            title={notice.title}
          >
            {notice.title}
          </span>

          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {(notice.hasImage || notice.hasFile) && (
              <span className="flex items-center gap-1">
                {notice.hasImage && <ImageIcon className="h-3 w-3" />}
                {notice.hasFile && <Paperclip className="h-3 w-3" />}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {notice.viewCount ?? 0}
            </span>
            <span className="w-20 shrink-0 whitespace-nowrap text-right tabular-nums">
              {fmt(notice.createdAt)}
            </span>
          </div>
        </Link>
      ))}

      <div className="flex items-center justify-between pt-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="whitespace-nowrap text-muted-foreground hover:text-foreground"
        >
          <Link href={basePath}>
            전체 보기
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
        {isAdmin && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
          >
            <Link href={writePath}>글 쓰기</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------- Q&A 리스트 ----------------------

function QnaList({
  items,
  viewerId,
  isAdmin,
  isLoading,
  error,
  onRetry,
}: {
  items: QnaItem[];
  viewerId?: string | null;
  isAdmin?: boolean;
  isLoading?: boolean;
  error?: any;
  onRetry?: () => void;
}) {
  const [secretBlock, setSecretBlock] = useState<{
    open: boolean;
    item?: QnaItem;
  }>({ open: false });
  const supportQuery = "from=support&returnTo=%2Fsupport";

  if (error)
    return (
      <ErrorBox message="Q&A 불러오기에 실패했습니다." onRetry={onRetry} />
    );
  if (isLoading) return <ListSkeleton />;
  if (items.length === 0)
    return (
      <AsyncState
        kind="empty"
        variant="card"
        title="등록된 문의가 없습니다."
        description="궁금한 점이 있다면 첫 문의를 남겨주세요."
      />
    );

  return (
    <>
      <Dialog
        open={secretBlock.open}
        onOpenChange={(open) => setSecretBlock((p) => ({ ...p, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              비밀글 열람 안내
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                이 문의는 <b>비밀글</b>로 등록되어 <b>작성자와 관리자만</b>{" "}
                확인할 수 있습니다.
              </span>
              {!viewerId ? (
                <span className="block">
                  작성자 계정이라면 로그인 후 다시 확인해 주세요.
                </span>
              ) : (
                <span className="block">
                  현재 계정으로는 이 문의를 열람할 수 없습니다.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-wrap gap-2 sm:justify-end">
            <Button variant="outline" asChild className="whitespace-nowrap">
              <Link href="/board/qna">목록으로</Link>
            </Button>
            {!viewerId && secretBlock.item?._id && (
              <Button asChild className="whitespace-nowrap">
                <Link
                  href={`/login?next=${encodeURIComponent(`/board/qna/${secretBlock.item._id}?${supportQuery}`)}`}
                >
                  로그인
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-1">
        {items.map((qna) => {
          const canOpenSecret =
            !qna.isSecret ||
            !!isAdmin ||
            (viewerId && qna.authorId && viewerId === qna.authorId);

          const RowContent = (
            <div className="flex items-start gap-3">
              <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                <Badge
                  variant={
                    getQnaCategoryBadgeSpec(qna.category ?? undefined).variant
                  }
                  className={`${badgeBaseOutlined} ${badgeSizeSm}`}
                >
                  {qna.category ?? "일반"}
                </Badge>
                {qna.isSecret && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>

              <span
                className="flex-1 line-clamp-1 text-sm font-medium text-foreground"
                title={qna.title}
              >
                {qna.title}
              </span>

              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  variant={getAnswerStatusBadgeSpec(!!qna.answer).variant}
                  className={`${badgeBaseOutlined} ${badgeSizeSm}`}
                >
                  {qna.answer ? "답변완료" : "대기중"}
                </Badge>
                {(qna.hasImage || qna.hasFile) && (
                  <span className="flex items-center gap-1">
                    {qna.hasImage && <ImageIcon className="h-3 w-3" />}
                    {qna.hasFile && <Paperclip className="h-3 w-3" />}
                  </span>
                )}
                <span className="w-20 shrink-0 whitespace-nowrap text-right tabular-nums">
                  {fmt(qna.createdAt)}
                </span>
              </div>
            </div>
          );

          if (qna.isSecret && !canOpenSecret) {
            return (
              <button
                key={qna._id}
                type="button"
                className="w-full rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => setSecretBlock({ open: true, item: qna })}
              >
                {RowContent}
              </button>
            );
          }

          return (
            <Link
              key={qna._id}
              href={`/board/qna/${qna._id}?${supportQuery}`}
              className="block rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
            >
              {RowContent}
            </Link>
          );
        })}

        <div className="flex items-center justify-between pt-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="whitespace-nowrap text-muted-foreground hover:text-foreground"
          >
            <Link href="/board/qna">
              전체 보기
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm" className="whitespace-nowrap">
            <Link href="/board/qna/write">문의하기</Link>
          </Button>
        </div>
      </div>
    </>
  );
}

// ---------------------- 페이지 컴포넌트 ----------------------

export default function SupportPage() {
  const { data, error, isLoading, mutate } = useSWR<BoardsMainRes>(
    "/api/boards/main",
    fetcher,
  );
  const notices = data?.notices ?? [];
  const events = data?.events ?? [];
  const qnas = data?.qna ?? [];

  const { data: me } = useSWR<MeRes | null>("/api/users/me", fetcherAllow401, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });
  const isAdmin = me?.role === "admin";
  const viewerId = me?.id ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-b from-muted/50 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--muted)/0.4),transparent_50%)]" />
        <SiteContainer className="relative py-12 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>고객센터</span>
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              무엇을 도와드릴까요?
            </h1>
            <p className="mb-8 text-base text-muted-foreground md:text-lg">
              주문, 배송, 서비스 관련 궁금한 점을 빠르게 해결해 드립니다.
            </p>

            {/* Search Bar */}
            <div className="relative mx-auto max-w-lg">
              <div className="group relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
                <Link
                  href="#faq"
                  className="flex h-14 w-full items-center rounded-xl border border-border bg-card pl-12 pr-4 text-muted-foreground shadow-sm transition-all hover:border-border/80 hover:shadow-md focus:outline-none"
                >
                  <span>자주 묻는 질문 검색하기</span>
                </Link>
              </div>
            </div>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer className="py-8 md:py-12">
        {/* Quick Actions */}
        <section className="mb-10 md:mb-14">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">빠른 문의</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              자주 사용하는 메뉴에 바로 접근하세요.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <QuickActionCard key={action.href} {...action} />
            ))}
          </div>
        </section>

        {/* Info Links */}
        <section className="mb-10 md:mb-14">
          <Card className="border-border">
            <CardContent className="p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {infoLinks.map((link) => (
                  <InfoLinkItem key={link.href} {...link} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="mb-10 md:mb-14 scroll-mt-20">
          <SupportFaqSearch />
        </section>

        {/* Boards Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">게시판</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              공지사항, 이벤트, Q&A를 확인하세요.
            </p>
          </div>

          <Card className="border-border">
            <Tabs defaultValue="notice" className="w-full">
              <CardHeader className="border-b border-border p-0">
                <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-0 bg-transparent p-0">
                  <TabsTrigger
                    value="notice"
                    className="relative rounded-none border-b-2 border-transparent px-6 py-4 text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    공지사항
                  </TabsTrigger>
                  <TabsTrigger
                    value="event"
                    className="relative rounded-none border-b-2 border-transparent px-6 py-4 text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    이벤트
                  </TabsTrigger>
                  <TabsTrigger
                    value="qna"
                    className="relative rounded-none border-b-2 border-transparent px-6 py-4 text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Q&A
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <TabsContent value="notice" className="mt-0">
                  <NoticeList
                    items={notices}
                    isAdmin={isAdmin}
                    isLoading={isLoading}
                    error={error}
                    onRetry={() => mutate()}
                  />
                </TabsContent>
                <TabsContent value="event" className="mt-0">
                  <NoticeList
                    mode="event"
                    items={events}
                    isAdmin={isAdmin}
                    isLoading={isLoading}
                    error={error}
                    onRetry={() => mutate()}
                  />
                </TabsContent>
                <TabsContent value="qna" className="mt-0">
                  <QnaList
                    items={qnas}
                    viewerId={viewerId}
                    isAdmin={isAdmin}
                    isLoading={isLoading}
                    error={error}
                    onRetry={() => mutate()}
                  />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </section>
      </SiteContainer>
    </div>
  );
}
