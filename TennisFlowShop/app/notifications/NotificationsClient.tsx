"use client";

import { Bell, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";

import SiteContainer from "@/components/layout/SiteContainer";
import { EmptyState, PublicPageHero, ResultState, SummaryCard } from "@/components/public";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotificationListItem } from "@/lib/hooks/useNotificationList";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

const LIMIT = 20;

type NotificationListRes =
  | {
      ok: true;
      items: NotificationListItem[];
      unreadCount: number;
      hasMore: boolean;
      nextCursor: string | null;
    }
  | { ok: false; error: string };

async function fetchNotifications(cursor?: string | null) {
  const params = new URLSearchParams({ limit: String(LIMIT) });
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`/api/notifications?${params.toString()}`, {
    credentials: "include",
  });
  const data = (await res.json().catch(() => null)) as NotificationListRes | null;

  if (!res.ok || !data?.ok) {
    throw new Error(data && !data.ok ? data.error : `알림 조회 실패 (${res.status})`);
  }

  return data;
}

export default function NotificationsClient() {
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    fetchNotifications()
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setUnreadCount(data.unreadCount);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      const data = await fetchNotifications(nextCursor);
      setItems((prev) => [...prev, ...data.items]);
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error(error);
      showErrorToast("알림을 더 불러오지 못했습니다.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const markAsRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`알림 읽음 처리 실패 (${res.status})`);
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await globalMutate("/api/notifications/unread-count");
  };

  const markAllAsRead = async () => {
    try {
      setIsMarkingAll(true);
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`알림 모두 읽음 처리 실패 (${res.status})`);
      }

      const now = new Date().toISOString();
      setItems((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: now })));
      setUnreadCount(0);
      await globalMutate("/api/notifications/unread-count");
    } catch (error) {
      console.error(error);
      showErrorToast("알림 처리에 실패했습니다.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      setIsDeletingAll(true);
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`알림 전체 삭제 실패 (${res.status})`);
      }

      setItems([]);
      setUnreadCount(0);
      setHasMore(false);
      setNextCursor(null);
      await globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/notifications?"),
        undefined,
        { revalidate: true },
      );
      await globalMutate("/api/notifications/unread-count");
      showSuccessToast("알림 기록을 모두 삭제했습니다.");
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error(error);
      showErrorToast("알림 삭제에 실패했습니다.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleItemClick = async (item: NotificationListItem) => {
    try {
      if (!item.readAt) await markAsRead(item.id);
    } catch (error) {
      console.error(error);
      showErrorToast("알림 처리에 실패했습니다.");
      return;
    }

    if (item.href) router.push(item.href);
  };

  const showEmpty = status === "ready" && items.length === 0;

  return (
    <div className="min-h-full bg-background">
      <PublicPageHero
        eyebrow="알림 센터"
        title="알림"
        description={`주문, 쪽지, 서비스 진행 안내를 시간순으로 확인하세요 · 읽지 않은 알림 ${unreadCount.toLocaleString()}개`}
        actions={
          <>
            <Button
              variant="outline"
              disabled={unreadCount <= 0 || isMarkingAll || isDeletingAll}
              onClick={markAllAsRead}
              className="w-full gap-2 sm:w-auto"
            >
              {isMarkingAll && <Loader2 className="h-4 w-4 animate-spin" />}
              모두 읽음
            </Button>
            <AlertDialog
              open={isDeleteDialogOpen}
              onOpenChange={(open) => {
                if (isDeletingAll) return;
                setIsDeleteDialogOpen(open);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={items.length <= 0 || isDeletingAll}
                  className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                >
                  {isDeletingAll && <Loader2 className="h-4 w-4 animate-spin" />}
                  전체 삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>알림 기록을 모두 삭제할까요?</AlertDialogTitle>
                  <AlertDialogDescription>
                    삭제된 알림은 목록에서 사라지며 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingAll}>취소</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeletingAll}
                    className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(event) => {
                      event.preventDefault();
                      void deleteAllNotifications();
                    }}
                  >
                    {isDeletingAll && <Loader2 className="h-4 w-4 animate-spin" />}
                    전체 삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />
      <SiteContainer className="py-6 md:py-8">
        <SummaryCard className="mx-auto max-w-5xl" contentClassName="p-0">
          {status === "loading" ? (
            <div className="space-y-3 p-3 md:p-5">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2 rounded-lg px-3 py-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </div>
          ) : status === "error" ? (
            <ResultState
              status="error"
              title="알림을 불러오지 못했습니다"
              description="잠시 후 다시 확인해주세요."
              className="py-12"
            />
          ) : showEmpty ? (
            <EmptyState
              icon={<Bell className="h-8 w-8" />}
              title="새 알림이 없습니다"
              description="주문 상태, 쪽지, 고객센터 답변 등 새 소식이 도착하면 이곳에 표시됩니다."
              className="m-4"
            />
          ) : (
            <div className="space-y-3 p-3 md:p-5">
              {items.map((item) => (
                <NotificationItem key={item.id} item={item} onClick={() => handleItemClick(item)} />
              ))}
            </div>
          )}
          {status === "ready" && items.length > 0 && hasMore && (
            <>
              <Separator />
              <div className="p-3">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isLoadingMore}
                  onClick={loadMore}
                >
                  {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  더보기
                </Button>
              </div>
            </>
          )}
        </SummaryCard>
      </SiteContainer>
    </div>
  );
}
