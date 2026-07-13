"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadNotificationCount } from "@/lib/hooks/useUnreadNotificationCount";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  enabled: boolean;
  mode?: "desktop" | "mobileHeader" | "mobileCard";
  onNavigate?: () => void;
  className?: string;
};

export function NotificationBell({
  enabled,
  mode = "desktop",
  onNavigate,
  className,
}: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { count, status } = useUnreadNotificationCount(enabled);
  const unreadCount = status === "ready" ? (count ?? 0) : 0;
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);
  const isMobile = mode !== "desktop";

  if (!enabled) return null;

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative shrink-0 rounded-control hover:bg-muted focus-visible:ring-2 ring-ring",
        mode === "desktop"
          ? "h-10 w-10 p-0"
          : mode === "mobileCard"
            ? "h-9 w-9 p-0"
            : "h-10 w-10 p-0",
        className,
      )}
      aria-label={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : "알림"}
      title="알림"
    >
      <Bell className={cn(mode === "desktop" ? "!h-5 !w-5" : "h-5 w-5")} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-ui-micro font-semibold text-destructive-foreground">
          {badge}
        </span>
      )}
    </Button>
  );

  if (mode === "mobileCard") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "relative h-9 w-9 shrink-0 rounded-control p-0 hover:bg-muted focus-visible:ring-2 ring-ring",
          className,
        )}
        aria-label={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : "알림"}
        title="알림"
        onClick={() => {
          onNavigate?.();
          router.push("/notifications");
        }}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-ui-micro font-semibold text-destructive-foreground">
            {badge}
          </span>
        )}
      </Button>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="z-[80] flex w-[92vw] max-w-sm flex-col p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>알림</SheetTitle>
          </SheetHeader>
          <NotificationPanel
            enabled={open}
            onClose={() => {
              setOpen(false);
              onNavigate?.();
            }}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        collisionPadding={16}
        className="z-[70] w-[360px] p-0"
      >
        <NotificationPanel
          enabled={open}
          onClose={() => {
            setOpen(false);
            onNavigate?.();
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
