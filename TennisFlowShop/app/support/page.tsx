"use client";

import SupportFaqSearch from "@/app/support/_components/SupportFaqSearch";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero } from "@/components/public/PublicPageHero";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Megaphone,
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
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { USER_ME_KEY, USER_ME_SWR_OPTIONS } from "@/lib/hooks/useCurrentUser";

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
    title: "문의하기",
    description: "주문, 배송, 교체서비스 문의",
    href: "/board/qna/write",
    variant: "primary",
  },
  {
    icon: Headset,
    title: "아카데미 문의",
    description: "레슨 일정 및 수강료",
    href: "/board/qna/write?category=academy",
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
        "group relative flex min-w-0 flex-col gap-3 rounded-panel border p-5 transition-colors",
        variant === "primary"
          ? "border-primary/20 bg-primary/5 hover:border-primary/30 hover:bg-primary/10"
          : "border-border bg-card hover:bg-muted/30",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-control transition-colors",
          variant === "primary"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground group-hover:bg-muted/80",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 space-y-1 pr-7">
        <h3 className="break-keep font-semibold text-foreground group-hover:text-foreground/90">
          {title}
        </h3>
        <p className="break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <ChevronRight className="absolute right-4 top-1/2 h-5 w-5 shrink-0 -translate-y-1/2 text-muted-foreground/50 transition-transform group-hover:translate-x-1" />
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
  { icon: Megaphone, title: "공지사항", href: "/board/notice" },
  { icon: Gift, title: "이벤트", href: "/board/event" },
  { icon: Headset, title: "아카데미", href: "/academy" },
  { icon: MessageSquare, title: "쪽지함", href: "/messages" },
];

function InfoLinkItem({ icon: Icon, title, href }: InfoLinkProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-14 min-w-0 items-center gap-3 rounded-control border border-border/60 bg-background px-4 py-3 transition-colors hover:border-primary/20 hover:bg-muted/50"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 break-keep text-ui-body-sm font-medium text-foreground">
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
  return <AsyncState kind="error" variant="inline" title={message} onAction={onRetry} />;
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
  const emptyTitle = isEventMode ? "등록된 이벤트가 없습니다." : "등록된 공지가 없습니다.";
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
      <AsyncState kind="empty" variant="card" title={emptyTitle} description={emptyDescription} />
    );

  return (
    <div className="divide-y divide-border/70">
      {items.map((notice) => (
        <Link
          key={notice._id}
          href={`${basePath}/${notice._id}?${supportQuery}`}
          className="group flex min-w-0 items-start gap-3 px-0 py-3 transition-colors hover:bg-muted/30 bp-sm:px-3"
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
            className="min-w-0 flex-1 line-clamp-1 break-keep text-ui-body-sm font-medium text-foreground group-hover:text-foreground/80"
            title={notice.title}
          >
            {notice.title}
          </span>

          <div className="hidden shrink-0 items-center gap-2 text-ui-label text-muted-foreground bp-sm:flex">
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

      <div className="flex flex-col gap-2 pt-4 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full shrink-0 whitespace-nowrap text-muted-foreground hover:text-foreground bp-sm:w-auto"
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
            className="w-full shrink-0 whitespace-nowrap bp-sm:w-auto"
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

  if (error) return <ErrorBox message="Q&A 불러오기에 실패했습니다." onRetry={onRetry} />;
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
                이 문의는 <b>비밀글</b>로 등록되어 <b>작성자와 관리자만</b> 확인할 수 있습니다.
              </span>
              {!viewerId ? (
                <span className="block">작성자 계정이라면 로그인 후 다시 확인해 주세요.</span>
              ) : (
                <span className="block">현재 계정으로는 이 문의를 열람할 수 없습니다.</span>
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

      <div className="divide-y divide-border/70">
        {items.map((qna) => {
          const canOpenSecret =
            !qna.isSecret || !!isAdmin || (viewerId && qna.authorId && viewerId === qna.authorId);

          const RowContent = (
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                <Badge
                  variant={getQnaCategoryBadgeSpec(qna.category ?? undefined).variant}
                  className={`${badgeBaseOutlined} ${badgeSizeSm}`}
                >
                  {qna.category ?? "일반"}
                </Badge>
                {qna.isSecret && <Lock className="h-3 w-3 text-muted-foreground" />}
              </div>

              <span
                className="min-w-0 flex-1 line-clamp-1 break-keep text-ui-body-sm font-medium text-foreground"
                title={qna.title}
              >
                {qna.title}
              </span>

              <div className="hidden shrink-0 items-center gap-2 text-ui-label text-muted-foreground bp-sm:flex">
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
                className="w-full px-0 py-3 text-left transition-colors hover:bg-muted/30 bp-sm:px-3"
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
              className="block px-0 py-3 transition-colors hover:bg-muted/30 bp-sm:px-3"
            >
              {RowContent}
            </Link>
          );
        })}

        <div className="flex flex-col gap-2 pt-4 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full shrink-0 whitespace-nowrap text-muted-foreground hover:text-foreground bp-sm:w-auto"
          >
            <Link href="/board/qna">
              전체 보기
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm" className="w-full shrink-0 whitespace-nowrap bp-sm:w-auto">
            <Link href="/board/qna/write">문의하기</Link>
          </Button>
        </div>
      </div>
    </>
  );
}

// ---------------------- 페이지 컴포넌트 ----------------------

export default function SupportPage() {
  const { data, error, isLoading, mutate } = useSWR<BoardsMainRes>("/api/boards/main", fetcher);
  const notices = data?.notices ?? [];
  const events = data?.events ?? [];
  const qnas = data?.qna ?? [];

  const { data: me } = useSWR<MeRes | null>(USER_ME_KEY, fetcherAllow401, USER_ME_SWR_OPTIONS);
  const isAdmin = me?.role === "admin";
  const viewerId = me?.id ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <PublicPageHero
        align="center"
        eyebrow="고객센터"
        title="무엇을 도와드릴까요?"
        description={
          <p className="break-keep leading-relaxed">
            주문, 배송, 서비스 관련 궁금한 점을 빠르게 해결해 드립니다.
          </p>
        }
        className="bg-muted/30"
      >
        {/* Search Bar */}
        <div className="w-full max-w-lg">
          <div className="group relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
            <Link
              href="#faq"
              className="flex min-h-14 w-full items-center rounded-control border border-border bg-card py-3 pl-12 pr-4 text-left text-muted-foreground shadow-sm transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="break-keep">자주 묻는 질문 검색하기</span>
            </Link>
          </div>
        </div>
      </PublicPageHero>

      <SiteContainer className="py-8 md:py-12">
        <div className="space-y-10 md:space-y-14">
          {/* Quick Actions */}
          <section>
            <SectionHeader
              className="mb-6"
              title="빠른 문의"
              description="문의하기와 자주 묻는 질문을 먼저 확인해 보세요."
            />
            <div className="grid grid-cols-1 gap-4 bp-md:grid-cols-2">
              {quickActions.map((action) => (
                <QuickActionCard key={action.href} {...action} />
              ))}
            </div>
          </section>

          {/* Info Links */}
          <section>
            <PublicSurface padding="sm">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {infoLinks.map((link) => (
                  <InfoLinkItem key={link.href} {...link} />
                ))}
              </div>
            </PublicSurface>
          </section>

          {/* FAQ Section */}
          <section id="faq" className="scroll-mt-20">
            <SupportFaqSearch />
          </section>

          {/* Boards Section */}
          <section>
            <SectionHeader
              className="mb-6"
              title="게시판"
              description="공지사항, 이벤트, 문의 내역을 한곳에서 확인하세요."
            />

            <PublicSurface padding="none" className="overflow-hidden">
              <Tabs defaultValue="notice" className="w-full">
                <div className="border-b border-border bg-muted/30">
                  <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-0 bg-transparent p-0">
                    <TabsTrigger
                      value="notice"
                      className="relative min-w-0 shrink-0 rounded-none border-b-2 border-transparent px-4 py-4 text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none bp-sm:px-6"
                    >
                      <Megaphone className="mr-2 h-4 w-4" />
                      공지사항
                    </TabsTrigger>
                    <TabsTrigger
                      value="event"
                      className="relative min-w-0 shrink-0 rounded-none border-b-2 border-transparent px-4 py-4 text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none bp-sm:px-6"
                    >
                      <Gift className="mr-2 h-4 w-4" />
                      이벤트
                    </TabsTrigger>
                    <TabsTrigger
                      value="qna"
                      className="relative min-w-0 shrink-0 rounded-none border-b-2 border-transparent px-4 py-4 text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none bp-sm:px-6"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      문의
                    </TabsTrigger>
                  </TabsList>
                </div>
                <div className="p-4 md:p-6">
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
                </div>
              </Tabs>
            </PublicSurface>
          </section>
        </div>
      </SiteContainer>
    </div>
  );
}
