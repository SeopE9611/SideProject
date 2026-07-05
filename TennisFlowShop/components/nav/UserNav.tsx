"use client";

import { useAuthStore } from "@/app/store/authStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSocialProviderBadgeSpec } from "@/lib/badge-style";
import { getUserRoleLabel, isAdminRole } from "@/lib/admin/roles";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { LayoutDashboard, LogOut, MessageSquare, Settings, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserNav() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const { logout } = useAuthStore();

  if (loading) {
    return (
      <div
        className="flex h-9 w-[72px] items-center rounded-md px-2 xl:w-[96px] 2xl:w-[120px]"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">사용자 상태 확인 중</span>
        <span aria-hidden="true" className="h-3.5 w-full animate-pulse rounded-full bg-muted/70" />
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
            typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
          router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
        }}
      >
        <UserIcon className="h-5 w-5" />
        <span className="sr-only">로그인</span>
      </Button>
    );
  }

  const normalizedRole = String(user.role ?? "").toLowerCase();
  const isAdmin = isAdminRole(normalizedRole);
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
              className="text-ui-body-sm min-w-0 grow max-w-[140px] sm:max-w-[180px] md:max-w-[220px] whitespace-nowrap overflow-hidden text-ellipsis"
              title={`${displayName} 님`}
            >
              {displayName} 님
            </span>

            {isAdmin && (
              <Badge
                variant="info"
                className="shrink-0 whitespace-nowrap text-ui-micro font-medium px-1.5 py-[2px]"
              >
                {getUserRoleLabel(normalizedRole)}
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
                <span className="text-ui-label text-muted-foreground">소셜 로그인</span>
                <div className="flex gap-1">
                  {hasKakao && (
                    <Badge
                      variant={getSocialProviderBadgeSpec("kakao").variant}
                      className="pointer-events-none h-5 px-2 text-ui-micro"
                    >
                      카카오
                    </Badge>
                  )}
                  {hasNaver && (
                    <Badge
                      variant={getSocialProviderBadgeSpec("naver").variant}
                      className="pointer-events-none h-5 px-2 text-ui-micro"
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
          <MessageSquare className="mr-2 h-4 w-4" />
          쪽지함
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            onClick={() => window.open("/admin/operations", "_blank", "noopener,noreferrer")}
          >
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
