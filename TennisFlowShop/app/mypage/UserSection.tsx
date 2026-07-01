"use client";

import { Badge } from "@/components/ui/badge";
import { getSocialProviderBadgeSpec } from "@/lib/badge-style";
import { getUserRoleLabel, isAdminRole } from "@/lib/admin/roles";
import { Mail, ShieldCheck, User } from "lucide-react";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    oauthProviders?: Array<"kakao" | "naver">;
  };
};

export default function UserSection({ user }: Props) {
  if (!user) return null;

  const normalizedRole = String(user.role ?? "").toLowerCase();
  const isAdmin = isAdminRole(normalizedRole);
  const socialProviders = user.oauthProviders ?? [];
  const hasKakao = socialProviders.includes("kakao");
  const hasNaver = socialProviders.includes("naver");

  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm bp-sm:px-5 bp-sm:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
          <User className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="min-w-0 break-keep text-ui-body font-semibold text-foreground bp-sm:text-ui-card-title-lg">
              {user.name ?? "회원"}님
            </h1>

            <Badge
              variant={isAdmin ? "info" : "secondary"}
              className="h-6 gap-1 whitespace-nowrap px-2 text-ui-label font-medium"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {isAdmin ? `${getUserRoleLabel(normalizedRole)} 계정` : "사용자 회원"}
            </Badge>

            {hasKakao && (
              <Badge
                variant={getSocialProviderBadgeSpec("kakao").variant}
                className="h-6 whitespace-nowrap px-2 text-ui-label font-medium"
              >
                카카오 로그인
              </Badge>
            )}

            {hasNaver && (
              <Badge
                variant={getSocialProviderBadgeSpec("naver").variant}
                className="h-6 whitespace-nowrap px-2 text-ui-label font-medium"
              >
                네이버 로그인
              </Badge>
            )}

            {!hasKakao && !hasNaver && (
              <Badge variant="secondary" className="h-6 whitespace-nowrap px-2 text-ui-label font-medium">
                이메일 계정
              </Badge>
            )}
          </div>

          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-ui-label text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-all">{user.email || "이메일 없음"}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
