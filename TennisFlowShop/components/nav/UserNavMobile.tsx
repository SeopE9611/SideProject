"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useAuthStore } from "@/app/store/authStore";
import { useUnreadMessageCount } from "@/lib/hooks/useUnreadMessageCount";
import { Badge } from "@/components/ui/badge";

interface UserNavMobileProps {
  setOpen: (open: boolean) => void;
  unreadCount?: number | null;
}

export function UserNavMobile({ setOpen, unreadCount }: UserNavMobileProps) {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const { logout } = useAuthStore();
  // 모바일 메뉴가 자체 unread API를 다시 부르면
  // 헤더(상단 공통)에서 이미 가져온 값과 중복 호출이 됩니다.
  // 따라서 상위에서 unreadCount를 내려준 경우에는 재호출을 완전히 건너뜁니다.
  const shouldPollUnread = unreadCount == null;
  const { count: polledUnreadCount, status: unreadStatus } = useUnreadMessageCount(
    shouldPollUnread && !loading && !!user,
  );
  // 상위 unreadCount가 있으면 그 값을 단일 소스로 사용하고,
  // 없을 때만(호환 목적) 기존 훅 결과를 사용합니다.
  // 이렇게 하면 데스크톱/모바일이 같은 unread 데이터 소스를 공유할 수 있습니다.
  const resolvedUnreadCount = shouldPollUnread
    ? unreadStatus === "ready"
      ? (polledUnreadCount ?? 0)
      : null
    : unreadCount;

  if (loading) {
    return (
      <p
        className="text-sm text-center text-muted-foreground py-2"
        aria-live="polite"
        aria-busy="true"
      >
        사용자 정보를 확인하고 있습니다.
      </p>
    );
  }

  if (!user) {
    return (
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={() => {
          setOpen(false);
          const redirectTo =
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/";
          router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
        }}
      >
        로그인
      </Button>
    );
  }

  const displayName = user.name?.trim() || "회원";
  const socialProviders = user.socialProviders ?? [];
  const hasKakao = socialProviders.includes("kakao");
  const hasNaver = socialProviders.includes("naver");

  return (
    <>
      <p className="text-sm text-center">
        {displayName}{" "}
        {user.role === "admin" && (
          <span className="text-muted-foreground">(관리자)</span>
        )}{" "}
        님
      </p>
      {(hasKakao || hasNaver) && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-muted-foreground">소셜 로그인</p>
          <div className="flex flex-wrap justify-center gap-1">
            {hasKakao && <Badge variant="brand">카카오</Badge>}
            {hasNaver && <Badge variant="success">네이버</Badge>}
          </div>
        </div>
      )}
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={() => {
          setOpen(false);
          router.push("/mypage");
        }}
      >
        마이페이지
      </Button>
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={() => {
          setOpen(false);
          router.push("/messages");
        }}
      >
        쪽지함
        {resolvedUnreadCount !== null && resolvedUnreadCount > 0 && (
          <span className="shrink-0 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-none px-1.5 py-[2px]">
            {resolvedUnreadCount > 99 ? "99+" : resolvedUnreadCount}
          </span>
        )}
      </Button>
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={async () => {
          setOpen(false);
          logout();
          await fetch("/api/logout", {
            method: "POST",
            credentials: "include",
          });
          router.replace("/");
          router.refresh();
        }}
      >
        로그아웃
      </Button>
    </>
  );
}
