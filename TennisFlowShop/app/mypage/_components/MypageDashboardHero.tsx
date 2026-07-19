"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IdentityBadge } from "@/components/ui/identity-badge";
import { getUserRoleLabel, isAdminRole } from "@/lib/admin/roles";
import { cn } from "@/lib/utils";
import { Mail, ShieldCheck, UserCog } from "lucide-react";
import Link from "next/link";

type MypageSummaryState = "loading" | "error" | "ready";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    oauthProviders?: Array<"kakao" | "naver">;
  };
  todoCount: number;
  summaryState: MypageSummaryState;
};

export default function MypageDashboardHero({ user, todoCount, summaryState }: Props) {
  const normalizedRole = String(user.role ?? "").toLowerCase();
  const isAdmin = isAdminRole(normalizedRole);
  const socialProviders = user.oauthProviders ?? [];
  const hasKakao = socialProviders.includes("kakao");
  const hasNaver = socialProviders.includes("naver");
  const hasTodoItems = summaryState === "ready" && todoCount > 0;
  const isSummaryReady = summaryState === "ready";
  const todoMessage =
    summaryState === "loading"
      ? "요약 정보를 불러오는 중입니다"
      : summaryState === "error"
        ? "요약 정보를 불러오지 못했습니다"
        : hasTodoItems
          ? "오늘 확인할 항목"
          : "현재 처리할 일이 없습니다";
  const todoBadgeVariant: "warning" | "success" | "secondary" | "danger" =
    summaryState === "error"
      ? "danger"
      : summaryState === "loading"
        ? "secondary"
        : hasTodoItems
          ? "warning"
          : "success";
  const todoBadgeLabel =
    summaryState === "loading"
      ? "불러오는 중"
      : summaryState === "error"
        ? "불러오기 실패"
        : hasTodoItems
          ? "확인 필요"
          : "완료";
  const todoCtaLabel = hasTodoItems
    ? "확인할 항목 보기"
    : isSummaryReady
      ? "거래 전체 보기"
      : "거래 내역 보기";

  return (
    <section
      className="overflow-hidden rounded-hero border border-surface-inverse-foreground/15 bg-surface-inverse p-5 text-surface-inverse-foreground shadow-soft bp-sm:p-6 bp-lg:p-8"
      aria-labelledby="mypage-dashboard-hero-title"
    >
      <div className="grid gap-5 bp-md:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] bp-md:items-center bp-lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-px w-6 bg-brand-highlight" aria-hidden="true" />
            <span className="text-ui-kicker text-surface-inverse-muted">MY TENNIS LAB</span>
          </div>

          <h1
            id="mypage-dashboard-hero-title"
            className="break-keep font-brand-heading text-[1.65rem] leading-tight tracking-[-0.015em] bp-sm:text-[2rem] bp-lg:text-[2.35rem]"
          >
            {user.name ?? "회원"}님, 내 이용 현황을 한눈에 확인하세요.
          </h1>

          <div className="mt-3 flex min-w-0 items-center gap-1.5 text-ui-body-sm text-surface-inverse-muted">
            <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-all">{user.email || "이메일 없음"}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <IdentityBadge
              tone={isAdmin ? "admin" : "email"}
              icon={<ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            >
              {isAdmin ? `${getUserRoleLabel(normalizedRole)} 계정` : "사용자 회원"}
            </IdentityBadge>
            {hasKakao ? <IdentityBadge tone="kakao">카카오 로그인</IdentityBadge> : null}
            {hasNaver ? <IdentityBadge tone="naver">네이버 로그인</IdentityBadge> : null}
            {!hasKakao && !hasNaver ? (
              <IdentityBadge tone="email">이메일 계정</IdentityBadge>
            ) : null}
          </div>
        </div>

        <div className="rounded-panel border border-surface-inverse-foreground/15 bg-surface-inverse-muted/10 p-4 bp-sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="hidden text-ui-kicker text-surface-inverse-muted bp-sm:block">
                TODAY ACTION
              </p>
              <p className="mt-2 text-ui-body-sm text-surface-inverse-muted">{todoMessage}</p>
            </div>
            <Badge variant={todoBadgeVariant}>{todoBadgeLabel}</Badge>
          </div>
          <p className="mt-2 font-brand-display text-[2.75rem] leading-none text-brand-highlight bp-sm:text-[3.25rem]">
            {isSummaryReady ? todoCount : "-"}
          </p>
          <div className="mt-4 grid gap-2 bp-sm:grid-cols-2 bp-lg:grid-cols-1">
            <Button
              asChild
              variant={hasTodoItems ? "inverse" : "outline"}
              className={cn(
                "min-h-11 rounded-control",
                !hasTodoItems &&
                  "border-surface-inverse-foreground/25 bg-transparent text-surface-inverse-foreground hover:bg-surface-inverse-muted/15 hover:text-surface-inverse-foreground",
              )}
            >
              <Link href={hasTodoItems ? "/mypage?tab=orders&scope=todo" : "/mypage?tab=orders"}>
                {todoCtaLabel}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-11 rounded-control border-surface-inverse-foreground/25 bg-transparent text-surface-inverse-foreground hover:bg-surface-inverse-muted/15 hover:text-surface-inverse-foreground"
            >
              <Link href="/mypage/profile">
                <UserCog className="h-4 w-4" aria-hidden="true" />
                회원정보 수정
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
