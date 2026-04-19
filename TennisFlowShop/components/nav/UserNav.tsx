"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  LayoutDashboard,
  Settings,
  UserIcon,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useAuthStore } from "@/app/store/authStore";
import { useUnreadMessageCount } from "@/lib/hooks/useUnreadMessageCount";
import { Badge } from "@/components/ui/badge";
import { getSocialProviderBadgeSpec } from "@/lib/badge-style";

type UserNavProps = {
  unreadCount?: number | null;
};

export function UserNav({ unreadCount }: UserNavProps) {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const { logout } = useAuthStore();
  const shouldPollUnread = unreadCount == null;
  const { count, status } = useUnreadMessageCount(
    shouldPollUnread && !loading && !!user,
  );
  const resolvedUnread = shouldPollUnread
    ? status === "ready"
      ? (count ?? 0)
      : null
    : unreadCount;

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 text-muted-foreground"
        aria-live="polite"
        aria-busy="true"
      >
        <UserIcon className="h-5 w-5" />
        <span className="text-sm">사용자 확인 중</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const redirectTo =
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/";
          router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
        }}
      >
        <UserIcon className="h-5 w-5" />
        <span className="sr-only">로그인</span>
      </Button>
    );
  }

  const isAdmin = user.role === "admin";
  const displayName = user.name?.trim() || "회원";
  const socialProviders = user.socialProviders ?? [];
  const hasKakao = socialProviders.includes("kakao");
  const hasNaver = socialProviders.includes("naver");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-foreground px-2 py-1.5 rounded-md transition min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <span
              className="text-sm min-w-0 grow max-w-[140px] sm:max-w-[180px] md:max-w-[220px] whitespace-nowrap overflow-hidden text-ellipsis"
              title={`${displayName} 님`}
            >
              {displayName} 님
            </span>

            {isAdmin && (
              <Badge
                variant="info"
                className="shrink-0 whitespace-nowrap text-[11px] font-semibold px-1.5 py-[2px]"
              >
                관리자
              </Badge>
            )}
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {(hasKakao || hasNaver) && (
          <>
            <div className="px-2 py-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  소셜 로그인
                </span>
                <div className="flex gap-1">
                  {hasKakao && (
                    <Badge
                      variant={getSocialProviderBadgeSpec("kakao").variant}
                      className="pointer-events-none h-5 px-2 text-[11px]"
                    >
                      카카오
                    </Badge>
                  )}
                  {hasNaver && (
                    <Badge
                      variant={getSocialProviderBadgeSpec("naver").variant}
                      className="pointer-events-none h-5 px-2 text-[11px]"
                    >
                      네이버
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => router.push("/mypage")}>
          <Settings className="mr-2 h-4 w-4" />
          마이페이지
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/messages")}>
          <Mail className="mr-2 h-4 w-4" />
          쪽지함{" "}
          {resolvedUnread !== null && resolvedUnread > 0 && (
            <span className="shrink-0 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-none px-1.5 py-[2px]">
              {resolvedUnread > 99 ? "99+" : resolvedUnread}
            </span>
          )}
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => router.push("/admin/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            관리자 페이지
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={async () => {
            logout();
            await fetch("/api/logout", {
              method: "POST",
              credentials: "include",
            });
            router.replace("/");
            router.refresh();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
