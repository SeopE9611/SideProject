"use client";

import SupportFaqSearch from "@/app/support/_components/SupportFaqSearch";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero } from "@/components/public/PublicPageHero";
import { InteractiveCard } from "@/components/public/InteractiveCard";
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
  Eye,
  Gift,
  Headset,
  ImageIcon,
  Lock,
  MessageSquare,
  Paperclip,
  Pin,
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

// ---------------------- 퀵 액션/안내 링크 ----------------------

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

// ---------------------- 안내 링크 ----------------------

type InfoLinkProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
};

const infoLinks: InfoLinkProps[] = [
  { icon: Megaphone, title: "공지사항", description: "서비스 운영 안내와 필수 공지를 확인합니다.", href: "/board/notice" },
  { icon: Gift, title: "이벤트", description: "진행 중인 혜택과 참여 안내를 살펴봅니다.", href: "/board/event" },
  { icon: Headset, title: "아카데미", description: "레슨 일정과 수강 안내 페이지로 이동합니다.", href: "/academy" },
  { icon: MessageSquare, title: "쪽지함", description: "개별 안내와 답변 메시지를 확인합니다.", href: "/messages" },
];

function InfoLinkItem({ icon: Icon, title, description, href }: InfoLinkProps) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-start gap-3 border-b border-border p-4 transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset bp-sm:border-r bp-sm:[&:nth-child(2n)]:border-r-0 bp-sm:[&:nth-last-child(-n+2)]:border-b-0 bp-lg:border-b-0 bp-lg:[&:nth-child(2n)]:border-r bp-lg:[&:nth-child(4n)]:border-r-0"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block break-keep text-ui-body-sm font-semibold text-foreground">{title}</span>
        <span className="block break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
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

              <div className="flex shrink-0 items-center gap-2 text-ui-label text-muted-foreground">
                <Badge
                  variant={getAnswerStatusBadgeSpec(!!qna.answer).variant}
                  className={`${badgeBaseOutlined} ${badgeSizeSm}`}
                >
                  {qna.answer ? "답변완료" : "대기중"}
                </Badge>
                <div className="hidden shrink-0 items-center gap-2 bp-sm:flex">
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
        variant="feature"
        eyebrow="고객센터"
        title="필요한 도움을 빠르게 찾아보세요"
        description={
          <p className="break-keep leading-relaxed">
            주문, 배송, 교체서비스, 아카데미 문의까지 자주 찾는 해결 경로를 한곳에서 안내합니다.
          </p>
        }
        actions={
          <>
            <Button variant="highlight" asChild wrap="responsive" className="w-full bp-sm:w-auto">
              <Link href="#faq">FAQ 찾아보기</Link>
            </Button>
            <Button variant="outline" asChild wrap="responsive" className="w-full bp-sm:w-auto">
              <Link href="/board/qna/write">문의하기</Link>
            </Button>
          </>
        }
      />

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
              {quickActions.map((action) => {
                const Icon = action.icon;
                const featured = action.variant === "primary";

                return (
                  <InteractiveCard
                    key={action.href}
                    href={action.href}
                    className={cn(
                      "group flex h-full min-w-0 flex-col gap-4",
                      featured && "border-brand-highlight-ink/35 bg-brand-highlight-muted",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-control border",
                          featured
                            ? "border-brand-highlight-ink/30 text-brand-highlight-ink"
                            : "border-border bg-background text-muted-foreground",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <h3 className="break-keep text-ui-card-title font-semibold text-foreground">
                        {action.title}
                      </h3>
                      <p className="break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </InteractiveCard>
                );
              })}
            </div>
          </section>

          {/* Info Links */}
          <section>
            <SectionHeader
              className="mb-6"
              title="지원 목적지"
              description="공지, 이벤트, 아카데미와 메시지 확인 경로를 이어서 확인하세요."
            />
            <PublicSurface padding="none" className="overflow-hidden">
              <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
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
