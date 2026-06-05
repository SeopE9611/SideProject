"use client";

import { Bell, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";

import { NotificationItem } from "@/components/notifications/NotificationItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotificationListItem } from "@/lib/hooks/useNotificationList";
import { showErrorToast } from "@/lib/toast";

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
        item.id === id && !item.readAt
          ? { ...item, readAt: new Date().toISOString() }
          : item,
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
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:py-8">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border/60 bg-secondary/70">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">알림</CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  읽지 않은 알림 {unreadCount.toLocaleString()}개
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              disabled={unreadCount <= 0 || isMarkingAll}
              onClick={markAllAsRead}
              className="gap-2"
            >
              {isMarkingAll && <Loader2 className="h-4 w-4 animate-spin" />}
              모두 읽음
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {status === "loading" ? (
            <div className="space-y-1 p-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2 rounded-lg px-3 py-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </div>
          ) : status === "error" ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
              알림을 불러오지 못했습니다.
            </div>
          ) : showEmpty ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
              새 알림이 없습니다.
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {items.map((item) => (
                <NotificationItem key={item.id} item={item} onClick={() => handleItemClick(item)} />
              ))}
            </div>
          )}
          {status === "ready" && items.length > 0 && hasMore && (
            <>
              <Separator />
              <div className="p-3">
                <Button variant="outline" className="w-full gap-2" disabled={isLoadingMore} onClick={loadMore}>
                  {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  더보기
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
