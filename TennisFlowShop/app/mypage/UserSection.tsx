"use client";

import { PublicSurface } from "@/components/public";
import { Button } from "@/components/ui/button";
import { IdentityBadge } from "@/components/ui/identity-badge";
import { getUserRoleLabel, isAdminRole } from "@/lib/admin/roles";
import { Mail, ShieldCheck, User, UserCog } from "lucide-react";
import Link from "next/link";

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
    <section>
      <PublicSurface variant="feature" padding="sm" className="bp-sm:px-5 bp-sm:py-4">
        <div className="flex min-w-0 flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-border bg-muted">
              <User className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                <h1 className="min-w-0 text-ui-body font-semibold text-foreground bp-sm:text-ui-card-title-lg">
                  {user.name ?? "회원"}님
                </h1>

                <IdentityBadge
                  tone={isAdmin ? "admin" : "email"}
                  icon={<ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                >
                  {isAdmin ? `${getUserRoleLabel(normalizedRole)} 계정` : "사용자 회원"}
                </IdentityBadge>

                {hasKakao && <IdentityBadge tone="kakao">카카오 로그인</IdentityBadge>}

                {hasNaver && <IdentityBadge tone="naver">네이버 로그인</IdentityBadge>}

                {!hasKakao && !hasNaver && <IdentityBadge tone="email">이메일 계정</IdentityBadge>}
              </div>

              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-ui-label text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-all">{user.email || "이메일 없음"}</span>
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-full shrink-0 bp-sm:w-auto" asChild>
            <Link href="/mypage/profile">
              <UserCog className="h-4 w-4" aria-hidden="true" />
              회원정보 수정
            </Link>
          </Button>
        </div>
      </PublicSurface>
    </section>
  );
}
