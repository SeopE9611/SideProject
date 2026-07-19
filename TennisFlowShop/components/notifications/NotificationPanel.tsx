"use client";

import { useRouter } from "next/navigation";

import { NotificationItem } from "@/components/notifications/NotificationItem";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationList } from "@/lib/hooks/useNotificationList";
import { showErrorToast } from "@/lib/toast";

export function NotificationPanel({ enabled, onClose }: { enabled: boolean; onClose: () => void }) {
  const router = useRouter();
  const { items, unreadCount, status, markAsRead, markAllAsRead } = useNotificationList({
    enabled,
    limit: 5,
  });

  const handleItemClick = async (id: string, href: string | null) => {
    try {
      await markAsRead(id);
    } catch {
      showErrorToast("알림 처리에 실패했습니다.");
      return;
    }
    onClose();
    if (href) router.push(href);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch {
      showErrorToast("알림 처리에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full max-h-[min(520px,80vh)] w-full flex-col">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="text-ui-body font-semibold">알림</h2>
          <p className="text-ui-label text-muted-foreground">
            읽지 않은 알림 {unreadCount.toLocaleString()}개
          </p>
        </div>
        <Button variant="ghost" size="sm" disabled={unreadCount <= 0} onClick={handleMarkAllAsRead}>
          모두 읽음
        </Button>
      </div>
      <Separator />
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {status === "loading" ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2 rounded-lg px-3 py-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))
        ) : status === "error" ? (
          <div className="px-4 py-10 text-center text-ui-body-sm text-muted-foreground">
            알림을 불러오지 못했습니다.
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center text-ui-body-sm text-muted-foreground">
            새 알림이 없습니다.
          </div>
        ) : (
          items.map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              onClick={() => handleItemClick(item.id, item.href)}
              variant="panel"
            />
          ))
        )}
      </div>
      {items.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onClose();
                router.push("/notifications");
              }}
            >
              전체 알림 보기
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
