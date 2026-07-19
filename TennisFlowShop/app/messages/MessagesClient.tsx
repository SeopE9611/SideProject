"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import SiteContainer from "@/components/layout/SiteContainer";
import { EmptyState, PublicPageHero, ResultState, SummaryCard } from "@/components/public";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMessageDetail } from "@/lib/hooks/useMessageDetail";
import { useMessageList } from "@/lib/hooks/useMessageList";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  MailOpen,
  Reply,
  Send,
  Trash2,
  User,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { mutate as globalMutate } from "swr";

type SafeUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin" | string;
};

const LIMIT = 20;
const MessageComposeDialog = dynamic(
  () => import("@/app/messages/_components/MessageComposeDialog"),
  { loading: () => null },
);
const AdminBroadcastDialog = dynamic(
  () => import("@/app/messages/_components/AdminBroadcastDialog"),
  { loading: () => null },
);

function formatKST(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
}

function buildReplyTitle(title: string) {
  const t = (title ?? "").trim();
  if (!t) return "RE:";
  if (t.toLowerCase().startsWith("re:")) return t;
  return `RE: ${t}`;
}

function buildQuotedBody(opts: {
  createdAt: string;
  fromName: string;
  toName: string;
  body: string;
}) {
  const { createdAt, fromName, toName, body } = opts;

  return [
    "",
    "",
    "---",
    `[원문] ${formatKST(createdAt)} · ${fromName} → ${toName}`,
    body ?? "",
  ].join("\n");
}

export default function MessagesClient({ user }: { user: SafeUser }) {
  const [tab, setTab] = useState<"inbox" | "send" | "admin">("inbox");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyToUserId, setReplyToUserId] = useState<string>("");
  const [replyToName, setReplyToName] = useState<string>("");
  const [replyDefaultTitle, setReplyDefaultTitle] = useState<string>("");
  const [replyDefaultBody, setReplyDefaultBody] = useState<string>("");

  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { items, total, isLoading, mutate, key, hasResolvedData, hasDataError, errorMessage } =
    useMessageList(tab, page, LIMIT, true);
  const { item: detail, isLoading: detailLoading } = useMessageDetail(selectedId, true);

  const totalPages = useMemo(() => {
    if (typeof total !== "number") return 1;
    return Math.max(1, Math.ceil(total / LIMIT));
  }, [total]);

  // empty 오판 방지를 위해 로딩/에러/실데이터 상태를 분리한다.
  const shouldShowEmptyState =
    !isLoading && !hasDataError && hasResolvedData && Array.isArray(items) && items.length === 0;
  const showListSkeleton = isLoading && !hasDataError;

  async function afterOpenDetail() {
    if (key) await mutate();
    await globalMutate("/api/messages/unread-count");
  }

  async function deleteSelectedMessage() {
    if (!detail) return;

    try {
      setIsDeleting(true);

      const res = await fetch(`/api/messages/${detail.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok || !data?.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "삭제에 실패했습니다.");
      }

      showSuccessToast("쪽지를 삭제했습니다.");
      setDeleteOpen(false);
      setSelectedId(null);

      if (key) await mutate();
      await globalMutate("/api/messages/unread-count");
      await globalMutate((k) => typeof k === "string" && k.startsWith("/api/messages/send"));
    } catch (e: any) {
      showErrorToast(e?.message || "삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  function openReply() {
    if (!detail) return;

    const toUserId = tab === "send" ? detail.toUserId : detail.fromUserId;
    const toName = tab === "send" ? detail.toName : detail.fromName;

    if (!toUserId) return showErrorToast("답장할 수 없는 쪽지입니다.");

    setReplyToUserId(String(toUserId));
    setReplyToName(String(toName ?? "회원"));
    setReplyDefaultTitle(buildReplyTitle(detail.title));
    setReplyDefaultBody(
      buildQuotedBody({
        createdAt: detail.createdAt,
        fromName: detail.fromName,
        toName: detail.toName,
        body: detail.body,
      }),
    );

    setReplyOpen(true);
  }

  return (
    <div className="min-h-full bg-background">
      <PublicPageHero
        variant="feature"
        eyebrow="쪽지"
        title="쪽지함"
        description="알림보다 자세한 1:1 안내와 답장을 확인하세요"
        actions={
          <>
            {user.role === "admin" && (
              <Button
                variant="highlight"
                onClick={() => setBroadcastOpen(true)}
                className="w-full gap-2 sm:w-auto"
              >
                <Megaphone aria-hidden="true" className="h-4 w-4" />
                전체 공지 보내기
              </Button>
            )}
          </>
        }
      />
      <SiteContainer className="py-6 md:py-8" variant="wide">
        <SummaryCard
          variant="feature"
          className="mx-auto max-w-7xl rounded-panel"
          contentClassName="p-3 sm:p-4 md:p-6"
        >
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = v as typeof tab;
              setTab(next);
              setPage(1);
              setSelectedId(null);
            }}
            className="w-full"
          >
            <TabsList className="mb-4 grid w-full grid-cols-3 rounded-control border border-border bg-brand-highlight-muted/45 p-1 md:mb-6">
              <TabsTrigger
                value="inbox"
                className="min-w-0 rounded-control px-2 text-ui-label data-[state=active]:bg-card data-[state=active]:text-brand-highlight-ink data-[state=active]:shadow-soft sm:px-3 sm:text-ui-body-sm"
              >
                <Mail aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">받은쪽지</span>
                <span className="sm:hidden">받은</span>
              </TabsTrigger>
              <TabsTrigger
                value="send"
                className="min-w-0 rounded-control px-2 text-ui-label data-[state=active]:bg-card data-[state=active]:text-brand-highlight-ink data-[state=active]:shadow-soft sm:px-3 sm:text-ui-body-sm"
              >
                <Send aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">보낸쪽지</span>
                <span className="sm:hidden">보낸</span>
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="min-w-0 rounded-control px-2 text-ui-label data-[state=active]:bg-card data-[state=active]:text-brand-highlight-ink data-[state=active]:shadow-soft sm:px-3 sm:text-ui-body-sm"
              >
                <Megaphone aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">관리자</span>
                <span className="sm:hidden">관리</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                <div className="lg:col-span-5">
                  <section className="overflow-hidden rounded-panel border border-border bg-card shadow-soft">
                    <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                      <div className="break-keep text-ui-body-sm font-medium text-muted-foreground">
                        총{" "}
                        <span className="text-foreground font-semibold">
                          {typeof total === "number" ? total : "-"}
                        </span>
                        개
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-ui-label text-muted-foreground hidden sm:inline">
                          {page} / {totalPages}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => {
                              setPage((p) => Math.max(1, p - 1));
                              setSelectedId(null);
                            }}
                            className="h-8 w-8 rounded-control p-0"
                            aria-label="이전 쪽지 페이지"
                          >
                            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => {
                              setPage((p) => Math.min(totalPages, p + 1));
                              setSelectedId(null);
                            }}
                            className="h-8 w-8 rounded-control p-0"
                            aria-label="다음 쪽지 페이지"
                          >
                            <ChevronRight aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 p-3 sm:p-4">
                      {showListSkeleton && (
                        <div className="space-y-2">
                          {Array.from({ length: 6 }).map((_, idx) => (
                            <div
                              key={`messages-list-skeleton-${idx}`}
                              className="flex items-start gap-3 rounded-control border border-border bg-card p-4"
                            >
                              <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-sm" />
                              <div className="min-w-0 flex-1">
                                <Skeleton className="h-4 w-3/5" />
                                <div className="mt-2 flex gap-2">
                                  <Skeleton className="h-3 w-20" />
                                  <Skeleton className="h-3 w-28" />
                                </div>
                                <Skeleton className="mt-2 h-3 w-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {hasDataError && (
                        <ResultState
                          status="error"
                          title="쪽지 목록을 불러오지 못했습니다"
                          description={errorMessage || "잠시 후 다시 확인해주세요."}
                          className="py-8"
                        />
                      )}

                      {shouldShowEmptyState && (
                        <EmptyState
                          icon={<Mail aria-hidden="true" className="h-8 w-8" />}
                          title="아직 쪽지가 없습니다"
                          description="고객센터 답변이나 회원 간 쪽지가 도착하면 이곳에 표시됩니다."
                        />
                      )}

                      {!isLoading &&
                        !hasDataError &&
                        Array.isArray(items) &&
                        items.map((m) => {
                          const active = selectedId === m.id;
                          const counterpart = tab === "send" ? m.toName : m.fromName;
                          const isUnread = tab !== "send" && !m.isRead;

                          return (
                            <button
                              key={m.id}
                              className={cn(
                                "w-full rounded-control border border-border bg-card p-4 text-left transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-sm",
                                isUnread &&
                                  !active &&
                                  "border-brand-highlight-ink/35 bg-brand-highlight-muted",
                                active &&
                                  "border-brand-highlight-ink/45 bg-brand-highlight-muted shadow-soft",
                                !active && "hover:bg-muted hover:text-foreground",
                              )}
                              onClick={async () => {
                                setSelectedId(m.id);
                                setTimeout(afterOpenDetail, 250);
                              }}
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <div
                                    className={cn(
                                      "mt-0.5 shrink-0",
                                      isUnread && "text-brand-highlight-ink",
                                      !isUnread && "text-muted-foreground",
                                    )}
                                  >
                                    {isUnread ? (
                                      <Mail aria-hidden="true" className="h-5 w-5" />
                                    ) : (
                                      <MailOpen aria-hidden="true" className="h-5 w-5" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div
                                      className={cn(
                                        "line-clamp-2 break-keep text-ui-body-sm leading-tight",
                                        isUnread
                                          ? "font-semibold text-foreground"
                                          : "font-medium text-foreground/90",
                                      )}
                                    >
                                      {m.title || "(제목 없음)"}
                                    </div>

                                    <div className="flex items-center gap-2 mt-1 text-ui-label text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <User aria-hidden="true" className="h-3 w-3" />
                                        <span className="max-w-[120px] truncate sm:max-w-[160px]">
                                          {counterpart}
                                        </span>
                                      </div>
                                      <span>·</span>
                                      <div className="flex items-center gap-1">
                                        <Clock aria-hidden="true" className="h-3 w-3" />
                                        <span className="whitespace-nowrap">
                                          {formatKST(m.createdAt)}
                                        </span>
                                      </div>
                                    </div>

                                    <p className="mt-2 text-ui-label text-muted-foreground line-clamp-2 leading-relaxed">
                                      {m.snippet}
                                    </p>
                                  </div>
                                </div>

                                {isUnread && (
                                  <Badge
                                    variant="brand"
                                    className="shrink-0 px-2 py-1 text-ui-label font-semibold leading-none"
                                  >
                                    읽지 않음
                                  </Badge>
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-7">
                  <section className="min-h-[400px] overflow-hidden rounded-panel border border-border bg-card shadow-soft">
                    {!selectedId && (
                      <EmptyState
                        icon={<Mail aria-hidden="true" className="h-8 w-8" />}
                        title="쪽지를 선택해 주세요"
                        description="쪽지를 선택하면 이곳에서 상세 내용을 볼 수 있습니다."
                        className="h-[400px] justify-center border-0 bg-transparent"
                      />
                    )}

                    {selectedId && detailLoading && (
                      <div className="space-y-4 p-5 md:p-6">
                        <Skeleton className="h-7 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="pt-4 border-t">
                          <Skeleton className="h-32 w-full" />
                        </div>
                      </div>
                    )}

                    {selectedId && !detailLoading && !detail && (
                      <div className="flex items-center justify-center h-[400px] text-center p-6 md:p-8">
                        <p className="break-keep text-ui-body-sm text-muted-foreground">
                          쪽지를 불러오지 못했습니다. 목록에서 다시 선택해 주세요.
                        </p>
                      </div>
                    )}

                    {detail && (
                      <div className="p-5 md:p-6">
                        <div className="pb-4 border-b border-border/40">
                          <h2 className="mb-3 font-brand-heading text-ui-section-title font-semibold leading-tight text-foreground">
                            {detail.title || "(제목 없음)"}
                          </h2>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex flex-col gap-1.5 text-ui-body-sm text-muted-foreground">
                              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                <User aria-hidden="true" className="h-4 w-4" />
                                <span>
                                  {tab === "send"
                                    ? `받는 사람: ${detail.toName}`
                                    : `보낸 사람: ${detail.fromName}`}
                                </span>
                              </div>

                              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                <Clock aria-hidden="true" className="h-4 w-4" />
                                <span>{formatKST(detail.createdAt)}</span>
                                {tab !== "send" && (
                                  <>
                                    <span>·</span>
                                    <span
                                      className={cn(
                                        detail.readAt
                                          ? "text-muted-foreground"
                                          : "font-medium text-brand-highlight-ink",
                                      )}
                                    >
                                      {detail.readAt ? "읽음" : "읽지 않음"}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                              {tab !== "send" && (
                                <Button
                                  variant="highlight_soft"
                                  size="sm"
                                  onClick={openReply}
                                  className="w-full gap-2 sm:w-auto"
                                >
                                  <Reply aria-hidden="true" className="h-4 w-4" />
                                  답장
                                </Button>
                              )}

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteOpen(true)}
                                className="w-full gap-2 sm:w-auto"
                              >
                                <Trash2 aria-hidden="true" className="h-4 w-4" />
                                삭제
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 md:pt-6">
                          <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-ui-body-sm leading-relaxed text-foreground/90">
                              {detail.body}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </SummaryCard>
      </SiteContainer>

      {/* 답장 다이얼로그는 실제 열릴 때만 로드 */}
      {replyOpen && replyToUserId && (
        <MessageComposeDialog
          open={replyOpen}
          onOpenChange={setReplyOpen}
          toUserId={replyToUserId}
          toName={replyToName}
          defaultTitle={replyDefaultTitle}
          defaultBody={replyDefaultBody}
          onSent={async () => {
            await globalMutate((k) => typeof k === "string" && k.startsWith("/api/messages/send"));
          }}
        />
      )}

      {/* 관리자 전체 공지 다이얼로그도 필요 시점에만 로드 */}
      {user.role === "admin" && broadcastOpen && (
        <AdminBroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>쪽지를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 쪽지는 현재 탭(받은/보낸/관리자)에서 보이지 않게 됩니다.
              <br />
              상대방 쪽지함에는 영향을 주지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void deleteSelectedMessage();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "삭제 중…" : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
