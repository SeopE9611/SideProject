"use client";

import { Mail, ShieldCheck, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSocialProviderBadgeSpec } from "@/lib/badge-style";

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
  const isAdmin = normalizedRole === "admin";
  const socialProviders = user.oauthProviders ?? [];
  const hasKakao = socialProviders.includes("kakao");
  const hasNaver = socialProviders.includes("naver");

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm bp-sm:p-6 bp-lg:p-7">
      <div className="flex min-w-0 items-start gap-4">
        <div className="shrink-0 rounded-2xl border border-border bg-muted p-3">
          <User className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-3">
          <h1 className="break-keep text-2xl font-semibold tracking-tight text-foreground bp-sm:text-3xl">
            {user.name ?? "회원"}님, 안녕하세요.
          </h1>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-all">
                {user.email || "이메일 없음"}
              </span>
            </span>
            <Badge
              variant={isAdmin ? "info" : "secondary"}
              className="gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-medium"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {isAdmin ? "관리자 계정" : "사용자 회원"}
            </Badge>
            {hasKakao && (
              <Badge
                variant={getSocialProviderBadgeSpec("kakao").variant}
                className="whitespace-nowrap px-2.5 py-1 text-xs font-medium"
              >
                카카오 로그인
              </Badge>
            )}
            {hasNaver && (
              <Badge
                variant={getSocialProviderBadgeSpec("naver").variant}
                className="whitespace-nowrap px-2.5 py-1 text-xs font-medium"
              >
                네이버 로그인
              </Badge>
            )}
            {!hasKakao && !hasNaver && (
              <Badge
                variant="secondary"
                className="whitespace-nowrap px-2.5 py-1 text-xs font-medium"
              >
                이메일 계정
              </Badge>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
